import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { TeamId, Session, Match, MatchResult } from "../types";
import { getSession, saveSession } from "../lib/storage";
import {
  TEAM_NAMES,
  computeCurrentFromHistory,
  computeStatsFromHistory,
  recomputeAllMatchesFromHistory,
} from "../lib/gameLogic";
import { generateId, formatTime } from "../lib/utils";
import { cn } from "../lib/utils";

const TIMER_DURATION = 7 * 60;

const TEAM_WIN_BTN: Record<TeamId, string> = {
  white: "bg-white text-gray-900 border-2 border-gray-200 active:bg-gray-100",
  black: "bg-gray-900 text-white border-2 border-gray-600 active:bg-gray-800",
  rainbow: "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 text-white border-2 border-violet-400 active:opacity-90",
};

interface HistoryItemProps {
  match: Match;
  onEdit: (matchId: string, result: MatchResult) => void;
  onDelete: (matchId: string) => void;
}

function HistoryItem({ match, onEdit, onDelete }: HistoryItemProps) {
  const [editing, setEditing] = useState(false);

  const resultLabel =
    match.result === "team1"
      ? `${TEAM_NAMES[match.team1]} Win`
      : match.result === "team2"
      ? `${TEAM_NAMES[match.team2]} Win`
      : "Draw";

  const resultColor =
    match.result === "draw"
      ? "text-yellow-400"
      : match.result === "team1"
      ? match.team1 === "rainbow"
        ? "text-violet-400"
        : match.team1 === "white"
        ? "text-gray-200"
        : "text-gray-400"
      : match.team2 === "rainbow"
      ? "text-violet-400"
      : match.team2 === "white"
      ? "text-gray-200"
      : "text-gray-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-600 font-semibold">#{match.matchNumber}</span>
            <span className="text-xs text-gray-400 truncate">
              {TEAM_NAMES[match.team1]} vs {TEAM_NAMES[match.team2]}
            </span>
          </div>
          <p className={cn("text-sm font-bold", resultColor)}>{resultLabel}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(match.id)}
            className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
          >
            Del
          </button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => { onEdit(match.id, "team1"); setEditing(false); }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            {TEAM_NAMES[match.team1]} Win
          </button>
          <button
            onClick={() => { onEdit(match.id, "team2"); setEditing(false); }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            {TEAM_NAMES[match.team2]} Win
          </button>
          <button
            onClick={() => { onEdit(match.id, "draw"); setEditing(false); }}
            className="text-xs bg-yellow-900/50 hover:bg-yellow-900 text-yellow-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Draw
          </button>
        </div>
      )}
    </div>
  );
}

export default function LiveMatch() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const savingRef = useRef(false);

  // Load session from API
  async function loadSession() {
    if (!params.id || savingRef.current) return;
    const s = await getSession(params.id);
    if (s) setSession(s);
  }

  useEffect(() => {
    loadSession();
  }, [params.id]);

  // Polling for real-time sync (3s interval)
  useEffect(() => {
    if (!params.id) return;
    pollRef.current = setInterval(() => {
      loadSession();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [params.id]);

  const playAlert = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch {}
    try {
      navigator.vibrate?.([200, 100, 200, 100, 400]);
    } catch {}
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            playAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, playAlert]);

  function resetTimer() {
    setTimerRunning(false);
    setTimeLeft(TIMER_DURATION);
  }

  async function persistSession(updated: Session) {
    savingRef.current = true;
    setSession(updated);
    try {
      await saveSession(updated);
    } finally {
      savingRef.current = false;
    }
  }

  async function recordResult(result: MatchResult) {
    if (!session || !session.startingTeam1 || !session.startingTeam2) return;

    const completedMatches = session.matches.filter((m) => m.result !== null);
    const current = computeCurrentFromHistory(completedMatches, session.startingTeam1, session.startingTeam2);
    const pendingMatch = session.matches.find((m) => m.result === null);

    let updatedMatches: Match[];
    if (pendingMatch) {
      updatedMatches = session.matches.map((m) =>
        m.id === pendingMatch.id ? { ...m, result } : m
      );
    } else {
      const newMatch: Match = {
        id: generateId(),
        matchNumber: current.matchNumber,
        team1: current.team1,
        team2: current.team2,
        restingTeam: current.restingTeam,
        result,
        cameFromRestTeam: current.cameFromRestTeam,
      };
      updatedMatches = [...session.matches, newMatch];
    }

    const lastCompleted = updatedMatches.filter((m) => m.result !== null);
    const nextCurrentMatch = computeCurrentFromHistory(lastCompleted, session.startingTeam1, session.startingTeam2);

    const nextPending: Match = {
      id: generateId(),
      matchNumber: nextCurrentMatch.matchNumber,
      team1: nextCurrentMatch.team1,
      team2: nextCurrentMatch.team2,
      restingTeam: nextCurrentMatch.restingTeam,
      result: null,
      cameFromRestTeam: nextCurrentMatch.cameFromRestTeam,
    };

    const finalMatches = [...updatedMatches, nextPending];
    const updated: Session = { ...session, matches: finalMatches };
    await persistSession(updated);
    resetTimer();

    const winningTeam = result === "team1"
      ? lastCompleted[lastCompleted.length - 1]?.team1
      : result === "team2"
      ? lastCompleted[lastCompleted.length - 1]?.team2
      : null;
    setFlash(result === "draw" ? "Draw!" : `${TEAM_NAMES[(winningTeam ?? "white") as TeamId]} Wins!`);
    setTimeout(() => setFlash(null), 2000);
  }

  async function handleEditResult(matchId: string, newResult: MatchResult) {
    if (!session || !session.startingTeam1 || !session.startingTeam2) return;
    const withNewResult = session.matches.map((m) =>
      m.id === matchId ? { ...m, result: newResult } : m
    );
    const completedOnly = withNewResult.filter((m) => m.result !== null);
    const recomputed = recomputeAllMatchesFromHistory(completedOnly, session.startingTeam1, session.startingTeam2);

    const nextCurrent = computeCurrentFromHistory(recomputed, session.startingTeam1, session.startingTeam2);
    const pendingMatch: Match = {
      id: generateId(),
      matchNumber: nextCurrent.matchNumber,
      team1: nextCurrent.team1,
      team2: nextCurrent.team2,
      restingTeam: nextCurrent.restingTeam,
      result: null,
      cameFromRestTeam: nextCurrent.cameFromRestTeam,
    };

    const finalMatches = [...recomputed, pendingMatch];
    const updated: Session = { ...session, matches: finalMatches };
    await persistSession(updated);
  }

  async function handleDeleteMatch(matchId: string) {
    if (!session || !session.startingTeam1 || !session.startingTeam2) return;
    const withoutDeleted = session.matches.filter((m) => m.id !== matchId && m.result !== null);
    const recomputed = recomputeAllMatchesFromHistory(withoutDeleted, session.startingTeam1, session.startingTeam2);

    const nextCurrent = computeCurrentFromHistory(recomputed, session.startingTeam1, session.startingTeam2);
    const pendingMatch: Match = {
      id: generateId(),
      matchNumber: nextCurrent.matchNumber,
      team1: nextCurrent.team1,
      team2: nextCurrent.team2,
      restingTeam: nextCurrent.restingTeam,
      result: null,
      cameFromRestTeam: nextCurrent.cameFromRestTeam,
    };

    const finalMatches = [...recomputed, pendingMatch];
    const updated: Session = { ...session, matches: finalMatches };
    await persistSession(updated);
  }

  async function handleEndSession() {
    if (!session) return;
    const updated: Session = { ...session, endedAt: new Date().toISOString() };
    await persistSession(updated);
    setLocation(`/summary/${session.id}`);
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    );
  }

  if (!session.startingTeam1 || !session.startingTeam2) return null;

  const completedMatches = session.matches.filter((m) => m.result !== null);
  const currentState = computeCurrentFromHistory(completedMatches, session.startingTeam1, session.startingTeam2);
  const stats = computeStatsFromHistory(completedMatches);

  const { team1, team2, restingTeam, matchNumber } = currentState;
  const timerPercent = (timeLeft / TIMER_DURATION) * 100;
  const timerColor = timeLeft <= 30 ? "text-red-400" : timeLeft <= 60 ? "text-yellow-400" : "text-white";
  const timerBg = timeLeft <= 30 ? "#ef4444" : timeLeft <= 60 ? "#eab308" : "#ffffff";

  const streakTeam = Object.entries(stats).find(([, s]) => s.currentStreak >= 2);

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-x-hidden">
      {/* Flash overlay */}
      {flash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl px-10 py-6 text-center">
            <p className="text-3xl font-black text-white">{flash}</p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-300 text-sm transition-colors"
            >
              ←
            </button>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{session.name}</p>
              <p className="text-xs text-gray-600">Match #{matchNumber}</p>
            </div>
          </div>
          <button
            onClick={handleEndSession}
            className="text-xs text-red-500 hover:text-red-400 font-semibold border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-xl transition-all"
          >
            End Session
          </button>
        </div>

        {/* Streak banner */}
        {streakTeam && (
          <div className="bg-orange-950/60 border border-orange-800/60 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-base">🔥</span>
            <span className="text-sm text-orange-300 font-semibold">
              On streak: {TEAM_NAMES[streakTeam[0] as TeamId]} ({streakTeam[1].currentStreak})
            </span>
          </div>
        )}

        {/* Matchup display */}
        <div className="mb-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
            <div className={cn("rounded-2xl p-4 text-center border-2",
              team1 === "white" ? "bg-white text-gray-900 border-gray-200" :
              team1 === "black" ? "bg-gray-900 text-white border-gray-700" :
              "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white border-violet-400"
            )}>
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider mb-1">Playing</p>
              <p className="font-bold text-sm leading-tight">{TEAM_NAMES[team1].replace("Team ", "")}</p>
              <p className="text-lg font-black mt-1">{stats[team1].wins}W</p>
            </div>
            <div className="text-gray-600 font-black text-lg">VS</div>
            <div className={cn("rounded-2xl p-4 text-center border-2",
              team2 === "white" ? "bg-white text-gray-900 border-gray-200" :
              team2 === "black" ? "bg-gray-900 text-white border-gray-700" :
              "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white border-violet-400"
            )}>
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider mb-1">Playing</p>
              <p className="font-bold text-sm leading-tight">{TEAM_NAMES[team2].replace("Team ", "")}</p>
              <p className="text-lg font-black mt-1">{stats[team2].wins}W</p>
            </div>
          </div>

          {/* Resting team */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">💤</span>
              <span className="text-sm text-gray-400">Resting: <span className="text-gray-200 font-semibold">{TEAM_NAMES[restingTeam]}</span></span>
            </div>
            <span className="text-xs text-green-400 font-semibold">⬆️ Next up</span>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Timer</p>
            <button onClick={resetTimer} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Reset
            </button>
          </div>

          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={timerBg}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-3xl font-black tabular-nums", timerColor)}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTimerRunning(true)}
              disabled={timerRunning || timeLeft === 0}
              className="bg-white text-gray-900 font-bold py-3.5 rounded-xl text-sm hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▶ Start
            </button>
            <button
              onClick={() => setTimerRunning(false)}
              disabled={!timerRunning}
              className="bg-gray-800 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⏸ Pause
            </button>
          </div>
        </div>

        {/* Result Buttons */}
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Record Result</p>
          <button
            onClick={() => recordResult("team1")}
            className={cn("w-full rounded-2xl py-5 font-black text-xl active:scale-[0.97] transition-all shadow-lg", TEAM_WIN_BTN[team1])}
          >
            {TEAM_NAMES[team1]} Wins
          </button>
          <button
            onClick={() => recordResult("team2")}
            className={cn("w-full rounded-2xl py-5 font-black text-xl active:scale-[0.97] transition-all shadow-lg", TEAM_WIN_BTN[team2])}
          >
            {TEAM_NAMES[team2]} Wins
          </button>
          <button
            onClick={() => recordResult("draw")}
            className="w-full bg-yellow-500/10 border-2 border-yellow-500/40 text-yellow-400 rounded-2xl py-5 font-black text-xl hover:bg-yellow-500/20 active:scale-[0.97] transition-all"
          >
            Draw
          </button>
        </div>

        {/* Stats Row */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-3">Session Stats</p>
          <div className="grid grid-cols-3 gap-2">
            {(["white", "black", "rainbow"] as TeamId[]).map((t) => (
              <div key={t} className="text-center">
                <div className={cn(
                  "text-xs font-bold px-2 py-1 rounded-lg mb-2",
                  t === "white" ? "bg-white/10 text-white" : t === "black" ? "bg-gray-700 text-gray-200" : "bg-violet-500/20 text-violet-300"
                )}>
                  {TEAM_NAMES[t].replace("Team ", "")}
                </div>
                <p className="text-xl font-black">{stats[t].wins}</p>
                <p className="text-xs text-gray-500">wins</p>
                <p className="text-sm font-bold text-blue-300 mt-0.5">{stats[t].points}pts</p>
                {stats[t].currentStreak > 0 && (
                  <p className="text-xs text-orange-400 font-semibold mt-0.5">🔥{stats[t].currentStreak}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Match History */}
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors mb-3"
          >
            <span className="text-xs font-semibold tracking-wider uppercase">
              Match History ({completedMatches.length})
            </span>
            <span>{showHistory ? "▲" : "▼"}</span>
          </button>

          {showHistory && (
            <div className="space-y-2">
              {completedMatches.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-4">No matches yet</p>
              )}
              {[...completedMatches].reverse().map((match) => (
                <HistoryItem
                  key={match.id}
                  match={match}
                  onEdit={handleEditResult}
                  onDelete={handleDeleteMatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
