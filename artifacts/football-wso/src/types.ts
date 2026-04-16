export type TeamId = "white" | "black" | "rainbow";

export interface Player {
  id: string;
  name: string;
  teamId: TeamId;
}

export interface TeamStats {
  wins: number;
  currentStreak: number;
  longestStreak: number;
  points: number;
}

export type MatchResult = "team1" | "team2" | "draw";

export interface Match {
  id: string;
  matchNumber: number;
  team1: TeamId;
  team2: TeamId;
  restingTeam: TeamId;
  result: MatchResult | null;
  cameFromRestTeam: TeamId;
}

export interface Session {
  id: string;
  name: string;
  location: string;
  duration: string;
  players: Player[];
  matches: Match[];
  startingTeam1: TeamId | null;
  startingTeam2: TeamId | null;
  startedAt: string;
  endedAt: string | null;
}

export interface DerivedState {
  teamStats: Record<TeamId, TeamStats>;
  currentMatch: {
    team1: TeamId;
    team2: TeamId;
    restingTeam: TeamId;
    cameFromRestTeam: TeamId;
    matchNumber: number;
  } | null;
}
