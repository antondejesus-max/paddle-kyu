export interface Player {
  id: string;
  name: string;
  rating: number; // default 2.0, e.g. 2.0 - 5.5
  createdAt: number;
}

export type PlayerStatus = 'active' | 'resting' | 'left';

export interface RosterPlayer {
  id: string; // document id (same as playerId)
  playerId: string;
  name: string;
  rating: number;
  status: PlayerStatus;
  currentCourtQueue: number; // court number they are queuing for (1 to numCourts)
  queueJoinedAt: number; // epoch ms or firestore timestamp
  lastPartnerId: string | null;
  gamesPlayed: number;
}

export interface MatchPlayer {
  id: string;
  name: string;
  rating: number;
}

export type CourtStatus = 'idle' | 'playing';

export interface Court {
  id: string; // usually `court_${courtNumber}`
  courtNumber: number; // 1 is highest / top court
  status: CourtStatus;
  startedAt: number | null; // epoch ms when match began
  teamA: MatchPlayer[]; // 2 players for doubles
  teamB: MatchPlayer[]; // 2 players for doubles
}

export type WinningTeam = 'A' | 'B';

export interface MatchRecord {
  id: string;
  courtNumber: number;
  teamA: MatchPlayer[];
  teamB: MatchPlayer[];
  winningTeam: WinningTeam;
  durationSeconds: number;
  completedAt: number;
}

export type MeetupFormat = 'doubles' | 'singles';
export type GameType = 'ladder';
export type MeetupStatus = 'active' | 'completed';

export interface Meetup {
  id: string;
  name: string;
  date: string;
  numCourts: number;
  format: MeetupFormat;
  gameType: GameType;
  status: MeetupStatus;
  createdAt: number;
  kingStayOnCourt1?: boolean; // When true, Court 1 winners stay on Court 1 and split
}

export interface PlayerStats {
  playerId: string;
  name: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  currentCourtQueue: number;
  status: PlayerStatus;
}
