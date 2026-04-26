export interface Player {
  id: string; // uid from Firebase
  codename: string;
  score: number;
  guess?: number; // current round guess (undefined if not guessed yet)
  difference?: number; // difference from correct price (calculated after round)
}
