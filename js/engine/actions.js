import { calculateMatchup } from './scoring.js';

/** Snapshot of dealer / wind round at the moment an event is recorded. */
export function eventMeta(state, overrides = {}) {
    return {
        brokerId: state.players.find(p => p.isBroker)?.id,
        rotationCount: state.rotationCount || 0,
        seating: [...(state.config.seating || [])],
        timestamp: new Date().toISOString(),
        ...overrides
    };
}

export function ensureStreaks(state) {
    if (!state.streaks) state.streaks = {};
}

function clearStreak(state, key) {
    state.streaks[key] = { count: 0, totalAmount: 0 };
}

/** Pass dealer counter-clockwise and advance the wind rotation. */
export function rotateDealer(state) {
    const broker = state.players.find(p => p.isBroker);
    if (!broker) {
        state.rotationCount = (state.rotationCount || 0) + 1;
        return;
    }
    broker.isBroker = false;
    broker.lianZhuangCount = 0;

    const seating = state.config.seating;
    const currentSeatIndex = seating.findIndex(id => id === broker.id);
    const nextSeatIndex = (currentSeatIndex - 1 + seating.length) % seating.length;
    const nextBroker = state.players.find(p => p.id === seating[nextSeatIndex]);
    if (nextBroker) nextBroker.isBroker = true;

    state.rotationCount = (state.rotationCount || 0) + 1;
}

export function keepDealer(state, brokerPlayer = null) {
    const broker = brokerPlayer || state.players.find(p => p.isBroker);
    if (broker) broker.lianZhuangCount = (broker.lianZhuangCount || 0) + 1;
}

/** Clear pulling streaks for anyone who did not win this hand. */
export function breakNonWinnerStreaks(state, winnerIds) {
    ensureStreaks(state);
    const winners = new Set(winnerIds);
    for (const p of state.players) {
        if (winners.has(p.id)) continue;
        for (const target of state.players) {
            const key = `${p.id}-${target.id}`;
            if (state.streaks[key]) clearStreak(state, key);
        }
    }
}

/**
 * Apply one winner→loser payout and update streak pots.
 * @returns {{ total, streakWin, streakKey }}
 */
export function applyMatchupPayment(state, winnerId, loserId, inputScore) {
    ensureStreaks(state);
    const result = calculateMatchup(state, winnerId, loserId, inputScore);
    const streakKey = `${winnerId}-${loserId}`;
    const reverseStreakKey = `${loserId}-${winnerId}`;

    if (!state.streaks[streakKey]) state.streaks[streakKey] = { count: 0, totalAmount: 0 };
    clearStreak(state, reverseStreakKey);

    state.streaks[streakKey].count++;
    state.streaks[streakKey].totalAmount += result.streakWin;

    return { ...result, streakKey };
}

/**
 * 自摸 — winner collects from all others.
 * @param {object} [opts] optional history overrides (e.g. timestamp when replaying)
 * @returns {{ updatedStreaks, event }}
 */
export function applyZimo(state, winnerId, handFan, opts = {}) {
    const winner = state.players.find(p => p.id === winnerId);
    const others = state.players.filter(p => p.id !== winnerId);
    const meta = eventMeta(state, opts.timestamp ? { timestamp: opts.timestamp } : {});

    let totalWon = 0;
    const updatedStreaks = [];
    const loserDetails = [];

    for (const loser of others) {
        const result = applyMatchupPayment(state, winnerId, loser.id, handFan);
        loser.score -= result.total;
        totalWon += result.total;
        updatedStreaks.push({ winnerId, loserId: loser.id, streakKey: result.streakKey });
        loserDetails.push({ loserId: loser.id, score: result.total });
    }

    if (winner) winner.score += totalWon;
    breakNonWinnerStreaks(state, [winnerId]);

    if (winner && !winner.isBroker) rotateDealer(state);
    else if (winner) keepDealer(state, winner);

    const event = {
        type: 'zimo',
        winnerId,
        handFan,
        totalScoreChange: totalWon,
        loserDetails,
        brokerId: meta.brokerId,
        rotationCount: meta.rotationCount,
        seating: meta.seating,
        timestamp: meta.timestamp
    };
    state.gameHistory.push(event);
    return { updatedStreaks, event };
}

/**
 * 出銃 — loser pays each winner their fan.
 * @param {Array<{winnerId:number, handFan:number}>} winners
 * @returns {{ updatedStreaks, event }}
 */
export function applyPostGame(state, loserId, winners, opts = {}) {
    const loser = state.players.find(p => p.id === loserId);
    const meta = eventMeta(state, opts.timestamp ? { timestamp: opts.timestamp } : {});

    let totalLost = 0;
    let brokerWon = false;
    const winnerIds = [];
    const winnerDetails = [];
    const updatedStreaks = [];

    for (const { winnerId, handFan } of winners) {
        if (!handFan || handFan <= 0) continue;
        const winner = state.players.find(p => p.id === winnerId);
        if (!winner) continue;

        const result = applyMatchupPayment(state, winnerId, loserId, handFan);
        winner.score += result.total;
        totalLost += result.total;
        if (winner.isBroker) brokerWon = true;

        winnerIds.push(winnerId);
        winnerDetails.push({ winnerId, handFan, finalScore: result.total });
        updatedStreaks.push({ winnerId, loserId, streakKey: result.streakKey });
    }

    if (loser) loser.score -= totalLost;
    breakNonWinnerStreaks(state, winnerIds);

    if (!brokerWon) rotateDealer(state);
    else keepDealer(state);

    const event = {
        type: 'post-game',
        winnerIds,
        winnerDetails,
        loserId,
        baseScore: 0,
        totalScoreChange: totalLost,
        brokerId: meta.brokerId,
        rotationCount: meta.rotationCount,
        seating: meta.seating,
        timestamp: meta.timestamp
    };
    state.gameHistory.push(event);
    return { updatedStreaks, event };
}

/** 流局 — rotate dealer, keep streaks. */
export function applyDraw(state, opts = {}) {
    const meta = eventMeta(state, opts.timestamp ? { timestamp: opts.timestamp } : {});
    rotateDealer(state);
    const event = {
        type: 'draw',
        brokerId: meta.brokerId,
        rotationCount: meta.rotationCount,
        seating: meta.seating,
        timestamp: meta.timestamp
    };
    state.gameHistory.push(event);
    return { event };
}

/**
 * 獎/罰 — zero-sum transfer from/to the other three.
 * Pass either `mult` (live: 0.5|1|2 底) or `totalScore` (replay from history).
 * @param {'bonus'|'penalty'} bpType
 */
export function applyBonusPenalty(state, playerId, bpType, { mult, totalScore: storedTotal, timestamp } = {}) {
    const player = state.players.find(p => p.id === playerId);
    const others = state.players.filter(p => p.id !== playerId);
    const meta = eventMeta(state, timestamp ? { timestamp } : {});

    let totalScore;
    let inputScore;
    if (storedTotal != null) {
        totalScore = storedTotal;
        inputScore = Math.round((totalScore / 3) * 10) / 10;
    } else {
        const di = state.config.baseScoreDi || 0;
        inputScore = Math.round((di * (mult ?? 1)) * 10) / 10;
        totalScore = Math.round((inputScore * 3) * 10) / 10;
    }

    const scoreChange = bpType === 'bonus' ? totalScore : -totalScore;
    const perPlayerChange = bpType === 'bonus' ? -inputScore : inputScore;

    if (player) player.score = Math.round((player.score + scoreChange) * 10) / 10;
    others.forEach(p => {
        p.score = Math.round((p.score + perPlayerChange) * 10) / 10;
    });

    const event = {
        type: 'in-game',
        subtype: bpType,
        player: player?.name,
        playerId,
        score: totalScore,
        brokerId: meta.brokerId,
        rotationCount: meta.rotationCount,
        seating: meta.seating,
        timestamp: meta.timestamp
    };
    state.gameHistory.push(event);
    return { event };
}

/** 投降 — clear one streak pot. */
export function applySurrender(state, winnerId, loserId, opts = {}) {
    ensureStreaks(state);
    const meta = eventMeta(state, opts.timestamp ? { timestamp: opts.timestamp } : {});
    clearStreak(state, `${winnerId}-${loserId}`);
    const event = {
        type: 'surrender',
        winnerId,
        loserId,
        brokerId: meta.brokerId,
        rotationCount: meta.rotationCount,
        seating: meta.seating,
        timestamp: meta.timestamp
    };
    state.gameHistory.push(event);
    return { event };
}
