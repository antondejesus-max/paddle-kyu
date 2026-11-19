import { Court, MatchPlayer, Player, RosterPlayer } from '../types';

/**
 * Balanced Initial Seeding:
 * Takes selected players, sorts them by rating (descending),
 * creates rating-balanced doubles teams via snake draft for the initial court matches,
 * assigns them randomly to Courts 1..X,
 * and distributes any leftover players into court queues with sequential timestamps.
 */
export function generateInitialMeetupSetup(
  selectedPlayers: Player[],
  numCourts: number
): { courts: Court[]; roster: RosterPlayer[] } {
  // 1. Sort players by rating descending
  const sorted = [...selectedPlayers].sort((a, b) => b.rating - a.rating);
  const now = Date.now();

  const totalStartingPlayersNeeded = numCourts * 4;
  const startingPlayers = sorted.slice(0, Math.min(sorted.length, totalStartingPlayersNeeded));
  const queuePlayers = sorted.slice(totalStartingPlayersNeeded);

  const numTeams = Math.floor(startingPlayers.length / 2);
  const teams: MatchPlayer[][] = [];

  // Snake draft pairing for balanced doubles
  // Team 0, 1, ..., numTeams-1 get top half
  // Team numTeams-1, ..., 0 get next half
  const half = numTeams;
  for (let i = 0; i < half; i++) {
    teams.push([
      { id: startingPlayers[i].id, name: startingPlayers[i].name, rating: startingPlayers[i].rating }
    ]);
  }
  for (let i = 0; i < half; i++) {
    const playerIndex = half + (half - 1 - i);
    if (playerIndex < startingPlayers.length) {
      teams[i].push({
        id: startingPlayers[playerIndex].id,
        name: startingPlayers[playerIndex].name,
        rating: startingPlayers[playerIndex].rating
      });
    }
  }

  // Shuffle teams for randomized court assignment
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  const courts: Court[] = [];
  const roster: RosterPlayer[] = [];
  const assignedPlayerIds = new Set<string>();

  for (let c = 1; c <= numCourts; c++) {
    const teamA = shuffledTeams[(c - 1) * 2] || [];
    const teamB = shuffledTeams[(c - 1) * 2 + 1] || [];

    const isFullCourt = teamA.length === 2 && teamB.length === 2;

    courts.push({
      id: `court_${c}`,
      courtNumber: c,
      status: isFullCourt ? 'playing' : 'idle',
      startedAt: isFullCourt ? now : null,
      teamA: teamA,
      teamB: teamB
    });

    // Record roster for active players on this court
    [...teamA, ...teamB].forEach(p => {
      assignedPlayerIds.add(p.id);
      roster.push({
        id: p.id,
        playerId: p.id,
        name: p.name,
        rating: p.rating,
        status: 'active',
        currentCourtQueue: c,
        queueJoinedAt: now,
        lastPartnerId: null,
        gamesPlayed: 0
      });
    });
  }

  // Any players from starting who didn't make a complete 4-player court
  const unassignedStarters = startingPlayers.filter(p => !assignedPlayerIds.has(p.id));
  const allQueuePlayers = [...unassignedStarters, ...queuePlayers];

  // Distribute waiting players round-robin across court queues (FIFO order)
  allQueuePlayers.forEach((p, idx) => {
    const targetCourt = (idx % numCourts) + 1;
    roster.push({
      id: p.id,
      playerId: p.id,
      name: p.name,
      rating: p.rating,
      status: 'active',
      currentCourtQueue: targetCourt,
      queueJoinedAt: now + idx * 1000, // staggered so FIFO order is crystal clear
      lastPartnerId: null,
      gamesPlayed: 0
    });
  });

  return { courts, roster };
}

/**
 * Evaluates the 3 possible pairing combinations for 4 players.
 * Strictly prevents pairs where player1.lastPartnerId === player2.id.
 * Balances remaining combinations by rating difference (|sum(teamA) - sum(teamB)|).
 */
export function pairFourPlayers(
  players: RosterPlayer[]
): { teamA: MatchPlayer[]; teamB: MatchPlayer[] } {
  if (players.length < 4) {
    throw new Error('Need at least 4 players to form a doubles match');
  }

  const [p0, p1, p2, p3] = players.slice(0, 4);

  const toMatchPlayer = (p: RosterPlayer): MatchPlayer => ({
    id: p.playerId,
    name: p.name,
    rating: p.rating
  });

  interface PairingOption {
    teamA: [RosterPlayer, RosterPlayer];
    teamB: [RosterPlayer, RosterPlayer];
    ratingDiff: number;
    hasLastPartnerConflict: boolean;
  }

  const checkConflict = (a: RosterPlayer, b: RosterPlayer): boolean => {
    return a.lastPartnerId === b.playerId || b.lastPartnerId === a.playerId;
  };

  const options: PairingOption[] = [
    // Option 1: (0, 1) vs (2, 3)
    {
      teamA: [p0, p1],
      teamB: [p2, p3],
      ratingDiff: Math.abs((p0.rating + p1.rating) - (p2.rating + p3.rating)),
      hasLastPartnerConflict: checkConflict(p0, p1) || checkConflict(p2, p3)
    },
    // Option 2: (0, 2) vs (1, 3)
    {
      teamA: [p0, p2],
      teamB: [p1, p3],
      ratingDiff: Math.abs((p0.rating + p2.rating) - (p1.rating + p3.rating)),
      hasLastPartnerConflict: checkConflict(p0, p2) || checkConflict(p1, p3)
    },
    // Option 3: (0, 3) vs (1, 2)
    {
      teamA: [p0, p3],
      teamB: [p1, p2],
      ratingDiff: Math.abs((p0.rating + p3.rating) - (p1.rating + p2.rating)),
      hasLastPartnerConflict: checkConflict(p0, p3) || checkConflict(p1, p2)
    }
  ];

  // Filter out any option that violates the lastPartner rule
  const validOptions = options.filter(opt => !opt.hasLastPartnerConflict);

  // Pick the valid option with smallest rating difference
  const chosen = (validOptions.length > 0 ? validOptions : options).sort(
    (a, b) => a.ratingDiff - b.ratingDiff
  )[0];

  return {
    teamA: [toMatchPlayer(chosen.teamA[0]), toMatchPlayer(chosen.teamA[1])],
    teamB: [toMatchPlayer(chosen.teamB[0]), toMatchPlayer(chosen.teamB[1])]
  };
}

/**
 * Pairs 2 defending players (already split on Court 1 into Team A and Team B)
 * with 2 incoming challengers from the queue.
 * Strictly prevents last partner pairing with challengers and balances rating.
 */
export function pairDefendersWithChallengers(
  defA: MatchPlayer,
  defB: MatchPlayer,
  challengers: RosterPlayer[]
): { teamA: MatchPlayer[]; teamB: MatchPlayer[] } {
  if (challengers.length < 2) {
    throw new Error('Need at least 2 challengers to complete Court 1 match');
  }

  const c0 = challengers[0];
  const c1 = challengers[1];

  const toMatchPlayer = (p: RosterPlayer): MatchPlayer => ({
    id: p.playerId,
    name: p.name,
    rating: p.rating
  });

  const checkConflict = (defId: string, chal: RosterPlayer) => {
    return chal.lastPartnerId === defId;
  };

  // Option 1: defA + c0 vs defB + c1
  const option1 = {
    teamA: [defA, toMatchPlayer(c0)],
    teamB: [defB, toMatchPlayer(c1)],
    diff: Math.abs((defA.rating + c0.rating) - (defB.rating + c1.rating)),
    conflict: checkConflict(defA.id, c0) || checkConflict(defB.id, c1)
  };

  // Option 2: defA + c1 vs defB + c0
  const option2 = {
    teamA: [defA, toMatchPlayer(c1)],
    teamB: [defB, toMatchPlayer(c0)],
    diff: Math.abs((defA.rating + c1.rating) - (defB.rating + c0.rating)),
    conflict: checkConflict(defA.id, c1) || checkConflict(defB.id, c0)
  };

  if (!option1.conflict && option2.conflict) return { teamA: option1.teamA, teamB: option1.teamB };
  if (!option2.conflict && option1.conflict) return { teamA: option2.teamA, teamB: option2.teamB };

  const chosen = option1.diff <= option2.diff ? option1 : option2;
  return { teamA: chosen.teamA, teamB: chosen.teamB };
}

/**
 * Calculates promotion / demotion movement after a match ends:
 * - When Court 1 ends and kingStayOnCourt1 is true:
 *     Winners STAY ON Court 1, split (one on Team A, one on Team B), awaiting 2 challengers.
 *     Losers move down to Court 2 queue.
 * - On other courts:
 *     Winners move to Math.max(1, courtNumber - 1)
 *     Losers move to Math.min(numCourts, courtNumber + 1)
 * - Mandatory Split: lastPartnerId set to partner
 */
export function calculateMatchEndMovement(
  courtNumber: number,
  numCourts: number,
  teamA: MatchPlayer[],
  teamB: MatchPlayer[],
  winningTeam: 'A' | 'B',
  kingStayOnCourt1: boolean = true
): {
  rosterUpdates: {
    playerId: string;
    updates: Partial<RosterPlayer>;
  }[];
  stagedCourt?: Partial<Court>;
} {
  const winners = winningTeam === 'A' ? teamA : teamB;
  const losers = winningTeam === 'A' ? teamB : teamA;

  const now = Date.now();
  const rosterUpdates: { playerId: string; updates: Partial<RosterPlayer> }[] = [];

  // Court 1 King of the Court special rule: Winners stay and split
  if (courtNumber === 1 && kingStayOnCourt1 && winners.length >= 2) {
    rosterUpdates.push({
      playerId: winners[0].id,
      updates: {
        currentCourtQueue: 1,
        lastPartnerId: winners[1].id,
        queueJoinedAt: now
      }
    });
    rosterUpdates.push({
      playerId: winners[1].id,
      updates: {
        currentCourtQueue: 1,
        lastPartnerId: winners[0].id,
        queueJoinedAt: now + 5
      }
    });

    // Losers demote to Court 2
    if (losers.length >= 2) {
      const loserNextCourt = Math.min(numCourts, 2);
      rosterUpdates.push({
        playerId: losers[0].id,
        updates: {
          currentCourtQueue: loserNextCourt,
          lastPartnerId: losers[1].id,
          queueJoinedAt: now + 10
        }
      });
      rosterUpdates.push({
        playerId: losers[1].id,
        updates: {
          currentCourtQueue: loserNextCourt,
          lastPartnerId: losers[0].id,
          queueJoinedAt: now + 15
        }
      });
    }

    return {
      rosterUpdates,
      stagedCourt: {
        status: 'idle',
        startedAt: null,
        teamA: [winners[0]],
        teamB: [winners[1]]
      }
    };
  }

  // Standard movement for other courts (or if kingStayOnCourt1 is disabled)
  const winnerNextCourt = Math.max(1, courtNumber - 1);
  const loserNextCourt = Math.min(numCourts, courtNumber + 1);

  // Winners
  if (winners.length >= 2) {
    rosterUpdates.push({
      playerId: winners[0].id,
      updates: {
        currentCourtQueue: winnerNextCourt,
        lastPartnerId: winners[1].id,
        queueJoinedAt: now
      }
    });
    rosterUpdates.push({
      playerId: winners[1].id,
      updates: {
        currentCourtQueue: winnerNextCourt,
        lastPartnerId: winners[0].id,
        queueJoinedAt: now + 10
      }
    });
  }

  // Losers
  if (losers.length >= 2) {
    rosterUpdates.push({
      playerId: losers[0].id,
      updates: {
        currentCourtQueue: loserNextCourt,
        lastPartnerId: losers[1].id,
        queueJoinedAt: now + 20
      }
    });
    rosterUpdates.push({
      playerId: losers[1].id,
      updates: {
        currentCourtQueue: loserNextCourt,
        lastPartnerId: losers[0].id,
        queueJoinedAt: now + 30
      }
    });
  }

  return {
    rosterUpdates,
    stagedCourt: {
      status: 'idle',
      startedAt: null,
      teamA: [],
      teamB: []
    }
  };
}

/**
 * Formats seconds into MM:SS string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Court colors and badges helper
 */
export function getCourtTheme(courtNumber: number) {
  if (courtNumber === 1) {
    return {
      name: 'Court 1 - Top Court',
      badge: 'Gold / King',
      bgGradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-500/60',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      accentColor: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      crown: true
    };
  }
  if (courtNumber === 2) {
    return {
      name: `Court ${courtNumber}`,
      badge: 'Contender',
      bgGradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      accentColor: 'text-emerald-400',
      glow: '',
      crown: false
    };
  }
  if (courtNumber === 3) {
    return {
      name: `Court ${courtNumber}`,
      badge: 'Challenger',
      bgGradient: 'from-blue-500/15 via-indigo-500/5 to-transparent',
      borderColor: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      accentColor: 'text-blue-400',
      glow: '',
      crown: false
    };
  }
  return {
    name: `Court ${courtNumber}`,
    badge: 'Ladder Court',
    bgGradient: 'from-slate-700/20 via-slate-800/10 to-transparent',
    borderColor: 'border-slate-700',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    accentColor: 'text-slate-300',
    glow: '',
    crown: false
  };
}
