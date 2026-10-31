import { Amplify } from "https://esm.sh/aws-amplify@6";
import {
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  confirmResetPassword,
} from "https://esm.sh/aws-amplify@6/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_Z8XPiGmrk",
      userPoolClientId: "7l1jvkjda7pql65kla7kqv4kon",
      loginWith: {
        email: true,
        username: true,
      },
    },
  },
});

export {
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  confirmResetPassword,
};