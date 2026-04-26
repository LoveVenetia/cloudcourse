import { useState } from "react";
import { Session } from "../types/Session";

/**
 * Custom hook for managing local game state
 */
export function useGameState(initialSession: Session | null) {
  const [sessionId, setSessionId] = useState<string | null>(
    initialSession?.id || null
  );
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetGuess = () => {
    setCurrentGuess("");
  };

  return {
    sessionId,
    setSessionId,
    currentGuess,
    setCurrentGuess,
    isSubmitting,
    setIsSubmitting,
    resetGuess,
  };
}
