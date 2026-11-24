import crypto from "node:crypto";

import {
  CognitoIdentityProviderClient, //	Establishes communication with Amazon Cognito.
  AdminGetUserCommand, //	Retrieves information about a Cognito user.
  AdminListGroupsForUserCommand, //	Retrieves the groups a user belongs to.
  AdminSetUserPasswordCommand, //	Allows an authorized backend to set a user's password.
} from "@aws-sdk/client-cognito-identity-provider";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  SESClient, // Establishes communication with SES.
  SendEmailCommand, // Sends an email using Amazon SES. Sender is 'noreply@awssbg-cdm.live'
} from "@aws-sdk/client-ses";

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "us-east-1";

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ses = new SESClient({ region: REGION });
const secretsManager = new SecretsManagerClient({ region: REGION });

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
);

const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;
const ADMIN_GROUP = process.env.ADMIN_GROUP || "Admins";
const SES_SENDER = process.env.SES_SENDER;
const SECRET_ARN = process.env.SECRET_ARN;

const OTP_EXPIRY = Number(process.env.OTP_EXPIRY_SECONDS || 300);
const RESET_EXPIRY = Number(process.env.RESET_TOKEN_EXPIRY_SECONDS || 300);
const MAX_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);

const RATE_WINDOW_SECONDS = 900;
const MAX_REQUESTS_PER_WINDOW = 5;

let cachedSecret;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://awssbg-cdm.live",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      Vary: "Origin",
    },
    body: JSON.stringify(body),
  };
}

function getBody(event) {
  if (!event.body) return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(raw);
}

async function getRecoverySecret() {
  if (cachedSecret) return cachedSecret;

  const result = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: SECRET_ARN,
    }),
  );

  if (!result.SecretString) {
    throw new Error("Recovery secret is unavailable.");
  }

  const parsed = JSON.parse(result.SecretString);

  if (!parsed.RECOVERY_SECRET) {
    throw new Error("RECOVERY_SECRET is missing.");
  }

  cachedSecret = parsed.RECOVERY_SECRET;
  return cachedSecret;
}

async function hashValue(value, purpose) {
  const secret = await getRecoverySecret();

  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${value}`)
    .digest("hex");
}

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(event) {
  return (
    event.requestContext?.identity?.sourceIp ||
    event.requestContext?.http?.sourceIp ||
    "unknown"
  );
}

async function isAdministrator(email) {
  try {
    const user = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }),
    );

    if (user.Enabled === false || user.UserStatus === "ARCHIVED") {
      return false;
    }

    const groups = await cognito.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }),
    );

    return (groups.Groups || []).some(
      (group) => group.GroupName === ADMIN_GROUP,
    );
  } catch (error) {
    if (
      error.name === "UserNotFoundException" ||
      error.name === "ResourceNotFoundException"
    ) {
      return false;
    }

    throw error;
  }
}

async function checkRateLimit(key) {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + RATE_WINDOW_SECONDS;

  try {
    const result = await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: key },
        UpdateExpression:
          "SET #count = if_not_exists(#count, :zero) + :one, " +
          "#windowEnd = if_not_exists(#windowEnd, :windowEnd), " +
          "#ttl = :ttl",
        ConditionExpression:
          "attribute_not_exists(#windowEnd) OR #windowEnd > :now",
        ExpressionAttributeNames: {
          "#count": "requestCount",
          "#windowEnd": "windowEndsAt",
          "#ttl": "ttl",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":windowEnd": windowEnd,
          ":ttl": windowEnd + 86400,
          ":now": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    return result.Attributes.requestCount <= MAX_REQUESTS_PER_WINDOW;
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") {
      throw error;
    }
  }

  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: key },
        UpdateExpression:
          "SET #count = :one, #windowEnd = :windowEnd, #ttl = :ttl",
        ConditionExpression: "#windowEnd <= :now",
        ExpressionAttributeNames: {
          "#count": "requestCount",
          "#windowEnd": "windowEndsAt",
          "#ttl": "ttl",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":windowEnd": windowEnd,
          ":ttl": windowEnd + 86400,
          ":now": now,
        },
      }),
    );

    return true;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return false;
    }
    throw error;
  }
}

async function requestRecovery(event) {
  const body = getBody(event);
  const email = normalizeEmail(body.email);

  const genericMessage = {
    message: "If the account is eligible, a recovery code will be sent.",
  };

  if (!validEmail(email)) {
    return response(200, genericMessage);
  }

  const emailHash = await hashValue(email, "email");
  const ipHash = await hashValue(getClientIp(event), "ip");

  const emailAllowed = await checkRateLimit(`rate#email#${emailHash}`);
  const ipAllowed = await checkRateLimit(`rate#ip#${ipHash}`);

  if (!emailAllowed || !ipAllowed) {
    return response(200, genericMessage);
  }

  const admin = await isAdministrator(email);

  if (!admin) {
    return response(200, genericMessage);
  }

  const otp = generateOtp();
  const otpHash = await hashValue(otp, "otp");
  const now = Math.floor(Date.now() / 1000);

  await dynamo.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        challengeId: `otp#${emailHash}`,
        email,
        otpHash,
        status: "PENDING",
        attempts: 0,
        createdAt: now,
        expiresAt: now + OTP_EXPIRY,
        ttl: now + OTP_EXPIRY + 86400,
      },
    }),
  );

  await ses.send(
    new SendEmailCommand({
      Source: SES_SENDER,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: "AWSSBG-CDM Administrator Password Recovery",
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data:
              `Your administrator password recovery code is: ${otp}\n\n` +
              `This code expires in five minutes. If you did not request ` +
              `this code, you can ignore this email.`,
            Charset: "UTF-8",
          },
        },
      },
    }),
  );

  return response(200, genericMessage);
}

async function verifyRecovery(event) {
  const body = getBody(event);
  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
    return response(400, { message: "Invalid or expired recovery code." });
  }

  const emailHash = await hashValue(email, "email");
  const otpHash = await hashValue(otp, "otp");
  const now = Math.floor(Date.now() / 1000);

  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { challengeId: `otp#${emailHash}` },
      ConsistentRead: true,
    }),
  );

  const challenge = result.Item;

  if (
    !challenge ||
    challenge.status !== "PENDING" ||
    challenge.expiresAt <= now ||
    challenge.attempts >= MAX_ATTEMPTS
  ) {
    return response(400, { message: "Invalid or expired recovery code." });
  }

  if (challenge.otpHash !== otpHash) {
    try {
      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { challengeId: `otp#${emailHash}` },
          UpdateExpression: "SET attempts = attempts + :one",
          ConditionExpression:
            "#status = :pending AND expiresAt > :now AND attempts < :max",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":one": 1,
            ":pending": "PENDING",
            ":now": now,
            ":max": MAX_ATTEMPTS,
          },
        }),
      );
    } catch (error) {
      if (error.name !== "ConditionalCheckFailedException") throw error;
    }

    return response(400, { message: "Invalid or expired recovery code." });
  }

  const resetToken = generateResetToken();
  const resetTokenHash = await hashValue(resetToken, "reset");
  const resetExpiresAt = now + RESET_EXPIRY;

  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: `otp#${emailHash}` },
        UpdateExpression:
          "SET #status = :verified, resetTokenHash = :tokenHash, " +
          "resetExpiresAt = :resetExpiry, ttl = :ttl",
        ConditionExpression:
          "#status = :pending AND expiresAt > :now AND attempts < :max " +
          "AND otpHash = :otpHash",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":verified": "VERIFIED",
          ":pending": "PENDING",
          ":tokenHash": resetTokenHash,
          ":resetExpiry": resetExpiresAt,
          ":ttl": resetExpiresAt + 86400,
          ":now": now,
          ":max": MAX_ATTEMPTS,
          ":otpHash": otpHash,
        },
      }),
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return response(400, { message: "Invalid or expired recovery code." });
    }
    throw error;
  }

  return response(200, {
    message: "Recovery code verified.",
    resetToken,
    expiresIn: RESET_EXPIRY,
  });
}

async function completeRecovery(event) {
  const body = getBody(event);
  const email = normalizeEmail(body.email);
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!validEmail(email) || resetToken.length < 32) {
    return response(400, { message: "Invalid or expired recovery session." });
  }

  if (
    newPassword.length < 8 ||
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    return response(400, {
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.",
    });
  }

  const emailHash = await hashValue(email, "email");
  const resetTokenHash = await hashValue(resetToken, "reset");
  const now = Math.floor(Date.now() / 1000);

  try {
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          challengeId: `otp#${emailHash}`,
          email,
          otpHash,
          status: "PENDING",
          attempts: 0,
          createdAt: now,
          expiresAt: now + OTP_EXPIRY,
          ttl: now + OTP_EXPIRY + 86400,
        },
        ConditionExpression:
          "attribute_not_exists(challengeId) OR expiresAt <= :now OR #status IN (:completed, :expired)",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":now": now,
          ":completed": "COMPLETED",
          ":expired": "EXPIRED",
        },
      }),
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return response(200, genericMessage);
    }

    throw error;
  }

  let passwordUpdated = false;

  try {
    const admin = await isAdministrator(email);

    if (!admin) {
      throw new Error("Administrator verification failed.");
    }

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: newPassword,
        Permanent: true,
      }),
    );

    passwordUpdated = true;

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: `otp#${emailHash}` },
        UpdateExpression:
          "SET #status = :completed REMOVE otpHash, resetTokenHash",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":completed": "COMPLETED",
        },
        ConditionExpression: "#status = :completing",
      }),
    );

    return response(200, {
      message: "Your administrator password has been updated.",
    });
  } catch (error) {
    console.error("Password recovery completion failed:", error.name);

    if (!passwordUpdated) {
      try {
        await dynamo.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { challengeId: `otp#${emailHash}` },
            UpdateExpression: "SET #status = :verified",
            ConditionExpression: "#status = :completing",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":verified": "VERIFIED",
              ":completing": "COMPLETING",
            },
          }),
        );
      } catch (rollbackError) {
        console.error(
          "Recovery challenge rollback failed:",
          rollbackError.name,
        );
      }

      return response(500, {
        message: "We could not update your password. Please try again.",
      });
    }

    // Cognito accepted the password change.
    // Keep the recovery token locked even if final DynamoDB cleanup fails.
    return response(200, {
      message: "Your administrator password has been updated.",
    });
  }
}

export const handler = async (event) => {
  try {
    const method = event.httpMethod || event.requestContext?.http?.method || "";

    const path = event.resource || event.path || event.rawPath || "";

    if (method === "OPTIONS") {
      return response(200, {});
    }

    if (method !== "POST") {
      return response(405, { message: "Method not allowed." });
    }

    if (path.endsWith("/admin/recovery/request")) {
      return await requestRecovery(event);
    }

    if (path.endsWith("/admin/recovery/verify")) {
      return await verifyRecovery(event);
    }

    if (path.endsWith("/admin/recovery/complete")) {
      return await completeRecovery(event);
    }

    return response(404, { message: "Route not found." });
  } catch (error) {
    console.error("Admin recovery request failed:", error.name);

    return response(500, {
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};
