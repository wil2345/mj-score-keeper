import { VERSION } from '../constants.js';
import {
    applyZimo,
    applyPostGame,
    applyDraw,
    applyBonusPenalty,
    applySurrender,
    eventMeta
} from './actions.js';

/**
 * Migration helper to move data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage() {
    const matchesJson = localStorage.getItem('mahjong_app_matches');
    if (!matchesJson) return;

    try {
        const matches = JSON.parse(matchesJson);
        console.log("Migration: Found matches in localStorage", matches);

        await idbKeyval.set('mahjong_app_matches', matches);

        for (const matchMeta of matches) {
            const matchId = matchMeta.id;

            const matchData = localStorage.getItem(`mahjong_app_match_${matchId}`);
            if (matchData) {
                await idbKeyval.set(`mahjong_app_match_${matchId}`, JSON.parse(matchData));
                localStorage.removeItem(`mahjong_app_match_${matchId}`);
            }

            const undoData = localStorage.getItem(`mahjong_app_undo_${matchId}`);
            if (undoData) {
                await idbKeyval.set(`mahjong_app_undo_${matchId}`, JSON.parse(undoData));
                localStorage.removeItem(`mahjong_app_undo_${matchId}`);
            }
        }

        const playerHistory = localStorage.getItem('mahjong_app_player_history');
        if (playerHistory) {
            await idbKeyval.set('mahjong_app_player_history', JSON.parse(playerHistory));
            localStorage.removeItem('mahjong_app_player_history');
        }

        localStorage.removeItem('mahjong_app_matches');
        console.log("Migration: Completed successfully.");
    } catch (e) {
        console.error("Migration: Failed", e);
    }
}

export async function saveGame(gameState) {
    if (!gameState.matchId) return;

    gameState.version = VERSION;

    await idbKeyval.set(`mahjong_app_match_${gameState.matchId}`, gameState);

    let matches = await idbKeyval.get('mahjong_app_matches') || [];
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

    await idbKeyval.set('mahjong_app_matches', matches);
}

export async function loadMatch(matchId) {
    const gameState = await idbKeyval.get(`mahjong_app_match_${matchId}`);
    if (gameState) {
        const savedUndo = await idbKeyval.get(`mahjong_app_undo_${matchId}`);
        return { gameState, undoStack: savedUndo || [] };
    }
    return null;
}

export async function deleteMatch(matchId) {
    await Promise.all([
        idbKeyval.del(`mahjong_app_match_${matchId}`),
        idbKeyval.del(`mahjong_app_undo_${matchId}`)
    ]);

    let matches = await idbKeyval.get('mahjong_app_matches') || [];
    matches = matches.filter(m => m.id !== matchId);
    await idbKeyval.set('mahjong_app_matches', matches);
}

export async function saveStateForUndo(gameState, undoStack) {
    if (!gameState.matchId) return;

    undoStack.push(JSON.stringify(gameState));
    if (undoStack.length > 50) undoStack.shift();

    await idbKeyval.set(`mahjong_app_undo_${gameState.matchId}`, undoStack);
}

function reconstructSeating(oldHistory, state) {
    const brokerSeq = [];
    const firstDealerEvent = oldHistory.find(e =>
        (e.type === 'manual-override' && e.subtype === 'dealer') || e.brokerId
    );
    if (firstDealerEvent) {
        brokerSeq.push(firstDealerEvent.newBrokerId || firstDealerEvent.brokerId);
    }

    for (const e of oldHistory) {
        let bId = null;
        if (e.type === 'manual-override' && e.subtype === 'dealer') bId = e.newBrokerId;
        else if (e.brokerId) bId = e.brokerId;

        if (bId && brokerSeq[brokerSeq.length - 1] !== bId) brokerSeq.push(bId);
    }

    const uniqueBrokers = [...new Set(brokerSeq)];
    if (uniqueBrokers.length < 1) return null;

    const table = [null, null, null, null];
    table[0] = uniqueBrokers[0];
    table[3] = uniqueBrokers[1] || null;
    table[2] = uniqueBrokers[2] || null;
    table[1] = uniqueBrokers[3] || null;

    const remaining = state.players.map(p => p.id).filter(id => !uniqueBrokers.includes(id));
    for (let i = 0; i < 4; i++) {
        if (table[i] === null) table[i] = remaining.shift();
    }
    return table;
}

export function recalculateHistory(state) {
    if (!state.config.decimalRounding) state.config.decimalRounding = 'integer';
    if (!state.config.roundingAdvantage) state.config.roundingAdvantage = 'winner';
    if (state.config.baseScoreDi === undefined) state.config.baseScoreDi = 5;

    state.players.forEach(p => {
        p.score = 0;
        p.lianZhuangCount = 0;
        p.isBroker = false;
    });
    state.streaks = {};
    state.rotationCount = 0;

    const oldHistory = state.gameHistory || [];
    state.gameHistory = [];

    let seating = reconstructSeating(oldHistory, state);

    let initialBrokerId = (oldHistory[0]?.brokerId !== undefined)
        ? oldHistory[0].brokerId
        : state.players[0].id;
    let initialRotationCount = 0;

    for (const e of oldHistory) {
        if (['zimo', 'post-game', 'draw'].includes(e.type)) break;
        if (e.type !== 'manual-override') continue;
        if (e.subtype === 'dealer') initialBrokerId = e.newBrokerId;
        if (e.subtype === 'rotation') initialRotationCount = e.newValue;
        if (e.subtype === 'seating' && !seating) seating = [...e.seating];
    }

    if (!seating) seating = [...state.config.seating];

    state.config.seating = seating;
    state.players = seating.map(id => state.players.find(p => p.id === id)).filter(Boolean);
    state.players.forEach(p => { p.isBroker = (p.id === initialBrokerId); });
    state.rotationCount = initialRotationCount;

    const firstGameIdx = oldHistory.findIndex(e =>
        ['zimo', 'post-game', 'draw'].includes(e.type)
    );

    oldHistory.forEach((event, idx) => {
        const ts = event.timestamp ? { timestamp: event.timestamp } : {};
        if (event.type === 'zimo') {
            applyZimo(state, event.winnerId, event.handFan, ts);
        } else if (event.type === 'post-game') {
            const winnersData = event.winnerIds
                || (event.winnerDetails ? event.winnerDetails.map(w => w.winnerId) : []);
            const winners = winnersData.map(wId => {
                const oldDetail = event.winnerDetails?.find(w => w.winnerId === wId);
                return {
                    winnerId: wId,
                    handFan: oldDetail ? oldDetail.handFan : (event.baseScore || 0)
                };
            });
            applyPostGame(state, event.loserId, winners, ts);
        } else if (event.type === 'in-game') {
            applyBonusPenalty(state, event.playerId, event.subtype, {
                totalScore: event.score,
                ...ts
            });
        } else if (event.type === 'draw') {
            applyDraw(state, ts);
        } else if (event.type === 'surrender') {
            applySurrender(state, event.winnerId, event.loserId, ts);
        } else if (event.type === 'manual-override') {
            const meta = eventMeta(state);
            if (event.subtype === 'rotation') state.rotationCount = event.newValue;
            else if (event.subtype === 'dealer') {
                state.players.forEach(p => {
                    p.isBroker = (p.id === event.newBrokerId);
                    p.lianZhuangCount = 0;
                });
            } else if (event.subtype === 'seating') {
                if (!seating || (firstGameIdx !== -1 && idx > firstGameIdx)) {
                    state.config.seating = [...event.seating];
                }
            }
            state.gameHistory.push({
                ...event,
                brokerId: meta.brokerId,
                rotationCount: meta.rotationCount,
                seating: [...state.config.seating],
                timestamp: event.timestamp || meta.timestamp
            });
        } else {
            const meta = eventMeta(state);
            state.gameHistory.push({
                ...event,
                brokerId: meta.brokerId,
                rotationCount: meta.rotationCount,
                seating: meta.seating,
                timestamp: event.timestamp || meta.timestamp
            });
        }
    });
}
