import { SessionStatus } from "./SessionStatus";
import { Player } from "./Player";

export interface Session {
  id: string;
  sessionName: string;
  createdBy: string; // uid
  creatorCodename: string;
  status: SessionStatus;
  players: Player[];
  currentRound: number;
  currentProduct?: {
    id: number;
    title: string;
    price: number;
  };
  scores: Record<string, number>; // playerId -> total score
  createdAt: number; // timestamp
  lastActivity: number; // timestamp
}
