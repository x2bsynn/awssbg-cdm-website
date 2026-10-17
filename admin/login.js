import { Amplify } from "https://esm.sh/aws-amplify@6";
import { signIn } from "https://esm.sh/aws-amplify@6/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_Z8XPiGmrk",
      userPoolClientId: "7l1jvkjda7pql65kla7kqv4kon",
      loginWith: {
        email: true,
      },
    },
  },
});

const form = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const status = document.getElementById("status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  status.textContent = "Signing in...";
  loginButton.disabled = true;

  try {
    const result = await signIn({
      username: email,
      password,
    });

    if (result.isSignedIn) {
      status.textContent = "Sign-in successful. Opening dashboard...";

      window.location.assign("./dashboard/index.html");
    } else {
      status.textContent =
        "Additional verification is required to complete sign-in.";

      console.info("Additional sign-in step:", result.nextStep.signInStep);
    }
  } catch (error) {
    console.error("Sign-in failed:", error);
    status.textContent =
      "Unable to sign in. Check your credentials or contact an administrator.";
  } finally {
    loginButton.disabled = false;
  }
});
