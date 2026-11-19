import React from 'react';
import { Meetup, MatchRecord, RosterPlayer } from '../types';
import { Trophy, Award, Medal, Clock, CheckCircle, X, Download } from 'lucide-react';
import { formatDuration } from '../lib/ladderLogic';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetup: Meetup;
  matches: MatchRecord[];
  roster: RosterPlayer[];
  onNewMeetup?: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  meetup,
  matches,
  roster,
  onNewMeetup
}) => {
  if (!isOpen) return null;

  // Calculate player records
  const statsMap = new Map<string, {
    name: string;
    rating: number;
    finalCourt: number;
    wins: number;
    losses: number;
    games: number;
    totalPlayTimeSec: number;
  }>();

  roster.forEach(p => {
    statsMap.set(p.playerId, {
      name: p.name,
      rating: p.rating,
      finalCourt: p.currentCourtQueue,
      wins: 0,
      losses: 0,
      games: 0,
      totalPlayTimeSec: 0
    });
  });

  matches.forEach(m => {
    const winners = m.winningTeam === 'A' ? m.teamA : m.teamB;
    const losers = m.winningTeam === 'A' ? m.teamB : m.teamA;

    winners.forEach(p => {
      const stat = statsMap.get(p.id);
      if (stat) {
        stat.wins += 1;
        stat.games += 1;
        stat.totalPlayTimeSec += m.durationSeconds || 0;
      }
    });

    losers.forEach(p => {
      const stat = statsMap.get(p.id);
      if (stat) {
        stat.losses += 1;
        stat.games += 1;
        stat.totalPlayTimeSec += m.durationSeconds || 0;
      }
    });
  });

  const rankedPlayers = Array.from(statsMap.values()).sort((a, b) => {
    // Rank primary: Lowest court number (Court 1 is highest rank)
    if (a.finalCourt !== b.finalCourt) {
      return a.finalCourt - b.finalCourt;
    }
    // Secondary: Most wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    // Tertiary: Win rate
    const winRateA = a.games > 0 ? a.wins / a.games : 0;
    const winRateB = b.games > 0 ? b.wins / b.games : 0;
    if (winRateB !== winRateA) {
      return winRateB - winRateA;
    }
    return b.rating - a.rating;
  });

  const totalMatchTime = matches.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2 text-amber-400">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Meetup Summary & Leaderboard</h2>
            <p className="text-xs text-slate-400">
              {meetup.name} • {matches.length} Matches Completed
            </p>
          </div>
        </div>

        {/* High-level session stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-center">
            <div className="text-xs text-slate-400 mb-0.5">Total Matches</div>
            <div className="text-lg font-bold text-white mono-font">{matches.length}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-center">
            <div className="text-xs text-slate-400 mb-0.5">Players</div>
            <div className="text-lg font-bold text-lime-400 mono-font">{roster.length}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-center">
            <div className="text-xs text-slate-400 mb-0.5">Court Play Time</div>
            <div className="text-lg font-bold text-cyan-400 mono-font">{formatDuration(totalMatchTime)}</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto pr-1 border border-slate-800 rounded-2xl bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-[11px] uppercase tracking-wider text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3"># Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 text-center">Court</th>
                <th className="py-2.5 px-3 text-center">W - L</th>
                <th className="py-2.5 px-3 text-right">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankedPlayers.map((player, idx) => {
                const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
                const isChampion = idx === 0 && player.wins > 0;

                return (
                  <tr
                    key={player.name}
                    className={`hover:bg-slate-850/50 transition ${
                      isChampion ? 'bg-amber-500/10 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {idx === 0 ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" /> 1st
                          </span>
                        ) : idx === 1 ? (
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Medal className="w-3.5 h-3.5" /> 2nd
                          </span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> 3rd
                          </span>
                        ) : (
                          <span className="text-slate-500 pl-1 font-mono">{idx + 1}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{player.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                          {player.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          player.finalCourt === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Court {player.finalCourt}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono">
                      <span className="text-emerald-400 font-bold">{player.wins}</span>
                      <span className="text-slate-500 mx-1">-</span>
                      <span className="text-rose-400">{player.losses}</span>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                      <span
                        className={`font-semibold ${
                          winRate >= 70
                            ? 'text-emerald-400'
                            : winRate >= 50
                            ? 'text-lime-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {winRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            Back to Dashboard
          </button>

          {onNewMeetup && (
            <button
              onClick={() => {
                onClose();
                onNewMeetup();
              }}
              className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-bold transition shadow-md shadow-lime-500/20"
            >
              Start New Meetup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
