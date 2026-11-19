import { Meetup, Court, RosterPlayer, MatchRecord, Player } from '../types';

type Listener<T> = (data: T) => void;

interface AppState {
  players: Record<string, Player>;
  meetups: Record<string, Meetup>;
  rosters: Record<string, Record<string, RosterPlayer>>; // meetupId -> playerId -> RosterPlayer
  courts: Record<string, Record<number, Court>>; // meetupId -> courtNumber -> Court
  matches: Record<string, Record<string, MatchRecord>>; // meetupId -> matchId -> MatchRecord
}

const STORAGE_KEY = 'paddle_kyu_mock_db';

import { INITIAL_PLAYER_LIST } from './seedPlayers';

const initialPlayers: Record<string, Player> = INITIAL_PLAYER_LIST.reduce((acc, p, idx) => {
  const id = `p${idx + 1}`;
  acc[id] = {
    id,
    name: p.name,
    rating: p.rating,
    createdAt: Date.now() - (INITIAL_PLAYER_LIST.length - idx) * 5000
  };
  return acc;
}, {} as Record<string, Player>);

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.players) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not load mock state from storage', e);
  }

  return {
    players: initialPlayers,
    meetups: {},
    rosters: {},
    courts: {},
    matches: {}
  };
}

class MockFirestoreEngine {
  private state: AppState;
  private channel: BroadcastChannel | null = null;

  // Active listeners
  private playersListeners: Set<Listener<Player[]>> = new Set();
  private meetupsListeners: Set<Listener<Meetup[]>> = new Set();
  private meetupListeners: Map<string, Set<Listener<Meetup | null>>> = new Map();
  private rosterListeners: Map<string, Set<Listener<RosterPlayer[]>>> = new Map();
  private courtsListeners: Map<string, Set<Listener<Court[]>>> = new Map();
  private matchesListeners: Map<string, Set<Listener<MatchRecord[]>>> = new Map();

  constructor() {
    this.state = loadInitialState();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('paddle_kyu_sync_channel');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'STATE_UPDATE') {
            this.state = event.data.state;
            this.notifyAll();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available', err);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.state = JSON.parse(e.newValue);
            this.notifyAll();
          } catch (err) {
            console.error(err);
          }
        }
      });
    }
  }

  private saveAndBroadcast() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'STATE_UPDATE', state: this.state });
      } catch (e) {
        console.warn('Broadcast error', e);
      }
    }

    this.notifyAll();
  }

  private notifyAll() {
    // Notify players
    const playersList = Object.values(this.state.players).sort((a, b) => b.rating - a.rating);
    this.playersListeners.forEach(cb => cb(playersList));

    // Notify meetups
    const meetupsList = Object.values(this.state.meetups).sort((a, b) => b.createdAt - a.createdAt);
    this.meetupsListeners.forEach(cb => cb(meetupsList));

    // Notify specific meetup
    this.meetupListeners.forEach((listeners, meetupId) => {
      const meetup = this.state.meetups[meetupId] || null;
      listeners.forEach(cb => cb(meetup));
    });

    // Notify rosters
    this.rosterListeners.forEach((listeners, meetupId) => {
      const rosterMap = this.state.rosters[meetupId] || {};
      const rosterList = Object.values(rosterMap).sort((a, b) => a.queueJoinedAt - b.queueJoinedAt);
      listeners.forEach(cb => cb(rosterList));
    });

    // Notify courts
    this.courtsListeners.forEach((listeners, meetupId) => {
      const courtMap = this.state.courts[meetupId] || {};
      const courtList = Object.values(courtMap).sort((a, b) => a.courtNumber - b.courtNumber);
      listeners.forEach(cb => cb(courtList));
    });

    // Notify matches
    this.matchesListeners.forEach((listeners, meetupId) => {
      const matchMap = this.state.matches[meetupId] || {};
      const matchList = Object.values(matchMap).sort((a, b) => b.completedAt - a.completedAt);
      listeners.forEach(cb => cb(matchList));
    });
  }

  // Subscriptions
  onPlayers(cb: Listener<Player[]>): () => void {
    this.playersListeners.add(cb);
    cb(Object.values(this.state.players).sort((a, b) => b.rating - a.rating));
    return () => { this.playersListeners.delete(cb); };
  }

  onMeetups(cb: Listener<Meetup[]>): () => void {
    this.meetupsListeners.add(cb);
    cb(Object.values(this.state.meetups).sort((a, b) => b.createdAt - a.createdAt));
    return () => { this.meetupsListeners.delete(cb); };
  }

  onMeetup(meetupId: string, cb: Listener<Meetup | null>): () => void {
    if (!this.meetupListeners.has(meetupId)) {
      this.meetupListeners.set(meetupId, new Set());
    }
    const set = this.meetupListeners.get(meetupId)!;
    set.add(cb);
    cb(this.state.meetups[meetupId] || null);
    return () => {
      set.delete(cb);
      if (set.size === 0) this.meetupListeners.delete(meetupId);
    };
  }

  onRoster(meetupId: string, cb: Listener<RosterPlayer[]>): () => void {
    if (!this.rosterListeners.has(meetupId)) {
      this.rosterListeners.set(meetupId, new Set());
    }
    const set = this.rosterListeners.get(meetupId)!;
    set.add(cb);
    const rosterMap = this.state.rosters[meetupId] || {};
    cb(Object.values(rosterMap).sort((a, b) => a.queueJoinedAt - b.queueJoinedAt));
    return () => {
      set.delete(cb);
      if (set.size === 0) this.rosterListeners.delete(meetupId);
    };
  }

  onCourts(meetupId: string, cb: Listener<Court[]>): () => void {
    if (!this.courtsListeners.has(meetupId)) {
      this.courtsListeners.set(meetupId, new Set());
    }
    const set = this.courtsListeners.get(meetupId)!;
    set.add(cb);
    const courtMap = this.state.courts[meetupId] || {};
    cb(Object.values(courtMap).sort((a, b) => a.courtNumber - b.courtNumber));
    return () => {
      set.delete(cb);
      if (set.size === 0) this.courtsListeners.delete(meetupId);
    };
  }

  onMatches(meetupId: string, cb: Listener<MatchRecord[]>): () => void {
    if (!this.matchesListeners.has(meetupId)) {
      this.matchesListeners.set(meetupId, new Set());
    }
    const set = this.matchesListeners.get(meetupId)!;
    set.add(cb);
    const matchMap = this.state.matches[meetupId] || {};
    cb(Object.values(matchMap).sort((a, b) => b.completedAt - a.completedAt));
    return () => {
      set.delete(cb);
      if (set.size === 0) this.matchesListeners.delete(meetupId);
    };
  }

  // Mutations
  async createPlayer(playerData: Omit<Player, 'id' | 'createdAt'>): Promise<Player> {
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newPlayer: Player = {
      ...playerData,
      id,
      createdAt: Date.now()
    };
    this.state.players[id] = newPlayer;
    this.saveAndBroadcast();
    return newPlayer;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
    if (this.state.players[id]) {
      this.state.players[id] = { ...this.state.players[id], ...updates };
      this.saveAndBroadcast();
    }
  }

  async deletePlayer(id: string): Promise<void> {
    delete this.state.players[id];
    this.saveAndBroadcast();
  }

  async resetToDemoPlayers(): Promise<void> {
    this.state.players = { ...initialPlayers };
    this.saveAndBroadcast();
  }

  async createMeetup(
    meetupData: Omit<Meetup, 'id' | 'createdAt'>,
    initialCourts: Court[],
    initialRoster: RosterPlayer[]
  ): Promise<string> {
    const meetupId = 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newMeetup: Meetup = {
      ...meetupData,
      id: meetupId,
      createdAt: Date.now()
    };

    this.state.meetups[meetupId] = newMeetup;

    // Courts
    this.state.courts[meetupId] = {};
    for (const c of initialCourts) {
      this.state.courts[meetupId][c.courtNumber] = c;
    }

    // Roster
    this.state.rosters[meetupId] = {};
    for (const r of initialRoster) {
      this.state.rosters[meetupId][r.playerId] = r;
    }

    this.state.matches[meetupId] = {};

    this.saveAndBroadcast();
    return meetupId;
  }

  async updateCourt(meetupId: string, courtNumber: number, updates: Partial<Court>): Promise<void> {
    if (!this.state.courts[meetupId]) return;
    const current = this.state.courts[meetupId][courtNumber];
    if (current) {
      this.state.courts[meetupId][courtNumber] = { ...current, ...updates };
      this.saveAndBroadcast();
    }
  }

  async updateRosterPlayer(meetupId: string, playerId: string, updates: Partial<RosterPlayer>): Promise<void> {
    if (!this.state.rosters[meetupId]) return;
    const current = this.state.rosters[meetupId][playerId];
    if (current) {
      this.state.rosters[meetupId][playerId] = { ...current, ...updates };
      this.saveAndBroadcast();
    }
  }

  async addRosterPlayer(meetupId: string, player: RosterPlayer): Promise<void> {
    if (!this.state.rosters[meetupId]) {
      this.state.rosters[meetupId] = {};
    }
    this.state.rosters[meetupId][player.playerId] = player;
    this.saveAndBroadcast();
  }

  async recordMatch(meetupId: string, matchData: Omit<MatchRecord, 'id'>): Promise<string> {
    if (!this.state.matches[meetupId]) {
      this.state.matches[meetupId] = {};
    }
    const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const record: MatchRecord = {
      ...matchData,
      id: matchId
    };
    this.state.matches[meetupId][matchId] = record;
    this.saveAndBroadcast();
    return matchId;
  }

  async batchUpdateRosterAndCourt(
    meetupId: string,
    courtNumber: number,
    courtUpdates: Partial<Court>,
    rosterUpdates: { playerId: string; updates: Partial<RosterPlayer> }[]
  ): Promise<void> {
    if (this.state.courts[meetupId] && this.state.courts[meetupId][courtNumber]) {
      this.state.courts[meetupId][courtNumber] = {
        ...this.state.courts[meetupId][courtNumber],
        ...courtUpdates
      };
    }

    if (this.state.rosters[meetupId]) {
      for (const item of rosterUpdates) {
        if (this.state.rosters[meetupId][item.playerId]) {
          this.state.rosters[meetupId][item.playerId] = {
            ...this.state.rosters[meetupId][item.playerId],
            ...item.updates
          };
        }
      }
    }

    this.saveAndBroadcast();
  }

  async endMeetup(meetupId: string): Promise<void> {
    if (this.state.meetups[meetupId]) {
      this.state.meetups[meetupId] = {
        ...this.state.meetups[meetupId],
        status: 'completed'
      };
      this.saveAndBroadcast();
    }
  }

  // Clear all data (demo helper)
  async clearAll(): Promise<void> {
    this.state = {
      players: { ...initialPlayers },
      meetups: {},
      rosters: {},
      courts: {},
      matches: {}
    };
    this.saveAndBroadcast();
  }
}

export const mockEngine = new MockFirestoreEngine();
