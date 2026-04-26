import { useState } from "react";
import { Player } from "../types/Player";
import { RoundResult } from "./RoundResult";
import { submitGuess } from "../services/sessionService";
import "./QuizForm.css";

interface QuizFormProps {
  sessionId: string;
  players: Player[];
  currentUserId: string;
  productName?: string;
  correctPrice?: number; // Present only in finished status
  onGuessSubmitted?: () => void;
}

export function QuizForm({
  sessionId,
  players,
  currentUserId,
  productName,
  correctPrice,
  onGuessSubmitted,
}: QuizFormProps) {
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show result if round is finished
  if (correctPrice !== undefined) {
    return <RoundResult players={players} correctPrice={correctPrice} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const guessValue = Number(guess);
      if (isNaN(guessValue) || guessValue < 0) {
        throw new Error("Syötä kelvollinen hinta");
      }

      await submitGuess(sessionId, currentUserId, guessValue);
      setGuess("");
      onGuessSubmitted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Virhe arvauksen lähettämisessä";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-form-container">
      <div className="product-info">
        <p className="label">Arvattavan tuotteen nimi:</p>
        <h2>{productName || "Ladataan tuotetta..."}</h2>
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        <div className="form-group">
          <input
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Arvaa hinta (€)"
            disabled={loading}
            required
            step="0.01"
            min="0"
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Lähetetään..." : `Arvaa hinta (${currentUserId})`}
        </button>
      </form>

      <div className="players-guessed">
        <p className="label">Pelaajat jotka ovat arvan­neet:</p>
        <ul>
          {players.map((p) => (
            <li key={p.id}>
              {p.codename}: {p.guess !== undefined ? `${p.guess} €` : "odottaa..."}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
