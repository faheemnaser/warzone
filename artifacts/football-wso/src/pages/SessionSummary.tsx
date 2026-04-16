import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { TeamId, Session } from "../types";
import { getSession } from "../lib/storage";
import { TEAM_NAMES, computeStatsFromHistory } from "../lib/gameLogic";
import { cn } from "../lib/utils";

const ALL_TEAMS: TeamId[] = ["white", "black", "rainbow"];

const TEAM_CARD: Record<TeamId, string> = {
  white: "bg-white text-gray-900",
  black: "bg-gray-900 text-white border border-gray-700",
  rainbow: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white",
};

function teamNames(teams: TeamId[]): string {
  return teams.map((t) => TEAM_NAMES[t]).join(" & ");
}

function findLeaders(
  getValue: (t: TeamId) => number
): { teams: TeamId[]; value: number } {
  const max = Math.max(...ALL_TEAMS.map(getValue));
  return { teams: ALL_TEAMS.filter((t) => getValue(t) === max), value: max };
}

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  return "🥉";
}

export default function SessionSummary() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getSession(params.id).then((s) => setSession(s));
  }, [params.id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    );
  }

  const completedMatches = session.matches.filter((m) => m.result !== null);
  const stats = computeStatsFromHistory(completedMatches);

  const totalMatches = completedMatches.length;
  const draws = completedMatches.filter((m) => m.result === "draw").length;

  const winsLeaders = findLeaders((t) => stats[t].wins);
  const streakLeaders = findLeaders((t) => stats[t].longestStreak);
  const pointsLeaders = findLeaders((t) => stats[t].points);

  // Sort teams by wins DESC, then assign shared ranks
  const sortedTeams = [...ALL_TEAMS].sort((a, b) => stats[b].wins - stats[a].wins);
  const rankMap = new Map<TeamId, number>();
  let rank = 1;
  for (let i = 0; i < sortedTeams.length; i++) {
    if (i > 0 && stats[sortedTeams[i]].wins === stats[sortedTeams[i - 1]].wins) {
      rankMap.set(sortedTeams[i], rankMap.get(sortedTeams[i - 1])!);
    } else {
      rankMap.set(sortedTeams[i], rank);
    }
    rank++;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏁</div>
          <h1 className="text-3xl font-black tracking-tight">Session Over</h1>
          <p className="text-gray-500 mt-1">{session.name}</p>
          {session.location && <p className="text-gray-600 text-sm">{session.location}</p>}
        </div>

        {/* Most Points */}
        {totalMatches > 0 && (
          <div className={cn("rounded-3xl p-6 text-center mb-4",
            pointsLeaders.teams.length === 1
              ? TEAM_CARD[pointsLeaders.teams[0]]
              : "bg-blue-950 border border-blue-800 text-white"
          )}>
            <p className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-1">
              🏆 Most Points{pointsLeaders.teams.length > 1 ? " (Tie)" : ""}
            </p>
            <p className="text-2xl font-black">{teamNames(pointsLeaders.teams)}</p>
            <p className="text-4xl font-black mt-2">{pointsLeaders.value}</p>
            <p className="text-sm opacity-60">points</p>
          </div>
        )}

        {/* Most Wins */}
        {totalMatches > 0 && (
          <div className={cn("rounded-3xl p-6 text-center mb-4",
            winsLeaders.teams.length === 1
              ? TEAM_CARD[winsLeaders.teams[0]]
              : "bg-gray-800 border border-gray-600 text-white"
          )}>
            <p className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-1">
              🥇 Most Wins{winsLeaders.teams.length > 1 ? " (Tie)" : ""}
            </p>
            <p className="text-2xl font-black">{teamNames(winsLeaders.teams)}</p>
            <p className="text-4xl font-black mt-2">{winsLeaders.value}</p>
            <p className="text-sm opacity-60">wins</p>
          </div>
        )}

        {/* Longest Streak */}
        {streakLeaders.value > 0 && (
          <div className="bg-orange-950/60 border border-orange-800/60 rounded-2xl p-4 text-center mb-6">
            <p className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-1">
              🔥 Longest Streak{streakLeaders.teams.length > 1 ? " (Tie)" : ""}
            </p>
            <p className="text-xl font-black text-white">{teamNames(streakLeaders.teams)}</p>
            <p className="text-3xl font-black text-orange-400">{streakLeaders.value}</p>
            <p className="text-xs text-orange-600">consecutive matches</p>
          </div>
        )}

        {/* Team Results */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-4">Team Results</p>
          <div className="space-y-3">
            {sortedTeams.map((t) => {
              const teamRank = rankMap.get(t)!;
              const maxWins = Math.max(...ALL_TEAMS.map((x) => stats[x].wins));
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{rankMedal(teamRank)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{TEAM_NAMES[t]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-300 text-xs font-bold">{stats[t].points}pts</span>
                        <span className="text-white font-black">{stats[t].wins}W</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          t === "white" ? "bg-white" : t === "black" ? "bg-gray-400" : "bg-violet-500"
                        )}
                        style={{ width: `${maxWins > 0 ? (stats[t].wins / maxWins) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    {stats[t].longestStreak > 0 && (
                      <p className="text-xs text-orange-400">🔥{stats[t].longestStreak}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session info */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{totalMatches}</p>
            <p className="text-xs text-gray-500">Matches</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{draws}</p>
            <p className="text-xs text-gray-500">Draws</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{session.players.length}</p>
            <p className="text-xs text-gray-500">Players</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setLocation("/")}
            className="w-full bg-white text-gray-900 font-bold text-lg rounded-2xl py-5 hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg"
          >
            All Sessions
          </button>
          <button
            onClick={() => setLocation(`/live/${session.id}`)}
            className="w-full bg-gray-900 border border-gray-700 text-white font-semibold text-base rounded-2xl py-4 hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            Back to Match
          </button>
        </div>
      </div>
    </div>
  );
}
