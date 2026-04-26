# Score Keeper: Technical & Functional Specification

## 1. System Overview
**Score Keeper (Taiwan Mahjong)** is a client-side, serverless web application designed to track and calculate complex scoring interactions for four-player Mahjong games.

The system is built entirely on **Vanilla HTML5, JavaScript (ES6+), and Tailwind CSS (via CDN)**. It follows a modular ES Module architecture and relies exclusively on the browser's `localStorage` for data persistence, ensuring an offline-capable, zero-backend architecture.

## 2. Directory Structure & Architecture
The application is refactored into focused modules to separate business logic from UI rendering:

```text
js/
├── app.js                # Main Entry & Orchestration (Bound to App object)
├── constants.js          # Static data (FAN_DATA, ICONS, VERSION)
├── utils/
│   ├── ui-helpers.js     # Global UI components (Notifications, Theme)
│   └── math-helpers.js   # Pure math functions (Rounding logic)
├── engine/
│   ├── state.js          # Persistence, Undo, Replay Engine
│   ├── scoring.js        # Core 4-step Scoring Pipeline & Debt Settlement
│   └── stats.js          # Player Analytics & Titles
└── ui/
    ├── landing.js        # Landing Page & Match History Index
    ├── setup.js          # Game Setup (Names, Seating, Config)
    ├── game-skeleton.js  # Main Layout & Tab Orchestration
    ├── scoring-view.js   # Real-time Score Entry & Live Breakdowns
    ├── history-view.js   # Grouped Timeline View
    ├── dashboard-view.js # Analytics & Cumulative Charts
    └── shared-modals.js  # Reusable Admin Modals (Dealer, Seating, Winds)
```

## 3. Match Management & Data Flow
The application supports managing multiple distinct "Matches" (game sessions).

*   **Initialization:** When a new match is created, it defaults player names, icons, and game configuration (Base Score, Rounding) to the values used in the most recent match found in `localStorage`.
*   **Version Tracking:** Every `gameState` object includes a `version` field (e.g., `1.3.1`). This ensures that exported files carry the application version for future compatibility tracking.
*   **Persistence:** The core state object (`gameState`) is serialized as JSON and saved to `localStorage` under `mahjong_app_match_{ID}`.
*   **State History:** Every confirmed action (win, loss, draw, penalty, override) pushes an event object into `gameState.gameHistory`. Every event captures a **seating snapshot** and the current **rotationCount** to ensure chronological integrity.
*   **Undo System (Rollback):** Before any action mutates the `gameState`, a deep copy of the entire state is pushed into an `undoStack` (capped at 50). Clicking "Rollback" restores the game to its exact previous condition.
*   **Replay Engine:** When importing or loading a match, the engine wipes the score to zero and chronologically re-executes every historical event.
    *   **Smart Reconstruction:** For legacy imports lacking seating data, the engine analyzes the dealer sequence to mathematically reconstruct the physical seating (`[Top, Right, Bottom, Left]`).
    *   **Settings Priority:** The engine prioritizes the `config` values (Rounding, Base Score) stored within the file itself.

## 4. The Mathematical Scoring Pipeline
The system calculates score exchanges between a **Winner** and a **Loser** through isolated 1-on-1 mathematical matchups.

### Seating and Rotation Standard
*   **Clockwise Seating:** Players are stored in a clockwise array: `[Top, Right, Bottom, Left]`.
*   **Counter-Clockwise Rotation:** Standard Mahjong dealer rotation passes to the player's right. In the clockwise array, this corresponds to `Index - 1`.
*   **Wind Mapping:** Relative winds (East, South, West, North) rotate counter-clockwise. Formula: `(brkIdx - pIdx + 4) % 4`.

### The 4-Step Pipeline:
1.  **Step 1: Base Score:** `Input Score (番) + Base Score (底)`.
2.  **Step 2: Broker Extra (莊家 / 連莊加台):** Adds `(2n + 1)` points where `n` is the consecutive win count if either party is the dealer.
3.  **Step 3: Pulling (拉):** A **0.5x** multiplier applied to the total cumulative score the winner has won from the loser during an unbroken streak.
4.  **Step 4: Revenge Cut (劈半):** If a player wins against their "tormentor," they reclaim **50%** of the accumulated "Pulling" pot back.

## 5. UI Mechanics & Timeline
### 5.1. History Timeline (DESC/ASC)
*   **Grouping:** Events are grouped by `rotationCount` into **Game Blocks**.
*   **Round Order:** Blocks are sorted **Descending (Latest round on top)**.
*   **Internal Order:** Within a round, events are sorted **Descending (Latest action on top)**.
*   **Visuals:** Each block features a centered round badge (e.g., `Round 1 東風`). Vertical timeline nodes are used to track progress, but horizontal lines do not cross the vertical timeline track.

### 5.2. Dashboard Analytics
*   **Cumulative Chart:** Displays player wealth over time. Mirroring lines visually confirm the **zero-sum integrity** of the engine.
*   **Titles:** Dynamic badges (食糊王, 運氣王, 陪跑員) awarded based on history metrics.

## 6. Configurable Rounding Options
### 6.1 Precision (小數處理)
*   **Keep 1 Decimal (取至0.1)**
*   **Round to 0.5 (取至0.5)**
*   **Round to Integer (取整數) [Default]**

### 6.2 Advantage Direction (進位優勢)
*   **Winner Advantage [Default]:** Rounds UP for Pulls, rounds DOWN for Cuts.
*   **Loser Advantage:** Rounds DOWN for Pulls, rounds UP for Cuts.

## 7. Progressive Web App (PWA)
*   **Offline Capability:** Fully functional without an internet connection.
*   **Cache Management:** The Service Worker (`sw.js`) caches all 14+ JS modules.
*   **Auto-Update:** Version string in `constants.js` and `sw.js` `CACHE_NAME` must be updated in tandem to trigger browser cache clearing.
