import { useState } from "react";
import { useLocation } from "wouter";
import { Session, Player, TeamId } from "../types";
import { generateId } from "../lib/utils";
import { saveSession, setActiveSessionId } from "../lib/storage";
import { TEAM_NAMES } from "../lib/gameLogic";
import { cn } from "../lib/utils";

const TEAM_IDS: TeamId[] = ["white", "black", "rainbow"];

const TEAM_STYLES: Record<TeamId, { card: string; badge: string; label: string }> = {
  white: {
    card: "bg-white border-2 border-gray-200 shadow-sm",
    badge: "bg-gray-100 text-gray-800",
    label: "text-gray-800",
  },
  black: {
    card: "bg-gray-900 border-2 border-gray-700",
    badge: "bg-gray-700 text-white",
    label: "text-white",
  },
  rainbow: {
    card: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 border-2 border-violet-400",
    badge: "bg-white/20 text-white",
    label: "text-white",
  },
};

export default function CreateSession() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [location, setLocation2] = useState("");
  const [duration, setDuration] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignTarget, setAssignTarget] = useState<TeamId | null>(null);

  const unassigned = players.filter((p) => !p.teamId);

  function addPlayer() {
    const trimmed = playerInput.trim();
    if (!trimmed) return;
    setPlayers((prev) => [...prev, { id: generateId(), name: trimmed, teamId: "white" }]);
    setPlayerInput("");
  }

  function assignPlayer(playerId: string, teamId: TeamId) {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, teamId } : p)));
  }

  function removePlayer(playerId: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }

  function handleStart() {
    if (!name.trim()) return;
    const session: Session = {
      id: generateId(),
      name: name.trim(),
      location: location.trim(),
      duration: duration.trim(),
      players,
      matches: [],
      startingTeam1: null,
      startingTeam2: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    saveSession(session);
    setActiveSessionId(session.id);
    setLocation(`/match-setup/${session.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚽</span>
            <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Winner Stays On</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">New Session</h1>
        </div>

        {/* Session Info */}
        <div className="space-y-3 mb-8">
          <div>
            <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase block mb-1.5">Session Name *</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 text-base transition-colors"
              placeholder="e.g. Tuesday Lunch Session"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase block mb-1.5">Location</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 text-sm transition-colors"
                placeholder="e.g. Astro Pitch"
                value={location}
                onChange={(e) => setLocation2(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase block mb-1.5">Duration</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 text-sm transition-colors"
                placeholder="e.g. 1 hour"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Add Players */}
        <div className="mb-6">
          <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase block mb-1.5">Players</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 text-base transition-colors"
              placeholder="Player name..."
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <button
              onClick={addPlayer}
              className="bg-white text-gray-900 font-bold rounded-xl px-5 py-3.5 text-base hover:bg-gray-100 active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        {/* Team Assignment */}
        {players.length > 0 && (
          <div className="space-y-3 mb-8">
            {TEAM_IDS.map((teamId) => {
              const teamPlayers = players.filter((p) => p.teamId === teamId);
              const style = TEAM_STYLES[teamId];
              return (
                <div key={teamId} className={cn("rounded-2xl p-4", style.card)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn("font-bold text-base", style.label)}>{TEAM_NAMES[teamId]}</span>
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", style.badge)}>
                      {teamPlayers.length} players
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {teamPlayers.map((p) => (
                      <div
                        key={p.id}
                        className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium", style.badge)}
                      >
                        <span>{p.name}</span>
                        <button
                          onClick={() => removePlayer(p.id)}
                          className="opacity-60 hover:opacity-100 ml-1 text-xs leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {teamPlayers.length === 0 && (
                      <span className={cn("text-sm opacity-40", style.label)}>No players yet</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick assign UI */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Quick Assign</p>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{player.name}</span>
                    <div className="flex gap-1.5">
                      {TEAM_IDS.map((tid) => (
                        <button
                          key={tid}
                          onClick={() => assignPlayer(player.id, tid)}
                          className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full transition-all",
                            player.teamId === tid
                              ? tid === "white"
                                ? "bg-white text-gray-900"
                                : tid === "black"
                                ? "bg-gray-700 text-white"
                                : "bg-violet-500 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          )}
                        >
                          {tid === "white" ? "W" : tid === "black" ? "B" : "R"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full bg-white text-gray-900 font-bold text-lg rounded-2xl py-5 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
        >
          Start Session
        </button>
      </div>
    </div>
  );
}
