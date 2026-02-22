# Score Keeper: Technical & Functional Specification

## 1. System Overview
**Score Keeper (Taiwan Mahjong)** is a client-side, serverless web application designed to track and calculate complex scoring interactions for four-player Mahjong games.

The system is built entirely on **Vanilla HTML5, JavaScript (ES6+), and Tailwind CSS (via CDN)**. It relies exclusively on the browser's `localStorage` for data persistence, ensuring an offline-capable, zero-backend architecture.

This document serves as the primary source of truth for the application's business logic, specifically detailing the intricate, multi-layered mathematical pipeline used to calculate score exchanges.

## 2. Match Management & Data Flow
The application supports managing multiple distinct "Matches" (game sessions).

*   **Initialization:** When a new match is created, it is assigned a unique timestamp ID.
*   **Persistence:** The core state object (`gameState`) is serialized as JSON and saved to `localStorage` under `mahjong_app_match_{ID}`. An index of all matches is maintained under `mahjong_app_matches` for the Landing Page.
*   **State History:** Every confirmed action (win, loss, draw, penalty) pushes an event object into `gameState.gameHistory`. This array is the foundation for the History Table and the Dashboard Analytics chart.
*   **Undo System (Rollback):** Before any action mutates the `gameState`, a deep copy of the entire state is pushed into an `undoStack` (capped at 20 to prevent `localStorage` limit errors on mobile devices) saved under `mahjong_app_undo_{ID}`. Clicking "Rollback" pops the last state from this stack, perfectly restoring the game to its previous exact condition without navigating away from the user's currently active view (e.g. History or Dashboard tabs).
*   **Export/Import:** The entire `gameState` object can be exported as a raw `.json` file and imported later. Importing assigns a new Match ID (but retains original timestamp) and clears the `undoStack` to prevent collision with legacy states. Users can optionally recalculate legacy imports to enforce modern configuration rules.

## 3. The Mathematical Scoring Pipeline
The core complexity of this application lies in how it calculates the exact point exchange between a **Winner** and a **Loser**. 

Every single transaction (whether it's a 1-on-1 "出銃" loss or a 1-on-3 "自摸" self-draw) is broken down into isolated 1-on-1 mathematical matchups. 

When Player A wins points from Player B, the system calculates the final amount by passing the raw inputted score through the following sequential pipeline:

### Step 1: The Base Score (底 + 番)
Every transaction begins with a foundational base score. During Game Setup, players define a global "Base Score" (底), which defaults to 5.
*   **Formula:** `Input Score (番) + Base Score (底)`
*   *Example:* Player inputs a 10-point winning hand. If the Base Score is 5, the starting value for the pipeline is **15**.

### Step 2: The Broker Extra (莊家 / 連莊加台)
The "Broker" (莊家) is the current dealer. Transactions involving the Broker carry heavier weight.
*   If either the Winner *or* the Loser is the current Broker, an extra penalty/bonus is added.
*   The application tracks how many consecutive hands the Broker has survived (`lianZhuangCount`, or `n`). 
*   **Formula:** `Previous Value + (2n + 1)`
*   *Example:* Player A (the Broker, currently on a 1-game winning streak, so `n=1`) wins against Player B. The Step 1 value was 15. The Broker Extra is `(2 * 1) + 1 = 3`. The new running total is **18**.

### Step 3: Consecutive Wins / Pulling (拉)
If Player A wins against Player B *multiple times in a row*, a "Pulling" (拉) multiplier is applied to simulate snowballing momentum. 
The "Pull Multiplier" factor is strictly hardcoded to **0.5** (半拉).

*   The system tracks the *total, cumulative score* Player A has won from Player B during their unbroken streak (`totalAmount`).
*   **Formula:** `Previous Value + (totalAmount * 0.5)`
*   *Example:* Player A wins against Player B again. The Step 2 value is 18. In their current streak, Player A has won a total of 34 points from Player B across previous hands. The bonus is `34 * 0.5 = 17`. The new running total is `18 + 17 =` **35**.
*   **Streak Breaking:** If Player A does *not* win the current hand (e.g., Player C wins, or Player A loses), Player A's "Pulling" streak against *all* opponents is instantly reset to zero.

### Step 4: Revenge Cut (劈半)
If a player who has been suffering a losing streak finally wins against their tormentor, they get a massive one-time windfall bonus.
*   The system tracks the total, cumulative amount of points Player B has lost to Player A during Player A's active streak (`totalAmount`).
*   When Player B finally wins against Player A, they "take revenge" and steal exactly 50% of that accumulated pot back.
*   **Formula:** `Previous Value + (totalAmount * 0.5)`
*   *Example:* Player B has lost 100 points to Player A over the last few hands. Player B finally wins a hand against Player A. The Step 3 value for this new win is 28. The Revenge Cut is `100 * 0.5 = 50`. The final, absolute score change is `28 + 50 =` **78**.
*   After the Revenge is applied, Player A's streak record against Player B is completely erased.

## 4. Game Actions & UI Mechanics

### 4.1. Bonus / Penalty (獎 / 罰)
These are arbitrary, mid-game point adjustments (e.g., a penalty for a foul).
*   They are **exempt** from the Mathematical Scoring Pipeline. They do not trigger Broker (莊) logic, and they do not affect or break Pulling (拉) streaks.
*   Instead of inputting an exact point value, users choose from a 3-button segmented control representing a multiplier of the current Base Score (底): **半底** (0.5x), **一底** (1.0x), or **兩底** (2.0x).
*   The resulting value represents the *per-player* exchange. If a `0.5 底` (半底) Bonus is applied to Player A (and 底=5), Player A receives +7.5, and the other three players receive -2.5 each.
*   **Decimal Exception:** Unlike Pulling or Cutting, Bonus/Penalty actions **do not follow** the global rounding rules (Section 6). They always allow for 0.5 increments to remain as precise decimals to ensure mathematical accuracy.

### 4.2. Draws (流局)
If a hand ends without a winner, a Draw is declared via the Action menu.
*   The Broker (莊) token automatically rotates to the next player.
*   The Wind/Hand indicator advances.
*   **Crucially:** All active Pulling (拉) streaks between all players are perfectly preserved.

### 4.3. Settle Debts (結算找數)
To facilitate the final payout at the end of a session, a "Settle Debts" action is available via the menu. This uses a debt simplification algorithm to calculate the absolute minimum number of transactions required for all losing players to pay out all winning players, ensuring nobody has to make multiple confusing fractional transactions.
*   **Visual Layout:** The generated transaction list (both in-app and in the exported image) displays a clean, minimalist flow: Player A `---- [Amount] ---->` Player B. Player names are rendered in high-contrast black/off-white, while the transaction amount is highlighted in bold green and positioned precisely in the middle of a broken arrow line for maximum readability.

### 4.4. Surrender (投降 / 斷纜)
To prevent Pulling (拉) multipliers from reaching mathematically absurd numbers, the system offers an "escape hatch" known as Surrendering.
*   **Automatic Prompts:** Every time a player reaches exactly 3, 6, 9, etc., consecutive losses against a specific opponent, a pop-up interrupts the game asking if they wish to surrender.
*   **Manual Trigger:** Users can manually view all active streaks and surrender at any time via the Action Menu.
*   **Effect:** Surrendering immediately erases the streak count and the accumulated "Revenge" pot between those two specific players. The next time they interact, the math will start fresh from Step 1.

## 5. UI/UX Principles
*   **Zero-Sum Integrity:** All score calculations (including 1.5x or 0.5x math) strictly adhere to the user-configured rounding preference (see Section 6) to prevent floating-point display errors, while ensuring the total sum of all four players' scores remains perfectly at `0.0` at all times.
*   **Live Mathematical Breakdowns:** The user interface heavily emphasizes transparency. When entering scores, small text breakdowns (e.g., `底:5 | 番:10 | 莊:3 | 拉:15.0 | 劈半:20.0 => 53`) automatically generate in real-time, utilizing the exact same engine that commits the final score. 
*   **Analytics:** The Dashboard provides long-term visualization, translating the complex event history into a clean line chart grouped chronologically by "Game Round" rather than by individual micro-transactions.

## 6. Configurable Rounding Options (小數處理)
Because fractional multipliers (like 0.5x Pulling or the 50% Revenge Cut) frequently result in decimal values, players can select global rounding preferences during Game Setup.

### 6.1 Precision (小數處理)
*   **Keep 1 Decimal (取至0.1):** Math is calculated exactly to the first decimal place (e.g., 17.5).
*   **Round to 0.5 (取至0.5):** Values are rounded cleanly to the nearest half-point boundary.
*   **Round to Integer (取整數):** Standard rounding to the nearest whole number (e.g., 17.5 to 17 or 18 based on advantage). *This is the default setting.*

### 6.2 Advantage Direction (進位優勢)
When a decimal appears during Pulling (拉) or Cutting (劈半), this dictates who receives the rounding advantage. "Winner" means the player with the upper-hand in the streak calculation, while "Loser" means the underdog.
*   **Winner Advantage (贏家優勢) [Default]:** Rounds UP (ceil) during a Pull (to favor the streaking winner), and rounds DOWN (floor) during a Cut (to reduce the penalty paid by the streaking winner).
*   **Loser Advantage (輸家優勢):** Rounds DOWN (floor) during a Pull (to reduce the payment of the losing player), and rounds UP (ceil) during a Cut (to give more windfall to the player breaking the streak).

These rounding rules are enforced dynamically at every step of the Mathematical Scoring Pipeline.

## 7. Player Analytics & Titles (稱號系統)
The system analyzes the entire `gameHistory` to calculate player statistics (`wu` wins, `zimo` self-draws, `chuchong` feeds, and net `bpFan` bonus/penalty points). Based on these metrics, players are dynamically awarded titles (badges) visible in the Stats Dashboard and the exported Match Results image.

### Title Evaluation Rules
*   **食糊王 (King of Winning):** Awarded to the player(s) with the highest total number of winning hands (must be > 0).
*   **自摸王 (King of Self-Draw):** Awarded to the player(s) with the highest total number of self-drawn wins (must be > 0).
*   **出銃王 (King of Feeding):** Awarded to the player(s) with the highest number of direct losses fed to others (must be > 0).
*   **運氣王 (King of Luck):** Awarded to the player(s) with the highest net Bonus/Penalty points gained (must be > 0).
*   **和平使者 (The Peacemaker):** Awarded to the player whose final absolute score is closest to `0`, provided their deviation is strictly `<= 10` points.
*   **陪跑員 (The Bystander):** Awarded to the player with the absolute lowest participation rate. 
    *   **Formula:** `(Total Wins + Total Feeds) / (Rotation Count / 4)`
    *   **Conditions:** The player's average participation must be `< 1` action per round, and the game must have progressed sufficiently (Dealer has rotated `>= 4` times) to prevent premature evaluation.

## 8. Progressive Web App (PWA) Architecture
The application is structured as a fully offline-capable Progressive Web App (PWA), ensuring it can be installed on mobile devices (iOS/Android) and run without an active internet connection.

### Core PWA Components
*   **Local Dependencies:** All external libraries (Tailwind CSS, Chart.js, html2canvas) are hosted locally within the `/libs/` directory rather than relying on external CDNs. This guarantees functionality when offline.
*   **Web App Manifest (`manifest.json`):** Defines the application's metadata (name, theme colors, display mode as `standalone`) and points to the dynamically generated SVG icons in the `/icons/` directory.
*   **Service Worker (`sw.js`):** Intercepts all network requests. Upon installation, it aggressively caches all core assets (`index.html`, `script.js`, `style.css`, local `/libs/`, and `/icons/`). During runtime, it utilizes a "Cache-First" strategy to ensure instant, reliable loading regardless of network status.

### 8.1 iOS Safe Area Handling
To ensure a native-like full-screen experience on iOS devices (especially those with a notch or Dynamic Island), the application explicitly handles viewport safe areas.
*   **Viewport Meta:** The `viewport-fit=cover` property is set in the HTML head to allow the application to paint into the safe areas.
*   **CSS Environment Variables:** Custom CSS properties (`--safe-top`, `--safe-bottom`) utilize `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to dynamically calculate padding.
*   **Targeted UI Adjustments:** Utility classes (e.g., `.safe-pt-landing`, `.safe-top-btn`) are applied to critical fixed or absolute elements (like the top navigation bar, history table headers, and modal close buttons) to push them down below the iOS status bar, preventing UI overlap while maintaining a seamless edge-to-edge background color.

### 8.2 Mobile Input UX (Auto-Selection)
To optimize data entry speed on mobile touch keyboards, all primary numerical and text inputs (Player Names, Base Score, Win/Loss/Zimo Points) implement an automatic `focus` event listener. 
*   When a user taps an input field, its entire existing value is instantly selected (`e.target.select()`).
*   This prevents users from needing to manually backspace or delete default values before typing a new score, significantly streamlining the flow of high-frequency interactions like the Post-Game scoring modal.