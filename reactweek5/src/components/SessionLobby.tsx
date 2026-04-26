import { Player } from "../types/Player";
import { startRound } from "../services/sessionService";
import "./SessionLobby.css";

interface SessionLobbyProps {
  sessionId: string;
  sessionName: string;
  players: Player[];
  currentUserId: string;
  isCreator: boolean;
  onGameStarted?: () => void;
}

export function SessionLobby({
  sessionId,
  sessionName,
  players,
  currentUserId,
  isCreator,
  onGameStarted,
}: SessionLobbyProps) {
  const canStartGame = players.length >= 2;

  const handleStartGame = async () => {
    try {
      await startRound(sessionId);
      onGameStarted?.();
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  return (
    <div className="session-lobby-container">
      <div className="lobby-header">
        <h2>Peliistunto: {sessionName}</h2>
        <p className="session-id">ID: {sessionId}</p>
      </div>

      <div className="players-section">
        <h3>Pelaajat ({players.length}/4)</h3>
        <ul className="players-list">
          {players.map((p) => (
            <li key={p.id} className={p.id === currentUserId ? "current-user" : ""}>
              <span className="codename">{p.codename}</span>
              {p.id === currentUserId && <span className="badge">Sinä</span>}
              {isCreator && p.id !== currentUserId && (
                <span className="you-creator">👑 Luoja</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {players.length < 2 && (
        <div className="waiting-message">
          <p>Odotetaan vähintään {2 - players.length} pelaajan lisää...</p>
        </div>
      )}

      {isCreator && (
        <button
          onClick={handleStartGame}
          disabled={!canStartGame}
          className="start-button"
        >
          {canStartGame ? "Aloita peli" : "Odota muita pelaajia"}
        </button>
      )}

      {!isCreator && (
        <div className="waiting-for-creator">
          <p>Odotetaan pelin luojan aloittavan pelin...</p>
        </div>
      )}

      <div className="share-info">
        <p className="info-label">Jaa tämä istunnon tunnus muille pelaajille:</p>
        <div className="session-code">
          <code>{sessionId}</code>
          <button
            onClick={() => navigator.clipboard.writeText(sessionId)}
            className="copy-button"
          >
            Kopioi
          </button>
        </div>
      </div>
    </div>
  );
}
