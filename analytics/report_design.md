# Taiwan Mahjong Analytics: Report Design & Technical Specification

This document outlines the architecture, data processing logic, and mathematical definitions behind the Mahjong Analytics Report generator (`analytics/analyze.py`). It is intended to serve as a comprehensive guide for future developers maintaining or enhancing the tool.

## 1. System Overview
The analytics tool is a standalone Python script designed to parse exported `.json` game states from the "Score Keeper" frontend application. It aggregates data across multiple matches, computes advanced player statistics (streaks, seating dynamics, revenge rates), and outputs a styled HTML report using Tailwind CSS.

### 1.1 Data Ingestion & Metadata
* **Source:** All `*.json` files in the `/data` directory, processed in **chronological order** based on file timestamps.
* **Format:** The script reads the `gameHistory`, `players`, and `config` objects from the raw local storage exports.
* **Name Normalization:** Player names are cleaned, stripped, and converted to uppercase (e.g., `WIL`). A hardcoded mapping (`WAH` -> `WIL`) exists to merge historical naming inconsistencies.
* **Report Metadata:** Every generated report includes a **Generation Timestamp**, total **Hands Analyzed**, and new time-based metrics:
    *   **Total Time Played:** Calculated by the delta between the first and last `timestamp` of each match.
    *   **Average Time per Hand:** Total time divided by the total number of valid hands analyzed.

---

## 2. Core Metrics & Event Handling

The engine processes the `gameHistory` array chronologically. It strictly listens to specific event types: `post-game` (Chuchong/Deal-in), `zimo` (Self-draw), `in-game` (Bonus/Penalty), `surrender` (Streak reset), and `manual-override` (Seating changes).

### 2.1 The Trophy Room (Hero Metrics)
The report features a expanded, 8-card Trophy Room arranged in two thematic rows:

**Row 1: Core Performance**
*   **The Shark:** Player with the highest overall `net_score`.
*   **The Wall:** Player with the lowest deal-in rate (`deal_ins` / `rounds_played`).
*   **The Ghost:** (Formerly The Sniper) Player with the highest percentage of their wins coming from `wins_zimo`.
*   **The Explosive:** Player with the highest Average Win **Fan**.

**Row 2: Event & Momentum**
*   **The Avenger:** Player with the highest number of `revenges_taken`.
*   **The Target:** Player who was the victim of a revenge most frequently (Most times avenged).
*   **The Lucky Star:** Player with the highest `bonus_penalty_net` score.
*   **The Taxpayer:** Player with the lowest (most negative) `bonus_penalty_net` score.

### 2.2 Quality Metrics (Avg Win / Avg Loss)
* **Avg Win Pts:** Measures the structural size of winning hands. Calculated purely using `handFan` for both Chuchong and Zimo wins (ignoring `baseScoreDi` and the `x3` Zimo multiplier).
* **Avg Loss (Deal-in) Pts:** Measures the structural size of hands the player deals into. It is calculated using `handFan` *only* when the player is the explicit `loserId` in a `post-game` event. Losing points passively to someone else's Zimo does not count toward this average.
* **Broker-Wins %:** Calculated as `(Wins as Broker / Total Hands Played as Broker) * 100`. The Broker is identified by matching the `brokerId` of the event to the `winnerId`.

### 2.3 Overall Standings Readability
The main standings table uses a high-readability typographic scale optimized for desktop and PDF viewing:
*   **Primary Metrics:** Net Score is emphasized with a **text-2xl** black font.
*   **Dynamic Indicators:** Next to the name and score, the engine displays **Ranking Deltas (▲/▼/▬)** and **Score Changes**, calculated by taking a state snapshot just before the final match is processed.
*   **Raw Figures:** Wins, Zimos, Deal-ins, and Broker-Wins are displayed in a larger **text-lg** bold font for quick scanning.
*   **Secondary Context:** Percentage-based ratios are displayed as smaller sub-labels beneath raw counts to reduce visual noise.

---

## 3. The Streak Engine

Streaks are highly sensitive to table dynamics and "bystander" status. The script maintains a `current_streaks` dictionary tracking active Win and Loss streaks.

### 3.1 Max Win Streaks
* **Increment:** If a player is in the `winners` array (via Chuchong or Zimo), their `w_streak` increments.
* **Break:** If *anyone else* at the table wins, the player's win streak immediately resets to `0`.
* **Visuals:** Points earned during the streak are displayed in a **Green Badge** showing only the raw numerical value.
* **Ranking:** The report prioritizes the **length of the streak (count)**. If tied, it prioritizes the **total points earned** during that streak.

### 3.2 Max Losing Streaks (Strict Definition)
* **Increment:** A losing streak increments ONLY if a player explicitly loses points in a hand (`hand_scores[p_name] < 0`). This means they either dealt-in (Chuchong) or were forced to pay a Zimo.
* **Break:** The losing streak resets to `0` if the player explicitly wins a hand, or if they are a **Bystander** (Hand score is exactly `0`). *Bystander hands do not "pause" a losing streak; they break it.*
* **Visuals:** Points lost during the streak are displayed in a **Red Badge** showing only the raw numerical value.

---

## 4. Momentum Dynamics (Revenge & Domination)

The engine maps the flow of points between specific pairs of players. Unlike basic streaks, these metrics are stored globally (`self.all_revenges`, `self.all_dominations`) to find the absolute biggest events across all matches.

### 4.1 Pot Creation
A 2D dictionary `streak_pots[winner][loser]` and `active_dominations[winner][loser]` tracks accumulated points. Every time Player A beats Player B, the points and consecutive win count are added to the pot.

### 4.2 Biggest Dominations & Worst Beatdowns
* The script monitors `active_dominations` until the pot is broken (via a third-party win, a revenge, or the game ending).
* Once broken, the final peak total is flushed to the `all_dominations` list. 
* In the report, **Dominations** are ranked by the length of consecutive wins, then by total points scored. **Worst Beatdowns** represents the exact same data but flips the perspective to show the victim.

### 4.3 Pot Breaking & Revenge Rate
* **Taking Revenge:** If Player B wins a hand against Player A while `streak_pots[A][B] > 0`, Player B "takes revenge". The `rev_pts` are calculated as 50% of the pot, and the event is flushed to `all_revenges`.
* **Neutralization:** If Player C wins a hand, all active pots between *all non-winning players* are neutralized.
* **Revenge Rate %:** Displayed in the main table as `(revenges_taken / pots_created_against_me) * 100`.

---

## 5. Seating Dynamics & Wind Tracking

The script reconstructs the table arrangement hand-by-hand to map psychological pressure and luck based on neighbors. It accounts for Mahjong's **counter-clockwise** rotation logic.

### 5.1 Relative Neighbor Tracking
For every player, the script determines their:
* **Prev Player (上家 / Shangjia):** Index `(i+1)%4` - The player who discards directly before them.
* **Next Player (下家 / Xiajia):** Index `(i+3)%4` - The player who discards directly after them.

*Note: Mid-game overrides (`type: 'manual-override', subtype: 'seating'`) dynamically alter this array mid-match.*

For each permutation, the engine tracks Hands, Wins, Zimos, Deal-ins, and Net Pts. In the HTML generator, these are rendered as high-contrast mini-cards that quickly highlight profitable (green) vs disastrous (red) seating arrangements.

---

## 6. AI Commentary Integration

To make the report lively, the report utilizes a decoupled AI text injection system.

* **File:** `analytics/ai_comments.json`
* **Mechanism:** Before generating the final HTML, the script attempts to load this JSON file. It maps the commentary string to the respective player's card at the bottom of the report.

### 6.1 Guidelines for AI Analysis (Prompting Instructions)
When future AI agents are tasked with updating `ai_comments.json`, they must adhere to the following analytical constraints to ensure accuracy and tone:
* **Tone:** Playful, slightly dramatic, but deeply rooted in statistical reality (e.g., using terms like "Mahjong Gods," "Iron Wall," "The Ghost," or "Character-building arc"). Use the preferred pronouns associated with the player names (e.g., he/him for WIL, JER, CHI, FU).
* **Cross-Referencing Stats:** Do not look at Net Score in a vacuum. A high Net Score with a low Win Rate indicates superior defense (low Deal-in %). A massive negative Net Score with an average Win Rate means the player is building hands but failing to fold under pressure.
* **Interpreting Seating Dynamics:** *Crucial Constraint.* When analyzing `shangjia_stats` (Prev Player) and `xiajia_stats` (Next Player), the `net_score` represents the total points the subject won/lost *while sitting in that specific environmental arrangement*. **It does NOT mean they stole those points directly from that neighbor.** Frame seating analysis around "environmental pressure," "table flow," "downstream starvation," or "seating luck" rather than direct theft.
* **Upstream Win Rate Control:** In addition to net score, calculate and reference how a player's *Win Rate* fluctuates based on who sits immediately upstream (Prev Player). This angle explains *why* the environment is good or bad (e.g., "Player A knows exactly how to read Player B's discards, resulting in a 31% win rate when sitting after them").
* **The Fatigue Index:** Check if a player's Deal-in rate spikes in the late stages (Stage 8-10). If so, call out their "burnout" or "lack of stamina."

---

## 7. Cinematic Highlights & Visuals

### 7.1 Match Highlights (Clutch Moments)
The report features a cinematic "Match Highlights" section that identifies peak performance moments:
*   **🚨 The Buzzer Beater:** Identifies the highest-scoring hand occurring in the North Wind (late-game). It tracks the specific point swing and calculates the **rank shift** (e.g., Rank 3 -> Rank 1) caused by the hand using a simulated match standings snapshot.
*   **👑 The Broker's Reign:** Highlights the longest unbroken winning streak as a **Broker** (Lianzhuang), including the total points accumulated during the "reign."

### 7.2 Visual Analytics
Located after seating dynamics, this section provides detailed data visualizations powered by **Chart.js** with standardized icon-based titles:
*   **🔥 Hand Quality Distribution:** Four individual bar charts (one per player) showing the frequency of winning hand sizes measured in **Fan**.
*   **⛓️ The Food Chain:** A horizontal stacked bar chart showing point flow—visualizing exactly which opponents a player scores their points against.
*   **🧠 Fatigue Index:** A line chart measuring **Deal-in Rate (%)** over 10 normalized match stages. It maps every match into 10% progress segments to standardize endurance analysis across matches of varying lengths. Sharp spikes in the late stages indicate a "Burnout" signature. The line chart uses **zero tension** (straight lines) for clearer observation of stage-by-stage spikes.

---

## 8. UI & Export Optimization
*   **Aesthetics:** The report uses a professional **bg-slate-50** background to make white content cards stand out.
*   **Trophy Layout:** Hero metrics are displayed in a **2-row, 4-column grid** to balance technical performance and event-driven achievements.
*   **Exporting:** The report is optimized for **Chrome Print-to-PDF**. It uses specialized `print:` Tailwind classes to preserve multi-column layouts and hide interactive elements (like buttons) during the export process.
*   **Flow:** All manual page breaks have been removed to allow for a continuous, seamless scrolling and capturing experience.
*   **Maintenance:** Adding new players or modifying charts requires updating the `normalize_name` function or the `export_html` method respectively within `analytics/analyze.py`.
