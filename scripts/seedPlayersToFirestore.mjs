import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBGCMgVDHPB82dyLB9yUbkxOf9f610HbUY",
  authDomain: "paddle-kyu.firebaseapp.com",
  projectId: "paddle-kyu",
  storageBucket: "paddle-kyu.firebasestorage.app",
  messagingSenderId: "490695426743",
  appId: "1:490695426743:web:d8c7bfd0f24549914b0332"
};

const PLAYERS = [
  "June Garcia",
  "Ereca Jardinico",
  "Ylette Rocha",
  "Benz",
  "Crystal_Yuki",
  "Wiwi",
  "Russel",
  "ken",
  "JC",
  "Jen",
  "Dean Osman",
  "Alvin",
  "Jen Ny",
  "Ace R",
  "Kevin Garcia",
  "Ivy Lucero",
  "Kevin C",
  "Sherwin Legaspi",
  "Dan C",
  "Rachel Dean",
  "Symon Peralta",
  "Anton Misael",
  "Jennifer Antonette",
  "Nelson Semblante"
];

async function seed() {
  console.log(`🚀 Connecting to Firebase Firestore (${firebaseConfig.projectId})...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log('Fetching existing players...');
    const snapshot = await getDocs(collection(db, 'players'));
    const existing = new Set(snapshot.docs.map(d => (d.data().name || '').toLowerCase().trim()));

    const toInsert = PLAYERS.filter(name => !existing.has(name.toLowerCase().trim()));

    if (toInsert.length === 0) {
      console.log(`✓ All ${PLAYERS.length} players already exist in Firestore 'players' collection.`);
      process.exit(0);
    }

    console.log(`Writing ${toInsert.length} players with default rank 2.0 to Firestore...`);
    const batch = writeBatch(db);

    for (const name of toInsert) {
      const docRef = doc(collection(db, 'players'));
      batch.set(docRef, {
        name,
        rating: 2.0,
        createdAt: serverTimestamp()
      });
      console.log(` + Queued: ${name} (Rating: 2.0)`);
    }

    await batch.commit();
    console.log(`🎉 Successfully seeded ${toInsert.length} players into Firestore!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed players to Firestore:', err);
    console.log('\nTIP: Make sure Cloud Firestore is enabled in test mode in your Firebase Console:');
    console.log('https://console.firebase.google.com/project/paddle-kyu/firestore');
    process.exit(1);
  }
}

seed();
