import { firebaseApi, initFirebase } from './firebase';
import { mockEngine } from './mockEngine';
import { Meetup, Court, RosterPlayer, MatchRecord, Player } from '../types';
import { FirebaseConfig, saveFirebaseConfig } from './firebaseConfig';

export function isUsingFirebase(): boolean {
  return firebaseApi.isConfigured();
}

export function switchFirebaseConfig(config: FirebaseConfig | null) {
  saveFirebaseConfig(config);
  initFirebase(config);
  window.location.reload();
}

export const db = {
  isFirebase: () => isUsingFirebase(),

  // Players
  onPlayers: (callback: (players: Player[]) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onPlayers(callback);
    }
    return mockEngine.onPlayers(callback);
  },

  createPlayer: async (player: Omit<Player, 'id' | 'createdAt'>): Promise<Player> => {
    if (isUsingFirebase()) {
      return firebaseApi.createPlayer(player);
    }
    return mockEngine.createPlayer(player);
  },

  updatePlayer: async (id: string, updates: Partial<Player>): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.updatePlayer(id, updates);
    }
    return mockEngine.updatePlayer(id, updates);
  },

  deletePlayer: async (id: string): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.deletePlayer(id);
    }
    return mockEngine.deletePlayer(id);
  },

  resetDemoPlayers: async (): Promise<void> => {
    return mockEngine.resetToDemoPlayers();
  },

  seedInitialPlayers: async (): Promise<number> => {
    if (isUsingFirebase()) {
      return firebaseApi.seedInitialPlayers();
    }
    await mockEngine.resetToDemoPlayers();
    return 24;
  },

  // Meetups
  onMeetups: (callback: (meetups: Meetup[]) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onMeetups(callback);
    }
    return mockEngine.onMeetups(callback);
  },

  onMeetup: (meetupId: string, callback: (meetup: Meetup | null) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onMeetup(meetupId, callback);
    }
    return mockEngine.onMeetup(meetupId, callback);
  },

  createMeetup: async (
    meetupData: Omit<Meetup, 'id' | 'createdAt'>,
    initialCourts: Court[],
    initialRoster: RosterPlayer[]
  ): Promise<string> => {
    if (isUsingFirebase()) {
      return firebaseApi.createMeetup(meetupData, initialCourts, initialRoster);
    }
    return mockEngine.createMeetup(meetupData, initialCourts, initialRoster);
  },

  // Courts
  onCourts: (meetupId: string, callback: (courts: Court[]) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onCourts(meetupId, callback);
    }
    return mockEngine.onCourts(meetupId, callback);
  },

  updateCourt: async (meetupId: string, courtNumber: number, updates: Partial<Court>): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.updateCourt(meetupId, courtNumber, updates);
    }
    return mockEngine.updateCourt(meetupId, courtNumber, updates);
  },

  // Roster
  onRoster: (meetupId: string, callback: (roster: RosterPlayer[]) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onRoster(meetupId, callback);
    }
    return mockEngine.onRoster(meetupId, callback);
  },

  updateRosterPlayer: async (meetupId: string, playerId: string, updates: Partial<RosterPlayer>): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.updateRosterPlayer(meetupId, playerId, updates);
    }
    return mockEngine.updateRosterPlayer(meetupId, playerId, updates);
  },

  addRosterPlayer: async (meetupId: string, player: RosterPlayer): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.addRosterPlayer(meetupId, player);
    }
    return mockEngine.addRosterPlayer(meetupId, player);
  },

  // Matches
  onMatches: (meetupId: string, callback: (matches: MatchRecord[]) => void): (() => void) => {
    if (isUsingFirebase()) {
      return firebaseApi.onMatches(meetupId, callback);
    }
    return mockEngine.onMatches(meetupId, callback);
  },

  recordMatch: async (meetupId: string, matchData: Omit<MatchRecord, 'id'>): Promise<string> => {
    if (isUsingFirebase()) {
      return firebaseApi.recordMatch(meetupId, matchData);
    }
    return mockEngine.recordMatch(meetupId, matchData);
  },

  // Batch operations
  batchUpdateRosterAndCourt: async (
    meetupId: string,
    courtNumber: number,
    courtUpdates: Partial<Court>,
    rosterUpdates: { playerId: string; updates: Partial<RosterPlayer> }[]
  ): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.batchUpdateRosterAndCourt(meetupId, courtNumber, courtUpdates, rosterUpdates);
    }
    return mockEngine.batchUpdateRosterAndCourt(meetupId, courtNumber, courtUpdates, rosterUpdates);
  },

  endMeetup: async (meetupId: string): Promise<void> => {
    if (isUsingFirebase()) {
      return firebaseApi.endMeetup(meetupId);
    }
    return mockEngine.endMeetup(meetupId);
  }
};
