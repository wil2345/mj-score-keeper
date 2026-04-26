import json
import os
import argparse
from analyze import MahjongAnalytics

def main():
    parser = argparse.ArgumentParser(description="Extract detailed Mahjong statistics for AI commentary drafting.")
    parser.add_argument("--group", type=str, default=None, help="The data group (subdirectory in ../data) to analyze")
    args = parser.parse_args()

    # Determine data directory based on group
    data_path = "../data"
    if args.group:
        data_path = os.path.join(data_path, args.group)
    
    print(f"Extracting stats from: {os.path.abspath(data_path)}\n")

    analyzer = MahjongAnalytics(data_path)
    analyzer.load_data()
    for match in analyzer.matches:
        analyzer.analyze_match(match)

    # Print detailed stats for each player
    output = {}
    for player, stats in analyzer.player_stats.items():
        player_data = {
            "core_stats": stats,
            "shangjia_env": dict(analyzer.shangjia_stats[player]),
            "xiajia_env": dict(analyzer.xiajia_stats[player])
        }
        output[player] = player_data
        
        print(f"=== {player} ===")
        print(f"Net Score: {stats['net_score']}")
        print(f"Win Rate: {(stats['wins_chuchong'] + stats['wins_zimo']) / max(1, stats['rounds_played']) * 100:.1f}%")
        print(f"Deal-in Rate: {stats['deal_ins'] / max(1, stats['rounds_played']) * 100:.1f}%")
        print(f"Max Win Streak: {stats['max_win_streak']} (Points: {stats['max_win_pts_in_streak']})")
        print(f"Bonus/Penalty Net: {stats['bonus_penalty_net']}")
        
        # Highlight interesting seating dynamics
        best_shangjia = max(analyzer.shangjia_stats[player].items(), key=lambda x: x[1]['net_score'], default=(None, {'net_score': 0}))
        worst_shangjia = min(analyzer.shangjia_stats[player].items(), key=lambda x: x[1]['net_score'], default=(None, {'net_score': 0}))
        
        if best_shangjia[0]:
            print(f"Favorite Victim (Prev Player): {best_shangjia[0]} (Net: {best_shangjia[1]['net_score']})")
        if worst_shangjia[0]:
            print(f"Toughest Predator (Prev Player): {worst_shangjia[0]} (Net: {worst_shangjia[1]['net_score']})")
        print("-" * 30 + "\n")

if __name__ == "__main__":
    main()
