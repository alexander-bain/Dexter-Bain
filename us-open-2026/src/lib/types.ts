export type Division = "men" | "women";
export type EntryType = "seed" | "direct" | "wildcard" | "qualifier" | "lucky-loser" | "tbd";
export type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DrawPlayer {
  drawPosition: number;
  name: string;
  countryCode: string | null;
  seed: number | null;
  entryType: EntryType;
}

export interface SourceMetadata {
  sourceName: string;
  sourcePage: string;
  checkedAt: string;
}

export interface OfficialDrawFile {
  division: Division;
  sourceMetadata: SourceMetadata[];
  players: DrawPlayer[];
}

export interface MatchDefinition {
  key: string;
  division: Division;
  round: RoundNumber;
  matchIndex: number;
  sourceOne: number | string;
  sourceTwo: number | string;
}

export type BracketPicks = Record<string, number>;

export interface OfficialResult {
  key: string;
  round: RoundNumber;
  status: "scheduled" | "in_progress" | "completed";
  participantOne: number | null;
  participantTwo: number | null;
  winner: number | null;
}

export interface ScoreSummary {
  points: number;
  maximumPossible: number;
  correctPicks: number;
  scoredPicks: number;
}

export interface LeaderboardRow {
  id: string;
  displayName: string;
  slug: string;
  combinedScore: number;
  maximumPossible: number;
  correctPicks: number;
  submittedAt: string;
}
