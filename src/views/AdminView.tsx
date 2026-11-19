import React, { useState, useEffect } from 'react';
import { Meetup, Court, RosterPlayer, MatchRecord, Player } from '../types';
import { db } from '../lib/db';
import { CourtCard } from '../components/CourtCard';
import { PinModal } from '../components/PinModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { RosterDrawer } from '../components/RosterDrawer';
import { MeetupSetupModal } from '../components/MeetupSetupModal';
import { SummaryModal } from '../components/SummaryModal';
import { FirebaseConfigModal } from '../components/FirebaseConfigModal';
import { generateInitialMeetupSetup } from '../lib/ladderLogic';
import { INITIAL_PLAYER_LIST } from '../lib/seedPlayers';
import {
  Lock,
  Unlock,
  QrCode,
  Users,
  Trophy,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Database,
  Cloud,
  CheckCircle,
  ExternalLink,
  Flame,
  ChevronRight
} from 'lucide-react';

export const AdminView: React.FC = () => {
  // Admin PIN Protection State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('paddle_admin_authenticated') === 'true';
  });

  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(() => {
    return localStorage.getItem('paddle_active_meetup_id') || null;
  });

  // State from Firestore listeners
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [allMeetups, setAllMeetups] = useState<Meetup[]>([]);

  // Modals state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRosterDrawer, setShowRosterDrawer] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // Load all meetups to pick from or find latest active
  useEffect(() => {
    const unsub = db.onMeetups((meetupsList) => {
      setAllMeetups(meetupsList);
      if (!activeMeetupId && meetupsList.length > 0) {
        const active = meetupsList.find(m => m.status === 'active') || meetupsList[0];
        setActiveMeetupId(active.id);
        localStorage.setItem('paddle_active_meetup_id', active.id);
      }
    });
    return () => unsub();
  }, [activeMeetupId]);

  // Subscribe to active meetup data
  useEffect(() => {
    if (!activeMeetupId) {
      setMeetup(null);
      setCourts([]);
      setRoster([]);
      setMatches([]);
      return;
    }

    const unsubMeetup = db.onMeetup(activeMeetupId, (m) => {
      setMeetup(m);
    });

    const unsubCourts = db.onCourts(activeMeetupId, (cList) => {
      setCourts(cList);
    });

    const unsubRoster = db.onRoster(activeMeetupId, (rList) => {
      setRoster(rList);
    });

    const unsubMatches = db.onMatches(activeMeetupId, (mList) => {
      setMatches(mList);
    });

    return () => {
      unsubMeetup();
      unsubCourts();
      unsubRoster();
      unsubMatches();
    };
  }, [activeMeetupId]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('paddle_admin_authenticated', 'true');
  };

  const handleLockAdmin = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('paddle_admin_authenticated');
  };

  const handleSelectMeetup = (id: string) => {
    setActiveMeetupId(id);
    localStorage.setItem('paddle_active_meetup_id', id);
  };

  const handleMeetupCreated = (newId: string) => {
    setActiveMeetupId(newId);
    localStorage.setItem('paddle_active_meetup_id', newId);
    setShowSetupModal(false);
  };

  // Instant 1-Click Demo / Seed Data Feature with 24 Players
  const handleLaunchInstantDemo = async () => {
    try {
      await db.seedInitialPlayers();

      // Retrieve all 24 players
      const samplePlayers: Player[] = INITIAL_PLAYER_LIST.map((p, idx) => ({
        id: `p_${idx + 1}`,
        name: p.name,
        rating: p.rating,
        createdAt: Date.now() - (24 - idx) * 1000
      }));

      const { courts: seededCourts, roster: seededRoster } = generateInitialMeetupSetup(samplePlayers, 3);

      const newId = await db.createMeetup(
        {
          name: 'Pickleball Ladder (24 Players)',
          date: new Date().toISOString(),
          numCourts: 3,
          format: 'doubles',
          gameType: 'ladder',
          status: 'active'
        },
        seededCourts,
        seededRoster
      );

      handleMeetupCreated(newId);
    } catch (err) {
      console.error('Failed to launch demo:', err);
      alert('Error launching session: ' + (err as Error).message);
    }
  };

  const handleEndMeetup = async () => {
    if (!activeMeetupId) return;
    if (confirm('Are you sure you want to complete this meetup? This will lock further edits and display the final leaderboard.')) {
      try {
        await db.endMeetup(activeMeetupId);
        setShowSummaryModal(true);
      } catch (e) {
        console.error('Failed to complete meetup', e);
      }
    }
  };

  const isCompleted = meetup?.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* PIN Lock Protection */}
      <PinModal
        isOpen={!isAuthenticated}
        onSuccess={handleAuthSuccess}
      />

      {/* Top Tablet-Optimized Court Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Meetup Title */}
          <div className="flex items-center gap-3">
            <img src="/paddle-ball.svg" alt="PaddleKyu" className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {meetup ? meetup.name : 'PaddleKyu Ladder'}
                </h1>
                {meetup && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isCompleted
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-lime-500/20 text-lime-400 border-lime-500/40 animate-pulse'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 'Live Ladder'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Tablet Court Control</span>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => setShowFirebaseModal(true)}
                  className="flex items-center gap-1 hover:text-lime-400 transition"
                  title="Cloud sync / connection status"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span>{db.isFirebase() ? 'Cloud Firestore' : 'Real-Time Sync'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {meetup && (
              <>
                {/* QR Code button */}
                <button
                  onClick={() => setShowQRModal(true)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition"
                  title="Show Spectator QR Code"
                >
                  <QrCode className="w-4 h-4 text-lime-400" />
                  <span className="hidden sm:inline">Spectator QR</span>
                </button>

                {/* Player Roster Drawer button */}
                <button
                  onClick={() => setShowRosterDrawer(true)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition"
                  title="Open Player Roster & Status"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">
                    Roster ({roster.filter(p => p.status === 'active').length})
                  </span>
                </button>

                {/* Leaderboard / Summary button */}
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition"
                  title="View Leaderboard & Stats"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Leaderboard</span>
                </button>

                {/* End Meetup button */}
                {!isCompleted ? (
                  <button
                    onClick={handleEndMeetup}
                    className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>End Meetup</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Results</span>
                  </button>
                )}
              </>
            )}

            {/* New Meetup Button */}
            <button
              onClick={() => setShowSetupModal(true)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-lime-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">New Meetup</span>
            </button>

            {/* Admin Lock Button */}
            <button
              onClick={handleLockAdmin}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Lock Admin Mode"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {!meetup ? (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12">
            <div className="w-20 h-20 rounded-3xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 mb-6 shadow-xl shadow-lime-500/10">
              <Flame className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
              Pickleball Ladder Queue Manager
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-8">
              Automatic balanced seeding, real-time court stopwatch timers, FIFO rotation, and strictly enforced partner splitting.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button
                onClick={() => setShowSetupModal(true)}
                className="flex-1 py-4 px-6 rounded-2xl bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-lime-500/25 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Create New Meetup</span>
              </button>

              <button
                onClick={handleLaunchInstantDemo}
                className="flex-1 py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white border border-slate-700 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-lime-400" />
                <span>Demo / Seed Data</span>
              </button>
            </div>

            {/* Meetup Switcher if meetups exist */}
            {allMeetups.length > 0 && (
              <div className="mt-12 w-full max-w-md text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Existing Sessions:
                </div>
                <div className="space-y-2">
                  {allMeetups.map(m => (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMeetup(m.id)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-slate-500">
                          {m.numCourts} courts • {m.status}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Meetup View: Courts Grid */
          <div className="space-y-6 flex-1 flex flex-col">
            {/* Quick Session Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Courts:</span>
                  <span className="font-bold text-white">{courts.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Total Players:</span>
                  <span className="font-bold text-lime-400">{roster.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Matches Completed:</span>
                  <span className="font-bold text-cyan-400">{matches.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/live/${meetup.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-400 hover:text-lime-400 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Spectator View</span>
                </a>
              </div>
            </div>

            {/* Completed Notice Banner if meetup is finished */}
            {isCompleted && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    This meetup is completed. Scores and statistics are finalized.
                  </span>
                </div>
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg shrink-0"
                >
                  View Final Standings
                </button>
              </div>
            )}

            {/* Courts Grid: 1 col on mobile, 2 col on tablet/desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
              {courts.map(court => (
                <CourtCard
                  key={court.id}
                  court={court}
                  meetupId={meetup.id}
                  numCourts={meetup.numCourts}
                  allRoster={roster}
                  activeCourts={courts}
                  isLocked={isCompleted}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {meetup && (
        <>
          <QRCodeModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            meetupId={meetup.id}
            meetupName={meetup.name}
          />

          <RosterDrawer
            isOpen={showRosterDrawer}
            onClose={() => setShowRosterDrawer(false)}
            meetupId={meetup.id}
            roster={roster}
            numCourts={meetup.numCourts}
            courts={courts}
            isLocked={isCompleted}
          />

          <SummaryModal
            isOpen={showSummaryModal}
            onClose={() => setShowSummaryModal(false)}
            meetup={meetup}
            matches={matches}
            roster={roster}
            onNewMeetup={() => setShowSetupModal(true)}
          />
        </>
      )}

      <MeetupSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onCreated={handleMeetupCreated}
      />

      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />
    </div>
  );
};
