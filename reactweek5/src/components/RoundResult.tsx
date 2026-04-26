import { Player } from "../types/Player";
import "./RoundResult.css";

interface RoundResultProps {
  players: Player[];
  correctPrice: number;
  onNextRound?: () => void;
  isCreator?: boolean;
}

export function RoundResult({
  players,
  correctPrice,
  onNextRound,
  isCreator = false,
}: RoundResultProps) {
  // Sort players by difference (closest first)
  const sortedPlayers = [...players].sort((a, b) => {
    const diffA = a.difference ?? Infinity;
    const diffB = b.difference ?? Infinity;
    return diffA - diffB;
  });

  // Find winner(s)
  const minDifference = Math.min(
    ...sortedPlayers
      .filter((p) => p.difference !== undefined)
      .map((p) => p.difference!)
  );

  return (
    <div className="round-result-container">
      <div className="result-header">
        <h2>Kierroksen tulos</h2>
      </div>

      <div className="correct-price">
        <p className="label">Oikea hinta:</p>
        <h3 className="price">{correctPrice} €</h3>
      </div>

      <div className="results-list">
        <table className="results-table">
          <thead>
            <tr>
              <th>Pelaaja</th>
              <th>Arvaus</th>
              <th>Ero</th>
              <th>Voitto?</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p) => (
              <tr
                key={p.id}
                className={
                  p.difference === minDifference && p.difference !== undefined
                    ? "winner"
                    : ""
                }
              >
                <td>{p.codename}</td>
                <td>{p.guess !== undefined ? `${p.guess} €` : "-"}</td>
                <td>
                  {p.difference !== undefined
                    ? `${p.difference} €`
                    : "Ei arvaus"}
                </td>
                <td>
                  {p.difference === minDifference && p.difference !== undefined
                    ? "🏆"
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="scores">
        <h4>Pisteet tällä hetkellä:</h4>
        <div className="scores-list">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="score-item">
              <span className="codename">{p.codename}</span>
              <span className="score">{p.score} p</span>
            </div>
          ))}
        </div>
      </div>

      {isCreator && onNextRound && (
        <button onClick={onNextRound} className="next-round-button">
          Seuraava kierros
        </button>
      )}
    </div>
  );
}
