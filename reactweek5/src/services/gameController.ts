import { Session } from "../types/Session";
import { Player } from "../types/Player";

/**
 * Calculate score for a round (closest guess wins 1 point)
 */
export function calculateRoundScores(
  players: Player[],
  correctPrice: number
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Initialize all scores to 0
  players.forEach((p) => {
    scores[p.id] = 0;
  });

  // Find players who guessed
  const playersWithGuess = players.filter((p) => p.guess !== undefined);

  if (playersWithGuess.length === 0) {
    return scores;
  }

  // Calculate differences and find closest
  const playerDiffs = playersWithGuess.map((p) => ({
    id: p.id,
    guess: p.guess!,
    difference: Math.abs(p.guess! - correctPrice),
  }));

  // Find minimum difference (closest guess)
  const minDifference = Math.min(...playerDiffs.map((p) => p.difference));

  // All players with the minimum difference get 1 point (in case of tie)
  playerDiffs.forEach((p) => {
    if (p.difference === minDifference) {
      scores[p.id] = 1;
    }
  });

  return scores;
}

/**
 * Calculate differences for each player's guess
 */
export function calculateDifferences(
  players: Player[],
  correctPrice: number
): Record<string, number> {
  const differences: Record<string, number> = {};

  players.forEach((p) => {
    if (p.guess !== undefined) {
      differences[p.id] = Math.abs(p.guess - correctPrice);
    }
  });

  return differences;
}

/**
 * Check if all players have made a guess
 */
export function allPlayersGuessed(players: Player[]): boolean {
  return players.length >= 2 && players.every((p) => p.guess !== undefined);
}

/**
 * Get next status based on current status
 */
export function getNextStatus(
  currentStatus: Session["status"]
): Session["status"] {
  if (currentStatus === "waiting") return "guessing";
  if (currentStatus === "guessing") return "finished";
  return "waiting"; // Loop back to waiting for next round
}
