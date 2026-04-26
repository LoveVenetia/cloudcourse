import { useEffect, useState } from "react";
import { Session } from "../types/Session";
import { listenToSession } from "../services/sessionService";

/**
 * Custom hook to listen to real-time session updates
 */
export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToSession(sessionId, (updatedSession) => {
      setSession(updatedSession);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId]);

  return { session, loading, error };
}
