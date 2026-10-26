import { escapeHtml, formatScore } from '../utils/ui-helpers.js';

const WINDS = ['東', '南', '西', '北'];

/**
 * For a history display group, resolve the seating + dealer that 調位 badges
 * should use. Prefers the latest dealer override (newBrokerId) over the
 * pre-change brokerId stamped on seating events — otherwise the new 莊 can
 * incorrectly show as 南 when seating+dealer are clustered.
 */
export function resolveSeatChangeWinds(groupEvents, gameHistory, fallbackSeating) {
    const seatingOverride = [...groupEvents].reverse().find(e =>
        e.type === 'manual-override' && e.subtype === 'seating' && Array.isArray(e.seating)
    );
    const dealerOverride = [...groupEvents].reverse().find(e =>
        e.type === 'manual-override' && e.subtype === 'dealer' && e.newBrokerId != null
    );

    if (!seatingOverride && !dealerOverride) {
        return null;
    }

    let seating = seatingOverride?.seating || dealerOverride?.seating || fallbackSeating;
    let brokerId = dealerOverride?.newBrokerId ?? null;

    if (brokerId == null && seatingOverride) {
        const seatIdx = gameHistory.findIndex(e =>
            e === seatingOverride
            || (e.type === 'manual-override' && e.subtype === 'seating'
                && e.timestamp === seatingOverride.timestamp
                && JSON.stringify(e.seating) === JSON.stringify(seatingOverride.seating))
        );
        if (seatIdx >= 0) {
            for (let i = seatIdx + 1; i < gameHistory.length && i <= seatIdx + 5; i++) {
                const e = gameHistory[i];
                if (e.type === 'manual-override' && e.subtype === 'dealer' && e.newBrokerId != null) {
                    brokerId = e.newBrokerId;
                    if (e.seating) seating = e.seating;
                    break;
                }
                if (['zimo', 'post-game', 'draw'].includes(e.type)) break;
            }
        }
        if (brokerId == null) brokerId = seatingOverride.brokerId ?? seating?.[0];
    }

    if (brokerId == null || !seating) return null;
    return { seating, brokerId };
}

export function relativeWindLabel(seating, brokerId, playerId) {
    const brkIdx = seating.indexOf(brokerId);
    const pIdx = seating.indexOf(playerId);
    if (brkIdx === -1 || pIdx === -1) return null;
    return WINDS[(brkIdx - pIdx + 4) % 4];
}

export function renderHistoryView() {
                const historyContainer = document.getElementById('history-table-container');
                const state = this.gameState;
                const winds = WINDS;

                let html = `
                    <div class="bg-gray-50 dark:bg-gray-800 p-1 md:p-2 rounded-b-lg shadow text-gray-700 dark:text-gray-300 w-full transition-colors">
                        <div class="w-full relative">
                            <!-- Vertical Timeline Line -->
                            <div class="absolute left-[30px] top-[75px] bottom-6 w-[2px] bg-gray-300 dark:bg-gray-600 z-0 transition-colors"></div>
        
                            <!-- Header -->
                            <div class="grid grid-cols-[60px_repeat(4,minmax(0,1fr))] gap-0 mb-2 sticky safe-sticky-history-header z-20 pb-2 border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 pt-2 shadow-sm rounded-t-lg transition-colors">
                                <div class="col-span-1"></div>
                                ${state.players.map((p, idx) => `
                                    <div class="text-center flex flex-col items-center justify-end py-2 px-1 bg-transparent transition-colors border-l border-gray-200 dark:border-gray-700/50">
                                        <span class="text-2xl">${p.icon}</span>
                                        <span class="text-sm font-semibold truncate w-full mt-1">${escapeHtml(p.name)}</span>
                                        <span class="text-xl font-bold mt-1 tabular-nums ${p.score >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${formatScore(p.score, { signed: true })}</span>
                                        <div class="text-gray-400 dark:text-gray-500 text-[10px] mt-1 border-t border-gray-300 dark:border-gray-600 w-1/2 mx-auto pt-1 font-bold transition-colors">
                                            ${p.lianZhuangCount > 0 ? `<span class="text-green-600 dark:text-green-400">連${p.lianZhuangCount}</span>` : '&nbsp;'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
        
                            <!-- Rows -->
                            <div class="flex flex-col relative z-10">
                `;
        
            // 1. Group events by rotationCount (The "Game")
            const gameBlocks = [];
            state.gameHistory.forEach(entry => {
                const rot = (entry.rotationCount !== undefined) ? entry.rotationCount : -1;
                let lastBlock = gameBlocks[gameBlocks.length - 1];
                
                if (lastBlock && lastBlock.rotationCount === rot) {
                    lastBlock.entries.push(entry);
                } else {
                    gameBlocks.push({
                        rotationCount: rot,
                        entries: [entry]
                    });
                }
            });

            // 2. Further group internal entries by timestamp to keep related logic together
            gameBlocks.forEach(block => {
                const groupedEntries = [];
                block.entries.forEach(entry => {
                    const isAdmin = ['manual-override', 'surrender', 'START'].includes(entry.type);
                    const lastGroup = groupedEntries[groupedEntries.length - 1];
                    const lastWasAdminOnly = lastGroup && lastGroup.events.every(e => ['manual-override', 'surrender', 'START'].includes(e.type));

                    if (lastGroup && (lastGroup.timestamp === entry.timestamp || (lastWasAdminOnly && isAdmin))) {
                        lastGroup.events.push(entry);
                    } else {
                        groupedEntries.push({
                            timestamp: entry.timestamp,
                            rotationCount: block.rotationCount,
                            brokerId: entry.brokerId,
                            events: [entry]
                        });
                    }
                });
                block.displayGroups = groupedEntries;
            });

            // 3. Render Blocks DESC (Latest game on top)
            gameBlocks.slice().reverse().forEach((block) => {
                // Render Game Header (Wind Badge)
                if (block.rotationCount !== -1) {
                    const windIdx = Math.floor(block.rotationCount / 4) % 4;
                    const gameIdx = block.rotationCount % 4;
                    const windChar = winds[windIdx];
                    const gameChar = winds[gameIdx];

                    html += `
                        <div class="flex items-center space-x-3 mb-2 mt-6 px-2 relative">
                            <div class="bg-gray-800 dark:bg-gray-900 text-white text-[12px] w-12 h-12 rounded-full shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-gray-600 transition-colors shrink-0">
                                <span class="font-bold">${windChar}風</span>
                                <span class="text-[10px] opacity-80">${gameChar}局</span>
                            </div>
                            <div class="flex-1 h-[2px] bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"></div>
                            ${gameIdx === 0 ? `<div class="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700/60 text-yellow-800 dark:text-yellow-400 text-[10px] px-3 py-1 rounded-full shadow-sm font-black transition-colors absolute left-1/2 -translate-x-1/2 -top-3 z-30 whitespace-nowrap">Round ${Math.floor(block.rotationCount/16)+1} ${windChar}風</div>` : ''}
                        </div>
                    `;
                } else {
                    html += `
                        <div class="flex items-center space-x-3 mb-2 mt-6 px-2 relative">
                            <div class="bg-gray-800 dark:bg-gray-900 text-white text-[10px] w-12 h-12 rounded-full shadow-lg flex items-center justify-center border-2 border-white dark:border-gray-600 font-bold transition-colors shrink-0">設定</div>
                            <div class="flex-1 h-[2px] bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"></div>
                        </div>
                    `;
                }

                // Render Internal Groups DESC (Latest action on top within the game)
                block.displayGroups.slice().reverse().forEach((group) => {
                    const hasGameAction = group.events.some(e => ['zimo', 'post-game', 'draw'].includes(e.type));
                    const seatWinds = resolveSeatChangeWinds(
                        group.events,
                        state.gameHistory,
                        state.config.seating
                    );

                    let timelineNode = `<div class="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 mx-auto mt-6 shadow-sm border border-white dark:border-gray-800 transition-colors"></div>`;

                    const playerCells = state.players.map((p) => {
                        let change = 0;
                        let badges = [];
                        const isBroker = group.brokerId === p.id;

                        group.events.forEach(entry => {
                            if (entry.type === 'in-game') {
                                if (entry.playerId === p.id) {
                                    change += entry.subtype === 'bonus' ? entry.score : -entry.score;
                                    badges.push(`<div class="${entry.subtype === 'bonus' ? 'bg-blue-500' : 'bg-red-500'} text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold">${entry.subtype === 'bonus' ? '獎' : '罰'}</div>`);
                                } else {
                                    change += entry.subtype === 'bonus' ? -entry.score/3 : entry.score/3;
                                }
                            } else if (entry.type === 'zimo') {
                                if (entry.winnerId === p.id) {
                                    change += entry.totalScoreChange;
                                    badges.push(`<div class="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold">自摸 ${entry.handFan ? entry.handFan+'番' : ''}</div>`);
                                } else {
                                    if (entry.loserDetails) {
                                        const detail = entry.loserDetails.find(d => d.loserId === p.id);
                                        change += detail ? -detail.score : 0;
                                    } else {
                                        change += -entry.totalScoreChange / 3;
                                    }
                                }
                            } else if (entry.type === 'post-game') {
                                if (entry.loserId === p.id) {
                                    change += -entry.totalScoreChange;
                                    badges.push(`<div class="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold">出銃</div>`);
                                } else if (entry.winnerIds && entry.winnerIds.includes(p.id)) {
                                    if (entry.winnerDetails) {
                                        const detail = entry.winnerDetails.find(d => d.winnerId === p.id);
                                        change += detail ? detail.finalScore : 0;
                                        badges.push(`<div class="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold">糊 ${detail && detail.handFan ? detail.handFan+'番' : ''}</div>`);
                                    } else {
                                        change += entry.totalScoreChange / entry.winnerIds.length;
                                        badges.push(`<div class="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold">糊</div>`);
                                    }
                                }
                            } else if (entry.type === 'surrender') {
                                 if (entry.loserId === p.id) {
                                     if (!badges.some(b => b.includes('投降'))) {
                                         badges.push(`<div class="bg-gray-400 dark:bg-gray-600 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold transition-colors">投降</div>`);
                                     }
                                 }
                            } else if (entry.type === 'draw') {
                                 if (!badges.some(b => b.includes('流局'))) {
                                     badges.push(`<div class="bg-gray-500 dark:bg-gray-600 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold transition-colors">流局</div>`);
                                 }
                            } else if (entry.type === 'manual-override' && entry.subtype === 'dealer') {
                                 if (entry.newBrokerId === p.id && !badges.some(b => b.includes('新莊家'))) {
                                     badges.push(`<div class="bg-yellow-500 dark:bg-yellow-600 text-white text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold transition-colors">新莊家</div>`);
                                 }
                            }
                        });

                        if (seatWinds) {
                            const label = relativeWindLabel(seatWinds.seating, seatWinds.brokerId, p.id);
                            if (label) {
                                badges.push(`<div class="bg-purple-400 dark:bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded mt-1 shadow-sm font-bold transition-colors">調位:${label}</div>`);
                            }
                        }

                        if (isBroker && hasGameAction) {
                            badges.push(`<div class="bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-400 text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold border border-yellow-300 dark:border-yellow-700/60 transition-colors">莊</div>`);
                        }
        
                        const displayChange = change === 0 ? 0 : Math.round(change * 10) / 10;
                        const changeStr = displayChange === 0 
                            ? '<span class="text-gray-300 dark:text-gray-600 font-light text-lg transition-colors">0</span>' 
                            : `<span class="text-xl font-bold tabular-nums ${displayChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} transition-colors">${formatScore(displayChange, { signed: true })}</span>`;
                        const bgClass = 'bg-transparent';
                        return `
                            <div class="flex flex-col items-center justify-start py-4 ${bgClass} h-full border-b border-gray-300 dark:border-gray-700 transition-colors border-l border-gray-200 dark:border-gray-700/30">
                                ${changeStr}
                                <div class="flex flex-col items-center space-y-1 mt-1">
                                    ${badges.join('')}
                                </div>
                            </div>
                        `;
                    });
        
                    html += `
                        <div class="grid grid-cols-[60px_repeat(4,minmax(0,1fr))] gap-0 items-stretch min-h-[80px] w-full">
                            <div class="flex flex-col justify-start pt-2 px-1 transition-colors">${timelineNode}</div>
                            ${playerCells.join('')}
                        </div>
                    `;
                });
            });
    
            html += `
                        </div>
                    </div>
                </div>
            `;
            historyContainer.innerHTML = html;
        }

