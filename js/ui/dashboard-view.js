// Automatically extracted UI module

export function renderDashboardView() {
        const history = this.gameState.gameHistory;
        const container = document.getElementById('dashboard-table-container');

        // Calculate Stats
        let stats = {};
        this.gameState.players.forEach(p => {
            stats[p.id] = { name: p.name, icon: p.icon, score: p.score, wu: 0, zimo: 0, chuchong: 0, bpFan: 0, totalWinningFan: 0, wuWithFan: 0 };
        });

        history.forEach(game => {
            if (game.type === 'zimo') {
                if (stats[game.winnerId]) {
                    stats[game.winnerId].zimo++;
                    stats[game.winnerId].wu++;
                    if (game.handFan !== undefined) {
                        stats[game.winnerId].totalWinningFan += game.handFan;
                        stats[game.winnerId].wuWithFan++;
                    }
                }
            } else if (game.type === 'post-game') {
                if (stats[game.loserId]) stats[game.loserId].chuchong++;
                if (game.winnerDetails) {
                    game.winnerDetails.forEach(w => {
                        if (stats[w.winnerId]) {
                            stats[w.winnerId].wu++;
                            if (w.handFan !== undefined) {
                                stats[w.winnerId].totalWinningFan += w.handFan;
                                stats[w.winnerId].wuWithFan++;
                            }
                        }
                    });
                } else if (game.winnerIds) {
                    game.winnerIds.forEach(wId => {
                        if (stats[wId]) stats[wId].wu++;
                    });
                }
            } else if (game.type === 'in-game') {
                const scoreChange = game.subtype === 'bonus' ? game.score : -game.score;
                Object.keys(stats).forEach(pIdStr => {
                    const pId = parseInt(pIdStr);
                    if (pId === game.playerId) {
                        stats[pId].bpFan += scoreChange;
                    } else {
                        stats[pId].bpFan -= scoreChange / 3;
                    }
                    stats[pId].bpFan = Math.round(stats[pId].bpFan * 10) / 10;
                });
            }
        });
        
        stats = this._calculateTitles(stats);

        // Render Table
        let tableHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
                <table class="w-full text-center text-sm">
                    <thead class="bg-gray-800 dark:bg-gray-900 text-white font-semibold transition-colors">
                        <tr>
                            <th class="p-3 text-left">玩家</th>
                            <th class="p-3">食糊</th>
                            <th class="p-3">自摸</th>
                            <th class="p-3">出銃</th>
                            <th class="p-3">獎/罰 (番)</th>
                            <th class="p-3">平均番數</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(stats).map((s, idx) => `
                            <tr class="border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-100 dark:bg-gray-800/50' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <td class="p-3 text-left flex flex-col justify-center">
                                    <div class="font-bold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                                        <span class="text-xl">${s.icon}</span>
                                        <span>${s.name}</span>
                                    </div>
                                    ${s.titles.length > 0 ? `
                                        <div class="mt-2 ml-8 block">
                                            ${s.titles.map(t => `<span class="${t.color} text-[10px] font-bold px-1.5 py-0.5 mr-1 mb-1 rounded shadow-sm inline-block">${t.label}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </td>
                                <td class="p-3 font-mono text-gray-800 dark:text-gray-200">${s.wu}</td>
                                <td class="p-3 font-mono text-green-600 dark:text-green-400 font-bold">${s.zimo}</td>
                                <td class="p-3 font-mono text-red-600 dark:text-red-400 font-bold">${s.chuchong}</td>
                                <td class="p-3 font-mono ${s.bpFan > 0 ? 'text-blue-600 dark:text-blue-400' : (s.bpFan < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500')}">${s.bpFan > 0 ? '+' : ''}${Math.round(s.bpFan * 10)/10}</td>
                                <td class="p-3 font-mono text-gray-800 dark:text-gray-200">${s.wuWithFan > 0 ? (s.totalWinningFan / s.wuWithFan).toFixed(1) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = tableHTML;

        // Render Chart grouped by Game
        const ctx = document.getElementById('score-chart').getContext('2d');
        const labels = ['Start'];
        
        const playerScores = {};
        let currentScores = {};
        this.gameState.players.forEach(p => { 
            playerScores[p.id] = [0]; 
            currentScores[p.id] = 0; 
        });

        let gameCount = 0;
        let pendingChanges = false;

        history.forEach(game => {
            if (game.type === 'post-game') {
                if (game.winnerDetails) {
                    game.winnerDetails.forEach(d => { currentScores[d.winnerId] += d.finalScore; });
                } else if (game.winnerIds) {
                    game.winnerIds.forEach(wId => { currentScores[wId] += (game.totalScoreChange / game.winnerIds.length); });
                }
                currentScores[game.loserId] -= game.totalScoreChange;
                pendingChanges = true;
            } else if (game.type === 'zimo') {
                currentScores[game.winnerId] += game.totalScoreChange;
                if (game.loserDetails) {
                    game.loserDetails.forEach(d => { currentScores[d.loserId] -= d.score; });
                } else {
                    const otherIds = Object.keys(currentScores).map(Number).filter(id => id !== game.winnerId);
                    otherIds.forEach(id => { currentScores[id] -= game.totalScoreChange / 3; });
                }
                pendingChanges = true;
            } else if (game.type === 'in-game') {
                const scoreChange = game.subtype === 'bonus' ? game.score : -game.score;
                currentScores[game.playerId] += scoreChange;
                const otherIds = Object.keys(currentScores).map(Number).filter(id => id !== game.playerId);
                otherIds.forEach(id => { currentScores[id] -= scoreChange / 3; });
                pendingChanges = true;
            } else if (game.type === 'draw') {
                pendingChanges = true;
            }

            if (game.type === 'post-game' || game.type === 'zimo' || game.type === 'draw') {
                gameCount++;
                labels.push(`Game ${gameCount}`);
                Object.keys(currentScores).forEach(id => {
                    playerScores[id].push(currentScores[id]);
                });
                pendingChanges = false;
            }
        });

        // If there were mid-game actions after the last round ended
        if (pendingChanges) {
            labels.push('Current');
            Object.keys(currentScores).forEach(id => {
                playerScores[id].push(currentScores[id]);
            });
        }

        // Force the final data point to perfectly match the highly-precise live player score
        // to mask any historic approximation rounding errors (e.g. legacy dividing by 3)
        Object.keys(playerScores).forEach(id => {
            const player = this.gameState.players.find(p => p.id === parseInt(id));
            if (player && playerScores[id].length > 0) {
                playerScores[id][playerScores[id].length - 1] = player.score;
            }
        });

        const chartColors = [
            '#3b82f6', // Blue
            '#ef4444', // Red
            '#10b981', // Green
            '#f59e0b'  // Yellow
        ];

        const datasets = this.gameState.players.map((player, idx) => {
            return {
                label: player.name,
                data: playerScores[player.id],
                fill: false,
                tension: 0.1,
                borderWidth: 3,
                pointRadius: 4,
                borderColor: chartColors[idx % chartColors.length],
                backgroundColor: chartColors[idx % chartColors.length],
            };
        });

        if(window.myScoreChart) {
            window.myScoreChart.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#D1D5DB' : '#4B5563'; // gray-300 vs gray-600
        const gridColor = isDark ? '#374151' : '#e5e7eb'; // gray-700 vs gray-200
        const tooltipBg = isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        const tooltipText = isDark ? '#F3F4F6' : '#111827';
        const tooltipBorder = isDark ? '#374151' : '#E5E7EB';

        window.myScoreChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipText,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += (Math.round(context.parsed.y * 10) / 10);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cumulative Score (番)', color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        title: { display: true, text: 'Games (Timeline)', color: textColor },
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

