import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { generateInitialMeetupSetup } from '../lib/ladderLogic';
import { db } from '../lib/db';
import { X, Plus, Sparkles, CheckSquare, Square, Users, Flame, AlertCircle } from 'lucide-react';

interface MeetupSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (meetupId: string) => void;
}

export const MeetupSetupModal: React.FC<MeetupSetupModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [meetupName, setMeetupName] = useState(() => {
    const d = new Date();
    return `Pickleball Ladder - ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  });
  const [numCourts, setNumCourts] = useState<number>(2);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState('3.0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = db.onPlayers((players) => {
      setAvailablePlayers(players);
      // Auto-select all by default if none selected yet
      if (selectedPlayerIds.size === 0 && players.length > 0) {
        setSelectedPlayerIds(new Set(players.map(p => p.id)));
      }
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const minPlayersNeeded = numCourts * 4;
  const selectedCount = selectedPlayerIds.size;
  const hasEnoughPlayers = selectedCount >= minPlayersNeeded;

  const handleTogglePlayer = (id: string) => {
    const next = new Set(selectedPlayerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlayerIds(next);
  };

  const handleSelectAll = () => {
    setSelectedPlayerIds(new Set(availablePlayers.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleAddNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      const created = await db.createPlayer({
        name: newPlayerName.trim(),
        rating: parseFloat(newPlayerRating) || 2.0
      });
      setSelectedPlayerIds(prev => new Set(prev).add(created.id));
      setNewPlayerName('');
    } catch (err) {
      console.error('Failed to create player:', err);
    }
  };

  const handleSeedDemoPlayers = async () => {
    try {
      const count = await db.seedInitialPlayers();
      alert(`Loaded players with default rank 2.0 (${count} new added)!`);
    } catch (err) {
      console.error('Failed to seed players', err);
      alert('Error seeding players: ' + (err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEnoughPlayers) {
      alert(`Please select at least ${minPlayersNeeded} players for ${numCourts} courts.`);
      return;
    }

    try {
      setIsSubmitting(true);

      const chosenPlayers = availablePlayers.filter(p => selectedPlayerIds.has(p.id));

      // Generate rating-balanced seeding and random court assignment
      const { courts, roster } = generateInitialMeetupSetup(chosenPlayers, numCourts);

      const meetupId = await db.createMeetup(
        {
          name: meetupName.trim() || 'Pickleball Ladder Session',
          date: new Date().toISOString(),
          numCourts,
          format: 'doubles',
          gameType: 'ladder',
          status: 'active'
        },
        courts,
        roster
      );

      onCreated(meetupId);
    } catch (err) {
      console.error('Failed to create meetup:', err);
      alert('Error creating meetup: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1 text-lime-400">
          <Flame className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">New Ladder Meetup</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Configure courts and select players. The algorithm pairs players into rating-balanced doubles teams and seeds initial matches.
        </p>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            {/* Meetup Name & Courts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Meetup Name
                </label>
                <input
                  type="text"
                  value={meetupName}
                  onChange={e => setMeetupName(e.target.value)}
                  required
                  placeholder="e.g. Wednesday Night Ladder"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Number of Courts
                </label>
                <select
                  value={numCourts}
                  onChange={e => setNumCourts(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500 font-semibold"
                >
                  <option value={1}>1 Court (4 players)</option>
                  <option value={2}>2 Courts (8+ players)</option>
                  <option value={3}>3 Courts (12+ players)</option>
                  <option value={4}>4 Courts (16+ players)</option>
                  <option value={5}>5 Courts (20+ players)</option>
                  <option value={6}>6 Courts (24+ players)</option>
                </select>
              </div>
            </div>

            {/* Quick Seed Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-400" />
                <span>Populate all 24 players with default Rank 2.0?</span>
              </div>
              <button
                type="button"
                onClick={handleSeedDemoPlayers}
                className="px-3 py-1.5 rounded-lg bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/30 text-lime-300 text-xs font-semibold transition"
              >
                Populate 24 Players
              </button>
            </div>

            {/* Add Player Inline */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Add New Player to Database
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-lime-500"
                />
                <select
                  value={newPlayerRating}
                  onChange={e => setNewPlayerRating(e.target.value)}
                  className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  {[2.0, 2.5, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 5.0].map(r => (
                    <option key={r} value={r.toFixed(1)}>
                      {r.toFixed(1)} rating
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddNewPlayer}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Player Selection List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Users className="w-4 h-4 text-lime-400" />
                  <span>Select Meetup Players ({selectedCount} selected)</span>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-lime-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Requirement Check notice */}
              {!hasEnoughPlayers && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Select at least {minPlayersNeeded} players to populate {numCourts} courts (currently {selectedCount}).
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {availablePlayers.map(player => {
                  const isChecked = selectedPlayerIds.has(player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => handleTogglePlayer(player.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                        isChecked
                          ? 'bg-lime-500/10 border-lime-500/40 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-lime-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-semibold">{player.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-lime-400/90 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {player.rating.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400">
              {selectedCount} players • {numCourts} courts • {Math.max(0, selectedCount - minPlayersNeeded)} in initial queue
            </div>

            <button
              type="submit"
              disabled={!hasEnoughPlayers || isSubmitting}
              className={`py-3 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2 ${
                hasEnoughPlayers && !isSubmitting
                  ? 'bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-lime-500/25 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Start Meetup & Seed Ladder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
