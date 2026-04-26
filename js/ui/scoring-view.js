// Automatically extracted UI module

export function renderScoringView() {
        const scoringDiv = document.getElementById('scoring-view');
        const state = this.gameState;
        const winds = ['東', '南', '西', '北'];
        const rCount = state.rotationCount || 0;
        const windIndex = Math.floor(rCount / 4) % 4;
        const gameIndex = rCount % 4;

        scoringDiv.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-b-lg shadow transition-colors">
                <h2 class="text-xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200 transition-colors">Current Seating</h2>
                <div class="relative w-64 h-64 mx-auto border-2 dark:border-gray-600 rounded-md mt-8 mb-16 transition-colors">
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-20 dark:opacity-40 pointer-events-none select-none text-gray-500 dark:text-gray-400 transition-colors">
                        <span class="text-5xl font-black tracking-widest">${winds[windIndex]}風</span>
                        <span class="text-5xl font-black tracking-widest">${winds[gameIndex]}局</span>
                    </div>
                    ${state.config.seating.map((playerId, index) => {
                        const player = state.players.find(p => p.id === playerId);
                        if (!player) return '';
                        let positionClass = '';
                        if (index === 0) positionClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
                        if (index === 1) positionClass = 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2';
                        if (index === 2) positionClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
                        if (index === 3) positionClass = 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2';
                        
                        return `
                            <div class="absolute ${positionClass} w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                                <div class="text-center text-gray-800 dark:text-gray-200">
                                    <div class="text-3xl">${player.icon}</div>
                                    <div class="text-xs font-semibold mt-1">${player.isBroker ? '<span class="text-yellow-500 font-bold mr-1">莊</span>' : ''}${player.name}</div>
                            ${player.lianZhuangCount > 0 ? `<div class="text-xs font-black text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 rounded-sm mt-0.5 animate-pulse transition-colors">連${player.lianZhuangCount}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                    ${state.players.map(p => `
                        <div class="p-4 rounded-lg shadow cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-750 player-card ${p.isBroker ? 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/60 dark:hover:bg-yellow-800/60' : 'bg-gray-50 dark:bg-gray-700'} text-gray-800 dark:text-gray-100 transition-colors" data-player-id="${p.id}">
                            <div class="text-3xl pointer-events-none">${p.icon}</div>
                            <div class="font-bold text-lg pointer-events-none">${p.name}</div>
                            <div class="text-2xl font-light pointer-events-none">${p.score.toFixed(1)}</div>
                            ${p.isBroker ? `<div class="text-xs font-bold text-yellow-700 dark:text-yellow-400 pointer-events-none mt-1">莊 ${p.lianZhuangCount > 0 ? `<span class="text-green-600 dark:text-green-400 font-black bg-green-100 dark:bg-green-900 px-1.5 rounded ml-1 transition-colors">連${p.lianZhuangCount}</span>` : ''}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // --- Event Listeners for Player Cards ---
        document.querySelectorAll('.player-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const playerId = parseInt(e.currentTarget.dataset.playerId);
                this.renderActionModal(playerId);
            });
        });
    }

export function renderActionModal(playerId) {
        const player = this.gameState.players.find(p => p.id === playerId);
        if (!player) return;

        const modal = document.createElement('div');
        modal.id = 'action-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg relative transition-colors text-gray-800 dark:text-gray-100">
                <button id="close-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold transition-colors">&times;</button>
                <h2 class="text-2xl font-bold text-center mb-6">${player.icon} ${player.name}</h2>
                
                <div id="action-selection" class="flex flex-col space-y-3">
                    <button class="action-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="bonus_penalty">獎 / 罰</button>
                    <button class="action-btn bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="zimo">自摸</button>
                    <button class="action-btn bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="lose">出銃</button>
                </div>

                <div id="action-input-area" class="hidden mt-4">
                    <!-- Dynamic form will be rendered here -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'action-modal') document.body.removeChild(modal);
        });

        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                document.getElementById('action-selection').classList.add('hidden');
                const inputArea = document.getElementById('action-input-area');
                inputArea.classList.remove('hidden');

                if (action === 'bonus_penalty') {
                    inputArea.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center">獎 / 罰</h3>
                        <form id="bp-form">
                            <div class="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-4 w-full text-lg font-bold mx-auto select-none transition-colors">
                                <label class="flex-1 text-center cursor-pointer">
                                    <input type="radio" name="bp-type" value="bonus" class="hidden peer" checked>
                                    <div class="py-2 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm peer-checked:text-blue-600 dark:peer-checked:text-blue-400 transition-all text-gray-500 dark:text-gray-400">獎 (+)</div>
                                </label>
                                <label class="flex-1 text-center cursor-pointer">
                                    <input type="radio" name="bp-type" value="penalty" class="hidden peer">
                                    <div class="py-2 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm peer-checked:text-red-600 dark:peer-checked:text-red-400 transition-all text-gray-500 dark:text-gray-400">罰 (-)</div>
                                </label>
                            </div>
                            <div class="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-6 w-full text-lg font-bold mx-auto select-none transition-colors">
                                <label class="flex-1 text-center cursor-pointer">
                                    <input type="radio" name="bp-amount" value="0.5" class="hidden peer">
                                    <div class="py-3 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm peer-checked:text-gray-900 dark:peer-checked:text-gray-100 transition-all text-gray-500 dark:text-gray-400">半底</div>
                                </label>
                                <label class="flex-1 text-center cursor-pointer">
                                    <input type="radio" name="bp-amount" value="1" class="hidden peer" checked>
                                    <div class="py-3 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm peer-checked:text-gray-900 dark:peer-checked:text-gray-100 transition-all text-gray-500 dark:text-gray-400">一底</div>
                                </label>
                                <label class="flex-1 text-center cursor-pointer">
                                    <input type="radio" name="bp-amount" value="2" class="hidden peer">
                                    <div class="py-3 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm peer-checked:text-gray-900 dark:peer-checked:text-gray-100 transition-all text-gray-500 dark:text-gray-400">兩底</div>
                                </label>
                            </div>
                            <div class="flex space-x-2">
                                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors">返回</button>
                                <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">確認</button>
                            </div>
                        </form>
                    `;
                    
                    document.getElementById('bp-form').addEventListener('submit', (ev) => {
                        ev.preventDefault();
                        const checkedAmountInput = document.querySelector('input[name="bp-amount"]:checked');
                        const mult = parseFloat(checkedAmountInput ? checkedAmountInput.value : 1);
                        const bpType = document.querySelector('input[name="bp-type"]:checked').value;
                        if (isNaN(mult) || mult <= 0) return;

                        this.saveStateForUndo();

                        const di = this.gameState.config.baseScoreDi || 0;
                        const inputScore = Math.round((di * mult) * 10) / 10;

                        const totalScore = Math.round((inputScore * 3) * 10) / 10;
                        const scoreChange = bpType === 'bonus' ? totalScore : -totalScore;
                        const perPlayerChange = bpType === 'bonus' ? -inputScore : inputScore;
                        const otherPlayers = this.gameState.players.filter(p => p.id !== playerId);
                        
                        // Note: Bonus/Penalty explicitly does NOT affect 連勝 (streaks), 劈半 (劈半), or 莊 (broker rotation).
                        
                        player.score += scoreChange;
                        otherPlayers.forEach(p => p.score += perPlayerChange);

                        this.gameState.gameHistory.push({
                            type: 'in-game',
                            subtype: bpType,
                            player: player.name,
                            playerId: player.id,
                            score: totalScore,
                            brokerId: this.gameState.players.find(p => p.isBroker)?.id,
                            rotationCount: this.gameState.rotationCount || 0,
                            timestamp: new Date().toISOString()
                        });

                        this._saveGame();
                        this.renderGame();
                        document.body.removeChild(modal);
                    });

                } else if (action === 'zimo') {
                    inputArea.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center">自摸</h3>
                        <form id="zimo-form">
                            <input type="number" id="zimo-score-input" data-winner="${playerId}" placeholder="每家番數" class="w-full p-3 border dark:border-gray-600 rounded-lg text-xl mb-4 text-center font-bold text-purple-700 dark:text-purple-400 bg-gray-50 dark:bg-gray-700 transition-colors" min="1" step="1" required autofocus>
                            <div id="breakdown-zimo" class="w-full text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono space-y-1 text-center transition-colors"></div>
                            <div class="flex space-x-2">
                                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors">返回</button>
                                <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">確認</button>
                            </div>
                        </form>
                    `;
                    
                    setTimeout(() => document.getElementById('zimo-score-input')?.focus(), 50);

                    const zimoInput = document.getElementById('zimo-score-input');
                    zimoInput.addEventListener('focus', e => e.target.select());
                    zimoInput.addEventListener('input', (e) => {
                        const val = parseInt(e.target.value);
                        const winnerId = parseInt(e.target.dataset.winner);
                        const breakdownDiv = document.getElementById('breakdown-zimo');
                        
                        if (isNaN(val) || val <= 0) {
                            breakdownDiv.innerHTML = '';
                            return;
                        }

                        const otherPlayers = this.gameState.players.filter(p => p.id !== winnerId);
                        let html = '';
                        let grandTotal = 0;
                        otherPlayers.forEach(loser => {
                             const result = this.calculateMatchup(winnerId, loser.id, val);
                             grandTotal += result.total;
                             html += `<div class="flex justify-between items-center whitespace-nowrap"><span class="w-16 text-left truncate text-gray-700 dark:text-gray-300 mr-2 transition-colors">${loser.name}</span> <span class="flex-1 text-right text-[10px]">${result.breakdownHTML}</span></div>`;
                        });
                        html += `<div class="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center transition-colors"><span class="font-bold text-gray-800 dark:text-gray-200 text-sm transition-colors">Total:</span> <span class="font-black text-green-600 dark:text-green-400 text-lg transition-colors">+${grandTotal}</span></div>`;
                        breakdownDiv.innerHTML = html;
                    });

                    document.getElementById('zimo-form').addEventListener('submit', (ev) => {
                        ev.preventDefault();
                        const inputScore = parseInt(document.getElementById('zimo-score-input').value);
                        if (isNaN(inputScore) || inputScore <= 0) return;

                        this.saveStateForUndo();

                                                const di = this.gameState.config.baseScoreDi || 0;
                                                const otherPlayers = this.gameState.players.filter(p => p.id !== playerId);
                                                let totalWon = 0;
                                                if (!this.gameState.streaks) this.gameState.streaks = {};
                        
                                                const updatedStreaks = [];
                                                const loserDetails = [];
                        
                                                                        // 1. Calculate the payouts from the losers
                                                                        otherPlayers.forEach(loser => {
                                                                            const result = this.calculateMatchup(playerId, loser.id, inputScore);
                                                                            const streakKey = `${playerId}-${loser.id}`; // Winner is playerId
                                                                            const reverseStreakKey = `${loser.id}-${playerId}`;
                                                
                                                                            if (!this.gameState.streaks[streakKey]) {
                                                                                this.gameState.streaks[streakKey] = { count: 0, totalAmount: 0 };
                                                                            }
                                                
                                                                            // The loser's specific streak against this winner is broken
                                                                            this.gameState.streaks[reverseStreakKey] = { count: 0, totalAmount: 0 };
                                                
                                                                            this.gameState.streaks[streakKey].count++;
                                                                            this.gameState.streaks[streakKey].totalAmount += result.streakWin;
                                                
                                                                            loser.score -= result.total;
                                                                            totalWon += result.total;
                                                
                                                                            updatedStreaks.push({ winnerId: playerId, loserId: loser.id, streakKey });
                                                                            loserDetails.push({ loserId: loser.id, score: result.total });
                                                                        });
                                                
                                                                        player.score += totalWon;
                                                
                                                                        // 2. Global Streak Break: Any time ANY player wins, ALL other players lose their active pulling streaks against EVERYONE.
                                                                        // "When the player is not winning consecutively, the streak should be ended."
                                                                        this.gameState.players.forEach(p => {
                                                                            if (p.id !== playerId) {
                                                                                // This player didn't win, so break all their pulling streaks
                                                                                this.gameState.players.forEach(target => {
                                                                                    const streakKeyToBreak = `${p.id}-${target.id}`;
                                                                                    if (this.gameState.streaks[streakKeyToBreak]) {
                                                                                        this.gameState.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                        const eventBrokerId = this.gameState.players.find(p => p.isBroker)?.id;
                        const eventRotationCount = this.gameState.rotationCount || 0;

                        // Broker rotation
                        if (!player.isBroker) {
                            const brokerPlayer = this.gameState.players.find(p => p.isBroker);
                            brokerPlayer.isBroker = false;
                            brokerPlayer.lianZhuangCount = 0;
                            
                            // Find the broker's current seat index (0=Top/North, 1=Right/East, 2=Bottom/South, 3=Left/West)
                            const currentSeatIndex = this.gameState.config.seating.findIndex(id => id === brokerPlayer.id);
                            
                            // Rotate counter-clockwise (previous seat index)
                            const nextSeatIndex = (currentSeatIndex - 1 + this.gameState.config.seating.length) % this.gameState.config.seating.length;
                            const nextBrokerId = this.gameState.config.seating[nextSeatIndex];
                            
                            const nextBroker = this.gameState.players.find(p => p.id === nextBrokerId);
                            nextBroker.isBroker = true;
                            
                            this.gameState.rotationCount = (this.gameState.rotationCount || 0) + 1;
                        } else {
                            player.lianZhuangCount = (player.lianZhuangCount || 0) + 1;
                        }

                        this.gameState.gameHistory.push({
                            type: 'zimo',
                            winnerId: playerId,
                            handFan: inputScore,
                            totalScoreChange: totalWon,
                            loserDetails: loserDetails,
                            brokerId: eventBrokerId,
                            rotationCount: eventRotationCount,
                            timestamp: new Date().toISOString()
                        });

                        document.body.removeChild(modal);
                        this.checkSurrenders(updatedStreaks);
                    });

                } else if (action === 'lose') {
                    const otherPlayers = this.gameState.players.filter(p => p.id !== playerId);
                    inputArea.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center">出銃</h3>
                        <form id="lose-form">
                            ${otherPlayers.map((p, index) => `
                                <div class="flex flex-col mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-2 w-1/2">
                                            <span class="text-2xl">${p.icon}</span>
                                            <span class="font-bold truncate text-gray-800 dark:text-gray-100 transition-colors">${p.name}</span>
                                        </div>
                                        <div class="w-1/2 flex items-center">
                                            <input type="number" id="lose-input-${p.id}" data-loser="${playerId}" data-winner="${p.id}" class="lose-input-calc w-full p-2 border dark:border-gray-600 rounded text-right font-bold text-lg text-purple-700 dark:text-purple-400 bg-gray-50 dark:bg-gray-800 transition-colors" min="0" step="1" placeholder="番數" ${index === 0 ? 'autofocus' : ''}>
                                        </div>
                                    </div>
                                    <div id="breakdown-lose-${p.id}" class="text-[10px] text-gray-800 dark:text-gray-300 text-right font-mono h-4 whitespace-nowrap transition-colors"></div>
                                </div>
                            `).join('')}
                            <div id="total-lose-summary" class="hidden mb-4 mt-2 px-2 py-3 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center transition-colors">
                                <span class="font-bold text-gray-800 dark:text-gray-200 text-sm transition-colors">Total:</span> 
                                <span id="total-lose-amount" class="font-black text-red-600 dark:text-red-400 text-lg transition-colors">0</span>
                            </div>
                            <div class="flex space-x-2 mt-2">
                                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors">返回</button>
                                <button type="submit" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">確認</button>
                            </div>
                        </form>
                    `;

                    // Ensure autofocus works on elements injected dynamically
                    setTimeout(() => {
                        const firstInput = document.getElementById(`lose-input-${otherPlayers[0].id}`);
                        if (firstInput) firstInput.focus();
                    }, 50);

                    // Live calculation breakdown
                    const updateTotalLoss = () => {
                        let total = 0;
                        let activeInputs = 0;
                        document.querySelectorAll('.lose-input-calc').forEach(inp => {
                            const val = parseInt(inp.value);
                            if (val > 0) {
                                const wId = parseInt(inp.dataset.winner);
                                const lId = parseInt(inp.dataset.loser);
                                const result = this.calculateMatchup(wId, lId, val);
                                total += result.total;
                                activeInputs++;
                            }
                        });
                        
                        const summaryDiv = document.getElementById('total-lose-summary');
                        const amountSpan = document.getElementById('total-lose-amount');
                        if (activeInputs > 0) {
                            summaryDiv.classList.remove('hidden');
                            amountSpan.textContent = `-${total}`;
                        } else {
                            summaryDiv.classList.add('hidden');
                        }
                    };

                    document.querySelectorAll('.lose-input-calc').forEach(input => {
                        input.addEventListener('focus', e => e.target.select());
                        input.addEventListener('input', (e) => {
                            const val = parseInt(e.target.value);
                            const winnerId = parseInt(e.target.dataset.winner);
                            const loserId = parseInt(e.target.dataset.loser);
                            const breakdownDiv = document.getElementById(`breakdown-lose-${winnerId}`);
                            
                            if (isNaN(val) || val <= 0) {
                                breakdownDiv.textContent = '';
                            } else {
                                const result = this.calculateMatchup(winnerId, loserId, val);
                                breakdownDiv.innerHTML = result.breakdownHTML;
                            }
                            
                            updateTotalLoss();
                        });
                    });

                    document.getElementById('lose-form').addEventListener('submit', (ev) => {
                        ev.preventDefault();
                        let totalLost = 0;
                        let brokerWon = false;
                        const winnersData = [];
                        const winnerDetails = [];

                        // Pre-flight check: ensure at least one input has a valid >0 value before committing an undo state
                        let hasValidInput = false;
                        otherPlayers.forEach(p => {
                             const val = parseInt(document.getElementById(`lose-input-${p.id}`).value);
                             if (val > 0) hasValidInput = true;
                        });
                        
                        if (!hasValidInput) {
                            alert('請輸入最少一家的分數 (Please enter a score for at least one winner).');
                            return;
                        }

                        this.saveStateForUndo();

                        if (!this.gameState.streaks) this.gameState.streaks = {};

                        const updatedStreaks = [];

                        otherPlayers.forEach(winner => {
                            const inputEl = document.getElementById(`lose-input-${winner.id}`);
                            const inputScore = parseInt(inputEl.value) || 0;
                            if (inputScore <= 0) return;

                            const result = this.calculateMatchup(winner.id, playerId, inputScore);

                            const streakKey = `${winner.id}-${playerId}`;
                            const reverseStreakKey = `${playerId}-${winner.id}`;

                            if (!this.gameState.streaks[streakKey]) {
                                this.gameState.streaks[streakKey] = { count: 0, totalAmount: 0 };
                            }

                            // Any time someone loses, their streak against the winner is broken
                            this.gameState.streaks[reverseStreakKey] = { count: 0, totalAmount: 0 };

                            // 3. Update the winner's streak tracking (excluding 劈半 windfall)
                            this.gameState.streaks[streakKey].count++;
                            this.gameState.streaks[streakKey].totalAmount += result.streakWin;

                            winner.score += result.total;
                            totalLost += result.total;

                            if (winner.isBroker) brokerWon = true;

                            winnersData.push(winner.id);
                            winnerDetails.push({ winnerId: winner.id, handFan: inputScore, finalScore: result.total });
                            updatedStreaks.push({ winnerId: winner.id, loserId: playerId, streakKey });
                        });

                        // Pre-flight check handles empty inputs before this point
                        
                        player.score -= totalLost;

                        // 2. Global Streak Break: "When the player is not winning consecutively, the streak should be ended."
                        // If you are not in the winnersData list, all of your active pulling streaks against EVERYONE are zeroed.
                        this.gameState.players.forEach(p => {
                            if (!winnersData.includes(p.id)) {
                                this.gameState.players.forEach(target => {
                                    const streakKeyToBreak = `${p.id}-${target.id}`;
                                    if (this.gameState.streaks[streakKeyToBreak]) {
                                        this.gameState.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                                    }
                                });
                            }
                        });

                        const eventBrokerId = this.gameState.players.find(p => p.isBroker)?.id;
                        const eventRotationCount = this.gameState.rotationCount || 0;

                        if (!brokerWon) {
                            const brokerPlayer = this.gameState.players.find(p => p.isBroker);
                            brokerPlayer.isBroker = false;
                            brokerPlayer.lianZhuangCount = 0;
                            
                            // Find the broker's current seat index
                            const currentSeatIndex = this.gameState.config.seating.findIndex(id => id === brokerPlayer.id);
                            
                            // Rotate counter-clockwise (previous seat index)
                            const nextSeatIndex = (currentSeatIndex - 1 + this.gameState.config.seating.length) % this.gameState.config.seating.length;
                            const nextBrokerId = this.gameState.config.seating[nextSeatIndex];
                            
                            const nextBroker = this.gameState.players.find(p => p.id === nextBrokerId);
                            nextBroker.isBroker = true;
                            
                            this.gameState.rotationCount = (this.gameState.rotationCount || 0) + 1;
                        } else {
                            const broker = this.gameState.players.find(p => p.isBroker);
                            if (broker) broker.lianZhuangCount = (broker.lianZhuangCount || 0) + 1;
                        }

                        this.gameState.gameHistory.push({
                            type: 'post-game',
                            winnerIds: winnersData,
                            winnerDetails: winnerDetails,
                            loserId: playerId,
                            baseScore: 0,
                            totalScoreChange: totalLost,
                            brokerId: eventBrokerId,
                            rotationCount: eventRotationCount,
                            timestamp: new Date().toISOString()
                        });

                        document.body.removeChild(modal);
                        this.checkSurrenders(updatedStreaks);
                    });
                }

                // Attach back button logic
                document.querySelectorAll('.back-btn').forEach(backBtn => {
                    backBtn.addEventListener('click', () => {
                        document.getElementById('action-input-area').classList.add('hidden');
                        document.getElementById('action-selection').classList.remove('hidden');
                    });
                });
            });
        });
    }

export function checkSurrenders(updatedStreaks) {
        const surrendersToPrompt = [];
        updatedStreaks.forEach(s => {
            const st = this.gameState.streaks[s.streakKey];
            if (st && st.count > 0 && st.count % 3 === 0) {
                surrendersToPrompt.push(s);
            }
        });
        
        this.processSurrenders(surrendersToPrompt);
    }

export function renderSeatChangeModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm transform transition-all scale-100 border border-gray-200 dark:border-gray-700">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6">
                            <span class="text-3xl">🔄</span>
                        </div>
                        <h3 class="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">一圈結束</h3>
                        <p class="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                            北風北局已經結束<br>
                            請留意是否需要調位
                        </p>
                        <button id="close-seating-reminder" class="mt-8 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">
                            知道了 (OK)
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-seating-reminder').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve();
            });
        });
    }

export function checkSeatChange(oldRotation, newRotation) {
        if (newRotation > 0 && Math.floor(newRotation / 16) > Math.floor(oldRotation / 16)) {
            return this.renderSeatChangeModal();
        }
        return Promise.resolve();
    }

export function processSurrenders(queue) {
        if (queue.length === 0) {
            // Queue is empty, finish saving and render the final state
            this._saveGame();
            this.renderGame();

            // Check for seat change reminder after everything is settled
            const history = this.gameState.gameHistory;
            if (history.length > 0) {
                const lastEvent = history[history.length - 1];
                if (['zimo', 'post-game', 'draw'].includes(lastEvent.type)) {
                    const oldRot = lastEvent.rotationCount; 
                    const newRot = this.gameState.rotationCount; 
                    this.checkSeatChange(oldRot, newRot);
                }
            }
            return;
        }

        const current = queue.shift();
        const winner = this.gameState.players.find(p => p.id === current.winnerId);
        const loser = this.gameState.players.find(p => p.id === current.loserId);
        const streakData = this.gameState.streaks[current.streakKey];

        const modal = document.createElement('div');
        modal.id = 'surrender-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]';
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm text-center transition-colors">
                <h3 class="text-2xl font-bold mb-4 text-red-600 dark:text-red-400 transition-colors">投降確認 (Surrender)</h3>
                <p class="text-lg mb-6 text-gray-800 dark:text-gray-200 transition-colors">
                    <span class="font-bold">${loser.name}</span> 已連續輸給 <span class="font-bold">${winner.name}</span> 
                    <span class="text-red-500 dark:text-red-400 font-bold transition-colors">${streakData.count}</span> 次。
                    <br>
                    目前累積番數: <span class="font-bold text-red-600 dark:text-red-400 transition-colors">${typeof streakData.totalAmount === 'number' ? streakData.totalAmount.toFixed(1).replace(/\.0$/, '') : streakData.totalAmount}</span>
                    <br><br>是否要投降 (斷纜)？<br><span class="text-sm text-gray-500 dark:text-gray-400 transition-colors">投降後將重新計算雙方連勝/連拉累積。</span>
                </p>
                <div class="flex space-x-4">
                    <button id="btn-no-surrender" class="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors">否 (繼續)</button>
                    <button id="btn-yes-surrender" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md transition-colors">是 (投降)</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-no-surrender').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.processSurrenders(queue); // Move to next in queue
        });

        document.getElementById('btn-yes-surrender').addEventListener('click', () => {
            // Apply surrender effects directly to the active state block
            this.gameState.streaks[current.streakKey] = { count: 0, totalAmount: 0 };
            
            this.gameState.gameHistory.push({
                type: 'surrender',
                winnerId: winner.id,
                loserId: loser.id,
                brokerId: this.gameState.players.find(p => p.isBroker)?.id,
                rotationCount: this.gameState.rotationCount || 0,
                timestamp: new Date().toISOString()
            });

            document.body.removeChild(modal);
            this.processSurrenders(queue); // Move to next in queue
        });
    }
