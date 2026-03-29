# Score Keeper: Technical & Functional Specification

## 1. System Overview
**Score Keeper (Taiwan Mahjong)** is a client-side, serverless web application designed to track and calculate complex scoring interactions for four-player Mahjong games.

The system is built entirely on **Vanilla HTML5, JavaScript (ES6+), and Tailwind CSS (via CDN)**. It relies exclusively on the browser's `localStorage` for data persistence, ensuring an offline-capable, zero-backend architecture.

This document serves as the primary source of truth for the application's business logic, specifically detailing the intricate, multi-layered mathematical pipeline used to calculate score exchanges.

## 2. Match Management & Data Flow
The application supports managing multiple distinct "Matches" (game sessions).

*   **Initialization:** When a new match is created, it is assigned a unique timestamp ID.
*   **Version Tracking:** Every `gameState` object includes a `version` field (e.g., `1.3.0`). This ensures that exported files carry the application version for future compatibility tracking.
*   **Persistence:** The core state object (`gameState`) is serialized as JSON and saved to `localStorage` under `mahjong_app_match_{ID}`. An index of all matches is maintained under `mahjong_app_matches` for the Landing Page.
*   **State History:** Every confirmed action (win, loss, draw, penalty, override) pushes an event object into `gameState.gameHistory`. This array is the foundation for the History Table and the Dashboard Analytics chart.
*   **Undo System (Rollback):** Before any action mutates the `gameState`, a deep copy of the entire state is pushed into an `undoStack` (capped at 50). Clicking "Rollback" pops the last state from this stack, perfectly restoring the game to its previous exact condition without navigating away from the user's currently active view.
*   **Export/Import:** The entire `gameState` object can be exported as a raw `.json` file. 
    *   **Automatic Recalculation:** When importing, the **Replay Engine** automatically resets the game state to zero and chronologically re-executes every historical event.
    *   **Settings Priority:** The engine prioritizes the `config` values (Rounding, Base Score, etc.) stored within the imported file itself, rather than forcing application defaults.
    *   **Smart Reconstruction:** For legacy imports lacking initial setup data, the engine analyzes the history to find the first 4 unique brokers. It uses this transition sequence to mathematically reconstruct the correct initial seating and dealer rotation.

## 3. The Mathematical Scoring Pipeline
The core complexity of this application lies in how it calculates the exact point exchange between a **Winner** and a **Loser**. 

Every single transaction (whether it's a 1-on-1 "出銃" loss or a 1-on-3 "自摸" self-draw) is broken down into isolated 1-on-1 mathematical matchups. 

### Seating and Rotation Standard
*   **Clockwise Seating:** Players are stored in a clockwise array: `[Top, Right, Bottom, Left]`.
*   **Counter-Clockwise Rotation:** Standard Mahjong dealer rotation passes to the player's right. In the clockwise array, this corresponds to `Index - 1`.
*   **Wind Mapping:** Relative winds (East, South, West, North) rotate counter-clockwise. To map clockwise seating indices (`pIdx`) to these winds relative to the current Broker (`brkIdx`), the formula is: `(brkIdx - pIdx + 4) % 4`.

When Player A wins points from Player B, the system calculates the final amount by passing the raw inputted score through the following sequential pipeline:

### Step 1: The Base Score (底 + 番)
Every transaction begins with a foundational base score. During Game Setup, players define a global "Base Score" (底), which defaults to 5.
*   **Formula:** `Input Score (番) + Base Score (底)`

### Step 2: The Broker Extra (莊家 / 連莊加台)
The "Broker" (莊家) is the current dealer (East). Transactions involving the Broker carry heavier weight.
*   If either the Winner *or* the Loser is the current Broker, an extra penalty/bonus is added.
*   The application tracks how many consecutive hands the Broker has survived (`lianZhuangCount`, or `n`). 
*   **Formula:** `Previous Value + (2n + 1)`

### Step 3: Consecutive Wins / Pulling (拉)
If Player A wins against Player B *multiple times in a row*, a "Pulling" (拉) multiplier is applied. 
The "Pull Multiplier" factor is strictly hardcoded to **0.5** (半拉).
*   The system tracks the *total, cumulative score* Player A has won from Player B during their unbroken streak (`totalAmount`).
*   **Formula:** `Previous Value + (totalAmount * 0.5)`
*   **Streak Breaking (Global):** Any time any player wins a hand, all active pulling streaks belonging to any player who did *not* win that hand are instantly reset to zero.

### Step 4: Revenge Cut (劈半)
If a player who has been suffering a losing streak finally wins against their tormentor, they get a massive one-time windfall bonus.
*   The system tracks the total, cumulative amount of points Player B has lost to Player A during Player A's active streak (`totalAmount`).
*   When Player B finally wins against Player A, they "take revenge" and steal exactly 50% of that accumulated pot back.
*   **Formula:** `Previous Value + (totalAmount * 0.5)`
*   After the Revenge is applied, Player A's streak record against Player B is completely erased.

## 4. Game Actions & UI Mechanics

### 4.1. Bonus / Penalty (獎 / 罰)
These are arbitrary, mid-game point adjustments.
*   They are **exempt** from the Mathematical Scoring Pipeline (no Broker logic, no Streak effects).
*   Users choose from a 3-button segmented control: **半底** (0.5x), **一底** (1.0x), or **兩底** (2.0x).
*   Decimal Exception: Unlike Pulling or Cutting, these **do not follow** global rounding rules and allow 0.5 increments.

### 4.2. Draws (流局)
*   The Broker (莊) token automatically rotates to the player on the right (`Index - 1`).
*   The Wind/Hand indicator advances.
*   Active Pulling (拉) streaks are preserved.

### 4.3. History Table Timeline
The History Table uses a vertical timeline with distinct indicators:
*   **Wind Indicator (e.g., 東風東局):** Appears when a new rotation or hand starts. It uses a dark circular badge (`bg-gray-800`).
*   **Setting Indicator (設定):** Groups consecutive administrative actions (manual dealer/seating overrides, surrenders). It uses the same dark circular badge style for visual consistency.
*   **Badges:** 
    *   **莊 (Dealer):** Only visible in gameplay rows (wins/draws). Hidden in standalone administrative rows to reduce clutter.
    *   **調位 (Winds):** Displays the relative wind (東, 南, 西, 北) for each player. It is automatically recalculated whenever the seating or dealer changes.

### 4.4. Surrender (投降 / 斷纜)
To prevent multipliers from reaching mathematically absurd numbers, players can surrender.
*   **Effect:** Erases the streak count and the accumulated "Revenge" pot between two specific players.

## 5. UI/UX Principles
*   **Zero-Sum Integrity:** All score calculations strictly adhere to configured rounding rules to ensure the total sum of all players remains perfectly at `0.0`.
*   **Non-Intrusive Notifications:** The system uses a `showNotification` method to display success/error messages as animated banners at the top of the screen, replacing disruptive browser alerts and confirmation dialogs.
*   **Live Mathematical Breakdowns:** Small text breakdowns (e.g., `底:5 | 番:10 | 莊:3 | 拉:15.0 | 劈半:20.0 => 53`) generate in real-time during score entry.

## 6. Configurable Rounding Options (小數處理)
Players can select global rounding preferences during Game Setup.

### 6.1 Precision (小數處理)
*   **Keep 1 Decimal (取至0.1):** Math is calculated exactly to the first decimal place.
*   **Round to 0.5 (取至0.5):** Values are rounded to the nearest half-point.
*   **Round to Integer (取整數):** Standard rounding to the nearest whole number. *[Default]*

### 6.2 Advantage Direction (進位優勢)
*   **Winner Advantage (贏家優勢) [Default]:** Rounds UP (ceil) during a Pull, and rounds DOWN (floor) during a Cut.
*   **Loser Advantage (輸家優勢):** Rounds DOWN (floor) during a Pull, and rounds UP (ceil) during a Cut.

## 7. Player Analytics & Titles (稱號系統)
Dynamic badges awarded based on `gameHistory` metrics (食糊王, 自摸王, 出銃王, 運氣王, 和平使者, 陪跑員).

## 8. Progressive Web App (PWA) Architecture
The application is a fully offline-capable PWA.

### 8.1 Seamless Auto-Update Mechanism
*   **Version Alignment Mandate:** To ensure update logic triggers correctly, the **Landing Page version string** (e.g., `v1.3.0`) and the **Service Worker `CACHE_NAME`** (e.g., `mahjong-score-v1.3.0`) **MUST** always be updated in tandem. This acts as the "cache buster."
