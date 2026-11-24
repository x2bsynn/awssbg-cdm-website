
import { UserManager } from "oidc-client-ts";

const baseUrl = window.location.origin;

const cognitoAuthConfig = {
  authority:
    "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Z8XPiGmrk",
  client_id: "7l1jvkjda7pql65kla7kqv4kon",
  redirect_uri: `${baseUrl}/admin/callback.html`,
  response_type: "code",
  scope: "openid email profile",
  post_logout_redirect_uri: `${baseUrl}/admin/`,
};

export const userManager = new UserManager(cognitoAuthConfig);

export async function signIn() {
  await userManager.clearStaleState();
  await userManager.signinRedirect();
}

export async function handleSignInCallback() {
  return await userManager.signinRedirectCallback();
}

export async function signOut() {
  await userManager.signoutRedirect();
}
