import React, { useState, useEffect } from 'react';
import { Meetup, Court, RosterPlayer, MatchRecord } from '../types';
import { db } from '../lib/db';
import { getCourtTheme, formatDuration } from '../lib/ladderLogic';
import { TimerDisplay } from '../components/TimerDisplay';
import {
  Users,
  Trophy,
  Flame,
  Radio,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';

interface SpectatorViewProps {
  meetupId: string;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({ meetupId }) => {
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'courts' | 'standings' | 'matches'>('courts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const unsubMeetup = db.onMeetup(meetupId, (m) => {
      setMeetup(m);
      setLoading(false);
    });

    const unsubCourts = db.onCourts(meetupId, (cList) => {
      setCourts(cList);
    });

    const unsubRoster = db.onRoster(meetupId, (rList) => {
      setRoster(rList);
    });

    const unsubMatches = db.onMatches(meetupId, (mList) => {
      setMatches(mList);
    });

    return () => {
      unsubMeetup();
      unsubCourts();
      unsubRoster();
      unsubMatches();
    };
  }, [meetupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 mb-4 animate-spin">
          <Activity className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-white mb-1">Connecting to Live Court Feed...</div>
        <div className="text-xs text-slate-400">Listening to real-time court updates</div>
      </div>
    );
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <div className="text-lg font-bold text-white mb-2">Meetup Not Found</div>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          This session may have concluded or the link may be incorrect.
        </p>
        <a
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition"
        >
          Go to Home
        </a>
      </div>
    );
  }

  // Calculate quick stats for standings
  const statsMap = new Map<string, {
    name: string;
    rating: number;
    finalCourt: number;
    wins: number;
    losses: number;
    games: number;
  }>();

  roster.forEach(p => {
    statsMap.set(p.playerId, {
      name: p.name,
      rating: p.rating,
      finalCourt: p.currentCourtQueue,
      wins: 0,
      losses: 0,
      games: 0
    });
  });

  matches.forEach(m => {
    const winners = m.winningTeam === 'A' ? m.teamA : m.teamB;
    const losers = m.winningTeam === 'A' ? m.teamB : m.teamA;

    winners.forEach(p => {
      const s = statsMap.get(p.id);
      if (s) {
        s.wins += 1;
        s.games += 1;
      }
    });

    losers.forEach(p => {
      const s = statsMap.get(p.id);
      if (s) {
        s.losses += 1;
        s.games += 1;
      }
    });
  });

  const rankedLeaderboard = Array.from(statsMap.values()).sort((a, b) => {
    if (a.finalCourt !== b.finalCourt) return a.finalCourt - b.finalCourt;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.rating - a.rating;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto border-x border-slate-900 shadow-2xl">
      {/* Sticky Header with Live Broadcast Indicator */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src="/paddle-ball.svg" alt="PaddleKyu" className="w-7 h-7" />
            <h1 className="text-base font-black text-white tracking-tight truncate max-w-[200px]">
              {meetup.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>LIVE FEED</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('courts')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'courts'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Courts ({courts.length})
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'standings'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'matches'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History ({matches.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* COURTS TAB */}
        {activeTab === 'courts' && (
          <div className="space-y-4">
            {courts.map(court => {
              const theme = getCourtTheme(court.courtNumber);
              const isPlaying = court.status === 'playing' && (court.teamA.length > 0 || court.teamB.length > 0);
              const isDefendersStaged = court.courtNumber === 1 && court.status === 'idle' && court.teamA.length === 1 && court.teamB.length === 1;

              // Queued players for this court
              const stagedIds = new Set(isDefendersStaged ? [court.teamA[0].id, court.teamB[0].id] : []);
              const courtQueue = roster
                .filter(p => p.currentCourtQueue === court.courtNumber && !stagedIds.has(p.playerId))
                .sort((a, b) => a.queueJoinedAt - b.queueJoinedAt);

              const activeQueued = courtQueue.filter(p => p.status === 'active');

              return (
                <div
                  key={court.id}
                  className={`rounded-2xl border bg-gradient-to-b ${theme.bgGradient} ${theme.borderColor} ${theme.glow} overflow-hidden shadow-lg`}
                >
                  {/* Court Header */}
                  <div className="px-4 py-3 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {theme.crown && <span className="text-amber-400 text-sm">👑</span>}
                      <span className="font-black text-white text-base">Court {court.courtNumber}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                        {court.courtNumber === 1 ? 'Top Court' : `Court ${court.courtNumber}`}
                      </span>
                    </div>

                    {isPlaying ? (
                      <TimerDisplay startedAt={court.startedAt} size="sm" />
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                        Next match queued
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Active Match */}
                    {isPlaying ? (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                          Current Matchup
                        </div>
                        <div className="grid grid-cols-2 gap-2 relative">
                          {/* Team A */}
                          <div className="rounded-xl border border-lime-500/30 bg-slate-900/80 p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400 mb-1">
                              Team A
                            </div>
                            <div className="space-y-1">
                              {court.teamA.map(p => (
                                <div key={p.id} className="flex justify-between items-center text-xs font-semibold">
                                  <span className="text-slate-100 truncate pr-1">{p.name}</span>
                                  <span className="text-[10px] font-mono text-lime-300">
                                    {p.rating.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* VS badge */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[9px] font-black text-slate-300 shadow">
                            VS
                          </div>

                          {/* Team B */}
                          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
                              Team B
                            </div>
                            <div className="space-y-1">
                              {court.teamB.map(p => (
                                <div key={p.id} className="flex justify-between items-center text-xs font-semibold">
                                  <span className="text-slate-100 truncate pr-1">{p.name}</span>
                                  <span className="text-[10px] font-mono text-cyan-300">
                                    {p.rating.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isDefendersStaged ? (
                      /* Defending Kings Staged */
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span className="flex items-center gap-1">👑 Defending Champions (Split)</span>
                          <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Awaiting Challengers
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700">
                            <div className="text-[9px] font-bold uppercase text-lime-400">Team A Anchor</div>
                            <div className="font-semibold text-white truncate">{court.teamA[0].name} ({court.teamA[0].rating.toFixed(1)})</div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700">
                            <div className="text-[9px] font-bold uppercase text-cyan-400">Team B Anchor</div>
                            <div className="font-semibold text-white truncate">{court.teamB[0].name} ({court.teamB[0].rating.toFixed(1)})</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                        Court is ready. Admin is staging the next match.
                      </div>
                    )}

                    {/* Court FIFO Queue */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-lime-400" />
                          <span>{isDefendersStaged ? 'Challenger Queue (FIFO)' : 'FIFO Queue'}</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-400">
                          {activeQueued.length} waiting
                        </span>
                      </div>

                      {activeQueued.length === 0 ? (
                        <div className="text-center py-2 text-xs text-slate-500 italic">
                          {isDefendersStaged
                            ? 'Waiting for Court 2 winners to promote...'
                            : `No players currently queued for Court ${court.courtNumber}`}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {activeQueued.map((player, idx) => {
                            const isNextUp = isDefendersStaged ? idx < 2 : idx < 4;
                            return (
                              <div
                                key={player.id}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                                  isNextUp
                                    ? 'bg-slate-900/90 border border-slate-700/60 text-white font-medium'
                                    : 'bg-slate-950/40 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                      isNextUp
                                        ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span className="truncate">{player.name}</span>
                                  {isNextUp && (
                                    <span className="text-[9px] uppercase font-bold text-lime-400 bg-lime-500/10 px-1 py-0.2 rounded">
                                      Up Next
                                    </span>
                                  )}
                                </div>

                                <span className="font-mono text-lime-400/80 text-[10px]">
                                  {player.rating.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STANDINGS TAB */}
        {activeTab === 'standings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Live Player Standings
              </span>
              <span className="text-[11px] text-slate-400">
                Sorted by Court & Wins
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden divide-y divide-slate-800">
              {rankedLeaderboard.map((player, idx) => {
                const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
                const isFirst = idx === 0 && player.wins > 0;

                return (
                  <div
                    key={player.name}
                    className={`p-3 flex items-center justify-between text-xs ${
                      isFirst ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 text-center font-bold text-slate-400 text-[11px]">
                        {idx === 0 ? '👑' : idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{player.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                            {player.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="text-lime-400 font-medium">Court {player.finalCourt}</span>
                          <span className="text-slate-600">•</span>
                          <span>{player.games} games played</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-white">
                        <span className="text-emerald-400">{player.wins}W</span>
                        <span className="text-slate-500 mx-1">-</span>
                        <span className="text-rose-400">{player.losses}L</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {winRate}% win rate
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MATCH HISTORY TAB */}
        {activeTab === 'matches' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Recent Completed Matches
              </span>
              <span className="text-[11px] text-slate-400">
                {matches.length} total
              </span>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matches completed yet. When games finish, results will appear here in real time!
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map(m => {
                  const isTeamAWinner = m.winningTeam === 'A';
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-lime-400">
                          Court {m.courtNumber}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mono-font">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatDuration(m.durationSeconds || 0)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {/* Team A */}
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded-lg ${
                            isTeamAWinner
                              ? 'bg-lime-500/15 border border-lime-500/30 text-lime-300 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isTeamAWinner && <Trophy className="w-3 h-3 text-amber-400" />}
                            <span>Team A: {m.teamA.map(p => p.name).join(' & ')}</span>
                          </div>
                          {isTeamAWinner && <span className="text-[10px] uppercase">Won</span>}
                        </div>

                        {/* Team B */}
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded-lg ${
                            !isTeamAWinner
                              ? 'bg-lime-500/15 border border-lime-500/30 text-lime-300 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {!isTeamAWinner && <Trophy className="w-3 h-3 text-amber-400" />}
                            <span>Team B: {m.teamB.map(p => p.name).join(' & ')}</span>
                          </div>
                          {!isTeamAWinner && <span className="text-[10px] uppercase">Won</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-slate-900 text-center text-[11px] text-slate-500">
        PaddleKyu • Real-time Pickleball Ladder Manager
      </footer>
    </div>
  );
};
