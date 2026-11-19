# PaddleKyu - Pickleball Ladder Queue Manager

A responsive, mobile-first web app designed for managing live court-side pickleball ladders with automatic balanced seeding, FIFO queueing, synchronized stopwatch timers, and strict partner splitting.

Built with **React (Vite)**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, and **Firebase Firestore** (with dual-engine local zero-config real-time synchronization fallback).

---

## ⚡ Features

### 1. Tablet-Optimized Court-Side Admin View (`/`)
- **4-Digit PIN Gate:** Protected by a court-side PIN modal (Default: `1234`) stored in local session state, preventing spectators from accidentally modifying matches.
- **Visual Court Hierarchy:** Distinct badges for Court 1 (Gold/Amber King of the Court) down to lower courts.
- **Large Touch-Friendly Controls:** Sized specifically for one-handed tablet use in direct sunlight at the courts.
- **One-Click Demo / Seed Data:** Populates 12 ranked players and immediately generates balanced doubles matches on 2 courts.

### 2. Spectator Live Mobile View (`/live/:meetupId`)
- **Clean Read-Only View:** Accessible by scanning a generated QR code court-side.
- **Real-Time `onSnapshot` Listeners:**
  - Live active matches per court with synchronized count-up timers.
  - Court FIFO queues with **"Up Next"** prominently highlighted for the next 4 players.
  - Player status badges (`Active`, `Resting`, `Left`).
  - Completed match history and live player leaderboard.

### 3. Balanced Seeding & Strict Ladder Promotion Rules
- **Snake Draft Initial Seeding:** Sorts selected players by rating and performs snake draft pairing so team combined ratings are evenly balanced across all courts.
- **Strict Mandatory Split:** When a match finishes, all 4 players have their `lastPartnerId` recorded to ensure they **never pair with the same partner in consecutive games**.
- **Ladder Movement Rules:**
  - Winners move up to `Math.max(1, courtNumber - 1)`. Court 1 winners stay on Court 1.
  - Losers move down to `Math.min(numCourts, courtNumber + 1)`. Court X losers stay on Court X.
  - `queueJoinedAt` is updated to the current timestamp.
- **FIFO Matchmaking:** Next game draws the first 4 active players in the court's FIFO queue, tests all 3 pairing combinations, strictly eliminates any with a `lastPartnerId` conflict, and picks the option with the closest rating balance.
- **Adjacent Court Borrowing:** If fewer than 4 players are in a court's queue, the admin can pull the longest-waiting player from an adjacent court with one tap.

### 4. Mid-Session Resting & Player Management
- Quick roster drawer allows toggling any player between **Active**, **Resting**, and **Left** at any point.
- Resting/Left players are automatically bypassed in FIFO selection without disrupting active matches.
- Add new walk-up players mid-session directly into any court's queue.

---

## 🗄️ Firestore Data Model

The Firestore collections are structured cleanly:

```
players/
  {playerId}/
    id: string
    name: string
    rating: number (default 2.0)
    createdAt: timestamp

meetups/
  {meetupId}/
    id: string
    name: string
    date: string
    numCourts: number
    format: 'doubles'
    gameType: 'ladder'
    status: 'active' | 'completed'
    createdAt: timestamp

    roster/ (subcollection)
      {playerId}/
        playerId: string
        name: string
        rating: number
        status: 'active' | 'resting' | 'left'
        currentCourtQueue: number
        queueJoinedAt: timestamp
        lastPartnerId: string | null
        gamesPlayed: number

    courts/ (subcollection)
      court_{courtNumber}/
        courtNumber: number (1 is highest)
        status: 'idle' | 'playing'
        startedAt: timestamp | null
        teamA: [{ id, name, rating }, { id, name, rating }]
        teamB: [{ id, name, rating }, { id, name, rating }]

    matches/ (subcollection)
      {matchId}/
        courtNumber: number
        teamA: [{ id, name, rating }, { id, name, rating }]
        teamB: [{ id, name, rating }, { id, name, rating }]
        winningTeam: 'A' | 'B'
        durationSeconds: number
        completedAt: timestamp
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Default Admin PIN: `1234`
- Click **"Demo / Seed Data"** to immediately test the full ladder flow!
- Click **"Spectator QR"** to scan or open the spectator view in a separate tab or phone.

### 3. Connect Real Firebase (Optional)
The app runs out-of-the-box in zero-config mode with cross-tab real-time broadcasting. To connect your cloud Firestore:
1. Click the cloud connection icon in the top header.
2. Paste your Firebase web app configuration JSON or set the environment variables in `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_PROJECT_ID=my-project-id
```

### 4. Build for Production
```bash
npm run build
```
The optimized bundle is generated in the `dist/` directory.
