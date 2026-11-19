import React, { useState } from 'react';
import { Court, RosterPlayer } from '../types';
import { getCourtTheme, pairFourPlayers, pairDefendersWithChallengers } from '../lib/ladderLogic';
import { TimerDisplay } from './TimerDisplay';
import { EndGameModal } from './EndGameModal';
import { Play, CheckCircle2, Users, ArrowRightLeft, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { db } from '../lib/db';

interface CourtCardProps {
  court: Court;
  meetupId: string;
  numCourts: number;
  allRoster: RosterPlayer[];
  activeCourts: Court[];
  isLocked?: boolean;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  court,
  meetupId,
  numCourts,
  allRoster,
  isLocked = false
}) => {
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const theme = getCourtTheme(court.courtNumber);
  const isPlaying = court.status === 'playing' && (court.teamA.length > 0 || court.teamB.length > 0);

  // Get active players currently queued for this court (ordered by FIFO queueJoinedAt)
  const courtQueue = allRoster
    .filter(p => p.currentCourtQueue === court.courtNumber)
    .sort((a, b) => a.queueJoinedAt - b.queueJoinedAt);

  // Active players eligible for match (not resting, not left, not currently playing on any court)
  const playingPlayerIds = new Set<string>();
  // We can track playing player ids across all courts
  // Note: RosterPlayer might still say currentCourtQueue = X, but if they are on a court's teamA/teamB they are playing
  courtQueue.forEach(() => {});

  const activeQueuedPlayers = courtQueue.filter(p => p.status === 'active');
  const restingQueuedPlayers = courtQueue.filter(p => p.status !== 'active');

  // Check if Court 1 has 2 defending winners staged and waiting for 2 challengers
  const isDefendersStaged = court.courtNumber === 1 && court.status === 'idle' && court.teamA.length === 1 && court.teamB.length === 1;
  const stagedPlayerIds = new Set(isDefendersStaged ? [court.teamA[0].id, court.teamB[0].id] : []);
  const availableQueuedPlayers = activeQueuedPlayers.filter(p => !stagedPlayerIds.has(p.playerId));
  const neededPlayers = isDefendersStaged ? 2 : 4;
  const isReadyToLoad = availableQueuedPlayers.length >= neededPlayers;

  // Adjacent courts to borrow from if queue is short
  const adjacentCourtNumbers = [court.courtNumber - 1, court.courtNumber + 1].filter(
    n => n >= 1 && n <= numCourts
  );

  // Find candidate players to borrow from adjacent court queues (longest waiting active player)
  const borrowCandidates = adjacentCourtNumbers.map(adjCourtNum => {
    const adjQueue = allRoster
      .filter(p => p.currentCourtQueue === adjCourtNum && p.status === 'active')
      .sort((a, b) => a.queueJoinedAt - b.queueJoinedAt);
    return {
      courtNumber: adjCourtNum,
      candidate: adjQueue[0] || null
    };
  }).filter(item => item.candidate !== null);

  // Load Next Match Handler
  const handleLoadNextMatch = async () => {
    if (isDefendersStaged) {
      if (availableQueuedPlayers.length < 2) return;
      try {
        setLoadingAction(true);
        const candidates = availableQueuedPlayers.slice(0, 2);
        const { teamA, teamB } = pairDefendersWithChallengers(court.teamA[0], court.teamB[0], candidates);
        const now = Date.now();
        await db.updateCourt(meetupId, court.courtNumber, {
          status: 'playing',
          startedAt: now,
          teamA,
          teamB
        });
      } catch (err) {
        console.error('Error loading challengers:', err);
        alert('Could not stage challengers: ' + (err as Error).message);
      } finally {
        setLoadingAction(false);
      }
      return;
    }

    if (activeQueuedPlayers.length < 4) return;
    try {
      setLoadingAction(true);
      const candidates = activeQueuedPlayers.slice(0, 4);
      const { teamA, teamB } = pairFourPlayers(candidates);

      const now = Date.now();

      // Batch update court to playing
      await db.updateCourt(meetupId, court.courtNumber, {
        status: 'playing',
        startedAt: now,
        teamA,
        teamB
      });
    } catch (err) {
      console.error('Error loading next match:', err);
      alert('Could not stage match: ' + (err as Error).message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Start Game manually if teams staged but not started
  const handleStartGame = async () => {
    try {
      setLoadingAction(true);
      await db.updateCourt(meetupId, court.courtNumber, {
        status: 'playing',
        startedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Reset / Cancel Match
  const handleResetMatch = async () => {
    if (!confirm(`Cancel the current game on Court ${court.courtNumber} and return players to queue?`)) {
      return;
    }
    try {
      setLoadingAction(true);
      await db.updateCourt(meetupId, court.courtNumber, {
        status: 'idle',
        startedAt: null,
        teamA: [],
        teamB: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Borrow Player Handler
  const handleBorrowPlayer = async (player: RosterPlayer) => {
    try {
      setLoadingAction(true);
      await db.updateRosterPlayer(meetupId, player.playerId, {
        currentCourtQueue: court.courtNumber,
        queueJoinedAt: Date.now() // joins queue now
      });
    } catch (err) {
      console.error('Error borrowing player:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      className={`relative rounded-3xl border bg-gradient-to-b ${theme.bgGradient} ${theme.borderColor} ${theme.glow} transition-all duration-200 overflow-hidden flex flex-col justify-between`}
    >
      {/* Top Bar / Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            {theme.crown && (
              <span className="text-amber-400 animate-pulse text-base">👑</span>
            )}
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Court {court.courtNumber}
            </h3>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
          >
            {court.courtNumber === 1 ? 'Top Court' : `Court ${court.courtNumber}`}
          </span>
        </div>

        {/* Status / Timer */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <TimerDisplay startedAt={court.startedAt} size="md" />
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
              Idle
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        {isPlaying ? (
          /* PLAYING VIEW: Current Matchup */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 relative">
              {/* Team A */}
              <div className="rounded-2xl border border-lime-500/30 bg-slate-900/70 p-3 sm:p-4">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-lime-400">Team A</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(court.teamA.reduce((sum, p) => sum + p.rating, 0)).toFixed(1)} avg
                  </span>
                </div>
                <div className="space-y-1.5">
                  {court.teamA.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-100 truncate pr-1">{p.name}</span>
                      <span className="text-[11px] font-mono text-lime-300 bg-lime-500/10 px-1.5 py-0.5 rounded border border-lime-500/20">
                        {p.rating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS Badge in middle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 shadow-md">
                VS
              </div>

              {/* Team B */}
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-3 sm:p-4">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Team B</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(court.teamB.reduce((sum, p) => sum + p.rating, 0)).toFixed(1)} avg
                  </span>
                </div>
                <div className="space-y-1.5">
                  {court.teamB.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-100 truncate pr-1">{p.name}</span>
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {p.rating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* If startedAt is null, show manual Start Game */}
            {!court.startedAt && (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={loadingAction || isLocked}
                className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Start Game Timer</span>
              </button>
            )}

            {/* Action Bar for Playing Match */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndGameModal(true)}
                disabled={isLocked || loadingAction}
                className="flex-1 py-3.5 sm:py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>End Game (Record Winner)</span>
              </button>

              <button
                type="button"
                onClick={handleResetMatch}
                disabled={isLocked || loadingAction}
                title="Cancel match & reset court to idle"
                className="py-3.5 sm:py-4 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          /* IDLE VIEW: Court FIFO Queue & Stage Match Button */
          <div className="space-y-4">
            {/* Defending Champions Banner on Court 1 */}
            {isDefendersStaged && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="text-sm">👑</span> Defending Champions (Split)
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Awaiting 2 Challengers
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400 mb-0.5">Team A Anchor</div>
                    <div className="font-semibold text-white truncate">{court.teamA[0].name}</div>
                    <div className="text-[10px] font-mono text-lime-400/80 mt-0.5">{court.teamA[0].rating.toFixed(1)} rating</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-0.5">Team B Anchor</div>
                    <div className="font-semibold text-white truncate">{court.teamB[0].name}</div>
                    <div className="text-[10px] font-mono text-cyan-400/80 mt-0.5">{court.teamB[0].rating.toFixed(1)} rating</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Users className="w-3.5 h-3.5 text-lime-400" />
                  <span>{isDefendersStaged ? 'Challenger Queue (FIFO)' : 'Court Queue (FIFO)'}</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({availableQueuedPlayers.length} active)
                  </span>
                </div>

                {isReadyToLoad && (
                  <span className="text-[11px] font-semibold text-lime-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ready to load
                  </span>
                )}
              </div>

              {/* FIFO Queue List */}
              {availableQueuedPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                  {isDefendersStaged
                    ? 'Waiting for challengers to arrive from Court 2...'
                    : `Queue is currently empty for Court ${court.courtNumber}.`}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {availableQueuedPlayers.map((player, idx) => {
                    const isNextUp = idx < neededPlayers;
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          isNextUp
                            ? 'bg-slate-900/90 border border-slate-700/80 text-white font-medium'
                            : 'bg-slate-950/50 border border-slate-800/40 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isNextUp
                                ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate">{player.name}</span>
                          {isNextUp && (
                            <span className="text-[10px] uppercase font-bold text-lime-400/90 bg-lime-500/10 px-1.5 py-0.2 rounded">
                              Up Next
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {player.lastPartnerId && (
                            <span
                              className="text-[10px] text-slate-500 hidden sm:inline"
                              title="Partner split rule applied"
                            >
                              Partner Split ✓
                            </span>
                          )}
                          <span className="font-mono text-lime-400/90 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                            {player.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resting players note */}
              {restingQueuedPlayers.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-400/80 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {restingQueuedPlayers.length} resting player(s) bypassed in queue
                  </span>
                </div>
              )}
            </div>

            {/* Edge Case: If not enough players, allow borrowing from adjacent courts */}
            {!isReadyToLoad && borrowCandidates.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Need {neededPlayers - availableQueuedPlayers.length} more player(s). Borrow from adjacent court:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {borrowCandidates.map(item => (
                    <button
                      key={item.candidate!.id}
                      type="button"
                      onClick={() => handleBorrowPlayer(item.candidate!)}
                      disabled={loadingAction || isLocked}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition"
                    >
                      <span>Pull {item.candidate!.name} ({item.candidate!.rating.toFixed(1)}) from Court {item.courtNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Big "Load Next Match" Button */}
            <button
              type="button"
              onClick={handleLoadNextMatch}
              disabled={!isReadyToLoad || isLocked || loadingAction}
              className={`w-full py-4 px-4 rounded-2xl font-bold text-sm sm:text-base shadow-lg transition flex items-center justify-center gap-2 ${
                isReadyToLoad
                  ? 'bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-slate-950 shadow-lime-500/20'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {isDefendersStaged
                  ? isReadyToLoad
                    ? '👑 Load 2 Challengers & Defend Court 1'
                    : `Waiting for 2 Challengers (${availableQueuedPlayers.length}/2)`
                  : isReadyToLoad
                    ? 'Load Next Match (Auto-Balance & Split)'
                    : `Waiting for Players (${availableQueuedPlayers.length}/4)`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* End Game Modal */}
      {showEndGameModal && (
        <EndGameModal
          isOpen={showEndGameModal}
          onClose={() => setShowEndGameModal(false)}
          meetupId={meetupId}
          court={court}
          numCourts={numCourts}
          roster={allRoster}
        />
      )}
    </div>
  );
};
