import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
const e = import.meta.env;
export const emulated =
  e.DEV &&
  e.VITE_FIREBASE_EMULATORS === "true" &&
  ["localhost", "127.0.0.1"].includes(location.hostname);
export const configured =
  emulated ||
  Boolean(
    e.VITE_FIREBASE_API_KEY &&
    e.VITE_FIREBASE_PROJECT_ID &&
    e.VITE_FIREBASE_AUTH_DOMAIN &&
    e.VITE_FIREBASE_APP_ID,
  );
const app = configured
  ? initializeApp(
      emulated
        ? {
            projectId: "demo-depth-map",
            apiKey: "demo-key",
            authDomain: "localhost",
          }
        : {
            apiKey: e.VITE_FIREBASE_API_KEY,
            projectId: e.VITE_FIREBASE_PROJECT_ID,
            authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
            appId: e.VITE_FIREBASE_APP_ID,
          },
      "community",
    )
  : null;
export const auth = app ? getAuth(app) : null;
export const database = app ? getFirestore(app) : null;
const functions = app ? getFunctions(app, "us-central1") : null;
if (emulated && auth && database && functions) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(database, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export async function act(action: string, payload: unknown = {}) {
  if (!functions) throw new Error("Community accounts are not connected yet.");
  return (await httpsCallable(functions, "community")({ action, payload }))
    .data;
}
export function explain(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password was not accepted.",
    "auth/email-already-in-use":
      "An account already uses this email. Sign in or reset your password.",
    "auth/weak-password": "Use a password with at least 8 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait before trying again.",
    "auth/network-request-failed":
      "Could not reach the account service. Check your connection.",
    "auth/requires-recent-login": "Sign in again before continuing.",
    "permission-denied": "You do not have access to this record.",
  };
  return (
    (code && messages[code]) ||
    (error instanceof Error
      ? error.message.replace(/^Firebase: /, "")
      : "The request could not be completed.")
  );
}
