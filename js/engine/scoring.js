import { roundScore } from '../utils/math-helpers.js';

export function calculateMatchup(gameState, winnerId, loserId, inputScore) {
    const winner = gameState.players.find(p => p.id === winnerId);
    const loser = gameState.players.find(p => p.id === loserId);
    if (!winner || !loser) return { total: 0, breakdownHTML: '' };

    const di = gameState.config.baseScoreDi || 0;
    let baseScore = inputScore + di;
    let breakdownParts = [`<span class="text-gray-600">底:</span>${di}`, `<span class="text-gray-600">番:</span>${inputScore}`];

    // Add Broker/LianZhuang extra (2n + 1)
    let brokerExtra = 0;
    if (winner.isBroker) {
        const n = winner.lianZhuangCount || 0;
        brokerExtra = (2 * n) + 1;
    } else if (loser.isBroker) {
        const n = loser.lianZhuangCount || 0;
        brokerExtra = (2 * n) + 1;
    }
    
    if (brokerExtra > 0) {
        baseScore += brokerExtra;
        breakdownParts.push(`<span class="text-gray-600">莊:</span>${brokerExtra}`);
    }

    let streakWin = baseScore;
    const streakKey = `${winner.id}-${loser.id}`;
    const reverseStreakKey = `${loser.id}-${winner.id}`;

    if (!gameState.streaks) gameState.streaks = {};
    
    const currentStreak = gameState.streaks[streakKey] ? gameState.streaks[streakKey].count : 0;
    const streakTotalAmount = gameState.streaks[streakKey] ? gameState.streaks[streakKey].totalAmount || 0 : 0;
    
    const currentPiBanAmt = gameState.streaks[reverseStreakKey] && gameState.streaks[reverseStreakKey].count > 0 
                              ? gameState.streaks[reverseStreakKey].totalAmount : 0;

    if (currentStreak > 0) {
        const mult = 0.5;
        const streakBonusValue = roundScore(streakTotalAmount * mult, gameState.config, 'pull');
        streakWin = roundScore(baseScore + streakBonusValue, gameState.config, 'neutral');
        breakdownParts.push(`<span class="text-gray-600">拉:</span>${streakBonusValue}`);
    }

    let finalScoreChange = streakWin;
    let appliedPiBan = 0;

    if (currentPiBanAmt > 0) {
        appliedPiBan = roundScore(currentPiBanAmt * 0.5, gameState.config, 'cut');
        finalScoreChange += appliedPiBan;
        // Round one more time just in case floating point weirdness happens from adding
        finalScoreChange = roundScore(finalScoreChange, gameState.config, 'neutral');
        breakdownParts.push(`<span class="text-gray-600">劈半:</span>${appliedPiBan}`);
    }

    const breakdownHTML = breakdownParts.join(' <span class="mx-0.5 text-gray-500">|</span> ') + ` <span class="mx-0.5 text-gray-500">=></span> <strong class="text-purple-700 font-black text-sm">${finalScoreChange}</strong>`;

    return {
        total: finalScoreChange,
        streakWin: streakWin, // Need to track this separately for state updates
        hasPiBan: appliedPiBan > 0,
        breakdownHTML: breakdownHTML
    };
}

export function calculateSettleDebts(gameState) {
    const players = gameState.players.map(p => ({ ...p })); // deep copy
    const debtors = players.filter(p => p.score < -0.01).sort((a, b) => a.score - b.score); // most negative first
    const creditors = players.filter(p => p.score > 0.01).sort((a, b) => b.score - a.score); // most positive first
    
    const transactions = [];
    let i = 0; // debtor index
    let j = 0; // creditor index
    
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        
        const debt = Math.abs(debtor.score);
        const credit = creditor.score;
        
        const amount = Math.min(debt, credit);
        const roundedAmount = Math.round(amount * 10) / 10;
        
        if (roundedAmount > 0) {
            transactions.push({
                from: debtor,
                to: creditor,
                amount: roundedAmount
            });
        }
        
        debtor.score += roundedAmount;
        creditor.score -= roundedAmount;
        
        if (Math.abs(debtor.score) < 0.01) i++;
        if (creditor.score < 0.01) j++;
    }
    
    return transactions;
}
