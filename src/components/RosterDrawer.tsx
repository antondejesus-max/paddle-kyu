import React, { useState } from 'react';
import { RosterPlayer, PlayerStatus, Court } from '../types';
import { X, Search, UserPlus, Check, Moon, LogOut, Play, UserCheck, Shield, ChevronRight } from 'lucide-react';
import { db } from '../lib/db';

interface RosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  meetupId: string;
  roster: RosterPlayer[];
  numCourts: number;
  courts: Court[];
  isLocked?: boolean;
}

export const RosterDrawer: React.FC<RosterDrawerProps> = ({
  isOpen,
  onClose,
  meetupId,
  roster,
  numCourts,
  courts,
  isLocked = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState('3.0');
  const [newPlayerCourt, setNewPlayerCourt] = useState('1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resting' | 'left'>('all');

  if (!isOpen) return null;

  // Identify players currently on a court in an active match
  const playingPlayerIds = new Set<string>();
  courts.forEach(c => {
    if (c.status === 'playing') {
      [...c.teamA, ...c.teamB].forEach(p => playingPlayerIds.add(p.id));
    }
  });

  const handleStatusChange = async (playerId: string, nextStatus: PlayerStatus) => {
    try {
      await db.updateRosterPlayer(meetupId, playerId, {
        status: nextStatus
      });
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleCourtQueueChange = async (playerId: string, nextCourt: number) => {
    try {
      await db.updateRosterPlayer(meetupId, playerId, {
        currentCourtQueue: nextCourt,
        queueJoinedAt: Date.now()
      });
    } catch (e) {
      console.error('Failed to update court queue', e);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      // 1. Create player in global players table
      const created = await db.createPlayer({
        name: newPlayerName.trim(),
        rating: parseFloat(newPlayerRating) || 2.0
      });

      // 2. Add to meetup roster
      const targetCourt = parseInt(newPlayerCourt, 10) || 1;
      await db.addRosterPlayer(meetupId, {
        id: created.id,
        playerId: created.id,
        name: created.name,
        rating: created.rating,
        status: 'active',
        currentCourtQueue: targetCourt,
        queueJoinedAt: Date.now(),
        lastPartnerId: null,
        gamesPlayed: 0
      });

      setNewPlayerName('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add player', err);
    }
  };

  const filteredRoster = roster
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Show playing first, then by court, then queue
      return a.currentCourtQueue - b.currentCourtQueue;
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-lime-400" />
              <span>Player Roster & Status</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle Resting/Left mid-session without restarting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Filters */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={isLocked}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-bold transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
          </div>

          {/* Add Player Form (Collapsible) */}
          {showAddForm && (
            <form onSubmit={handleAddPlayer} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
              <div className="text-xs font-semibold text-lime-400 flex items-center justify-between">
                <span>Add Player Mid-Session</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Player Full Name"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Rating (2.0 - 5.5)
                  </label>
                  <select
                    value={newPlayerRating}
                    onChange={e => setNewPlayerRating(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {[2.0, 2.5, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 5.0].map(r => (
                      <option key={r} value={r.toFixed(1)}>
                        {r.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Initial Court Queue
                  </label>
                  <select
                    value={newPlayerCourt}
                    onChange={e => setNewPlayerCourt(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {Array.from({ length: numCourts }, (_, i) => i + 1).map(c => (
                      <option key={c} value={c}>
                        Court {c} {c === 1 ? '(Top Court)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Save & Add to Queue
              </button>
            </form>
          )}

          {/* Status Filter Pills */}
          <div className="flex gap-1.5 text-[11px]">
            {(['all', 'active', 'resting', 'left'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`capitalize px-2.5 py-1 rounded-lg border font-medium transition ${
                  statusFilter === f
                    ? 'bg-lime-500/15 border-lime-500/50 text-lime-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f} ({roster.filter(p => f === 'all' || p.status === f).length})
              </button>
            ))}
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredRoster.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No players found matching current filter.
            </div>
          ) : (
            filteredRoster.map(player => {
              const isCurrentlyPlaying = playingPlayerIds.has(player.playerId);

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    player.status === 'resting'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      : player.status === 'left'
                      ? 'bg-rose-950/20 border-rose-900/40 text-slate-500 opacity-60'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {player.name}
                      </span>
                      <span className="text-[11px] font-mono text-lime-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {player.rating.toFixed(1)}
                      </span>
                    </div>

                    {isCurrentlyPlaying && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Playing</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span>Court Queue:</span>
                      <select
                        value={player.currentCourtQueue}
                        disabled={isLocked || isCurrentlyPlaying}
                        onChange={e => handleCourtQueueChange(player.playerId, parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200"
                      >
                        {Array.from({ length: numCourts }, (_, i) => i + 1).map(c => (
                          <option key={c} value={c}>
                            Court {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>Games: {player.gamesPlayed || 0}</div>
                  </div>

                  {/* Quick Status Buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/40">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleStatusChange(player.playerId, 'active')}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                        player.status === 'active'
                          ? 'bg-lime-500 text-slate-950 shadow-sm font-bold'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleStatusChange(player.playerId, 'resting')}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                        player.status === 'resting'
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Moon className="w-3 h-3" />
                      <span>Resting</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleStatusChange(player.playerId, 'left')}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                        player.status === 'left'
                          ? 'bg-rose-500 text-white shadow-sm font-bold'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Left</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          Total: {roster.length} players ({roster.filter(p => p.status === 'active').length} active, {roster.filter(p => p.status === 'resting').length} resting, {roster.filter(p => p.status === 'left').length} left)
        </div>
      </div>
    </div>
  );
};
