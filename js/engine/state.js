import { VERSION } from '../constants.js';
import { calculateMatchup } from './scoring.js';

export function saveGame(gameState) {
    if (!gameState.matchId) return;

    gameState.version = VERSION;
    localStorage.setItem(`mahjong_app_match_${gameState.matchId}`, JSON.stringify(gameState));

    let matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
    const matchIndex = matches.findIndex(m => m.id === gameState.matchId);
    
    const matchMeta = {
        id: gameState.matchId,
        createdAt: gameState.createdAt || new Date().toISOString(),
        lastPlayed: new Date().toISOString(),
        players: [
            gameState.players.slice(0, 2).map(p => `${p.icon} ${p.name}`).join(' | '),
            gameState.players.slice(2, 4).map(p => `${p.icon} ${p.name}`).join(' | ')
        ].join('\n')
    };

    if (matchIndex > -1) {
        matches[matchIndex] = matchMeta;
    } else {
        matches.push(matchMeta);
    }
    
    localStorage.setItem('mahjong_app_matches', JSON.stringify(matches));
}

export function loadMatch(matchId) {
    const savedGame = localStorage.getItem(`mahjong_app_match_${matchId}`);
    if (savedGame) {
        const gameState = JSON.parse(savedGame);
        const savedUndo = localStorage.getItem(`mahjong_app_undo_${matchId}`);
        const undoStack = savedUndo ? JSON.parse(savedUndo) : [];
        return { gameState, undoStack };
    }
    return null;
}

export function deleteMatch(matchId) {
    localStorage.removeItem(`mahjong_app_match_${matchId}`);
    localStorage.removeItem(`mahjong_app_undo_${matchId}`);
    
    let matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
    matches = matches.filter(m => m.id !== matchId);
    localStorage.setItem('mahjong_app_matches', JSON.stringify(matches));
}

export function saveStateForUndo(gameState, undoStack) {
    if (!gameState.matchId) return;
    undoStack.push(JSON.stringify(gameState));
    if (undoStack.length > 50) undoStack.shift(); // keep last 50 states
    localStorage.setItem(`mahjong_app_undo_${gameState.matchId}`, JSON.stringify(undoStack));
}

export function recalculateHistory(state) {
    // Apply defaults if missing
    if (!state.config.decimalRounding) state.config.decimalRounding = 'integer';
    if (!state.config.roundingAdvantage) state.config.roundingAdvantage = 'winner';
    if (state.config.baseScoreDi === undefined) state.config.baseScoreDi = 5;

    // Clean state
    state.players.forEach(p => {
        p.score = 0;
        p.lianZhuangCount = 0;
        p.isBroker = false;
    });
    state.streaks = {};
    state.rotationCount = 0;
    
    const oldHistory = state.gameHistory || [];
    state.gameHistory = [];

    // --- 1. Smart Seating Reconstruction ---
    const brokerSeq = [];
    // 1. Pick up the very first dealer defined in history
    const firstDealerEvent = oldHistory.find(e => (e.type === 'manual-override' && e.subtype === 'dealer') || e.brokerId);
    if (firstDealerEvent) {
        const firstId = firstDealerEvent.newBrokerId || firstDealerEvent.brokerId;
        brokerSeq.push(firstId);
    }

    // 2. Pick up all subsequent transitions
    oldHistory.forEach(e => {
        let bId = null;
        if (e.type === 'manual-override' && e.subtype === 'dealer') bId = e.newBrokerId;
        else if (e.brokerId) bId = e.brokerId;
        
        if (bId && brokerSeq[brokerSeq.length - 1] !== bId) brokerSeq.push(bId);
    });
    const uniqueBrokers = [...new Set(brokerSeq)];

    let seating = null;
    if (uniqueBrokers.length >= 1) {
        const table = [null, null, null, null];
        table[0] = uniqueBrokers[0];
        table[3] = uniqueBrokers[1] || null;
        table[2] = uniqueBrokers[2] || null;
        table[1] = uniqueBrokers[3] || null;

        const allIds = state.players.map(p => p.id);
        const remaining = allIds.filter(id => !uniqueBrokers.includes(id));
        for (let i = 0; i < 4; i++) if (table[i] === null) table[i] = remaining.shift();
        seating = table;
    }

    // --- 2. Initial State Setup ---
    let initialBrokerId = (oldHistory[0]?.brokerId !== undefined) ? oldHistory[0].brokerId : state.players[0].id;
    let initialRotationCount = 0;

    // Look for initial overrides (before any game action)
    for (const e of oldHistory) {
        if (['zimo', 'post-game', 'draw'].includes(e.type)) break;
        if (e.type === 'manual-override') {
            if (e.subtype === 'dealer') initialBrokerId = e.newBrokerId;
            if (e.subtype === 'rotation') initialRotationCount = e.newValue;
            // Only use seating override if reconstruction failed
            if (e.subtype === 'seating' && !seating) seating = [...e.seating];
        }
    }

    if (!seating) seating = [...state.config.seating];
    
    state.config.seating = seating;
    state.players = seating.map(id => state.players.find(p => p.id === id)).filter(p => p);
    state.players.forEach(p => p.isBroker = (p.id === initialBrokerId));
    state.rotationCount = initialRotationCount;

    // --- 3. Replay History ---
    oldHistory.forEach(event => {
        if (event.type === 'zimo') {
            const playerId = event.winnerId;
            const player = state.players.find(p => p.id === playerId);
            const inputScore = event.handFan;
            const otherPlayers = state.players.filter(p => p.id !== playerId);
            let totalWon = 0;
            const loserDetails = [];
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;

            otherPlayers.forEach(loser => {
                const result = calculateMatchup(state, playerId, loser.id, inputScore);
                const streakKey = `${playerId}-${loser.id}`;
                const reverseStreakKey = `${loser.id}-${playerId}`;
                if (!state.streaks[streakKey]) state.streaks[streakKey] = { count: 0, totalAmount: 0 };
                state.streaks[reverseStreakKey] = { count: 0, totalAmount: 0 };
                state.streaks[streakKey].count++;
                state.streaks[streakKey].totalAmount += result.streakWin;
                loser.score -= result.total;
                totalWon += result.total;
                loserDetails.push({ loserId: loser.id, score: result.total });
            });

            if (player) player.score += totalWon;
            state.players.forEach(p => {
                if (p.id !== playerId) {
                    state.players.forEach(target => {
                        const streakKeyToBreak = `${p.id}-${target.id}`;
                        if (state.streaks[streakKeyToBreak]) state.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                    });
                }
            });

            if (player && !player.isBroker) {
                const brokerPlayer = state.players.find(p => p.isBroker);
                if (brokerPlayer) {
                    brokerPlayer.isBroker = false;
                    brokerPlayer.lianZhuangCount = 0;
                    const currentSeatIndex = state.config.seating.findIndex(id => id === brokerPlayer.id);
                    const nextSeatIndex = (currentSeatIndex - 1 + state.config.seating.length) % state.config.seating.length;
                    const nextBroker = state.players.find(p => p.id === state.config.seating[nextSeatIndex]);
                    if (nextBroker) nextBroker.isBroker = true;
                }
                state.rotationCount = (state.rotationCount || 0) + 1;
            } else if (player) {
                player.lianZhuangCount = (player.lianZhuangCount || 0) + 1;
            }

            state.gameHistory.push({ 
                ...event, 
                totalScoreChange: totalWon, 
                loserDetails, 
                brokerId: eventBrokerId, 
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });

        } else if (event.type === 'post-game') {
            const playerId = event.loserId;
            const player = state.players.find(p => p.id === playerId);
            const winnersData = event.winnerIds || (event.winnerDetails ? event.winnerDetails.map(w => w.winnerId) : []);
            let totalLost = 0;
            let brokerWon = false;
            const winnerDetails = [];
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;

            winnersData.forEach(wId => {
                const winner = state.players.find(p => p.id === wId);
                if (!winner) return;
                const oldDetail = event.winnerDetails ? event.winnerDetails.find(w => w.winnerId === winner.id) : null;
                const inputScore = oldDetail ? oldDetail.handFan : (event.baseScore || 0);
                if (inputScore <= 0) return;
                const result = calculateMatchup(state, winner.id, playerId, inputScore);
                const streakKey = `${winner.id}-${playerId}`;
                const reverseStreakKey = `${playerId}-${winner.id}`;
                if (!state.streaks[streakKey]) state.streaks[streakKey] = { count: 0, totalAmount: 0 };
                state.streaks[reverseStreakKey] = { count: 0, totalAmount: 0 };
                state.streaks[streakKey].count++;
                state.streaks[streakKey].totalAmount += result.streakWin;
                winner.score += result.total;
                totalLost += result.total;
                if (winner.isBroker) brokerWon = true;
                winnerDetails.push({ winnerId: winner.id, handFan: inputScore, finalScore: result.total });
            });

            if (player) player.score -= totalLost;
            state.players.forEach(p => {
                if (!winnersData.includes(p.id)) {
                    state.players.forEach(target => {
                        const streakKeyToBreak = `${p.id}-${target.id}`;
                        if (state.streaks[streakKeyToBreak]) state.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                    });
                }
            });

            if (!brokerWon) {
                const brokerPlayer = state.players.find(p => p.isBroker);
                if (brokerPlayer) {
                    brokerPlayer.isBroker = false;
                    brokerPlayer.lianZhuangCount = 0;
                    const nextIndex = (state.config.seating.indexOf(brokerPlayer.id) - 1 + 4) % 4;
                    const nextBroker = state.players.find(p => p.id === state.config.seating[nextIndex]);
                    if (nextBroker) nextBroker.isBroker = true;
                }
                state.rotationCount = (state.rotationCount || 0) + 1;
            } else {
                const broker = state.players.find(p => p.isBroker);
                if (broker) broker.lianZhuangCount = (broker.lianZhuangCount || 0) + 1;
            }

            state.gameHistory.push({ 
                ...event, 
                winnerDetails, 
                totalScoreChange: totalLost, 
                brokerId: eventBrokerId, 
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });

        } else if (event.type === 'in-game') {
            const playerId = event.playerId;
            const player = state.players.find(p => p.id === playerId);
            const otherPlayers = state.players.filter(p => p.id !== playerId);
            const bpType = event.subtype;
            const totalScore = event.score;
            const inputScore = Math.round((totalScore / 3) * 10) / 10;
            const scoreChange = bpType === 'bonus' ? totalScore : -totalScore;
            const perPlayerChange = bpType === 'bonus' ? -inputScore : inputScore;
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;

            if (player) player.score = Math.round((player.score + scoreChange) * 10) / 10;
            otherPlayers.forEach(p => p.score = Math.round((p.score + perPlayerChange) * 10) / 10);
            state.gameHistory.push({
                ...event,
                brokerId: eventBrokerId,
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });

        } else if (event.type === 'draw') {
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;
            const brokerPlayer = state.players.find(p => p.isBroker);
            if (brokerPlayer) {
                brokerPlayer.isBroker = false;
                brokerPlayer.lianZhuangCount = 0;
                const nextIndex = (state.config.seating.indexOf(brokerPlayer.id) - 1 + 4) % 4;
                const nextBroker = state.players.find(p => p.id === state.config.seating[nextIndex]);
                if (nextBroker) nextBroker.isBroker = true;
            }
            state.rotationCount = (state.rotationCount || 0) + 1;
            state.gameHistory.push({
                ...event,
                brokerId: eventBrokerId,
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });

        } else if (event.type === 'manual-override') {
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;

            if (event.subtype === 'rotation') state.rotationCount = event.newValue;
            else if (event.subtype === 'dealer') state.players.forEach(p => { p.isBroker = (p.id === event.newBrokerId); p.lianZhuangCount = 0; });
            else if (event.subtype === 'seating') {
                const firstGameIdx = oldHistory.findIndex(e => ['zimo', 'post-game', 'draw'].includes(e.type));
                const currentEventIdx = oldHistory.indexOf(event);
                if (!seating || (firstGameIdx !== -1 && currentEventIdx > firstGameIdx)) {
                    state.config.seating = [...event.seating];
                }
            }
            state.gameHistory.push({
                ...event,
                brokerId: eventBrokerId,
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });
        } else if (event.type === 'surrender') {
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;
            state.streaks[`${event.winnerId}-${event.loserId}`] = { count: 0, totalAmount: 0 };
            state.gameHistory.push({
                ...event,
                brokerId: eventBrokerId,
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });
        } else {
            const eventBrokerId = state.players.find(p => p.isBroker)?.id;
            const eventRotationCount = state.rotationCount || 0;
            state.gameHistory.push({
                ...event,
                brokerId: eventBrokerId,
                rotationCount: eventRotationCount,
                seating: [...state.config.seating]
            });
        }
    });
}
