import { FAN_DATA } from '../constants.js';

// Automatically extracted UI module

export function renderWindSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'wind-settings-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        const rCount = this.gameState.rotationCount || 0;
        const currentWindIdx = Math.floor(rCount / 4) % 4;
        const currentGameIdx = rCount % 4;

        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm relative transition-colors">
                <button id="close-wind-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
                <h3 class="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100 transition-colors">設定風圈與局數</h3>
                <form id="wind-settings-form">
                    <div class="flex space-x-4 mb-6">
                        <div class="w-1/2">
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1 text-center font-bold transition-colors">風圈</label>
                            <select id="select-wind" class="w-full p-3 border dark:border-gray-600 rounded-lg text-center text-xl font-bold bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
                                <option value="0" ${currentWindIdx === 0 ? 'selected' : ''}>東風</option>
                                <option value="1" ${currentWindIdx === 1 ? 'selected' : ''}>南風</option>
                                <option value="2" ${currentWindIdx === 2 ? 'selected' : ''}>西風</option>
                                <option value="3" ${currentWindIdx === 3 ? 'selected' : ''}>北風</option>
                            </select>
                        </div>
                        <div class="w-1/2">
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1 text-center font-bold transition-colors">局數</label>
                            <select id="select-game" class="w-full p-3 border dark:border-gray-600 rounded-lg text-center text-xl font-bold bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
                                <option value="0" ${currentGameIdx === 0 ? 'selected' : ''}>東局</option>
                                <option value="1" ${currentGameIdx === 1 ? 'selected' : ''}>南局</option>
                                <option value="2" ${currentGameIdx === 2 ? 'selected' : ''}>西局</option>
                                <option value="3" ${currentGameIdx === 3 ? 'selected' : ''}>北局</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">確認 (Confirm)</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-wind-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'wind-settings-modal') document.body.removeChild(modal);
        });

        document.getElementById('wind-settings-form').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await this.saveStateForUndo();
            const selectedWind = parseInt(document.getElementById('select-wind').value);
            const selectedGame = parseInt(document.getElementById('select-game').value);
            
            const newRotationCount = (selectedWind * 4) + selectedGame;
            
            // Record the override in history for replay/recalculation accuracy
            this.gameState.gameHistory.push({
                type: 'manual-override',
                subtype: 'rotation',
                oldValue: this.gameState.rotationCount,
                newValue: newRotationCount,
                timestamp: new Date().toISOString()
            });

            this.gameState.rotationCount = newRotationCount;
            
            await this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
        });
    }

export function renderSetDealerModal() {
        const modal = document.createElement('div');
        modal.id = 'set-dealer-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm relative transition-colors">
                <button id="close-dealer-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
                <h3 class="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100 transition-colors">設定莊家 (Set Dealer)</h3>
                <form id="set-dealer-form">
                    <div class="flex flex-col space-y-3 mb-6">
                        ${this.gameState.players.map(p => `
                            <label class="flex items-center p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-100">
                                <input type="radio" name="select-new-dealer" value="${p.id}" ${p.isBroker ? 'checked' : ''} class="w-5 h-5 mr-3 accent-blue-500">
                                <span class="text-2xl mr-2">${p.icon}</span>
                                <span class="text-lg font-bold">${p.name}</span>
                            </label>
                        `).join('')}
                    </div>
                    <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors">確認 (Confirm)</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-dealer-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'set-dealer-modal') document.body.removeChild(modal);
        });

        document.getElementById('set-dealer-form').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await this.saveStateForUndo();
            const selectedId = parseInt(document.querySelector('input[name="select-new-dealer"]:checked').value);
            
            const oldBroker = this.gameState.players.find(p => p.isBroker);
            
            // Record the override in history
            this.gameState.gameHistory.push({
                type: 'manual-override',
                subtype: 'dealer',
                oldBrokerId: oldBroker ? oldBroker.id : null,
                newBrokerId: selectedId,
                timestamp: new Date().toISOString()
            });

            this.gameState.players.forEach(p => {
                p.isBroker = (p.id === selectedId);
                // When manually changing the dealer, we reset LianZhuang for everyone.
                p.lianZhuangCount = 0;
            });
            
            await this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
        });
    }

export function renderSetSeatingModal() {
        const oldSeating = [...this.gameState.config.seating];
        const modal = document.createElement('div');
        modal.id = 'set-seating-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg overflow-y-auto overflow-x-hidden transition-colors" style="max-height: 90vh;">
                <button id="close-seating-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold z-10 transition-colors">&times;</button>
                <div id="seating-area" class="relative w-64 h-64 mx-auto border-2 border-dashed dark:border-gray-600 rounded-md mt-12 mb-10 transition-colors"></div>
                <div class="mt-6 flex flex-col items-center">
                     <button id="finish-set-seating" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors">確認 (Confirm)</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        document.getElementById('close-seating-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'set-seating-modal') {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        });

        // Save current seating configuration as backup for undo
        this.saveStateForUndo();

        document.getElementById('finish-set-seating').addEventListener('click', async () => {
            const history = this.gameState.gameHistory;
            const lastEvent = history.length > 0 ? history[history.length - 1] : null;

            if (lastEvent && lastEvent.type === 'manual-override' && lastEvent.subtype === 'seating') {
                // Collapse consecutive seating changes into the last event
                lastEvent.seating = [...this.gameState.config.seating];
                lastEvent.timestamp = new Date().toISOString();
            } else {
                // Record the new override in history
                history.push({
                    type: 'manual-override',
                    subtype: 'seating',
                    oldSeating: oldSeating,
                    seating: [...this.gameState.config.seating],
                    timestamp: new Date().toISOString()
                });
            }

            await this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        });

        // Re-use the existing display method to render the drag-and-drop elements
        this._updateSeatingDisplay();
    }

export function renderActiveStreaksModal() {
        const modal = document.createElement('div');
        modal.id = 'active-streaks-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        let streaksHTML = '';
        const activeStreaks = [];

        if (this.gameState.streaks) {
            for (const [key, data] of Object.entries(this.gameState.streaks)) {
                if (data.count > 0) {
                    const [wId, lId] = key.split('-').map(Number);
                    const winner = this.gameState.players.find(p => p.id === wId);
                    const loser = this.gameState.players.find(p => p.id === lId);
                    if (winner && loser) {
                        activeStreaks.push({ winner, loser, data, key });
                    }
                }
            }
        }

        if (activeStreaks.length === 0) {
            streaksHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-8 transition-colors">目前無連勝紀錄 (No active streaks).</div>';
        } else {
            streaksHTML = activeStreaks.map(s => `
                <div class="flex justify-between items-center p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2 transition-colors">
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="font-bold text-sm truncate whitespace-nowrap mb-1 text-gray-800 dark:text-gray-100 transition-colors">
                            ${s.winner.icon} ${s.winner.name} <span class="text-gray-400 dark:text-gray-500 font-normal mx-0.5 transition-colors">拉</span> ${s.loser.icon} ${s.loser.name}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap transition-colors">
                            連勝: <span class="font-bold text-red-500 dark:text-red-400">${s.data.count}</span> | 番: <span class="font-bold">${typeof s.data.totalAmount === 'number' ? s.data.totalAmount.toFixed(1).replace(/\.0$/, '') : s.data.totalAmount}</span>
                        </div>
                    </div>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm manual-surrender-btn flex-shrink-0 transition-colors" data-streak-key="${s.key}" data-winner="${s.winner.id}" data-loser="${s.loser.id}">
                        投降 (Surrender)
                    </button>
                </div>
            `).join('');
        }

        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-md relative max-h-[80vh] flex flex-col transition-colors">
                <button id="close-streaks-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
                <h3 class="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100 transition-colors">連勝狀態與投降<br><span class="text-sm text-gray-500 dark:text-gray-400 font-normal transition-colors">(Active Streaks / Surrender)</span></h3>
                ${activeStreaks.length > 0 ? `
                    <div class="mb-4 text-right">
                        <button id="btn-surrender-all" class="text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded transition-colors">
                            全部投降 (All Surrender)
                        </button>
                    </div>
                ` : ''}
                <div class="overflow-y-auto flex-1">
                    ${streaksHTML}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-streaks-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'active-streaks-modal') document.body.removeChild(modal);
        });

        const btnSurrenderAll = document.getElementById('btn-surrender-all');
        if (btnSurrenderAll) {
            btnSurrenderAll.addEventListener('click', async () => {
                if (confirm('確定要一鍵清空所有的連勝與拉莊紀錄嗎？\n此操作無法單獨復原。')) {
                    await this.saveStateForUndo();
                    
                    activeStreaks.forEach(s => {
                        this.gameState.streaks[s.key] = { count: 0, totalAmount: 0 };
                        this.gameState.gameHistory.push({
                            type: 'surrender',
                            winnerId: s.winner.id,
                            loserId: s.loser.id,
                            brokerId: this.gameState.players.find(p => p.isBroker)?.id,
                            rotationCount: this.gameState.rotationCount || 0,
                            timestamp: new Date().toISOString()
                        });
                    });

                    await this._saveGame();
                    this.renderGame();
                    document.body.removeChild(modal);
                }
            });
        }

        document.querySelectorAll('.manual-surrender-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const btnEl = e.currentTarget;
                const streakKey = btnEl.dataset.streakKey;
                const winnerId = parseInt(btnEl.dataset.winner);
                const loserId = parseInt(btnEl.dataset.loser);
                const winner = this.gameState.players.find(p => p.id === winnerId);
                const loser = this.gameState.players.find(p => p.id === loserId);
                const streakData = this.gameState.streaks[streakKey];
                const totalAmt = typeof streakData?.totalAmount === 'number' ? streakData.totalAmount.toFixed(1).replace(/\.0$/, '') : '0';

                if (confirm(`確定要讓 ${loser.name} 向 ${winner.name} 投降 (斷纜) 嗎？\n目前累積番數: ${totalAmt}\n此操作將清空雙方連勝/連拉累積紀錄。`)) {
                    await this.saveStateForUndo();
                    this.gameState.streaks[streakKey] = { count: 0, totalAmount: 0 };
                    
                    this.gameState.gameHistory.push({
                        type: 'surrender',
                        winnerId: winnerId,
                        loserId: loserId,
                        brokerId: this.gameState.players.find(p => p.isBroker)?.id,
                        rotationCount: this.gameState.rotationCount || 0,
                        timestamp: new Date().toISOString()
                    });

                    await this._saveGame();
                    this.renderGame();
                    document.body.removeChild(modal);
                }
            });
        });
    }

export function renderSettleDebtsModal() {
        const transactions = this.calculateSettleDebts();
        
        const modal = document.createElement('div');
        modal.id = 'settle-debts-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]';
        
        let html = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col relative transition-colors">
                <button id="close-settle-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
                <h3 class="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100 transition-colors">結算找數 (Settle Debts)</h3>
                <div class="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 transition-colors">以下是最小交易次數建議 (Min. Transactions)</div>
                <div class="space-y-4 mb-6 overflow-y-auto pr-1">
        `;
        
        if (transactions.length === 0) {
            html += `<div class="text-center text-gray-500 dark:text-gray-400 font-bold py-4 transition-colors">目前沒有需要結算的款項<br>(All balances are zero).</div>`;
        } else {
            transactions.forEach(t => {
                html += `
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                        <div class="flex flex-col items-center justify-center w-16">
                            <span class="text-3xl mb-1 drop-shadow-sm">${t.from.icon}</span>
                            <span class="text-[11px] font-black text-gray-900 dark:text-gray-100 truncate w-full text-center tracking-tighter transition-colors">${t.from.name}</span>
                        </div>

                        <div class="flex-1 flex items-center px-2">
                            <div class="flex-1 h-[2px] bg-gray-400 dark:bg-gray-500 transition-colors"></div>
                            <span class="px-2 font-black text-xl text-green-600 dark:text-green-400 transition-colors">${t.amount}</span>
                            <div class="flex-1 h-[2px] bg-gray-400 dark:bg-gray-500 flex items-center relative transition-colors">
                                <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-400 dark:border-l-gray-500 transition-colors"></div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center justify-center w-16">
                            <span class="text-3xl mb-1 drop-shadow-sm">${t.to.icon}</span>
                            <span class="text-[11px] font-black text-gray-900 dark:text-gray-100 truncate w-full text-center tracking-tighter transition-colors">${t.to.name}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
                <div class="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors">
                    <button id="btn-close-settle" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors shadow-md">完成 (Close)</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };
        
        document.getElementById('close-settle-modal').addEventListener('click', closeModal);
        document.getElementById('btn-close-settle').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'settle-debts-modal') closeModal();
        });
    }

export function renderFanTableModal() {
        const modal = document.createElement('div');
        modal.id = 'fan-table-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[80]';
        
        let html = `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden transition-colors">
                <div class="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 transition-colors">
                    <h3 class="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center">
                        <span class="mr-2">📜</span> 番數表 (Fan Lookup)
                    </h3>
                    <button id="close-fan-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-bold transition-colors">&times;</button>
                </div>
                
                <div class="p-4 bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 transition-colors">
                    <input type="text" id="fan-search-input" placeholder="搜尋番種 (如: 清一色, 雞胡)..." class="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                </div>

                <div id="fan-list-container" class="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    ${this._generateFanListHTML()}
                </div>
                
                <div class="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-xs text-gray-500 dark:text-gray-400 transition-colors">
                    <p>* 以上番數僅供參考，實際以玩家協議為準。</p>
                    <p class="mt-1 opacity-60">最後更新 (Last Updated): 2024-03-28</p>
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        const searchInput = document.getElementById('fan-search-input');
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const container = document.getElementById('fan-list-container');
            container.innerHTML = this._generateFanListHTML(term);
        });

        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };

        document.getElementById('close-fan-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'fan-table-modal') closeModal();
        });
    }

export function _generateFanListHTML(searchTerm = '') {
        let html = '';
        
        FAN_DATA.forEach(category => {
            const filteredItems = category.items.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                item.note.toLowerCase().includes(searchTerm) ||
                String(item.fan).toLowerCase().includes(searchTerm)
            );

            if (filteredItems.length > 0) {
                html += `
                    <div>
                        <h4 class="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 border-l-4 border-blue-500 pl-2 transition-colors">${category.category}</h4>
                        <div class="bg-gray-50 dark:bg-gray-700/30 rounded-lg border dark:border-gray-700 overflow-hidden transition-colors">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold transition-colors">
                                    <tr>
                                        <th class="px-4 py-2 w-1/3">番種</th>
                                        <th class="px-4 py-2 w-20 text-center">番數</th>
                                        <th class="px-4 py-2">說明/備註</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filteredItems.map((item, idx) => `
                                        <tr class="border-t dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800/40' : 'bg-transparent'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-100">${item.name}</td>
                                            <td class="px-4 py-3 text-center font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">${item.fan}</td>
                                            <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${item.note || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        });

        if (html === '') {
            return `<div class="text-center py-20 text-gray-500 dark:text-gray-400">找不到符合 "${searchTerm}" 的番種。</div>`;
        }
        
        return html;
    }

export function renderShareResultModal() {
        const modal = document.createElement('div');
        modal.id = 'share-result-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[70] overflow-y-auto';

        // 1. Calculate Stats
        let stats = {};
        this.gameState.players.forEach(p => {
            stats[p.id] = { name: p.name, icon: p.icon, score: p.score, wu: 0, zimo: 0, chuchong: 0, bpFan: 0, totalWinningFan: 0, wuWithFan: 0 };
        });
        
        this.gameState.gameHistory.forEach(game => {
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

        // 2. Calculate Debts
        const transactions = this.calculateSettleDebts();

        const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        let html = `
            <div class="w-full max-w-md flex flex-col relative my-auto py-10">
                <button id="close-share-modal" class="absolute safe-top-btn right-2 text-white hover:text-gray-300 text-3xl font-bold z-10">&times;</button>
                
                <div id="capture-area" class="bg-gray-200 dark:bg-gray-900 rounded-lg shadow-2xl p-6 w-full text-gray-800 dark:text-gray-100">
                    <h2 class="text-2xl font-black text-center mb-2 tracking-tight">戰果總結 (Match Results)</h2>
                    <div class="text-center text-xs text-gray-500 mb-6">${dateStr}</div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">最終得分 (Final Scores)</h3>
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        ${this.gameState.players.map(p => {
                            const pStats = stats[p.id];
                            return `
                                <div class="p-3 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center space-x-2">
                                            <span class="text-2xl drop-shadow-sm">${p.icon}</span>
                                            <span class="font-bold text-sm max-w-[70px] whitespace-nowrap overflow-hidden text-ellipsis py-0.5">${p.name}</span>
                                        </div>
                                        <span class="text-lg font-black ${p.score > 0 ? 'text-green-600 dark:text-green-400' : (p.score < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400')}">${p.score > 0 ? '+' : ''}${p.score.toFixed(1).replace(/\.0$/, '')}</span>
                                    </div>
                                    ${pStats.titles.length > 0 ? `
                                        <div class="mt-1.5 block w-full">
                                            ${pStats.titles.map(t => `<span class="${t.color} text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm inline-block mr-1 mb-1">${t.label}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `
                        }).join('')}
                    </div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">數據統計 (Stats)</h3>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-6">
                        <table class="w-full text-center text-xs">
                            <thead class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                                <tr>
                                    <th class="p-2 text-left">玩家</th>
                                    <th class="p-2">糊</th>
                                    <th class="p-2">自摸</th>
                                    <th class="p-2">出銃</th>
                                    <th class="p-2">獎/罰 (番)</th>
                                    <th class="p-2">平均番數</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(stats).map((s, idx) => `
                                    <tr class="border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-100 dark:bg-gray-800/50' : 'bg-gray-50 dark:bg-gray-800'}">
                                        <td class="p-2 text-left font-bold whitespace-nowrap">
                                            <span class="text-lg mr-1 align-middle inline-block">${s.icon}</span>
                                            <span class="inline-block align-middle">${s.name}</span>
                                        </td>
                                        <td class="p-2">${s.wu}</td>
                                        <td class="p-2 text-green-600 dark:text-green-400">${s.zimo}</td>
                                        <td class="p-2 text-red-600 dark:text-red-400">${s.chuchong}</td>
                                        <td class="p-2 ${s.bpFan > 0 ? 'text-blue-600 dark:text-blue-400' : (s.bpFan < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500')}">${s.bpFan > 0 ? '+' : ''}${Math.round(s.bpFan * 10)/10}</td>
                                        <td class="p-2">${s.wuWithFan > 0 ? (s.totalWinningFan / s.wuWithFan).toFixed(1) : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">結算找數 (Settle Debts)</h3>
                    <div class="space-y-3 mb-2">
                        ${transactions.length === 0 ? '<div class="text-center text-sm text-gray-500 py-2">無須結算 (All balanced).</div>' : transactions.map(t => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
                                <div class="text-center w-14">
                                    <div class="text-xl">${t.from.icon}</div>
                                    <div class="text-[10px] font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis w-full mt-1 py-0.5">${t.from.name}</div>
                                </div>
                                <div class="flex-1 flex items-center px-2">
                                    <div class="flex-1 h-[2px] bg-gray-400 dark:bg-gray-500"></div>
                                    <span class="px-2 font-black text-sm text-green-600 dark:text-green-400">${t.amount}</span>
                                    <div class="flex-1 h-[2px] bg-gray-400 dark:bg-gray-500 flex items-center relative">
                                        <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-400 dark:border-l-gray-500"></div>
                                    </div>
                                </div>
                                <div class="text-center w-14">
                                    <div class="text-xl">${t.to.icon}</div>
                                    <div class="text-[10px] font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis w-full mt-1 py-0.5">${t.to.name}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <button id="btn-download-image" class="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-colors">
                    <span id="download-text">下載圖片 (Download Image)</span>
                    <span id="download-spinner" class="hidden animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                </button>
            </div>
        `;

        modal.innerHTML = html;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };

        document.getElementById('close-share-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'share-result-modal') closeModal();
        });

        document.getElementById('btn-download-image').addEventListener('click', async () => {
            if (typeof html2canvas === 'undefined') {
                alert('圖片產生工具尚未載入，請稍後再試或重新整理網頁。(Tool not loaded)');
                return;
            }

            const btn = document.getElementById('btn-download-image');
            const text = document.getElementById('download-text');
            const spinner = document.getElementById('download-spinner');
            
            btn.disabled = true;
            text.textContent = '產生中 (Generating)...';
            spinner.classList.remove('hidden');

            try {
                const captureArea = document.getElementById('capture-area');
                const canvas = await html2canvas(captureArea, {
                    scale: 2,
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#e5e7eb',
                    logging: false,
                    useCORS: true
                });

                const image = canvas.toDataURL("image/png");
                
                const link = document.createElement('a');
                link.href = image;
                link.download = `mahjong_result_${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                closeModal();
            } catch (error) {
                console.error("Failed to capture image", error);
                alert("產生圖片失敗，請重試。(Failed to generate image)");
                
                btn.disabled = false;
                text.textContent = '下載圖片 (Download Image)';
                spinner.classList.add('hidden');
            }
        });
    }
