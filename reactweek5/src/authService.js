import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { app, db } from "./firebaseConfig";

export const auth = getAuth(app);
export { db };

/**
 * Kirjautuminen sähköposti + salasana
 */
export const loginWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

/**
 * Käyttäjän rekisteröinti
 */
export const registerWithEmail = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

/**
 * Kirjautuminen ulos
 */
export const logout = async () => {
  await signOut(auth);
};
