import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getStoredFirebaseConfig, FirebaseConfig } from './firebaseConfig';
import { Meetup, Court, RosterPlayer, MatchRecord, Player } from '../types';
import { INITIAL_PLAYER_LIST } from './seedPlayers';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function initFirebase(config?: FirebaseConfig | null): Firestore | null {
  const effectiveConfig = config || getStoredFirebaseConfig();
  if (!effectiveConfig || !effectiveConfig.projectId || !effectiveConfig.apiKey) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(effectiveConfig);
    } else {
      app = getApps()[0];
    }
    firestore = getFirestore(app);
    return firestore;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (!firestore) {
    return initFirebase();
  }
  return firestore;
}

// Convert Firestore Timestamp or number to epoch ms
function toEpoch(val: unknown): number {
  if (!val) return Date.now();
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'seconds' in val) {
    return (val as { seconds: number; nanoseconds?: number }).seconds * 1000;
  }
  return Date.now();
}

function handleFirestoreError(context: string, err: unknown) {
  console.error(`Firestore error in ${context}:`, err);
  const msg = (err as Error)?.message || '';
  if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
    console.warn(
      'Cloud Firestore Permission Denied! Please check your Firestore Security Rules in the Firebase console (paddle-kyu).'
    );
  }
}

export const firebaseApi = {
  isConfigured: () => getDb() !== null,

  // Players
  onPlayers: (callback: (players: Player[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const q = query(collection(db, 'players'), orderBy('rating', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const players: Player[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || '',
            rating: Number(data.rating) || 2.0,
            createdAt: toEpoch(data.createdAt)
          };
        });
        callback(players);
      },
      (err) => handleFirestoreError('onPlayers', err)
    );
  },

  createPlayer: async (playerData: Omit<Player, 'id' | 'createdAt'>): Promise<Player> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(collection(db, 'players'));
    const newPlayer = {
      ...playerData,
      id: docRef.id,
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, newPlayer);
    return {
      ...playerData,
      id: docRef.id,
      createdAt: Date.now()
    };
  },

  seedInitialPlayers: async (): Promise<number> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const existingSnap = await getDocs(collection(db, 'players'));
    const existingNames = new Set(existingSnap.docs.map(d => (d.data().name || '').toLowerCase().trim()));

    const toAdd = INITIAL_PLAYER_LIST.filter(p => !existingNames.has(p.name.toLowerCase().trim()));
    if (toAdd.length === 0) return 0;

    const batch = writeBatch(db);
    for (const p of toAdd) {
      const docRef = doc(collection(db, 'players'));
      batch.set(docRef, {
        name: p.name,
        rating: p.rating,
        createdAt: serverTimestamp()
      });
    }
    await batch.commit();
    return toAdd.length;
  },

  updatePlayer: async (id: string, updates: Partial<Player>): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await updateDoc(doc(db, 'players', id), updates);
  },

  deletePlayer: async (id: string): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await deleteDoc(doc(db, 'players', id));
  },

  // Meetups
  onMeetups: (callback: (meetups: Meetup[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const q = query(collection(db, 'meetups'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const meetups: Meetup[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            date: data.date,
            numCourts: data.numCourts,
            format: data.format || 'doubles',
            gameType: data.gameType || 'ladder',
            status: data.status || 'active',
            createdAt: toEpoch(data.createdAt)
          };
        });
        callback(meetups);
      },
      (err) => handleFirestoreError('onMeetups', err)
    );
  },

  onMeetup: (meetupId: string, callback: (meetup: Meetup | null) => void) => {
    const db = getDb();
    if (!db) return () => {};
    return onSnapshot(
      doc(db, 'meetups', meetupId),
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        const data = snapshot.data();
        callback({
          id: snapshot.id,
          name: data.name,
          date: data.date,
          numCourts: data.numCourts,
          format: data.format || 'doubles',
          gameType: data.gameType || 'ladder',
          status: data.status || 'active',
          createdAt: toEpoch(data.createdAt)
        });
      },
      (err) => handleFirestoreError(`onMeetup(${meetupId})`, err)
    );
  },

  createMeetup: async (
    meetupData: Omit<Meetup, 'id' | 'createdAt'>,
    initialCourts: Court[],
    initialRoster: RosterPlayer[]
  ): Promise<string> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const meetupRef = doc(collection(db, 'meetups'));
    const meetupId = meetupRef.id;

    const batch = writeBatch(db);

    batch.set(meetupRef, {
      ...meetupData,
      id: meetupId,
      createdAt: serverTimestamp()
    });

    // Courts subcollection: meetups/{meetupId}/courts
    for (const court of initialCourts) {
      const courtRef = doc(db, 'meetups', meetupId, 'courts', `court_${court.courtNumber}`);
      batch.set(courtRef, {
        courtNumber: court.courtNumber,
        status: court.status,
        startedAt: court.startedAt ? Timestamp.fromMillis(court.startedAt) : null,
        teamA: court.teamA,
        teamB: court.teamB
      });
    }

    // Roster subcollection: meetups/{meetupId}/roster
    for (const player of initialRoster) {
      const rosterRef = doc(db, 'meetups', meetupId, 'roster', player.playerId);
      batch.set(rosterRef, {
        playerId: player.playerId,
        name: player.name,
        rating: player.rating,
        status: player.status,
        currentCourtQueue: player.currentCourtQueue,
        queueJoinedAt: player.queueJoinedAt ? Timestamp.fromMillis(player.queueJoinedAt) : serverTimestamp(),
        lastPartnerId: player.lastPartnerId,
        gamesPlayed: player.gamesPlayed
      });
    }

    await batch.commit();
    return meetupId;
  },

  onCourts: (meetupId: string, callback: (courts: Court[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const q = query(collection(db, 'meetups', meetupId, 'courts'), orderBy('courtNumber', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const courts: Court[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            courtNumber: data.courtNumber,
            status: data.status,
            startedAt: data.startedAt ? toEpoch(data.startedAt) : null,
            teamA: data.teamA || [],
            teamB: data.teamB || []
          };
        });
        callback(courts);
      },
      (err) => handleFirestoreError(`onCourts(${meetupId})`, err)
    );
  },

  onRoster: (meetupId: string, callback: (roster: RosterPlayer[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const q = query(collection(db, 'meetups', meetupId, 'roster'), orderBy('queueJoinedAt', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const roster: RosterPlayer[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            playerId: data.playerId,
            name: data.name,
            rating: data.rating,
            status: data.status,
            currentCourtQueue: data.currentCourtQueue,
            queueJoinedAt: toEpoch(data.queueJoinedAt),
            lastPartnerId: data.lastPartnerId || null,
            gamesPlayed: data.gamesPlayed || 0
          };
        });
        callback(roster);
      },
      (err) => handleFirestoreError(`onRoster(${meetupId})`, err)
    );
  },

  onMatches: (meetupId: string, callback: (matches: MatchRecord[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const q = query(collection(db, 'meetups', meetupId, 'matches'), orderBy('completedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const matches: MatchRecord[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            courtNumber: data.courtNumber,
            teamA: data.teamA || [],
            teamB: data.teamB || [],
            winningTeam: data.winningTeam,
            durationSeconds: data.durationSeconds || 0,
            completedAt: toEpoch(data.completedAt)
          };
        });
        callback(matches);
      },
      (err) => handleFirestoreError(`onMatches(${meetupId})`, err)
    );
  },

  updateCourt: async (meetupId: string, courtNumber: number, updates: Partial<Court>): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const courtRef = doc(db, 'meetups', meetupId, 'courts', `court_${courtNumber}`);
    const firestoreUpdates: Record<string, unknown> = { ...updates };
    if (updates.startedAt !== undefined) {
      firestoreUpdates.startedAt = updates.startedAt ? Timestamp.fromMillis(updates.startedAt) : null;
    }
    await updateDoc(courtRef, firestoreUpdates);
  },

  updateRosterPlayer: async (meetupId: string, playerId: string, updates: Partial<RosterPlayer>): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const rosterRef = doc(db, 'meetups', meetupId, 'roster', playerId);
    const firestoreUpdates: Record<string, unknown> = { ...updates };
    if (updates.queueJoinedAt !== undefined) {
      firestoreUpdates.queueJoinedAt = updates.queueJoinedAt ? Timestamp.fromMillis(updates.queueJoinedAt) : serverTimestamp();
    }
    await updateDoc(rosterRef, firestoreUpdates);
  },

  addRosterPlayer: async (meetupId: string, player: RosterPlayer): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const rosterRef = doc(db, 'meetups', meetupId, 'roster', player.playerId);
    await setDoc(rosterRef, {
      ...player,
      queueJoinedAt: player.queueJoinedAt ? Timestamp.fromMillis(player.queueJoinedAt) : serverTimestamp()
    });
  },

  recordMatch: async (meetupId: string, matchData: Omit<MatchRecord, 'id'>): Promise<string> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const matchRef = doc(collection(db, 'meetups', meetupId, 'matches'));
    await setDoc(matchRef, {
      ...matchData,
      completedAt: matchData.completedAt ? Timestamp.fromMillis(matchData.completedAt) : serverTimestamp()
    });
    return matchRef.id;
  },

  batchUpdateRosterAndCourt: async (
    meetupId: string,
    courtNumber: number,
    courtUpdates: Partial<Court>,
    rosterUpdates: { playerId: string; updates: Partial<RosterPlayer> }[]
  ): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    const batch = writeBatch(db);

    const courtRef = doc(db, 'meetups', meetupId, 'courts', `court_${courtNumber}`);
    const cUpdates: Record<string, unknown> = { ...courtUpdates };
    if (courtUpdates.startedAt !== undefined) {
      cUpdates.startedAt = courtUpdates.startedAt ? Timestamp.fromMillis(courtUpdates.startedAt) : null;
    }
    batch.update(courtRef, cUpdates);

    for (const r of rosterUpdates) {
      const rosterRef = doc(db, 'meetups', meetupId, 'roster', r.playerId);
      const rUpdates: Record<string, unknown> = { ...r.updates };
      if (r.updates.queueJoinedAt !== undefined) {
        rUpdates.queueJoinedAt = r.updates.queueJoinedAt ? Timestamp.fromMillis(r.updates.queueJoinedAt) : serverTimestamp();
      }
      batch.update(rosterRef, rUpdates);
    }

    await batch.commit();
  },

  endMeetup: async (meetupId: string): Promise<void> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized');
    await updateDoc(doc(db, 'meetups', meetupId), { status: 'completed' });
  }
};
