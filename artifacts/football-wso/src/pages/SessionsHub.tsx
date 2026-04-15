import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Session } from "../types";
import { loadSessions, deleteSession } from "../lib/storage";
import { computeStatsFromHistory } from "../lib/gameLogic";

function statusBadge(session: Session) {
  if (session.endedAt) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
        Completed
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
      Live
    </span>
  );
}

function sessionHref(session: Session) {
  if (session.endedAt) return `/summary/${session.id}`;
  if (!session.startingTeam1) return `/match-setup/${session.id}`;
  return `/live/${session.id}`;
}

export default function SessionsHub() {
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const all = await loadSessions();
    const sorted = [...all].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    setSessions(sorted);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const live = sessions.filter((s) => !s.endedAt);
  const completed = sessions.filter((s) => !!s.endedAt);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteSession(id);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚽</span>
              <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Winner Stays On
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          </div>
          <button
            onClick={() => setLocation("/create")}
            className="bg-white text-gray-900 font-bold text-sm rounded-xl px-4 py-2.5 hover:bg-gray-100 active:scale-95 transition-all"
          >
            + New
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-600 text-sm">Loading...</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏟️</p>
            <p className="text-gray-400 font-semibold text-lg mb-1">No sessions yet</p>
            <p className="text-gray-600 text-sm mb-8">Tap "New" to start your first session</p>
            <button
              onClick={() => setLocation("/create")}
              className="bg-white text-gray-900 font-bold text-base rounded-2xl px-8 py-4 hover:bg-gray-100 active:scale-95 transition-all"
            >
              Create Session
            </button>
          </div>
        )}

        {/* Live sessions */}
        {live.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-3">
              Live
            </p>
            <div className="space-y-2">
              {live.map((session) => {
                const completedMatches = session.matches.filter((m) => m.result !== null);
                const stats = computeStatsFromHistory(completedMatches);
                const totalWins = Object.values(stats).reduce((sum, s) => sum + s.wins, 0);
                return (
                  <div
                    key={session.id}
                    onClick={() => setLocation(sessionHref(session))}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-600 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {statusBadge(session)}
                        <span className="font-semibold text-sm truncate">{session.name}</span>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className="text-gray-700 hover:text-red-500 text-xs ml-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {session.location && <span>{session.location}</span>}
                      <span>{totalWins} matches played</span>
                      <span>{session.players.length} players</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed sessions */}
        {completed.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-3">
              Completed
            </p>
            <div className="space-y-2">
              {completed.map((session) => {
                const completedMatches = session.matches.filter((m) => m.result !== null);
                const stats = computeStatsFromHistory(completedMatches);
                const topTeam = (["white", "black", "rainbow"] as const).reduce(
                  (best, t) => (stats[t].wins > stats[best].wins ? t : best),
                  "white" as "white" | "black" | "rainbow"
                );
                const winLabel =
                  topTeam === "white" ? "White" : topTeam === "black" ? "Black" : "Rainbow";
                return (
                  <div
                    key={session.id}
                    onClick={() => setLocation(sessionHref(session))}
                    className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-4 cursor-pointer hover:border-gray-700 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {statusBadge(session)}
                        <span className="font-semibold text-sm text-gray-300 truncate">
                          {session.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className="text-gray-700 hover:text-red-500 text-xs ml-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      {session.location && <span>{session.location}</span>}
                      <span>{completedMatches.length} matches</span>
                      {stats[topTeam].wins > 0 && (
                        <span className="text-gray-500">
                          🥇 {winLabel} ({stats[topTeam].wins}W)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
