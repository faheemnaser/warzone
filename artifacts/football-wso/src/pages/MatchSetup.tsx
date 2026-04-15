import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { TeamId, Session } from "../types";
import { getSession, saveSession } from "../lib/storage";
import { TEAM_NAMES, getThirdTeam, ALL_TEAMS } from "../lib/gameLogic";
import { generateId } from "../lib/utils";
import { cn } from "../lib/utils";

const TEAM_BG: Record<TeamId, string> = {
  white: "bg-white text-gray-900 border-gray-200",
  black: "bg-gray-900 text-white border-gray-700",
  rainbow: "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 text-white border-violet-400",
};

const TEAM_SELECTED: Record<TeamId, string> = {
  white: "ring-4 ring-white ring-offset-2 ring-offset-gray-950",
  black: "ring-4 ring-gray-400 ring-offset-2 ring-offset-gray-950",
  rainbow: "ring-4 ring-violet-400 ring-offset-2 ring-offset-gray-950",
};

export default function MatchSetup() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [team1, setTeam1] = useState<TeamId | null>(null);
  const [team2, setTeam2] = useState<TeamId | null>(null);

  useEffect(() => {
    if (params.id) {
      const s = getSession(params.id);
      setSession(s);
      if (s?.startingTeam1 && s?.startingTeam2) {
        setTeam1(s.startingTeam1);
        setTeam2(s.startingTeam2);
      }
    }
  }, [params.id]);

  if (!session) return null;

  const restingTeam = team1 && team2 ? getThirdTeam(team1, team2) : null;

  function handleRandom() {
    const shuffled = [...ALL_TEAMS].sort(() => Math.random() - 0.5);
    setTeam1(shuffled[0]);
    setTeam2(shuffled[1]);
  }

  function handleTeam1Select(t: TeamId) {
    if (team2 === t) setTeam2(null);
    setTeam1(t);
  }

  function handleTeam2Select(t: TeamId) {
    if (team1 === t) setTeam1(null);
    setTeam2(t);
  }

  function handleStart() {
    if (!team1 || !team2 || !session) return;
    const resting = getThirdTeam(team1, team2);
    const updated: Session = {
      ...session,
      startingTeam1: team1,
      startingTeam2: team2,
      matches: [
        {
          id: generateId(),
          matchNumber: 1,
          team1,
          team2,
          restingTeam: resting,
          result: null,
          cameFromRestTeam: resting,
        },
      ],
    };
    saveSession(updated);
    setLocation(`/live/${session.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {/* Header */}
        <button onClick={() => setLocation("/")} className="text-gray-500 text-sm mb-6 flex items-center gap-1 hover:text-gray-300 transition-colors">
          ← Back
        </button>

        <div className="mb-8">
          <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">{session.name}</span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Match Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Choose which 2 teams start on the pitch</p>
        </div>

        {/* Random Button */}
        <button
          onClick={handleRandom}
          className="w-full border-2 border-dashed border-gray-700 rounded-2xl py-4 text-gray-400 font-semibold hover:border-gray-500 hover:text-gray-200 active:scale-[0.98] transition-all mb-8 flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎲</span>
          <span>Randomly Pick Starting Teams</span>
        </button>

        <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-4 text-center">— or choose manually —</p>

        {/* Team 1 Selection */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-3">Team 1 (Playing)</p>
          <div className="grid grid-cols-3 gap-3">
            {ALL_TEAMS.map((t) => (
              <button
                key={t}
                onClick={() => handleTeam1Select(t)}
                className={cn(
                  "border-2 rounded-2xl py-4 font-bold text-sm transition-all active:scale-95",
                  TEAM_BG[t],
                  team1 === t ? TEAM_SELECTED[t] : "opacity-60 hover:opacity-100"
                )}
              >
                {TEAM_NAMES[t].replace("Team ", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Team 2 Selection */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-3">Team 2 (Playing)</p>
          <div className="grid grid-cols-3 gap-3">
            {ALL_TEAMS.map((t) => (
              <button
                key={t}
                onClick={() => handleTeam2Select(t)}
                disabled={team1 === t}
                className={cn(
                  "border-2 rounded-2xl py-4 font-bold text-sm transition-all active:scale-95",
                  TEAM_BG[t],
                  team2 === t ? TEAM_SELECTED[t] : "opacity-60 hover:opacity-100",
                  team1 === t && "opacity-20 cursor-not-allowed"
                )}
              >
                {TEAM_NAMES[t].replace("Team ", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Resting team preview */}
        {restingTeam && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <span className="text-gray-500">💤</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Resting</p>
              <p className="text-white font-bold">{TEAM_NAMES[restingTeam]}</p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!team1 || !team2}
          className="w-full bg-white text-gray-900 font-bold text-lg rounded-2xl py-5 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
