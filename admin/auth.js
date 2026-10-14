
import { UserManager } from "https://esm.sh/oidc-client-ts@3.5.0";

const cognitoAuthConfig = {
  authority:
    "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Z8XPiGmrk",
  client_id: "7l1jvkjda7pql65kla7kqv4kon",
  redirect_uri: "https://awssbg-cdm.live/admin/callback.html",
  response_type: "code",
  scope: "openid email",
};

export const userManager = new UserManager(cognitoAuthConfig);

export async function signIn() {
  await userManager.signinRedirect();
}

export async function handleSignInCallback() {
  return await userManager.signinRedirectCallback();
}

export async function signOut() {
  const metadata = await userManager.metadataService.getMetadata();
  const logoutEndpoint = metadata.end_session_endpoint;

  if (!logoutEndpoint) {
    throw new Error("Cognito logout endpoint is unavailable.");
  }

  const logoutUrl = new URL(logoutEndpoint);
  logoutUrl.searchParams.set("client_id", cognitoAuthConfig.client_id);
  logoutUrl.searchParams.set("logout_uri", "https://awssbg-cdm.live/admin/");

  window.location.assign(logoutUrl.toString());
}
