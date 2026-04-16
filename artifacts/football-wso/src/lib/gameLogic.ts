import { TeamId, Match, MatchResult, DerivedState, TeamStats } from "../types";

export const TEAM_NAMES: Record<TeamId, string> = {
  white: "Team White",
  black: "Team Black",
  rainbow: "Team Rainbow",
};

export const TEAM_COLORS: Record<TeamId, { bg: string; text: string; border: string; dot: string }> = {
  white: {
    bg: "bg-white",
    text: "text-gray-900",
    border: "border-gray-200",
    dot: "bg-gray-800",
  },
  black: {
    bg: "bg-gray-900",
    text: "text-white",
    border: "border-gray-700",
    dot: "bg-gray-100",
  },
  rainbow: {
    bg: "bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400",
    text: "text-white",
    border: "border-violet-400",
    dot: "bg-white",
  },
};

export const ALL_TEAMS: TeamId[] = ["white", "black", "rainbow"];

export function getThirdTeam(team1: TeamId, team2: TeamId): TeamId {
  return ALL_TEAMS.find((t) => t !== team1 && t !== team2) as TeamId;
}

export function deriveStateFromMatches(
  completedMatches: Match[],
  nextTeam1: TeamId,
  nextTeam2: TeamId,
  nextRestingTeam: TeamId,
  nextCameFromRest: TeamId,
  nextMatchNumber: number
): DerivedState {
  const stats: Record<TeamId, TeamStats> = {
    white: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
    black: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
    rainbow: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
  };

  for (const match of completedMatches) {
    if (match.result === null) continue;
    const winnerTeam = match.result === "team1" ? match.team1 : match.result === "team2" ? match.team2 : null;
    const loserTeam = match.result === "team1" ? match.team2 : match.result === "team2" ? match.team1 : null;

    if (winnerTeam) {
      stats[winnerTeam].wins += 1;
      stats[winnerTeam].points += 3;
      stats[winnerTeam].currentStreak += 1;
      if (stats[winnerTeam].currentStreak > stats[winnerTeam].longestStreak) {
        stats[winnerTeam].longestStreak = stats[winnerTeam].currentStreak;
      }
      if (loserTeam) stats[loserTeam].currentStreak = 0;
    } else {
      // Draw: both playing teams get +1 point; team that came from rest stays on streak
      stats[match.team1].points += 1;
      stats[match.team2].points += 1;
      const stayingTeam = match.cameFromRestTeam;
      const leavingTeam = match.team1 === stayingTeam ? match.team2 : match.team1;
      stats[stayingTeam].currentStreak += 1;
      if (stats[stayingTeam].currentStreak > stats[stayingTeam].longestStreak) {
        stats[stayingTeam].longestStreak = stats[stayingTeam].currentStreak;
      }
      stats[leavingTeam].currentStreak = 0;
    }
  }

  return {
    teamStats: stats,
    currentMatch: {
      team1: nextTeam1,
      team2: nextTeam2,
      restingTeam: nextRestingTeam,
      cameFromRestTeam: nextCameFromRest,
      matchNumber: nextMatchNumber,
    },
  };
}

export function computeNextMatchup(
  prevMatch: Match,
  result: MatchResult
): { team1: TeamId; team2: TeamId; restingTeam: TeamId; cameFromRestTeam: TeamId } {
  const { team1, team2, restingTeam, cameFromRestTeam } = prevMatch;

  if (result === "team1") {
    // team1 wins, stays; team2 goes to rest; restingTeam comes in
    return {
      team1: team1,
      team2: restingTeam,
      restingTeam: team2,
      cameFromRestTeam: restingTeam,
    };
  } else if (result === "team2") {
    // team2 wins, stays; team1 goes to rest; restingTeam comes in
    return {
      team1: team2,
      team2: restingTeam,
      restingTeam: team1,
      cameFromRestTeam: restingTeam,
    };
  } else {
    // Draw: team that came from rest stays; the other goes to rest; restingTeam comes in
    const stayingTeam = cameFromRestTeam;
    const leavingTeam = team1 === stayingTeam ? team2 : team1;
    return {
      team1: stayingTeam,
      team2: restingTeam,
      restingTeam: leavingTeam,
      cameFromRestTeam: restingTeam,
    };
  }
}

export function recomputeAllMatchesFromHistory(
  matches: Match[],
  startingTeam1: TeamId,
  startingTeam2: TeamId
): Match[] {
  if (matches.length === 0) return [];

  const result: Match[] = [];
  let currentTeam1 = startingTeam1;
  let currentTeam2 = startingTeam2;
  let currentRestingTeam = getThirdTeam(startingTeam1, startingTeam2);
  let currentCameFromRest = currentRestingTeam; // first match: restingTeam is whichever started on bench

  for (let i = 0; i < matches.length; i++) {
    const original = matches[i];
    const updatedMatch: Match = {
      ...original,
      matchNumber: i + 1,
      team1: currentTeam1,
      team2: currentTeam2,
      restingTeam: currentRestingTeam,
      cameFromRestTeam: currentCameFromRest,
    };
    result.push(updatedMatch);

    if (original.result !== null) {
      const next = computeNextMatchup(updatedMatch, original.result);
      currentTeam1 = next.team1;
      currentTeam2 = next.team2;
      currentRestingTeam = next.restingTeam;
      currentCameFromRest = next.cameFromRestTeam;
    }
  }

  return result;
}

export function computeCurrentFromHistory(
  matches: Match[],
  startingTeam1: TeamId,
  startingTeam2: TeamId
): { team1: TeamId; team2: TeamId; restingTeam: TeamId; cameFromRestTeam: TeamId; matchNumber: number } {
  let currentTeam1 = startingTeam1;
  let currentTeam2 = startingTeam2;
  let currentRestingTeam = getThirdTeam(startingTeam1, startingTeam2);
  let currentCameFromRest = currentRestingTeam;

  const completedMatches = matches.filter((m) => m.result !== null);

  for (const match of completedMatches) {
    const next = computeNextMatchup(match, match.result!);
    currentTeam1 = next.team1;
    currentTeam2 = next.team2;
    currentRestingTeam = next.restingTeam;
    currentCameFromRest = next.cameFromRestTeam;
  }

  return {
    team1: currentTeam1,
    team2: currentTeam2,
    restingTeam: currentRestingTeam,
    cameFromRestTeam: currentCameFromRest,
    matchNumber: completedMatches.length + 1,
  };
}

export function computeStatsFromHistory(matches: Match[]): Record<TeamId, TeamStats> {
  const stats: Record<TeamId, TeamStats> = {
    white: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
    black: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
    rainbow: { wins: 0, currentStreak: 0, longestStreak: 0, points: 0 },
  };

  const completedMatches = matches.filter((m) => m.result !== null);

  for (const match of completedMatches) {
    const result = match.result!;
    const winnerTeam = result === "team1" ? match.team1 : result === "team2" ? match.team2 : null;
    const loserTeam = result === "team1" ? match.team2 : result === "team2" ? match.team1 : null;

    if (winnerTeam) {
      stats[winnerTeam].wins += 1;
      stats[winnerTeam].points += 3;
      stats[winnerTeam].currentStreak += 1;
      if (stats[winnerTeam].currentStreak > stats[winnerTeam].longestStreak) {
        stats[winnerTeam].longestStreak = stats[winnerTeam].currentStreak;
      }
      if (loserTeam) stats[loserTeam].currentStreak = 0;
    } else {
      // Draw: both playing teams get +1 point
      stats[match.team1].points += 1;
      stats[match.team2].points += 1;
      const stayingTeam = match.cameFromRestTeam;
      const leavingTeam = match.team1 === stayingTeam ? match.team2 : match.team1;
      stats[stayingTeam].currentStreak += 1;
      if (stats[stayingTeam].currentStreak > stats[stayingTeam].longestStreak) {
        stats[stayingTeam].longestStreak = stats[stayingTeam].currentStreak;
      }
      stats[leavingTeam].currentStreak = 0;
    }
  }

  return stats;
}
