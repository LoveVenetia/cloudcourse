import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Session } from "../types/Session";
import { Player } from "../types/Player";
import { fetchRandomProduct } from "./productService";

/**
 * Create a new game session
 */
export async function createSession(
  creatorId: string,
  creatorCodename: string,
  sessionName: string
): Promise<Session> {
  const sessionId = doc(collection(db, "sessions")).id;
  const now = Date.now();

  const newSession: Session = {
    id: sessionId,
    sessionName,
    createdBy: creatorId,
    creatorCodename,
    status: "waiting",
    players: [
      {
        id: creatorId,
        codename: creatorCodename,
        score: 0,
      },
    ],
    currentRound: 1,
    scores: {
      [creatorId]: 0,
    },
    createdAt: now,
    lastActivity: now,
  };

  await setDoc(doc(db, "sessions", sessionId), newSession);
  return newSession;
}

/**
 * Join an existing session
 */
export async function joinSession(
  sessionId: string,
  playerId: string,
  playerCodename: string
): Promise<Session> {
  const sessionRef = doc(db, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Session not found");
  }

  const session = sessionSnap.data() as Session;

  // Check if player already in session
  if (session.players.some((p) => p.id === playerId)) {
    return session;
  }

  // Check player limit (max 4)
  if (session.players.length >= 4) {
    throw new Error("Session is full (max 4 players)");
  }

  // Add player
  const newPlayer: Player = {
    id: playerId,
    codename: playerCodename,
    score: 0,
  };

  await updateDoc(sessionRef, {
    players: arrayUnion(newPlayer),
    scores: {
      ...session.scores,
      [playerId]: 0,
    },
    lastActivity: Date.now(),
  });

  session.players.push(newPlayer);
  session.scores[playerId] = 0;
  session.lastActivity = Date.now();

  return session;
}

/**
 * Transition session to guessing state and fetch a product
 */
export async function startRound(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);

  // Fetch random product
  const product = await fetchRandomProduct();

  // Reset all guesses
  const session = (await getDoc(sessionRef)).data() as Session;
  const playersWithoutGuess = session.players.map((p) => ({
    ...p,
    guess: undefined,
  }));

  await updateDoc(sessionRef, {
    status: "guessing",
    currentProduct: {
      id: product.id,
      title: product.title,
      price: product.price,
    },
    players: playersWithoutGuess,
    lastActivity: Date.now(),
  });
}

/**
 * Submit a player's guess for current round
 */
export async function submitGuess(
  sessionId: string,
  playerId: string,
  guess: number
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  const session = (await getDoc(sessionRef)).data() as Session;

  // Update player guess
  const updatedPlayers = session.players.map((p) =>
    p.id === playerId ? { ...p, guess } : p
  );

  await updateDoc(sessionRef, {
    players: updatedPlayers,
    lastActivity: Date.now(),
  });
}

/**
 * End current round and show results
 */
export async function endRound(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  const session = (await getDoc(sessionRef)).data() as Session;

  if (!session.currentProduct) {
    throw new Error("No current product");
  }

  const correctPrice = session.currentProduct.price;

  // Calculate who won this round and differences
  const playersWithDiff = session.players.map((p) => ({
    ...p,
    difference:
      p.guess !== undefined ? Math.abs(p.guess - correctPrice) : undefined,
  }));

  // Find closest guess(es)
  let minDifference = Infinity;
  playersWithDiff.forEach((p) => {
    if (p.difference !== undefined && p.difference < minDifference) {
      minDifference = p.difference;
    }
  });

  // Award 1 point to closest guesser(s)
  const newScores = { ...session.scores };
  playersWithDiff.forEach((p) => {
    if (p.difference === minDifference) {
      newScores[p.id] = (newScores[p.id] || 0) + 1;
    }
  });

  // Update session
  await updateDoc(sessionRef, {
    status: "finished",
    players: playersWithDiff,
    scores: newScores,
    lastActivity: Date.now(),
  });
}

/**
 * Move to next round (waiting -> guessing)
 */
export async function nextRound(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  const session = (await getDoc(sessionRef)).data() as Session;

  // Reset for next round
  const resetPlayers = session.players.map((p) => ({
    ...p,
    guess: undefined,
    difference: undefined,
  }));

  // Fetch new product
  const product = await fetchRandomProduct();

  await updateDoc(sessionRef, {
    status: "guessing",
    currentRound: session.currentRound + 1,
    currentProduct: {
      id: product.id,
      title: product.title,
      price: product.price,
    },
    players: resetPlayers,
    lastActivity: Date.now(),
  });
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
  return sessionSnap.exists() ? (sessionSnap.data() as Session) : null;
}

/**
 * Listen to session changes in real-time
 */
export function listenToSession(
  sessionId: string,
  onUpdate: (session: Session) => void
): Unsubscribe {
  return onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as Session);
    }
  });
}

/**
 * Get all sessions created by or joined by a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const q = query(collection(db, "sessions"), where("createdBy", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Session);
}
