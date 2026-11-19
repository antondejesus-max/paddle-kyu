import React, { useState } from 'react';
import { Court, MatchPlayer, RosterPlayer } from '../types';
import { calculateMatchEndMovement, formatDuration, getCourtTheme } from '../lib/ladderLogic';
import { Trophy, ArrowUp, ArrowDown, X, Timer } from 'lucide-react';
import { db } from '../lib/db';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetupId: string;
  court: Court;
  numCourts: number;
  roster: RosterPlayer[];
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  onClose,
  meetupId,
  court,
  numCourts,
  roster
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const durationSec = court.startedAt ? Math.max(0, Math.floor((Date.now() - court.startedAt) / 1000)) : 0;
  const theme = getCourtTheme(court.courtNumber);

  const winnerDest = Math.max(1, court.courtNumber - 1);
  const loserDest = Math.min(numCourts, court.courtNumber + 1);
  const isCourt1 = court.courtNumber === 1;

  const handleSelectWinner = async (winner: 'A' | 'B') => {
    try {
      setIsSubmitting(true);

      // 1. Calculate movement & mandatory split (Court 1 winners stay and split)
      const { rosterUpdates, stagedCourt } = calculateMatchEndMovement(
        court.courtNumber,
        numCourts,
        court.teamA,
        court.teamB,
        winner,
        true // kingStayOnCourt1 enabled
      );

      // 2. Record match in matches subcollection
      await db.recordMatch(meetupId, {
        courtNumber: court.courtNumber,
        teamA: court.teamA,
        teamB: court.teamB,
        winningTeam: winner,
        durationSeconds: durationSec,
        completedAt: Date.now()
      });

      // 3. Increment gamesPlayed for each of the 4 players
      const rosterMap = new Map(roster.map(r => [r.playerId, r]));

      const finalRosterUpdates = rosterUpdates.map(u => {
        const existing = rosterMap.get(u.playerId);
        const prevGames = existing ? existing.gamesPlayed || 0 : 0;
        return {
          playerId: u.playerId,
          updates: {
            ...u.updates,
            gamesPlayed: prevGames + 1
          }
        };
      });

      // 4. Batch update court and roster (Court 1 keeps winners staged & split!)
      await db.batchUpdateRosterAndCourt(
        meetupId,
        court.courtNumber,
        stagedCourt || {
          status: 'idle',
          startedAt: null,
          teamA: [],
          teamB: []
        },
        finalRosterUpdates
      );

      onClose();
    } catch (err) {
      console.error('Failed to end game', err);
      alert('Error ending game: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTeamPlayers = (team: MatchPlayer[]) => {
    return (
      <div className="space-y-1 my-2">
        {team.map((p) => (
          <div key={p.id} className="flex justify-between items-center text-sm font-semibold">
            <span>{p.name}</span>
            <span className="text-xs font-mono text-lime-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700/50">
              {p.rating.toFixed(1)}
            </span>
          </div>
        ))}
        <div className="text-[11px] text-slate-400 font-mono text-right pt-0.5 border-t border-slate-700/40">
          Combined: {(team.reduce((acc, p) => acc + p.rating, 0)).toFixed(1)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${theme.badgeBg}`}>
            {theme.name}
          </span>
          <div className="flex items-center gap-1 text-xs text-lime-400 mono-font bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
            <Timer className="w-3.5 h-3.5" />
            <span>{formatDuration(durationSec)}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Record Match Result</h2>
        <p className="text-xs text-slate-400 mb-5">
          Tap the winning team. Winners promote (or hold Court 1), losers demote, and partners are strictly split for their next game.
        </p>

        {/* Grid of Teams */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Team A */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-850/80 p-4 flex flex-col justify-between hover:border-lime-500/50 transition">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-lime-400">Team A</span>
                <span className="text-[11px] text-slate-400">Matchup</span>
              </div>
              {renderTeamPlayers(court.teamA)}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => handleSelectWinner('A')}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-lime-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy className="w-4 h-4" />
                <span>Team A Won</span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2">
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>{isCourt1 ? '👑 Stays & Splits on Court 1' : `Wins → Court ${winnerDest}`}</span>
                <span className="text-slate-600">|</span>
                <ArrowDown className="w-3 h-3 text-amber-400" />
                <span>Loses → Court {loserDest}</span>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-850/80 p-4 flex flex-col justify-between hover:border-lime-500/50 transition">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Team B</span>
                <span className="text-[11px] text-slate-400">Matchup</span>
              </div>
              {renderTeamPlayers(court.teamB)}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => handleSelectWinner('B')}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy className="w-4 h-4" />
                <span>Team B Won</span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2">
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>{isCourt1 ? '👑 Stays & Splits on Court 1' : `Wins → Court ${winnerDest}`}</span>
                <span className="text-slate-600">|</span>
                <ArrowDown className="w-3 h-3 text-amber-400" />
                <span>Loses → Court {loserDest}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ladder Rule info pill */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-lime-400 mt-1 shrink-0" />
          <div>
            <span className="text-white font-medium">Ladder Rules Active:</span> Winners advance up, losers drop down. Both pairs are dissolved so neither plays with the same partner next game.
          </div>
        </div>
      </div>
    </div>
  );
};
