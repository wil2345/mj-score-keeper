import json
import sys

def check_rotation(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return

    config_seating = data.get('config', {}).get('seating', [1, 2, 3, 4])
    players = {p['id']: p['name'] for p in data.get('players', [])}
    
    history = data.get('gameHistory', [])
    
    current_seating = list(config_seating)
    
    # determine initial broker
    current_broker = None
    if history and history[0].get('brokerId'):
        current_broker = history[0]['brokerId']
    else:
        current_broker = current_seating[0]
        
    rotation_count = 0
    
    print(f"{'Idx':<4} | {'Type':<17} | {'File Rot':<8} | {'Sim Rot':<7} | {'Sim Broker':<10} | {'Seating'}")
    print("-" * 80)
    
    for idx, event in enumerate(history):
        e_type = event.get('type')
        e_rot = event.get('rotationCount', '-')
        
        if e_type == 'manual-override':
            subtype = event.get('subtype')
            if subtype == 'rotation':
                rotation_count = event.get('newValue')
            elif subtype == 'dealer':
                current_broker = event.get('newBrokerId')
            elif subtype == 'seating':
                current_seating = event.get('seating')
                
            print(f"{idx:<4} | {'OVERRIDE '+subtype:<17} | {e_rot:<8} | {rotation_count:<7} | {players.get(current_broker, str(current_broker)):<10} | {current_seating}")
            continue
            
        print(f"{idx:<4} | {e_type:<17} | {e_rot:<8} | {rotation_count:<7} | {players.get(current_broker, str(current_broker)):<10} | {current_seating}")
        
        # Check rotation logic for game events
        broker_won = False
        if e_type == 'zimo':
            if event.get('winnerId') == current_broker:
                broker_won = True
        elif e_type == 'post-game':
            winners = event.get('winnerIds', [])
            if not winners and event.get('winnerDetails'):
                winners = [w['winnerId'] for w in event.get('winnerDetails')]
            if current_broker in winners:
                broker_won = True
                
        if e_type in ['zimo', 'post-game']:
            if not broker_won:
                # Rotate
                try:
                    curr_idx = current_seating.index(current_broker)
                    next_idx = (curr_idx - 1 + len(current_seating)) % len(current_seating)
                    current_broker = current_seating[next_idx]
                except ValueError:
                    pass
                rotation_count += 1
        elif e_type == 'draw':
             try:
                 curr_idx = current_seating.index(current_broker)
                 next_idx = (curr_idx - 1 + len(current_seating)) % len(current_seating)
                 current_broker = current_seating[next_idx]
             except ValueError:
                 pass
             rotation_count += 1

if __name__ == '__main__':
    check_rotation('data/mahjong_score_keeper_match_1772849758737.json')
