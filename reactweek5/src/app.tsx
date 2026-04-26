import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, logout } from "./authService";
import { getOrCreateCodename } from "./codenameService";
import { useSession } from "./hooks/useSession";
import { SessionLobby } from "./components/SessionLobby";
import { QuizForm } from "./components/QuizForm";
import {
  createSession,
  joinSession,
  endRound,
  nextRound,
} from "./services/sessionService";
import "./App.css";
import LoginForm from "./LoginForm.tsx";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [codename, setCodename] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Game state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useState<string>("");
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  // Real-time session subscription
  const { session } = useSession(sessionId);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const name = getOrCreateCodename(firebaseUser.uid);
        setCodename(name);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle creating a new session
  const handleCreateSession = async () => {
    if (!user || !newSessionName.trim()) return;

    try {
      const newSession = await createSession(
        user.uid,
        codename,
        newSessionName
      );
      setSessionId(newSession.id);
      setShowCreateSession(false);
      setNewSessionName("");
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // Handle joining an existing session
  const handleJoinSession = async () => {
    if (!user || !joinSessionId.trim()) return;

    try {
      await joinSession(joinSessionId, user.uid, codename);
      setSessionId(joinSessionId);
      setJoinSessionId("");
    } catch (error) {
      console.error("Failed to join session:", error);
    }
  };

  // Handle ending current round and showing results
  const handleEndRound = async () => {
    if (!session) return;
    try {
      await endRound(session.id);
    } catch (error) {
      console.error("Failed to end round:", error);
    }
  };

  // Handle moving to next round
  const handleNextRound = async () => {
    if (!session) return;
    try {
      await nextRound(session.id);
    } catch (error) {
      console.error("Failed to start next round:", error);
    }
  };

  // Handle leaving session
  const handleLeaveSession = () => {
    setSessionId(null);
  };

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">
          <p>Ladataan...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="eyebrow">Week 5: Multiplayer Price Guessing Game</p>
          <h1>Hintapeliarvaus</h1>
          <LoginForm />
        </section>
      </main>
    );
  }

  // Main game interface
  if (!sessionId) {
    return (
      <main className="app-shell">
        <section className="card">
          <div className="header-section">
            <div>
              <p className="eyebrow">Week 5: Multiplayer Price Guessing Game</p>
              <h1>Tervetuloa, {codename}!</h1>
            </div>
            <button onClick={() => logout()} className="logout-button">
              Kirjaudu ulos
            </button>
          </div>

          <div className="session-selector">
            {showCreateSession ? (
              <div className="create-session-form">
                <h3>Luo uusi peliistunto</h3>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Istunnon nimi"
                />
                <div className="button-group">
                  <button
                    onClick={handleCreateSession}
                    className="primary-button"
                  >
                    Luo
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSession(false);
                      setNewSessionName("");
                    }}
                    className="secondary-button"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowCreateSession(true)}
                  className="primary-button"
                >
                  Luo uusi peli
                </button>
              </>
            )}

            <div className="divider">tai</div>

            <div className="join-session-form">
              <h3>Liity olemassa olevaan istuntoon</h3>
              <input
                type="text"
                value={joinSessionId}
                onChange={(e) => setJoinSessionId(e.target.value)}
                placeholder="Istunnon tunnus"
              />
              <button onClick={handleJoinSession} className="primary-button">
                Liity
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell">
        <section className="card">
          <p>Ladataan peliä...</p>
        </section>
      </main>
    );
  }

  const isCreator = session.createdBy === user.uid;
  const currentUser = session.players.find((p) => p.id === user.uid);

  // Waiting for players to join
  if (session.status === "waiting") {
    return (
      <main className="app-shell">
        <section className="card">
          <SessionLobby
            sessionId={session.id}
            sessionName={session.sessionName}
            players={session.players}
            currentUserId={user.uid}
            isCreator={isCreator}
            onGameStarted={() => {
              // Game started, session will update via real-time listener
            }}
          />
          <button onClick={handleLeaveSession} className="leave-button">
            Poistu istunnosta
          </button>
        </section>
      </main>
    );
  }

  // Guessing phase
  if (session.status === "guessing") {
    const hasCurrentUserGuessed = currentUser?.guess !== undefined;

    return (
      <main className="app-shell">
        <section className="card">
          <div className="game-header">
            <h2>Kierros {session.currentRound}</h2>
            <button onClick={handleLeaveSession} className="leave-button-small">
              Poistu
            </button>
          </div>

          <QuizForm
            sessionId={session.id}
            players={session.players}
            currentUserId={user.uid}
            productName={session.currentProduct?.title}
            onGuessSubmitted={() => {
              // Check if all players have guessed
              const allGuessed = session.players.every((p) => p.guess !== undefined);
              if (allGuessed && isCreator) {
                // Auto-end round after small delay
                setTimeout(() => handleEndRound(), 1000);
              }
            }}
          />

          {hasCurrentUserGuessed && (
            <div className="guess-submitted">
              <p>✓ Arvaus lähetetty: {currentUser?.guess} €</p>
            </div>
          )}

          {isCreator && session.players.every((p) => p.guess !== undefined) && (
            <div className="creator-controls">
              <button onClick={handleEndRound} className="end-round-button">
                Näytä tulokset
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  // Finished phase - show results
  if (session.status === "finished") {
    return (
      <main className="app-shell">
        <section className="card">
          <div className="game-header">
            <h2>Kierros {session.currentRound} - Tulokset</h2>
            <button onClick={handleLeaveSession} className="leave-button-small">
              Poistu
            </button>
          </div>

          <QuizForm
            sessionId={session.id}
            players={session.players}
            currentUserId={user.uid}
            correctPrice={session.currentProduct?.price}
          />

          {isCreator && (
            <div className="creator-controls">
              <button onClick={handleNextRound} className="next-round-button">
                Seuraava kierros
              </button>
            </div>
          )}

          {!isCreator && (
            <div className="waiting-for-creator">
              <p>Odotetaan pelin luojan aloittavan seuraavan kierroksen...</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return null;
}

export default App;
