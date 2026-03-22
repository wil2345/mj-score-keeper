import json
import os
import glob
from collections import defaultdict
from datetime import datetime, timedelta
import argparse
import random

def normalize_name(name):
    name = name.strip().upper()
    return name

def get_wind_round_string(rotation_count):
    if rotation_count is None:
        return ""
    winds = ["東", "南", "西", "北"]
    wind_idx = (rotation_count // 4) % 4
    game_idx = (rotation_count % 4)
    cycle = (rotation_count // 16) + 1
    
    wind_name = winds[wind_idx]
    game_name = winds[game_idx]
    
    return f"Round {cycle}, {wind_name}風{game_name}局"

class MahjongAnalytics:
    def __init__(self, data_dir, anonymous=False):
        self.data_dir = data_dir
        self.anonymous = anonymous
        self.anon_mapping = {}
        self.anon_counter = 1
        self.matches = []
        self.player_stats = defaultdict(lambda: {
            "matches_played": 0,
            "net_score": 0.0,
            "wins_chuchong": 0,
            "wins_zimo": 0,
            "deal_ins": 0,
            "total_fan_won": 0,
            "total_fan_lost": 0,
            "max_fan": 0,
            "bonus_penalty_net": 0.0,
            "rounds_played": 0,
            "total_points_lost": 0.0,
            "loss_count": 0,
            "max_win_streak": 0,
            "max_win_pts_in_streak": 0.0,
            "max_win_streak_date": "",
            "max_dealin_streak": 0,
            "max_dealin_pts_in_streak": 0.0,
            "max_dealin_streak_date": "",
            "revenges_taken": 0,
            "biggest_revenge_pts": 0.0,
            "biggest_revenge_date": "",
            "biggest_revenge_against": "",
            "pots_created_against_me": 0,
            "rounds_as_broker": 0,
            "wins_as_broker": 0
        })
        self.nemesis_matrix = defaultdict(lambda: defaultdict(lambda: {"deal_ins": 0, "points_fed": 0.0}))
        self.all_revenges = []
        self.all_dominations = []
        self.all_win_streaks = []
        self.all_loss_streaks = []
        self.player_fan_distribution = defaultdict(lambda: defaultdict(int))
        self.highlights = {
            "buzzer_beater": {"player": "-", "pts": 0, "fan": 0, "desc": "-", "rank_before": 0, "rank_after": 0},
            "broker_reign": {"player": "-", "streak": 0, "pts": 0, "desc": "-"}
        }
        
        self.shangjia_stats = defaultdict(lambda: defaultdict(lambda: {"hands": 0, "wins": 0, "zimos": 0, "deal_ins": 0, "net_score": 0.0}))
        self.xiajia_stats = defaultdict(lambda: defaultdict(lambda: {"hands": 0, "wins": 0, "zimos": 0, "deal_ins": 0, "net_score": 0.0}))
        self.total_hands_sum = 0
        self.total_duration_seconds = 0.0
        
        # Stamina Curve Tracking (10 Stages: 0-9)
        self.stamina_stats = defaultdict(lambda: defaultdict(lambda: {"pts": 0.0, "deal_ins": 0, "hands": 0}))

    def get_current_ranks(self):
        sorted_players = sorted(self.player_stats.items(), key=lambda x: x[1]["net_score"], reverse=True)
        ranks = {}
        for idx, (p, _) in enumerate(sorted_players):
            ranks[p] = idx + 1
        return ranks

    def load_data(self):
        filepaths = sorted(glob.glob(os.path.join(self.data_dir, '*.json')))
        for filepath in filepaths:
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    self.matches.append(data)
                except json.JSONDecodeError:
                    print(f"Error reading {filepath}")

    def run(self, output_file="analytics/report.html"):
        self.load_data()
        print(f"Loaded {len(self.matches)} matches for analysis.\n")
        
        self.previous_ranks = {}
        self.previous_scores = {}
        for i, match in enumerate(self.matches):
            if i == len(self.matches) - 1 and len(self.matches) > 1:
                self.previous_ranks = self.get_current_ranks()
                self.previous_scores = {p: s["net_score"] for p, s in self.player_stats.items()}
            self.analyze_match(match)
            
        self.current_ranks = self.get_current_ranks()
        if not self.previous_ranks and len(self.matches) <= 1:
            self.previous_ranks = self.current_ranks
            self.previous_scores = {p: s["net_score"] for p, s in self.player_stats.items()}
            
        self.print_overall_standings()
        self.export_html(output_file)

    def _get_player_name(self, original_name):
        norm_name = normalize_name(original_name)
        if not self.anonymous:
            return norm_name
            
        if norm_name not in self.anon_mapping:
            self.anon_mapping[norm_name] = f"P{self.anon_counter}"
            self.anon_counter += 1
            
        return self.anon_mapping[norm_name]

    def analyze_match(self, match):
        players_by_id = {}
        for p in match.get("players", []):
            name = self._get_player_name(p.get("name", f"Player {p['id']}"))
            players_by_id[p["id"]] = name
            self.player_stats[name]["matches_played"] += 1
            # Match score mapping
            self.player_stats[name]["net_score"] += p.get("score", 0.0)
            
        history = match.get("gameHistory", [])
        if history:
            # Sort history by timestamp to find start and end
            # Some entries might not have timestamps, so filter them
            valid_events = [e for e in history if e.get("timestamp")]
            if valid_events:
                # ISO timestamps like 2026-03-22T05:35:30.275Z
                try:
                    ts_format = "%Y-%m-%dT%H:%M:%S.%fZ"
                    start_ts = datetime.strptime(valid_events[0]["timestamp"], ts_format)
                    end_ts = datetime.strptime(valid_events[-1]["timestamp"], ts_format)
                    duration = (end_ts - start_ts).total_seconds()
                    # Only add if it's a reasonable positive duration (e.g., > 1 minute)
                    if duration > 60:
                        self.total_duration_seconds += duration
                except Exception as e:
                    # Fallback for slightly different formats if any
                    try:
                        ts_format = "%Y-%m-%dT%H:%M:%SZ"
                        start_ts = datetime.strptime(valid_events[0]["timestamp"], ts_format)
                        end_ts = datetime.strptime(valid_events[-1]["timestamp"], ts_format)
                        duration = (end_ts - start_ts).total_seconds()
                        if duration > 60:
                            self.total_duration_seconds += duration
                    except:
                        pass

        seating = match.get("config", {}).get("seating", [])
        base_score_di = match.get("config", {}).get("baseScoreDi", 5)
        
        current_streaks = defaultdict(lambda: {"w_streak": 0, "w_pts": 0.0, "w_start_date": "", "l_streak": 0, "l_pts": 0.0, "l_start_date": ""})
        streak_pots = defaultdict(lambda: defaultdict(float))
        active_dominations = defaultdict(lambda: defaultdict(lambda: {"pts": 0.0, "date": "", "wins": 0}))
        
        def reset_domination(p1, p2):
            if active_dominations[p1][p2]["pts"] > 0:
                self.all_dominations.append({
                    "player": p1,
                    "against": p2,
                    "pts": active_dominations[p1][p2]["pts"],
                    "wins": active_dominations[p1][p2]["wins"],
                    "date": active_dominations[p1][p2]["date"]
                })
                active_dominations[p1][p2]["pts"] = 0.0
                active_dominations[p1][p2]["wins"] = 0
                active_dominations[p1][p2]["date"] = ""
        
        current_broker_id = None
        broker_reign_streak = 0
        broker_reign_pts = 0
        
        match_running_scores = defaultdict(float)
        
        def get_rank(p_name, scores_dict):
            # Sort players by score descending
            sorted_players = sorted(scores_dict.items(), key=lambda x: x[1], reverse=True)
            for i, (name, score) in enumerate(sorted_players):
                if name == p_name:
                    return i + 1
            return 4 # Default to last if not found
            
        # First pass: count total valid hands to determine stage lengths
        total_valid_hands = sum(1 for e in history if e.get("type") in ["post-game", "zimo"])
        self.total_hands_sum += total_valid_hands
        current_hand_index = 0

        for event in history:
            evt_type = event.get("type")
            evt_date = event.get("timestamp", "")[:10]  # Extracts YYYY-MM-DD
            rot_count = event.get("rotationCount", 0)
            wind_str = get_wind_round_string(rot_count)
            full_date_str = f"{evt_date} {wind_str}" if evt_date else wind_str
            
            # HANDLE SEAT CHANGE MID-GAME
            if evt_type == "manual-override" and event.get("subtype") == "seating":
                seating = event.get("seating", seating)
                continue
                
            broker_id = event.get("brokerId")
            if evt_type not in ["post-game", "zimo", "in-game", "surrender"]:
                continue
                
            if evt_type in ["post-game", "zimo"]:
                for p_id in players_by_id:
                    self.player_stats[players_by_id[p_id]]["rounds_played"] += 1
                broker_name = players_by_id.get(broker_id)
                if broker_name:
                    self.player_stats[broker_name]["rounds_as_broker"] += 1
                    
                # Track Stage
                stage_idx = 0
                if total_valid_hands > 0:
                    stage_idx = int((current_hand_index / total_valid_hands) * 10)
                    if stage_idx == 10: stage_idx = 9 # cap at 9
                current_hand_index += 1
                for p_name in players_by_id.values():
                    self.stamina_stats[p_name][stage_idx]["hands"] += 1
                
            hand_scores = defaultdict(float)
            winners = []
            loser = None

            if evt_type == "post-game":
                loser_id = event.get("loserId")
                loser = players_by_id.get(loser_id, "Unknown")
                self.player_stats[loser]["deal_ins"] += 1
                self.stamina_stats[loser][stage_idx]["deal_ins"] += 1
                for w_detail in event.get("winnerDetails", []):
                    w_id = w_detail.get("winnerId")
                    w_name = players_by_id.get(w_id, "Unknown")
                    fan = w_detail.get("handFan", 0)
                    self.player_fan_distribution[w_name][fan] += 1
                    score = w_detail.get("finalScore", 0)
                    self.player_stats[w_name]["wins_chuchong"] += 1
                    self.player_stats[w_name]["total_fan_won"] += fan
                    self.player_stats[loser]["total_fan_lost"] += fan
                    self.player_stats[w_name]["max_fan"] = max(self.player_stats[w_name]["max_fan"], fan)
                    self.nemesis_matrix[loser][w_name]["deal_ins"] += 1
                    self.nemesis_matrix[loser][w_name]["points_fed"] += score
                    hand_scores[w_name] += score
                    hand_scores[loser] -= score
                    winners.append(w_name)
                    
                    if streak_pots[loser][w_name] > 0:
                        self.player_stats[w_name]["revenges_taken"] += 1
                        rev_pts = streak_pots[loser][w_name] * 0.5
                        self.all_revenges.append({"player": w_name, "against": loser, "pts": rev_pts, "date": full_date_str})
                        streak_pots[loser][w_name] = 0.0
                        reset_domination(loser, w_name)
                        
                    if streak_pots[w_name][loser] == 0:
                        self.player_stats[loser]["pots_created_against_me"] += 1
                    streak_pots[w_name][loser] += score
                    
                    if active_dominations[w_name][loser]["pts"] == 0:
                        active_dominations[w_name][loser]["date"] = full_date_str
                    active_dominations[w_name][loser]["pts"] += score
                    active_dominations[w_name][loser]["wins"] += 1

            elif evt_type == "zimo":
                w_id = event.get("winnerId")
                w_name = players_by_id.get(w_id, "Unknown")
                fan = event.get("handFan", 0)
                self.player_fan_distribution[w_name][fan] += 1
                self.player_stats[w_name]["wins_zimo"] += 1
                
                self.player_stats[w_name]["total_fan_won"] += fan
                self.player_stats[w_name]["max_fan"] = max(self.player_stats[w_name]["max_fan"], fan)
                winners.append(w_name)
                for l_detail in event.get("loserDetails", []):
                    l_id = l_detail.get("loserId")
                    l_name = players_by_id.get(l_id, "Unknown")
                    score = l_detail.get("score", 0)
                    hand_scores[w_name] += score
                    hand_scores[l_name] -= score
                    
                    self.stamina_stats[w_name][stage_idx]["pts"] += score
                    self.stamina_stats[l_name][stage_idx]["pts"] -= score
                    
                    # Revenge check
                    if streak_pots[l_name][w_name] > 0:
                        self.player_stats[w_name]["revenges_taken"] += 1
                        rev_pts = streak_pots[l_name][w_name] * 0.5
                        self.all_revenges.append({"player": w_name, "against": l_name, "pts": rev_pts, "date": full_date_str})
                        streak_pots[l_name][w_name] = 0.0
                        reset_domination(l_name, w_name)
                        
                    if streak_pots[w_name][l_name] == 0:
                        self.player_stats[l_name]["pots_created_against_me"] += 1
                    streak_pots[w_name][l_name] += score
                    
                    if active_dominations[w_name][l_name]["pts"] == 0:
                        active_dominations[w_name][l_name]["date"] = full_date_str
                    active_dominations[w_name][l_name]["pts"] += score
                    active_dominations[w_name][l_name]["wins"] += 1
                    
            elif evt_type == "in-game":
                p_id = event.get("playerId")
                p_name = players_by_id.get(p_id, "Unknown")
                score = event.get("score", 0)
                self.player_stats[p_name]["bonus_penalty_net"] += score
                # Do NOT affect hand_scores for streaks because in-game adjustments do not count towards streaks
                for other_id in players_by_id:
                    if other_id != p_id:
                        other_name = players_by_id[other_id]
                        self.player_stats[other_name]["bonus_penalty_net"] -= score / 3.0
            
            elif evt_type == "surrender":
                w_id, l_id = event.get("winnerId"), event.get("loserId")
                w_name, l_name = players_by_id.get(w_id), players_by_id.get(l_id)
                if w_name and l_name: 
                    streak_pots[w_name][l_name] = 0.0
                    streak_pots[l_name][w_name] = 0.0
                    reset_domination(w_name, l_name)
                    reset_domination(l_name, w_name)

            if seating and len(seating) == 4:
                for i in range(4):
                    subj_id = seating[i]
                    subj = players_by_id.get(subj_id)
                    if not subj: continue
                    
                    shang_id = seating[(i+1)%4]
                    shang = players_by_id.get(shang_id)
                    
                    xia_id = seating[(i+3)%4]
                    xia = players_by_id.get(xia_id)
                    
                    if shang:
                        self.shangjia_stats[subj][shang]["net_score"] += hand_scores.get(subj, 0.0)
                        if evt_type in ["post-game", "zimo"]:
                            self.shangjia_stats[subj][shang]["hands"] += 1
                            if subj in winners: 
                                self.shangjia_stats[subj][shang]["wins"] += 1
                                if evt_type == "zimo":
                                    self.shangjia_stats[subj][shang]["zimos"] += 1
                            if subj == loser: 
                                self.shangjia_stats[subj][shang]["deal_ins"] += 1
                                
                    if xia:
                        self.xiajia_stats[subj][xia]["net_score"] += hand_scores.get(subj, 0.0)
                        if evt_type in ["post-game", "zimo"]:
                            self.xiajia_stats[subj][xia]["hands"] += 1
                            if subj in winners: 
                                self.xiajia_stats[subj][xia]["wins"] += 1
                                if evt_type == "zimo":
                                    self.xiajia_stats[subj][xia]["zimos"] += 1
                            if subj == loser: 
                                self.xiajia_stats[subj][xia]["deal_ins"] += 1

            if evt_type in ["post-game", "zimo"]:
                broker_name = players_by_id.get(broker_id)
                
                # --- HIGHLIGHTS: THE BROKER'S REIGN ---
                if broker_id != current_broker_id:
                    current_broker_id = broker_id
                    broker_reign_streak = 0
                    broker_reign_pts = 0
                    
                if broker_name in winners:
                    broker_reign_streak += 1
                    broker_reign_pts += hand_scores[broker_name]
                    if broker_reign_streak > self.highlights["broker_reign"]["streak"] or (broker_reign_streak == self.highlights["broker_reign"]["streak"] and broker_reign_pts > self.highlights["broker_reign"]["pts"]):
                        self.highlights["broker_reign"] = {
                            "player": broker_name,
                            "streak": broker_reign_streak,
                            "pts": broker_reign_pts,
                            "desc": full_date_str
                        }
                else:
                    broker_reign_streak = 0
                    broker_reign_pts = 0
                
                # --- HIGHLIGHTS: THE BUZZER BEATER ---
                wind_idx = (rot_count // 4) % 4
                if wind_idx == 3: # North Wind (Late game)
                    for w_name in winners:
                        pts_won = hand_scores[w_name]
                        # Find the fan for this specific hand
                        hand_fan = event.get("handFan", 0) # default for zimo
                        if evt_type == "post-game":
                            for w_detail in event.get("winnerDetails", []):
                                if players_by_id.get(w_detail.get("winnerId")) == w_name:
                                    hand_fan = w_detail.get("handFan", 0)
                                    break
                                    
                        if pts_won > self.highlights["buzzer_beater"]["pts"]:
                            rank_before = get_rank(w_name, match_running_scores)
                            
                            # Simulate the rank after this specific hand is applied
                            simulated_scores = match_running_scores.copy()
                            for p_name, p_score in hand_scores.items():
                                simulated_scores[p_name] += p_score
                            rank_after = get_rank(w_name, simulated_scores)
                                
                            self.highlights["buzzer_beater"] = {
                                "player": w_name,
                                "pts": pts_won,
                                "fan": hand_fan,
                                "desc": full_date_str,
                                "rank_before": rank_before,
                                "rank_after": rank_after
                            }

                for w_name in winners:
                    if w_name == broker_name: self.player_stats[w_name]["wins_as_broker"] += 1
                for p_a in players_by_id.values():
                    if p_a not in winners:
                        for p_b in players_by_id.values(): 
                            if streak_pots[p_a][p_b] > 0 or active_dominations[p_a][p_b]["pts"] > 0:
                                streak_pots[p_a][p_b] = 0.0
                                reset_domination(p_a, p_b)
                        
                for p_name in players_by_id.values():
                    if p_name in winners:
                        # Winning streak continues
                        if current_streaks[p_name]["w_streak"] == 0:
                            current_streaks[p_name]["w_start_date"] = full_date_str # Mark start of streak
                        
                        current_streaks[p_name]["w_streak"] += 1
                        current_streaks[p_name]["w_pts"] += hand_scores[p_name]
                        
                        # Update all-time personal bests
                        if current_streaks[p_name]["w_streak"] > self.player_stats[p_name]["max_win_streak"] or (current_streaks[p_name]["w_streak"] == self.player_stats[p_name]["max_win_streak"] and current_streaks[p_name]["w_pts"] > self.player_stats[p_name]["max_win_pts_in_streak"]):
                            self.player_stats[p_name]["max_win_streak"] = current_streaks[p_name]["w_streak"]
                            self.player_stats[p_name]["max_win_pts_in_streak"] = current_streaks[p_name]["w_pts"]
                            self.player_stats[p_name]["max_win_streak_date"] = current_streaks[p_name]["w_start_date"]
                            
                        # Breaking their losing streak because they won
                        if current_streaks[p_name]["l_streak"] >= 2:  # Only log meaningful streaks
                            self.all_loss_streaks.append({"player": p_name, "streak": current_streaks[p_name]["l_streak"], "pts": current_streaks[p_name]["l_pts"], "date": current_streaks[p_name]["l_start_date"]})
                        current_streaks[p_name]["l_streak"] = 0
                        current_streaks[p_name]["l_pts"] = 0.0
                        current_streaks[p_name]["l_start_date"] = ""
                    else:
                        # They did not win, so their winning streak resets
                        if current_streaks[p_name]["w_streak"] >= 2: # Only log meaningful streaks
                            self.all_win_streaks.append({"player": p_name, "streak": current_streaks[p_name]["w_streak"], "pts": current_streaks[p_name]["w_pts"], "date": current_streaks[p_name]["w_start_date"]})
                        current_streaks[p_name]["w_streak"] = 0
                        current_streaks[p_name]["w_pts"] = 0.0
                        current_streaks[p_name]["w_start_date"] = ""
                        
                        # Did they lose points?
                        if hand_scores[p_name] < 0:
                            # Only count towards deal-in average if they were the specific loser in a post-game (chuchong) event
                            if evt_type == "post-game" and p_name == loser:
                                self.player_stats[p_name]["total_points_lost"] += abs(hand_scores[p_name])
                                self.player_stats[p_name]["loss_count"] += 1
                                
                            if current_streaks[p_name]["l_streak"] == 0:
                                current_streaks[p_name]["l_start_date"] = full_date_str # Mark start of streak
                                
                            current_streaks[p_name]["l_streak"] += 1
                            current_streaks[p_name]["l_pts"] += abs(hand_scores[p_name])
                            
                            # Update all-time personal bests
                            if current_streaks[p_name]["l_streak"] > self.player_stats[p_name]["max_dealin_streak"] or (current_streaks[p_name]["l_streak"] == self.player_stats[p_name]["max_dealin_streak"] and current_streaks[p_name]["l_pts"] > self.player_stats[p_name]["max_dealin_pts_in_streak"]):
                                self.player_stats[p_name]["max_dealin_streak"] = current_streaks[p_name]["l_streak"]
                                self.player_stats[p_name]["max_dealin_pts_in_streak"] = current_streaks[p_name]["l_pts"]
                                self.player_stats[p_name]["max_dealin_streak_date"] = current_streaks[p_name]["l_start_date"]
                        else:
                            # They didn't win, but they didn't lose points either (Bystander). This breaks the losing streak.
                            if current_streaks[p_name]["l_streak"] >= 2:
                                self.all_loss_streaks.append({"player": p_name, "streak": current_streaks[p_name]["l_streak"], "pts": current_streaks[p_name]["l_pts"], "date": current_streaks[p_name]["l_start_date"]})
                            current_streaks[p_name]["l_streak"] = 0
                            current_streaks[p_name]["l_pts"] = 0.0
                            current_streaks[p_name]["l_start_date"] = ""
                            
            # Update running scores for rank tracking
            for p_name, score in hand_scores.items():
                match_running_scores[p_name] += score
                            
        # Flush any active dominations and streaks at the end of the match
        for p_name in players_by_id.values():
            if current_streaks[p_name]["w_streak"] >= 2:
                self.all_win_streaks.append({"player": p_name, "streak": current_streaks[p_name]["w_streak"], "pts": current_streaks[p_name]["w_pts"], "date": current_streaks[p_name]["w_start_date"]})
            if current_streaks[p_name]["l_streak"] >= 2:
                self.all_loss_streaks.append({"player": p_name, "streak": current_streaks[p_name]["l_streak"], "pts": current_streaks[p_name]["l_pts"], "date": current_streaks[p_name]["l_start_date"]})
        for p1 in list(players_by_id.values()):
            for p2 in list(players_by_id.values()):
                reset_domination(p1, p2)

    def generate_ai_commentary(self):
        commentary_file = os.path.join(os.path.dirname(__file__), "ai_comments.json")
        if os.path.exists(commentary_file):
            with open(commentary_file, 'r', encoding='utf-8') as f: 
                raw_comments = json.load(f)
                
            if not self.anonymous:
                return raw_comments
                
            anon_comments = {}
            for p, comment in raw_comments.items():
                p_norm = normalize_name(p)
                anon_p = self.anon_mapping.get(p_norm, p_norm)
                
                anon_text = comment
                # Replace real names with anonymous names in the text
                for real_name, fake_name in self.anon_mapping.items():
                    anon_text = anon_text.replace(real_name, fake_name)
                    
                anon_comments[anon_p] = anon_text
            return anon_comments
            
        return {p: "Analysis pending." for p in self.player_stats.keys()}

    def print_overall_standings(self):
        print("="*60)
        print("  OVERALL PLAYER STANDINGS")
        print("="*60)
        print(f"{'Player':<10} | {'Net Score':<10} | {'Win Rate':<9} | {'Broker-Wins':<12}")
        for p, s in sorted(self.player_stats.items(), key=lambda x: x[1]["net_score"], reverse=True):
            tw = s["wins_chuchong"] + s["wins_zimo"]
            wr = (tw / s["rounds_played"] * 100) if s["rounds_played"] > 0 else 0
            bwr = (s["wins_as_broker"] / s["rounds_as_broker"] * 100) if s["rounds_as_broker"] > 0 else 0
            print(f"{p:<10} | {s['net_score']:<10.1f} | {wr:>6.1f}%   | {bwr:>11.1f}%")

    def export_html(self, filename):
        generation_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        players = sorted(self.player_stats.keys())
        sorted_players = sorted(self.player_stats.items(), key=lambda x: x[1]["net_score"], reverse=True)
        ai_comments = self.generate_ai_commentary()
        
        # Calculate time metrics
        total_hours = self.total_duration_seconds / 3600
        avg_time_per_hand_seconds = self.total_duration_seconds / self.total_hands_sum if self.total_hands_sum > 0 else 0
        avg_time_str = f"{int(avg_time_per_hand_seconds // 60)}m {int(avg_time_per_hand_seconds % 60)}s" if avg_time_per_hand_seconds > 0 else "N/A"
        
        def build_seating_html(stats_dict, title, col_header):
            html_str = f'''
            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-gray-800">🪑 {title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">'''
            
            for p in players:
                html_str += f'''
                    <div class="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col">
                        <div class="bg-gray-800 px-4 py-3 border-b border-gray-700">
                            <h3 class="font-bold text-white text-lg tracking-wide">{p}</h3>
                        </div>
                        <div class="p-4 flex-grow space-y-4">'''
                            
                opponents = sorted(stats_dict[p].items(), key=lambda x: x[1]["net_score"], reverse=True)
                for opp, stats in opponents:
                    if stats["hands"] > 0:
                        pts_clr = "text-green-600" if stats["net_score"] >= 0 else "text-red-600"
                        bg_clr = "bg-green-50 border-green-100" if stats["net_score"] >= 0 else "bg-red-50 border-red-100"
                        sign = "+" if stats["net_score"] > 0 else ""
                        
                        win_pct = (stats['wins'] / stats['hands'] * 100)
                        zimo_pct = (stats['zimos'] / stats['hands'] * 100)
                        deal_in_pct = (stats['deal_ins'] / stats['hands'] * 100)
                        
                        html_str += f'''
                            <div class="rounded-xl border-2 p-4 {bg_clr} relative pt-7 mt-4 shadow-sm transition-all hover:shadow-md">
                                <div class="absolute -top-3.5 left-3 bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg text-[10px] font-bold uppercase tracking-widest border border-gray-700">
                                    {col_header} <span class="text-yellow-400 text-sm ml-1 font-black">{opp}</span>
                                </div>
                                <div class="flex justify-between items-end">
                                    <div class="text-2xl font-black {pts_clr} leading-none">{sign}{stats['net_score']:.1f}</div>
                                    <div class="text-[10px] font-black text-gray-400 bg-white/80 px-2 py-1 rounded border border-gray-200 uppercase tracking-tighter">{stats['hands']} Hands</div>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-300/40">
                                    <div class="text-center">
                                        <div class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Win</div>
                                        <div class="font-black text-green-700 text-sm">{stats['wins']} <span class="text-[9px] font-normal text-gray-400">({win_pct:.0f}%)</span></div>
                                    </div>
                                    <div class="text-center border-l border-gray-300/40">
                                        <div class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Zimo</div>
                                        <div class="font-black text-indigo-700 text-sm">{stats['zimos']} <span class="text-[9px] font-normal text-gray-400">({zimo_pct:.0f}%)</span></div>
                                    </div>
                                    <div class="text-center border-l border-gray-300/40">
                                        <div class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Deal-in</div>
                                        <div class="font-black text-red-700 text-sm">{stats['deal_ins']} <span class="text-[9px] font-normal text-gray-400">({deal_in_pct:.0f}%)</span></div>
                                    </div>
                                </div>
                            </div>'''
            
                html_str += '''
                        </div>
                    </div>'''
            html_str += '''
                </div>
            </section>'''
            return html_str

        # --- TROPHY CALCULATIONS ---
        shark_p, shark_stats = max(self.player_stats.items(), key=lambda x: x[1]['net_score'])
        shark_val = shark_stats['net_score']
        
        sniper_p, sniper_val = None, 0
        for p, s in self.player_stats.items():
            tw = s["wins_chuchong"] + s["wins_zimo"]
            if tw > 0:
                zp = (s["wins_zimo"] / tw) * 100
                if zp > sniper_val: sniper_p, sniper_val = p, zp
                
        wall_p, wall_val = None, 100
        for p, s in self.player_stats.items():
            if s["rounds_played"] > 0:
                dr = (s["deal_ins"] / s["rounds_played"]) * 100
                if dr < wall_val: wall_p, wall_val = p, dr
                
        boom_p, boom_val = None, 0
        for p, s in self.player_stats.items():
            tw = s["wins_chuchong"] + s["wins_zimo"]
            if tw > 0:
                ap = s["total_fan_won"] / tw
                if ap > boom_val: boom_p, boom_val = p, ap

        lucky_p, lucky_stats = max(self.player_stats.items(), key=lambda x: x[1]['bonus_penalty_net'])
        lucky_val = lucky_stats['bonus_penalty_net']

        unlucky_p, unlucky_stats = min(self.player_stats.items(), key=lambda x: x[1]['bonus_penalty_net'])
        unlucky_val = unlucky_stats['bonus_penalty_net']

        avenger_p, avenger_stats = max(self.player_stats.items(), key=lambda x: x[1]['revenges_taken'])
        avenger_val = avenger_stats['revenges_taken']

        # Calculate being avenged
        revenged_counts = defaultdict(int)
        for rev in self.all_revenges:
            revenged_counts[rev["against"]] += 1
        
        target_p = max(revenged_counts.keys(), key=lambda k: revenged_counts[k]) if revenged_counts else "-"
        target_val = revenged_counts[target_p] if revenged_counts else 0
        # ---------------------------

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mahjong Analytics Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="../libs/chart.js"></script>
    <style> body {{ font-family: -apple-system, sans-serif; }} th {{ position: sticky; top: 0; background-color: #f3f4f6; }} </style>
</head>
<body class="bg-slate-50 p-4 md:p-8 text-gray-800 print:bg-white [color-adjust:exact] [-webkit-print-color-adjust:exact]">
    <div class="max-w-7xl mx-auto space-y-8">
        <div class="bg-gray-800 text-white shadow-xl rounded-xl px-8 py-6 border border-gray-300">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 class="text-3xl font-bold">🀄 Taiwan Mahjong Analytics</h1>
                    <p class="text-gray-300 mt-2">Historical Performance Report <span class="text-indigo-400 font-bold ml-2">• {self.total_hands_sum} Hands Analyzed</span> <span class="text-gray-500 text-xs ml-2 font-mono">Generated: {generation_time}</span></p>
                </div>
                <div class="flex gap-4">
                    <div class="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600 text-center">
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Time</div>
                        <div class="text-xl font-black text-indigo-300">{total_hours:.1f}h</div>
                    </div>
                    <div class="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600 text-center">
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Avg/Hand</div>
                        <div class="text-xl font-black text-emerald-300">{avg_time_str}</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- TROPHY ROOM -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4">
            <!-- Row 1: Core Performance -->
            <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 shadow-lg border border-yellow-700 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">🏆</div>
                <div class="text-yellow-100 text-xs font-bold uppercase tracking-wider mb-1">The Shark</div>
                <div class="text-lg font-medium leading-tight">Highest Net Score</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{shark_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">+{shark_val:.1f}</div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 shadow-lg border border-emerald-800 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">🛡️</div>
                <div class="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">The Wall</div>
                <div class="text-lg font-medium leading-tight">Lowest Deal-in %</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{wall_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{wall_val:.1f}%</div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 shadow-lg border border-indigo-700 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">👻</div>
                <div class="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">The Ghost</div>
                <div class="text-lg font-medium leading-tight">Highest Zimo %</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{sniper_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{sniper_val:.1f}%</div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 shadow-lg border border-orange-700 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">🧨</div>
                <div class="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">The Explosive</div>
                <div class="text-lg font-medium leading-tight">Highest Avg Win</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{boom_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{boom_val:.1f} Fan</div>
                </div>
            </div>

            <!-- Row 2: Event & Momentum -->
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 shadow-lg border border-purple-700 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">⚔️</div>
                <div class="text-purple-100 text-xs font-bold uppercase tracking-wider mb-1">The Avenger</div>
                <div class="text-lg font-medium leading-tight">Most Revenges Taken</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{avenger_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{avenger_val} Times</div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl p-5 shadow-lg border border-rose-800 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">🎯</div>
                <div class="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">The Target</div>
                <div class="text-lg font-medium leading-tight">Most Times Avenged</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{target_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{target_val} Times</div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-5 shadow-lg border border-pink-700 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">✨</div>
                <div class="text-pink-100 text-xs font-bold uppercase tracking-wider mb-1">The Lucky Star</div>
                <div class="text-lg font-medium leading-tight">Highest Bonus Net</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{lucky_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{"+" if lucky_val > 0 else ""}{lucky_val:.1f} Pts</div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-5 shadow-lg border border-slate-800 text-white relative overflow-hidden">
                <div class="absolute right-[-10px] top-[-10px] opacity-20 text-7xl">💸</div>
                <div class="text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">The Taxpayer</div>
                <div class="text-lg font-medium leading-tight">Lowest Bonus Net</div>
                <div class="mt-3 flex items-end justify-between">
                    <div class="text-3xl font-black">{unlucky_p}</div>
                    <div class="text-xl font-bold bg-black/20 text-white px-3 py-1 rounded print:[backdrop-filter:none] backdrop-blur-sm">{unlucky_val:.1f} Pts</div>
                </div>
            </div>
        </div>

        <div class="bg-gray-50 shadow-xl rounded-xl p-8 space-y-12 border border-gray-300">
            <!-- CLUTCH MOMENTS -->
            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-gray-800">🎬 Match Highlights</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
                    <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg border border-gray-700 text-white relative overflow-hidden flex items-center">
                        <div class="text-5xl mr-6 opacity-80">🚨</div>
                        <div>
                            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">The Buzzer Beater</div>
                            <div class="text-lg font-medium leading-tight mb-2">Biggest Late-Game Swing (North Wind)</div>
                            <div class="flex items-baseline gap-3">
                                <span class="text-3xl font-black text-yellow-400">{self.highlights['buzzer_beater']['player']}</span>
                                <span class="text-xl font-bold bg-white/20 px-2 py-0.5 rounded text-green-300">+{self.highlights['buzzer_beater']['pts']} Pts</span>
                                <span class="text-sm text-gray-300">({self.highlights['buzzer_beater']['fan']} Fan)</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-2 flex items-center gap-2">
                                <span>{self.highlights['buzzer_beater']['desc']}</span>
                                <span class="bg-gray-700/50 px-2 py-0.5 rounded border border-gray-600 font-medium">Rank {self.highlights['buzzer_beater']['rank_before']} -> {self.highlights['buzzer_beater']['rank_after']}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg border border-gray-700 text-white relative overflow-hidden flex items-center">
                        <div class="text-5xl mr-6 opacity-80">👑</div>
                        <div>
                            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">The Broker's Reign</div>
                            <div class="text-lg font-medium leading-tight mb-2">Longest Unbroken Streak as Broker</div>
                            <div class="flex items-baseline gap-3">
                                <span class="text-3xl font-black text-yellow-400">{self.highlights['broker_reign']['player']}</span>
                                <span class="text-xl font-bold bg-white/20 px-2 py-0.5 rounded text-blue-300">{self.highlights['broker_reign']['streak']} Wins</span>
                                <span class="text-sm text-green-400">+{self.highlights['broker_reign']['pts']:.1f} Pts</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-2">{self.highlights['broker_reign']['desc']}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-gray-800">🏆 Overall Standings</h2>
                <div class="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                    <table class="w-full text-left border-collapse bg-white">
                        <thead>
                            <tr class="bg-gray-200 text-gray-600 uppercase text-[10px] tracking-widest border-b border-gray-300">
                                <th class="py-2 px-4 border-r border-gray-300" colspan="2">General</th>
                                <th class="py-2 px-4 border-r border-gray-300 text-center" colspan="2">Scoring Quality</th>
                                <th class="py-2 px-4 text-center" colspan="5">Activity & Frequency</th>
                            </tr>
                            <tr class="bg-gray-100 text-gray-700 uppercase text-xs border-b border-gray-300">
                                <th class="py-3 px-4">Player</th>
                                <th class="py-3 px-4 border-r border-gray-300">Net Score</th>
                                <th class="py-3 px-4 text-center">Avg Win</th>
                                <th class="py-3 px-4 text-center border-r border-gray-300">Avg Loss</th>
                                <th class="py-3 px-4 text-center">Wins</th>
                                <th class="py-3 px-4 text-center">Zimo</th>
                                <th class="py-3 px-4 text-center">Broker-Wins</th>
                                <th class="py-3 px-4 text-center">Deal-ins</th>
                                <th class="py-3 px-4 text-center">Revenges</th>
                            </tr>
                        </thead>
                        <tbody class="text-base">"""
        for p, s in sorted_players:
            tw = s["wins_chuchong"] + s["wins_zimo"]
            wr, zp = (tw/s["rounds_played"]*100) if s["rounds_played"] > 0 else 0, (s["wins_zimo"]/tw*100) if tw > 0 else 0
            bwr = (s["wins_as_broker"]/s["rounds_as_broker"]*100) if s["rounds_as_broker"] > 0 else 0
            dr = (s["deal_ins"]/s["rounds_played"]*100) if s["rounds_played"] > 0 else 0
            ap = (s["total_fan_won"]/tw) if tw > 0 else 0
            alp = (s["total_fan_lost"]/s["deal_ins"]) if s["deal_ins"] > 0 else 0
            rr = (s["revenges_taken"]/s["pots_created_against_me"]*100) if s["pots_created_against_me"] > 0 else 0
            clr = "text-green-600" if s["net_score"] >= 0 else "text-red-600"
            
            rank_delta = self.previous_ranks.get(p, self.current_ranks.get(p, 0)) - self.current_ranks.get(p, 0)
            if rank_delta > 0:
                rank_indicator = f'<span class="text-green-500 text-sm ml-2" title="Up {rank_delta} place(s) since last session">▲ {rank_delta}</span>'
            elif rank_delta < 0:
                rank_indicator = f'<span class="text-red-500 text-sm ml-2" title="Down {abs(rank_delta)} place(s) since last session">▼ {abs(rank_delta)}</span>'
            else:
                rank_indicator = f'<span class="text-gray-400 text-sm ml-2" title="No change in rank">▬</span>'
                
            score_delta = s['net_score'] - self.previous_scores.get(p, s['net_score'])
            if score_delta > 0:
                score_indicator = f'<div class="text-green-500 text-[10px] font-bold tracking-tighter" title="Gained {score_delta:.1f} points since last session">▲ {score_delta:.1f}</div>'
            elif score_delta < 0:
                score_indicator = f'<div class="text-red-500 text-[10px] font-bold tracking-tighter" title="Lost {abs(score_delta):.1f} points since last session">▼ {abs(score_delta):.1f}</div>'
            else:
                score_indicator = f'<div class="text-gray-400 text-[10px] font-bold tracking-tighter" title="No change in score">▬ 0.0</div>'
                
            html += f"""<tr class="border-b hover:bg-gray-50">
                <td class="py-3 px-4 font-black text-gray-900 text-lg flex items-center h-full">{p} {rank_indicator}</td>
                <td class="py-3 px-4 border-r border-gray-200 align-middle">
                    <div class="flex flex-col justify-center">
                        <span class="{clr} font-black text-2xl leading-none">{s['net_score']:.1f}</span>
                        {score_indicator}
                    </div>
                </td>
                <td class="py-3 px-4 font-bold text-indigo-700 text-center text-lg">{ap:.1f}</td>
                <td class="py-3 px-4 font-bold text-pink-700 text-center border-r border-gray-200 text-lg">-{alp:.1f}</td>
                <td class="py-3 px-4 text-center font-bold text-gray-800 text-lg">{tw}<div class="text-[11px] text-gray-400 font-normal">{wr:.1f}%</div></td>
                <td class="py-3 px-4 text-center font-bold text-gray-800 text-lg">{s['wins_zimo']}<div class="text-[11px] text-gray-400 font-normal">{zp:.1f}%</div></td>
                <td class="py-3 px-4 text-center font-bold text-orange-600 text-lg">{s['wins_as_broker']}<div class="text-[11px] text-orange-400 font-normal">{bwr:.1f}%</div></td>
                <td class="py-3 px-4 text-center font-bold text-red-500 text-lg">{s['deal_ins']}<div class="text-[11px] text-red-400 font-normal">{dr:.1f}%</div></td>
                <td class="py-3 px-4 text-center font-bold text-purple-600 text-lg">{s['revenges_taken']}<div class="text-[11px] text-purple-400 font-normal">{rr:.1f}%</div></td>
            </tr>"""
        html += """</tbody></table></div></section>

            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-gray-800">🔥 Streaks & Records</h2>
                <div class="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-6">
                    
                    <!-- Top Row: General Streaks (Takes up 6/12 each) -->
                    <div class="lg:col-span-6 print:col-span-6 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden border-t-4 border-t-green-600">
                        <div class="bg-green-600 px-6 py-3 border-b border-green-700">
                            <h3 class="font-bold text-white flex items-center gap-2"><span class="text-xl">📈</span> Max Win Streaks</h3>
                        </div>
                        <div class="p-6">
                            <ul class="space-y-3">"""
        for streak in sorted(self.all_win_streaks, key=lambda x: (x["streak"], x["pts"]), reverse=True)[:len(players)]:
            html += f'<li class="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-md border border-gray-200"><span class="font-bold text-gray-800">{streak["player"]}</span><div class="text-right flex items-center gap-4"><div class="flex flex-col items-end"><span class="text-lg font-black text-green-700 leading-none">{streak["streak"]} Wins</span><span class="text-[10px] text-gray-400 font-medium tracking-wider mt-1">{streak["date"]}</span></div><div class="text-green-600 font-bold bg-green-100 px-2 py-1 rounded w-24 text-center">+{streak["pts"]:.1f}</div></div></li>'
        html += '''</ul>
                        </div>
                    </div>
                    
                    <div class="lg:col-span-6 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden border-t-4 border-t-red-600">
                        <div class="bg-red-600 px-6 py-3 border-b border-red-700">
                            <h3 class="font-bold text-white flex items-center gap-2"><span class="text-xl">📉</span> Max Losing Streaks</h3>
                        </div>
                        <div class="p-6">
                            <ul class="space-y-3">'''
        for streak in sorted(self.all_loss_streaks, key=lambda x: (x["streak"], x["pts"]), reverse=True)[:len(players)]:
            html += f'<li class="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-md border border-gray-200"><span class="font-bold text-gray-800">{streak["player"]}</span><div class="text-right flex items-center gap-4"><div class="flex flex-col items-end"><span class="text-lg font-black text-red-700 leading-none">{streak["streak"]} Losses</span><span class="text-[10px] text-gray-400 font-medium tracking-wider mt-1">{streak["date"]}</span></div><div class="text-red-600 font-bold bg-red-100 px-2 py-1 rounded w-24 text-center">-{streak["pts"]:.1f}</div></div></li>'
        
        html += '''</ul>
                        </div>
                    </div>

                    <!-- Bottom Row: Inter-player Dynamics (Takes up 4/12 each) -->
                    <div class="lg:col-span-4 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden border-t-4 border-t-purple-600">
                        <div class="bg-purple-600 px-6 py-3 border-b border-purple-700">
                            <h3 class="font-bold text-white flex items-center gap-2"><span class="text-xl">⚔️</span> Biggest Revenges</h3>
                        </div>
                        <div class="p-6">
                            <ul class="space-y-3">'''
        for rev in sorted(self.all_revenges, key=lambda x: x["pts"], reverse=True)[:len(players)]:
            html += f'<li class="flex justify-between bg-gray-50 p-3 rounded-md border border-gray-200"><div><div class="font-bold text-gray-800">{rev["player"]}</div><div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Vs {rev["against"]}</div></div><div class="text-right"><div class="text-purple-600 font-bold text-lg">+{rev["pts"]:.1f}</div><div class="text-xs text-gray-400 mt-0.5">{rev["date"]}</div></div></li>'
        html += '''</ul>
                        </div>
                    </div>
                    
                    <div class="lg:col-span-4 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden border-t-4 border-t-blue-600">
                        <div class="bg-blue-600 px-6 py-3 border-b border-blue-700">
                            <h3 class="font-bold text-white flex items-center gap-2"><span class="text-xl">🎯</span> Biggest Dominations</h3>
                        </div>
                        <div class="p-6">
                            <ul class="space-y-3">'''
        for dom in sorted(self.all_dominations, key=lambda x: (x["wins"], x["pts"]), reverse=True)[:len(players)]:
            html += f'<li class="flex justify-between bg-gray-50 p-3 rounded-md border border-gray-200"><div><div class="font-bold text-gray-800">{dom["player"]}</div><div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Vs {dom["against"]}</div></div><div class="text-right"><div class="text-blue-600 font-bold text-lg">+{dom["pts"]:.1f}</div><div class="text-xs font-medium text-gray-600 mt-0.5">{dom["wins"]} wins <span class="font-normal text-gray-400">({dom["date"]})</span></div></div></li>'
        html += '''</ul>
                        </div>
                    </div>
                    
                    <div class="lg:col-span-4 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden border-t-4 border-t-orange-600">
                        <div class="bg-orange-600 px-6 py-3 border-b border-orange-700">
                            <h3 class="font-bold text-white flex items-center gap-2"><span class="text-xl">💀</span> Worst Beatdowns</h3>
                        </div>
                        <div class="p-6">
                            <ul class="space-y-3">'''
        for dom in sorted(self.all_dominations, key=lambda x: (x["wins"], x["pts"]), reverse=True)[:len(players)]:
            html += f'<li class="flex justify-between bg-gray-50 p-3 rounded-md border border-gray-200"><div><div class="font-bold text-gray-800">{dom["against"]}</div><div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">By {dom["player"]}</div></div><div class="text-right"><div class="text-orange-600 font-bold text-lg">-{dom["pts"]:.1f}</div><div class="text-xs font-medium text-gray-600 mt-0.5">{dom["wins"]} losses <span class="font-normal text-gray-400">({dom["date"]})</span></div></div></li>'
        html += """</ul>
                        </div>
                    </div>

                </div>
            </section>"""

        html += build_seating_html(self.shangjia_stats, "Seating Dynamics (Impact of Prev Player)", "Prev Player:")
        html += build_seating_html(self.xiajia_stats, "Seating Dynamics (Impact of Next Player)", "Next Player:")

        html += """
            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-gray-800">📊 Visual Analytics</h2>
                
                <h3 class="font-bold text-gray-800 mb-4 text-center text-xl">🔥 Hand Quality Distribution</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">"""
        for p in players:
            html += f'''
                    <div class="bg-white p-4 rounded-xl border border-gray-300 shadow-sm">
                        <h4 class="font-bold text-gray-800 mb-2 text-center">{p}</h4>
                        <div class="relative h-64 w-full"><canvas id="fanDistChart_{p}"></canvas></div>
                    </div>'''
        html += """
                </div>
                <br>
                <div class="bg-white p-4 rounded-xl border border-gray-300 shadow-sm mb-6">
                    <h3 class="font-bold text-gray-800 mb-2 text-center">⛓️ The Food Chain</h3>
                    <div class="relative h-96 w-full"><canvas id="foodChainChart"></canvas></div>
                </div>
                <br>
                <div class="bg-white p-4 rounded-xl border border-gray-300 shadow-sm mb-6">
                    <h3 class="font-bold text-gray-800 mb-2 text-center">🧠 Fatigue Index (Deal-in Rate over Stages)</h3>
                    <div class="relative h-96 w-full"><canvas id="staminaChart"></canvas></div>
                </div>
            </section>"""

        html += """
            </div>

        <div class="bg-gray-800 text-white shadow-xl rounded-xl p-8 border border-gray-300">
            <h2 class="text-2xl font-bold mb-6 flex items-center">🤖 AI Player Analysis</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">"""
        for p, comment in ai_comments.items():
            p_upper = p.upper()
            net = self.player_stats.get(p_upper, {}).get('net_score', 0.0)
            clr = "green" if net >= 0 else "red"
            html += f'<div class="bg-white p-6 rounded-lg shadow border-t-4 border-t-{clr}-500"><div class="flex justify-between mb-4"><h3 class="text-xl font-bold text-gray-800">{p_upper}</h3><span class="font-bold text-{clr}-600">{net:+.1f}</span></div><p class="text-gray-600">{comment}</p></div>'
        html += """</div></div><div class="py-4 text-center text-sm text-gray-500">Generated by Taiwan Mahjong Score Keeper Analytics Tool</div></div>"""
        
        # --- CHART DATA PREPARATION ---
        colors = [
            ("rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 1)"), # Blue
            ("rgba(16, 185, 129, 0.2)", "rgba(16, 185, 129, 1)"), # Green
            ("rgba(245, 158, 11, 0.2)", "rgba(245, 158, 11, 1)"), # Yellow/Orange
            ("rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 1)")    # Red
        ]

        # 2. Fan Distribution (Per Player)
        player_fan_chart_data = {}
        for idx, p in enumerate(players):
            if p in self.player_fan_distribution and self.player_fan_distribution[p]:
                sorted_fans = sorted(self.player_fan_distribution[p].items())
                fan_labels = [f"{fan} Fan" for fan, _ in sorted_fans]
                fan_data = [count for _, count in sorted_fans]
                player_fan_chart_data[p] = {
                    "labels": fan_labels,
                    "data": fan_data,
                    "bgColor": colors[idx % len(colors)][0],
                    "borderColor": colors[idx % len(colors)][1]
                }
            else:
                player_fan_chart_data[p] = {"labels": [], "data": [], "bgColor": colors[idx % len(colors)][0], "borderColor": colors[idx % len(colors)][1]}

        # 3. Food Chain
        fc_labels = [name.upper() for name in self.player_stats.keys()]
        fc_datasets = []
        for idx, feeder in enumerate(list(self.player_stats.keys())):
            data = []
            for winner in list(self.player_stats.keys()):
                if winner == feeder:
                    data.append(0)
                else:
                    data.append(self.nemesis_matrix[feeder][winner]["points_fed"])
            fc_datasets.append({
                "label": f"Paid by {feeder.upper()}",
                "data": data,
                "backgroundColor": colors[idx % len(colors)][1]
            })

        # 4. Stamina Curve (Deal-in % per Stage)
        stamina_labels = [f"Stage {i+1}" for i in range(10)]
        stamina_datasets = []
        for idx, p in enumerate(players):
            data = []
            for i in range(10):
                stage_hands = self.stamina_stats[p][i]["hands"]
                stage_deal_ins = self.stamina_stats[p][i]["deal_ins"]
                if stage_hands > 0:
                    deal_in_rate = (stage_deal_ins / stage_hands) * 100
                else:
                    deal_in_rate = 0 # or null/None to skip plotting, but 0 is safer for chart.js out of the box
                data.append(round(deal_in_rate, 1))
            
            stamina_datasets.append({
                "label": p.upper(),
                "data": data,
                "borderColor": colors[idx % len(colors)][1],
                "backgroundColor": colors[idx % len(colors)][0],
                "fill": False,
                "tension": 0,
                "borderWidth": 3,
                "pointRadius": 4,
                "pointHoverRadius": 6
            })

        html += f"""
        <script>
        """

        for p, data in player_fan_chart_data.items():
            html += f"""
        const fanCtx_{p} = document.getElementById('fanDistChart_{p}').getContext('2d');
        new Chart(fanCtx_{p}, {{
            type: 'bar',
            data: {{
                labels: {json.dumps(data['labels'])},
                datasets: [{{
                    label: 'Number of Hands ({p})',
                    data: {json.dumps(data['data'])},
                    backgroundColor: '{data['bgColor']}',
                    borderColor: '{data['borderColor']}',
                    borderWidth: 1
                }}]
            }},
            options: {{ responsive: true, maintainAspectRatio: false, scales: {{ y: {{ beginAtZero: true, ticks: {{ stepSize: 1 }} }} }} }}
        }});"""

        html += f"""
        const fcCtx = document.getElementById('foodChainChart').getContext('2d');
        new Chart(fcCtx, {{
            type: 'bar',
            data: {{
                labels: {json.dumps(fc_labels)},
                datasets: {json.dumps(fc_datasets)}
            }},
            options: {{ 
                responsive: true, maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {{
                    x: {{ stacked: true, title: {{ display: true, text: 'Points Scored' }} }},
                    y: {{ stacked: true }}
                }},
                plugins: {{
                    title: {{ display: false }}
                }}
            }}
        }});
        
        const stamCtx = document.getElementById('staminaChart').getContext('2d');
        new Chart(stamCtx, {{
            type: 'line',
            data: {{
                labels: {json.dumps(stamina_labels)},
                datasets: {json.dumps(stamina_datasets)}
            }},
            options: {{ 
                responsive: true, maintainAspectRatio: false,
                scales: {{
                    y: {{ title: {{ display: true, text: 'Deal-in Rate (%)' }}, min: 0 }},
                    x: {{ title: {{ display: true, text: 'Match Progress (10% Segments)' }} }}
                }},
                plugins: {{
                    title: {{ display: false }},
                    tooltip: {{ mode: 'index', intersect: false }}
                }},
                interaction: {{ mode: 'nearest', axis: 'x', intersect: false }}
            }}
        }});
        </script>
        </body></html>"""

        with open(filename, "w", encoding="utf-8") as f: f.write(html)
        print(f"✅ Successfully exported beautifully styled report to: {os.path.abspath(filename)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mahjong Analytics Report Generator")
    parser.add_argument("--anonymous", action="store_true", help="Generate ONLY the anonymous report")
    args = parser.parse_args()

    if args.anonymous:
        analyzer = MahjongAnalytics("../data", anonymous=True)
        analyzer.run("sanitized_report.html")
    else:
        print("--- GENERATING STANDARD REPORT ---")
        analyzer_std = MahjongAnalytics("../data", anonymous=False)
        analyzer_std.run("report.html")
        
        print("\n--- GENERATING ANONYMOUS REPORT ---")
        analyzer_anon = MahjongAnalytics("../data", anonymous=True)
        analyzer_anon.run("sanitized_report.html")