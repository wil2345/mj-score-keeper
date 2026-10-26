import { roundScore } from '../utils/math-helpers.js';

export function calculateMatchup(gameState, winnerId, loserId, inputScore) {
    const winner = gameState.players.find(p => p.id === winnerId);
    const loser = gameState.players.find(p => p.id === loserId);
    if (!winner || !loser) return { total: 0, streakWin: 0, hasPiBan: false, breakdownHTML: '' };

    const di = gameState.config.baseScoreDi || 0;
    let baseScore = inputScore + di;
    const breakdownParts = [
        `<span class="text-gray-600">底:</span>${di}`,
        `<span class="text-gray-600">番:</span>${inputScore}`
    ];

    // 莊/連莊加台: (2n + 1) if either party is dealer
    let brokerExtra = 0;
    if (winner.isBroker) brokerExtra = (2 * (winner.lianZhuangCount || 0)) + 1;
    else if (loser.isBroker) brokerExtra = (2 * (loser.lianZhuangCount || 0)) + 1;

    if (brokerExtra > 0) {
        baseScore += brokerExtra;
        breakdownParts.push(`<span class="text-gray-600">莊:</span>${brokerExtra}`);
    }

    if (!gameState.streaks) gameState.streaks = {};
    const streakKey = `${winner.id}-${loser.id}`;
    const reverseStreakKey = `${loser.id}-${winner.id}`;
    const forward = gameState.streaks[streakKey];
    const reverse = gameState.streaks[reverseStreakKey];

    let streakWin = baseScore;
    if (forward && forward.count > 0) {
        const streakBonusValue = roundScore((forward.totalAmount || 0) * 0.5, gameState.config, 'pull');
        streakWin = roundScore(baseScore + streakBonusValue, gameState.config, 'neutral');
        breakdownParts.push(`<span class="text-gray-600">拉:</span>${streakBonusValue}`);
    }

    let finalScoreChange = streakWin;
    let appliedPiBan = 0;
    if (reverse && reverse.count > 0 && reverse.totalAmount > 0) {
        appliedPiBan = roundScore(reverse.totalAmount * 0.5, gameState.config, 'cut');
        finalScoreChange = roundScore(streakWin + appliedPiBan, gameState.config, 'neutral');
        breakdownParts.push(`<span class="text-gray-600">劈半:</span>${appliedPiBan}`);
    }

    const breakdownHTML = breakdownParts.join(' <span class="mx-0.5 text-gray-500">|</span> ')
        + ` <span class="mx-0.5 text-gray-500">=></span> <strong class="text-purple-700 dark:text-purple-400 font-black text-sm">${finalScoreChange}</strong>`;

    return {
        total: finalScoreChange,
        streakWin,
        hasPiBan: appliedPiBan > 0,
        breakdownHTML
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
