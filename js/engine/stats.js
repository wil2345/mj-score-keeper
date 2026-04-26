export function calculateTitles(gameState, stats) {
    let maxWu = 0;
    let maxZimo = 0;
    let maxChuchong = 0;
    let maxBpFan = 0;
    let minScoreAbs = Infinity;
    let minParticipationPerRound = Infinity;

    const rotationCount = gameState.rotationCount || 0;
    const totalRounds = rotationCount / 4;
    
    // Find max/min values
    Object.values(stats).forEach(s => {
        if (s.wu > maxWu) maxWu = s.wu;
        if (s.zimo > maxZimo) maxZimo = s.zimo;
        if (s.chuchong > maxChuchong) maxChuchong = s.chuchong;
        if (s.bpFan > maxBpFan) maxBpFan = s.bpFan;
        
        const scoreAbs = Math.abs(s.score);
        if (scoreAbs < minScoreAbs) minScoreAbs = scoreAbs;
        
        // Participation per round = (Wins + Losses) / Total Rounds
        // Use at least 1 as denominator to handle very short games fairly
        const participationPerRound = (s.wu + s.chuchong) / Math.max(1, totalRounds);
        if (participationPerRound < minParticipationPerRound) minParticipationPerRound = participationPerRound;
    });

    // Assign titles
    Object.values(stats).forEach(s => {
        s.titles = [];
        
        if (s.wu === maxWu && maxWu > 0) s.titles.push({ label: '食糊王', color: 'text-orange-700 bg-orange-100 border border-orange-300 dark:text-orange-300 dark:bg-orange-900/60 dark:border-orange-800' });
        if (s.zimo === maxZimo && maxZimo > 0) s.titles.push({ label: '自摸王', color: 'text-green-700 bg-green-100 border border-green-300 dark:text-green-300 dark:bg-green-900/60 dark:border-green-800' });
        if (s.chuchong === maxChuchong && maxChuchong > 0) s.titles.push({ label: '出銃王', color: 'text-red-700 bg-red-100 border border-red-300 dark:text-red-300 dark:bg-red-900/60 dark:border-red-800' });
        
        if (s.bpFan === maxBpFan && maxBpFan > 0) s.titles.push({ label: '運氣王', color: 'text-blue-700 bg-blue-100 border border-blue-300 dark:text-blue-300 dark:bg-blue-900/60 dark:border-blue-800' });
        
        const scoreAbs = Math.abs(s.score);
        const participationPerRound = (s.wu + s.chuchong) / Math.max(1, totalRounds);

        // 4A 和平使者: 絕對值最小，且差距小於10
        if (scoreAbs === minScoreAbs && scoreAbs <= 10) {
            s.titles.push({ label: '和平使者', color: 'text-teal-700 bg-teal-100 border border-teal-300 dark:text-teal-300 dark:bg-teal-900/60 dark:border-teal-800' });
        }

        // 4B 陪跑員: 平均每圈參與 < 1次 且為最低，且最少要打完一圈 (接近4局，為包容莊家連莊我們用 >= 4)
        if (participationPerRound === minParticipationPerRound && participationPerRound < 1 && rotationCount >= 4) {
            s.titles.push({ label: '陪跑員', color: 'text-gray-700 bg-gray-200 border border-gray-300 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600' });
        }
    });
    
    return stats;
}
