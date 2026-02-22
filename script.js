/* Mahjong Score Keeper - Refactored Application Logic */

const App = {
    gameState: {},
    undoStack: [],
    icons: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
    
    init() {
        if (localStorage.getItem('mahjong_theme') === 'dark' || (!('mahjong_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        this.loadPlayerHistory();
        this.renderLanding();
    },

    toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('mahjong_theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('mahjong_theme', 'dark');
        }
        
        // Re-render the dashboard if it is currently visible to update the chart
        if (document.getElementById('dashboard-view') && !document.getElementById('dashboard-view').classList.contains('hidden')) {
            this.renderDashboardView();
        }
    },

    _saveGame() {
        if (!this.gameState.matchId) return;

        localStorage.setItem(`mahjong_app_match_${this.gameState.matchId}`, JSON.stringify(this.gameState));

        let matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
        const matchIndex = matches.findIndex(m => m.id === this.gameState.matchId);
        
        const matchMeta = {
            id: this.gameState.matchId,
            createdAt: this.gameState.createdAt || new Date().toISOString(),
            lastPlayed: new Date().toISOString(),
            players: [
                this.gameState.players.slice(0, 2).map(p => `${p.icon} ${p.name}`).join(' | '),
                this.gameState.players.slice(2, 4).map(p => `${p.icon} ${p.name}`).join(' | ')
            ].join('\n')
        };

        if (matchIndex > -1) {
            matches[matchIndex] = matchMeta;
        } else {
            matches.push(matchMeta);
        }
        
        localStorage.setItem('mahjong_app_matches', JSON.stringify(matches));
    },

    loadMatch(matchId) {
        const savedGame = localStorage.getItem(`mahjong_app_match_${matchId}`);
        if (savedGame) {
            this.gameState = JSON.parse(savedGame);
            const savedUndo = localStorage.getItem(`mahjong_app_undo_${matchId}`);
            this.undoStack = savedUndo ? JSON.parse(savedUndo) : [];
            this.renderGame();
        } else {
            alert('Cannot find this match data.');
        }
    },

    deleteMatch(matchId) {
        if (confirm('確定要刪除這筆牌局紀錄嗎？ (Are you sure you want to delete this match?)')) {
            localStorage.removeItem(`mahjong_app_match_${matchId}`);
            localStorage.removeItem(`mahjong_app_undo_${matchId}`);
            
            let matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
            matches = matches.filter(m => m.id !== matchId);
            localStorage.setItem('mahjong_app_matches', JSON.stringify(matches));
            
            this.renderLanding();
        }
    },

    saveStateForUndo() {
        if (!this.gameState.matchId) return;
        this.undoStack.push(JSON.stringify(this.gameState));
        if (this.undoStack.length > 50) this.undoStack.shift(); // keep last 50 states to prevent memory bloat
        localStorage.setItem(`mahjong_app_undo_${this.gameState.matchId}`, JSON.stringify(this.undoStack));
    },

    rollback() {
        if (this.undoStack.length === 0) {
            alert('沒有可以復原的操作 (Nothing to rollback).');
            return;
        }
        if (!this.gameState.matchId) return;

        // Remember which tab was currently open before re-rendering the game skeleton
        const activeViewBtn = document.querySelector('.view-btn.active-view');
        const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'scoring';

        const prevStateStr = this.undoStack.pop();
        this.gameState = JSON.parse(prevStateStr);
        this._saveGame();
        localStorage.setItem(`mahjong_app_undo_${this.gameState.matchId}`, JSON.stringify(this.undoStack));
        
        this.renderGame();
        
        // Restore the active tab
        if (activeView !== 'scoring') {
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`${activeView}-view`).classList.remove('hidden');

            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active-view'));
            const targetBtn = document.querySelector(`.view-btn[data-view="${activeView}"]`);
            if (targetBtn) targetBtn.classList.add('active-view');
            
            if (activeView === 'history') {
                this.renderHistoryView();
            } else if (activeView === 'dashboard') {
                this.renderDashboardView();
            }
        }
    },

    loadPlayerHistory() {
        const history = localStorage.getItem('mahjong_app_player_history');
        this.playerHistory = history ? JSON.parse(history) : [];
    },

    savePlayerHistory() {
        const currentNames = this.gameState.players.map(p => p.name.trim()).filter(n => n);
        const newHistory = [...new Set([...this.playerHistory, ...currentNames])];
        this.playerHistory = newHistory;
        localStorage.setItem('mahjong_app_player_history', JSON.stringify(this.playerHistory));
    },

    renderLanding() {
        let matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
        // Sort by createdAt descending (newest created first)
        matches.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        const appDiv = document.getElementById('app');
        
        let matchesHTML = '';
        if (matches.length === 0) {
            matchesHTML = '<div class="text-center text-gray-500 py-8">沒有歷史牌局 (No historical matches).</div>';
        } else {
            matchesHTML = matches.map(m => {
                const dateObj = new Date(m.createdAt);
                const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Handle both new newline format and legacy single-line format
                let rows = [];
                if (m.players.includes('\n')) {
                    const parsed = m.players.split('\n');
                    rows = [
                        parsed[0].replace(' | ', ' 　'), 
                        parsed[1].replace(' | ', ' 　')
                    ];
                } else if (m.players.split(' | ').length === 4) {
                    const parts = m.players.split(' | ');
                    rows = [
                        `${parts[0]} 　${parts[1]}`,
                        `${parts[2]} 　${parts[3]}`
                    ];
                } else {
                    rows = [m.players]; // Ultimate fallback
                }

                return `
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col mb-3 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors match-item" data-match-id="${m.id}">
                        <div class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">${dateStr}</div>
                        <div class="flex flex-col space-y-1">
                            ${rows.map(row => `<div class="font-bold text-gray-700 dark:text-gray-200 text-sm truncate pr-8">${row}</div>`).join('')}
                        </div>
                        <button class="delete-match-btn absolute right-3 top-3 text-gray-300 dark:text-gray-600 hover:text-red-500 font-bold px-2 py-1 z-10 transition-colors" data-match-id="${m.id}">&times;</button>
                    </div>
                `;
            }).join('');
        }

        const isDark = document.documentElement.classList.contains('dark');

        appDiv.innerHTML = `
            <div class="min-h-screen flex flex-col items-center justify-start safe-pt-landing safe-pb bg-gray-100 dark:bg-gray-900 overflow-y-auto w-full transition-colors duration-200">
                <button id="theme-toggle-btn" class="absolute safe-top-btn right-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    ${isDark ? '☀️' : '🌙'}
                </button>
                <h1 class="text-4xl font-black mb-2 text-center text-gray-800 dark:text-gray-100 tracking-tight">Score Keeper</h1>
                <p class="text-gray-500 dark:text-gray-400 mb-10 font-medium">Taiwan Mahjong</p>
                
                <div class="space-y-4 w-full max-w-md px-4">
                    <div class="flex space-x-3 mb-6">
                        <button id="new-game-btn" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-lg text-xl shadow">
                            + 新牌局 (New)
                        </button>
                        <button id="import-match-btn" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg text-xl shadow relative overflow-hidden">
                            匯入 (Import)
                            <input type="file" id="import-match-input" accept=".json" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                        </button>
                    </div>
                    
                    <h2 class="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-8 mb-4">歷史牌局 (Match History)</h2>
                    <div id="match-list" class="space-y-3 pb-8 w-full">
                        ${matchesHTML}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
            this.renderLanding(); // Re-render to update the icon
        });

        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        
        const fileInput = document.getElementById('import-match-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedState = JSON.parse(event.target.result);
                        if (!importedState.matchId || !importedState.players || !importedState.gameHistory) {
                            alert('無效的牌局檔案 (Invalid match file).');
                            return;
                        }
                        
                        // Treat the imported game as a cloned new match to avoid ID collisions
                        importedState.matchId = Date.now().toString();
                        // importedState.createdAt = new Date().toISOString(); // Keep the original creation date
                        
                        if (confirm('是否要重新計算這場牌局的所有分數？\n(這會將沒有新設定的舊牌局，自動套用目前的預設規則：取整數、贏家優勢)')) {
                            this.recalculateHistory(importedState);
                        }
                        
                        // Force save it into the system
                        this.gameState = importedState;
                        this.undoStack = []; // Reset undo stack since it's a new unique instance
                        this._saveGame();
                        // Clear any potential legacy undo data
                        localStorage.setItem(`mahjong_app_undo_${importedState.matchId}`, JSON.stringify(this.undoStack));
                        
                        alert('牌局匯入成功！ (Match imported successfully!)');
                        this.renderLanding();
                    } catch (err) {
                        alert('讀取檔案失敗 (Failed to parse JSON file).');
                        console.error(err);
                    }
                    e.target.value = ''; // Reset input
                };
                reader.readAsText(file);
            });
        }

        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignore if clicked on the delete button
                if (e.target.classList.contains('delete-match-btn')) return;
                const matchId = e.currentTarget.dataset.matchId;
                this.loadMatch(matchId);
            });
        });

        document.querySelectorAll('.delete-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent triggering the load
                const matchId = e.currentTarget.dataset.matchId;
                this.deleteMatch(matchId);
            });
        });
    },

    recalculateHistory(state) {
        const originalState = this.gameState;
        
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

        // Set initial broker
        if (oldHistory.length > 0 && oldHistory[0].brokerId) {
            const firstBroker = state.players.find(p => p.id === oldHistory[0].brokerId);
            if (firstBroker) firstBroker.isBroker = true;
            else state.players[0].isBroker = true;
        } else {
            state.players[0].isBroker = true;
        }

        this.gameState = state;

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
                    const result = this.calculateMatchup(playerId, loser.id, inputScore);
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
                            if (state.streaks[streakKeyToBreak]) {
                                state.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                            }
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
                        const nextBrokerId = state.config.seating[nextSeatIndex];
                        const nextBroker = state.players.find(p => p.id === nextBrokerId);
                        if (nextBroker) nextBroker.isBroker = true;
                    }
                    state.rotationCount = (state.rotationCount || 0) + 1;
                } else if (player) {
                    player.lianZhuangCount = (player.lianZhuangCount || 0) + 1;
                }

                state.gameHistory.push({
                    ...event, // Keep timestamp
                    totalScoreChange: totalWon,
                    loserDetails: loserDetails,
                    brokerId: eventBrokerId,
                    rotationCount: eventRotationCount
                });

            } else if (event.type === 'post-game') {
                const playerId = event.loserId; 
                const player = state.players.find(p => p.id === playerId);
                const winnersData = event.winnerIds || (event.winnerDetails ? event.winnerDetails.map(w=>w.winnerId) : []);
                
                let totalLost = 0;
                let brokerWon = false;
                const winnerDetails = [];

                const eventBrokerId = state.players.find(p => p.isBroker)?.id;
                const eventRotationCount = state.rotationCount || 0;

                winnersData.forEach(wId => {
                    const winner = state.players.find(p => p.id === wId);
                    if (!winner) return;
                    
                    const oldDetail = event.winnerDetails ? event.winnerDetails.find(w => w.winnerId === winner.id) : null;
                    const inputScore = oldDetail ? oldDetail.handFan : (event.baseScore || 0); // fallback for extremely old schemas
                    if (inputScore <= 0) return;

                    const result = this.calculateMatchup(winner.id, playerId, inputScore);

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
                            if (state.streaks[streakKeyToBreak]) {
                                state.streaks[streakKeyToBreak] = { count: 0, totalAmount: 0 };
                            }
                        });
                    }
                });

                if (!brokerWon) {
                    const brokerPlayer = state.players.find(p => p.isBroker);
                    if (brokerPlayer) {
                        brokerPlayer.isBroker = false;
                        brokerPlayer.lianZhuangCount = 0;
                        const currentSeatIndex = state.config.seating.findIndex(id => id === brokerPlayer.id);
                        const nextSeatIndex = (currentSeatIndex - 1 + state.config.seating.length) % state.config.seating.length;
                        const nextBrokerId = state.config.seating[nextSeatIndex];
                        const nextBroker = state.players.find(p => p.id === nextBrokerId);
                        if (nextBroker) nextBroker.isBroker = true;
                    }
                    state.rotationCount = (state.rotationCount || 0) + 1;
                } else {
                    const broker = state.players.find(p => p.isBroker);
                    if (broker) broker.lianZhuangCount = (broker.lianZhuangCount || 0) + 1;
                }

                state.gameHistory.push({
                    ...event,
                    winnerDetails: winnerDetails,
                    totalScoreChange: totalLost,
                    brokerId: eventBrokerId,
                    rotationCount: eventRotationCount
                });

            } else if (event.type === 'in-game') {
                const playerId = event.playerId;
                const player = state.players.find(p => p.id === playerId);
                const otherPlayers = state.players.filter(p => p.id !== playerId);
                
                // For in-game, applying the exact old score change is the safest 
                // because it has no mathematical dependency on streaks/broker.
                const bpType = event.subtype;
                const totalScore = event.score;
                const inputScore = totalScore / 3;

                const scoreChange = bpType === 'bonus' ? totalScore : -totalScore;
                const perPlayerChange = bpType === 'bonus' ? -inputScore : inputScore;

                if (player) player.score += scoreChange;
                otherPlayers.forEach(p => p.score += perPlayerChange);

                state.gameHistory.push(event);

            } else if (event.type === 'draw') {
                const brokerPlayer = state.players.find(p => p.isBroker);
                if (brokerPlayer) {
                    brokerPlayer.isBroker = false;
                    brokerPlayer.lianZhuangCount = 0;
                    
                    const currentSeatIndex = state.config.seating.findIndex(id => id === brokerPlayer.id);
                    const nextSeatIndex = (currentSeatIndex - 1 + state.config.seating.length) % state.config.seating.length;
                    const nextBrokerId = state.config.seating[nextSeatIndex];
                    
                    const nextBroker = state.players.find(p => p.id === nextBrokerId);
                    if (nextBroker) nextBroker.isBroker = true;
                }
                state.rotationCount = (state.rotationCount || 0) + 1;
                state.gameHistory.push(event);

            } else if (event.type === 'surrender') {
                const streakKey = `${event.winnerId}-${event.loserId}`;
                if (state.streaks[streakKey]) {
                    state.streaks[streakKey] = { count: 0, totalAmount: 0 };
                }
                state.gameHistory.push(event);

            } else {
                state.gameHistory.push(event);
            }
        });

        this.gameState = originalState;
    },

    startNewGame() {
        // We will generate the matchId when they finish setup.
        this.undoStack = [];

        // Shuffle icons for random assignment
        const shuffledIcons = [...this.icons].sort(() => 0.5 - Math.random());

        this.gameState = {
            players: [
                { id: 1, name: 'Player 1', icon: shuffledIcons[0], score: 0 },
                { id: 2, name: 'Player 2', icon: shuffledIcons[1], score: 0 },
                { id: 3, name: 'Player 3', icon: shuffledIcons[2], score: 0 },
                { id: 4, name: 'Player 4', icon: shuffledIcons[3], score: 0 },
            ],
            gameHistory: [],
            rotationCount: 0,
            streaks: {},
            config: {
                seating: [1, 2, 3, 4], // Player IDs in order: 12, 3, 6, 9 o'clock
                baseScoreDi: 5,        // 底 (Base Score)
            }
        };
        this.renderSetupModal();
    },

    renderSetupModal() {
        let draggedIndex = null; // Declare draggedIndex in the outer scope
        const modal = document.createElement('div');
        modal.id = 'setup-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg overflow-y-auto overflow-x-hidden transition-colors text-gray-800 dark:text-gray-100" style="max-height: 90vh;">
                <h1 class="text-2xl font-bold text-center mb-4">Game Setup</h1>
                
                <datalist id="player-history-list">
                    ${(this.playerHistory || []).map(name => `<option value="${name}">`).join('')}
                </datalist>

                ${this.gameState.players.map((p, index) => `
                    <div class="grid grid-cols-4 gap-2 items-center mb-3">
                        <input type="text" list="player-history-list" value="${p.name}" data-player-id="${p.id}" class="p-2 border dark:border-gray-600 rounded col-span-2 player-name-input bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" autocomplete="off">
                        <div class="flex items-center justify-center">
                            <span class="text-3xl cursor-pointer icon-display" data-player-id="${p.id}">${p.icon}</span>
                        </div>
                        <div class="flex flex-col items-center justify-center">
                            <input type="radio" name="broker" value="${p.id}" class="broker-radio w-4 h-4 cursor-pointer" ${index === 0 ? 'checked' : ''}>
                            <label class="text-xs mt-1 font-bold text-yellow-600 dark:text-yellow-400 transition-colors">莊</label>
                        </div>
                    </div>
                    <div class="hidden icon-picker p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 transition-colors" data-player-id="${p.id}">
                        <div class="flex space-x-2 overflow-x-auto"></div>
                    </div>
                `).join('')}

                <div class="mt-6 border-t dark:border-gray-700 pt-4 transition-colors">
                    <div class="flex justify-around items-center px-2">
                        <div class="flex flex-col items-center">
                            <h2 class="text-sm font-bold text-gray-600 dark:text-gray-400 mb-1 transition-colors">底</h2>
                            <input type="number" id="base-score-di" value="${this.gameState.config.baseScoreDi !== undefined ? this.gameState.config.baseScoreDi : 5}" class="p-2 border dark:border-gray-600 rounded w-16 text-center font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" min="0" step="1">
                        </div>
                        <div class="flex flex-col items-center">
                            <h2 class="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1 leading-tight text-center transition-colors">小數處理<br>(Rounding)</h2>
                            <select id="decimal-rounding" class="p-2 border dark:border-gray-600 rounded w-24 text-center font-bold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
                                <option value="0.1" ${this.gameState.config.decimalRounding === '0.1' ? 'selected' : ''}>取至0.1</option>
                                <option value="0.5" ${this.gameState.config.decimalRounding === '0.5' ? 'selected' : ''}>取至0.5</option>
                                <option value="integer" ${this.gameState.config.decimalRounding === 'integer' || this.gameState.config.decimalRounding === undefined ? 'selected' : ''}>取整數</option>
                            </select>
                        </div>
                        <div class="flex flex-col items-center">
                            <h2 class="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1 leading-tight text-center transition-colors">進位優勢<br>(Advantage)</h2>
                            <select id="rounding-advantage" class="p-2 border dark:border-gray-600 rounded w-24 text-center font-bold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
                                <option value="winner" ${this.gameState.config.roundingAdvantage === 'winner' || this.gameState.config.roundingAdvantage === undefined ? 'selected' : ''}>贏家優勢</option>
                                <option value="loser" ${this.gameState.config.roundingAdvantage === 'loser' ? 'selected' : ''}>輸家優勢</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="seating-area" class="relative w-64 h-64 mx-auto border-2 border-dashed dark:border-gray-600 rounded-md mt-12 mb-10 transition-colors"></div>

                <div class="mt-6 flex flex-col items-center">
                     <button id="finish-setup" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-xl">Start Game</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        modal.addEventListener('click', (e) => {
            if (e.target.id === 'setup-modal') {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        });

        document.querySelectorAll('.icon-display').forEach(el => {
            el.addEventListener('click', e => {
                const id = e.target.dataset.playerId;
                document.querySelector(`.icon-picker[data-player-id="${id}"]`).classList.toggle('hidden');
            });
        });

        document.querySelectorAll('.player-name-input').forEach(input => {
            input.addEventListener('input', e => {
                 const player = this.gameState.players.find(p => p.id == e.target.dataset.playerId);
                 if(player) {
                     player.name = e.target.value;
                     this._updateSeatingDisplay();
                 }
            });
        });
        
        document.getElementById('finish-setup').addEventListener('click', () => {
             const playerNames = this.gameState.players.map(p => p.name.trim());
             if (new Set(playerNames).size !== playerNames.length) {
                 alert('Error: Player names must be unique.');
                 return;
             }
             
             const selectedBrokerId = parseInt(document.querySelector('input[name="broker"]:checked').value);
             this.gameState.players.forEach(p => p.isBroker = (p.id === selectedBrokerId));
             
             const diValue = parseInt(document.getElementById('base-score-di').value);
             this.gameState.config.baseScoreDi = isNaN(diValue) ? 0 : diValue;

             const decimalRounding = document.getElementById('decimal-rounding').value;
             this.gameState.config.decimalRounding = decimalRounding;

             const roundingAdvantage = document.getElementById('rounding-advantage').value;
             this.gameState.config.roundingAdvantage = roundingAdvantage;

             this.gameState.matchId = Date.now().toString();
             this.gameState.createdAt = new Date().toISOString();
             
             this.savePlayerHistory();
             this._saveGame();
             this.renderGame();
             document.body.removeChild(modal);
             document.body.style.overflow = '';
             document.body.style.position = '';
             document.body.style.width = '';
        });

        this._updateSeatingDisplay();
        this._updateIconPickers(); 
    },

    _updateIconPickers() {
        const usedIcons = this.gameState.players.map(p => p.icon);
        
        this.gameState.players.forEach(player => {
            const pickerFlex = document.querySelector(`.icon-picker[data-player-id="${player.id}"] .flex`);
            if (!pickerFlex) return;

            const availableIcons = this.icons.filter(icon => !usedIcons.includes(icon) || icon === player.icon);
            
            pickerFlex.innerHTML = availableIcons.map(icon => 
                `<span class="text-3xl cursor-pointer p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors">${icon}</span>`
            ).join('');

            pickerFlex.querySelectorAll('span').forEach(iconEl => {
                iconEl.addEventListener('click', e => {
                    const newIcon = e.target.textContent;
                    player.icon = newIcon;
                    document.querySelector(`.icon-display[data-player-id="${player.id}"]`).textContent = newIcon;
                    pickerFlex.parentElement.classList.add('hidden');
                    this._updateIconPickers();
                    this._updateSeatingDisplay();
                });
            });
        });
    },

    _updateSeatingDisplay() {
        const seatingArea = document.getElementById('seating-area');
        if (!seatingArea) return;

        seatingArea.innerHTML = `
            ${this.gameState.config.seating.map((playerId, index) => {
                const player = this.gameState.players.find(p => p.id === playerId);
                if (!player) return '';
                let positionClass = '';
                if (index === 0) positionClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
                if (index === 1) positionClass = 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2';
                if (index === 2) positionClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
                if (index === 3) positionClass = 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2';
                
                return `
                    <div class="absolute ${positionClass} w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center cursor-move seat transition-colors" draggable="true" data-seat-index="${index}" data-player-id="${player.id}" style="touch-action: none;">
                        <div class="text-center pointer-events-none text-gray-800 dark:text-gray-200 transition-colors">
                            <div class="text-3xl">${player.icon}</div>
                            <div class="text-xs font-semibold mt-1">${player.isBroker ? '<span class="text-yellow-500 font-bold mr-1">莊</span>' : ''}${player.name}</div>
                            ${player.lianZhuangCount > 0 ? `<div class="text-xs font-black text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 rounded-sm mt-0.5 animate-pulse transition-colors">連${player.lianZhuangCount}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
            <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors">Drag to Swap</span>
        `;
        
        // --- Attach Listeners ---
        let draggedIndex = null;
        let ghost;

        document.querySelectorAll('.seat').forEach(seat => {
            // Mouse Events
            seat.addEventListener('dragstart', (e) => {
                draggedIndex = e.currentTarget.dataset.seatIndex;
                e.currentTarget.style.opacity = '0.5';
            });
            seat.addEventListener('dragover', (e) => e.preventDefault());
            seat.addEventListener('drop', (e) => {
                e.preventDefault();
                const droppedIndex = e.currentTarget.dataset.seatIndex;
                if (draggedIndex !== null && draggedIndex !== droppedIndex) {
                    const seating = this.gameState.config.seating;
                    [seating[draggedIndex], seating[droppedIndex]] = [seating[droppedIndex], seating[draggedIndex]];
                    this._updateSeatingDisplay();
                }
                e.currentTarget.style.opacity = '1';
            });
            seat.addEventListener('dragend', (e) => {
                e.currentTarget.style.opacity = '1';
                draggedIndex = null;
            });

            // Touch Events
            seat.addEventListener('touchstart', (e) => {
                e.preventDefault();
                draggedIndex = e.currentTarget.dataset.seatIndex;
                const rect = e.currentTarget.getBoundingClientRect();
                const touch = e.touches[0];
                
                ghost = e.currentTarget.cloneNode(true);
                // Strip out positioning and transform classes so it tracks exactly to the touch point
                ghost.className = 'w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-colors text-gray-800 dark:text-gray-200';
                ghost.style.position = 'fixed';
                ghost.style.zIndex = '1000';
                ghost.style.opacity = '0.7';
                ghost.style.pointerEvents = 'none';
                ghost.style.left = `${touch.clientX - (rect.width / 2)}px`;
                ghost.style.top = `${touch.clientY - (rect.height / 2)}px`;
                document.body.appendChild(ghost);

                e.currentTarget.style.opacity = '0.5';
            }, { passive: false });

            seat.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (!ghost) return;
                const touch = e.touches[0];
                ghost.style.left = `${touch.clientX - (ghost.offsetWidth / 2)}px`;
                ghost.style.top = `${touch.clientY - (ghost.offsetHeight / 2)}px`;
            }, { passive: false });

            seat.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!ghost) return;

                const originalSeat = document.querySelector(`[data-seat-index="${draggedIndex}"]`);
                if(originalSeat) originalSeat.style.opacity = '1';

                const touch = e.changedTouches[0];
                ghost.style.display = 'none';
                const endElement = document.elementFromPoint(touch.clientX, touch.clientY);
                document.body.removeChild(ghost);
                ghost = null;
                
                const targetSeat = endElement ? endElement.closest('.seat') : null;

                if (targetSeat) {
                    const droppedIndex = targetSeat.dataset.seatIndex;
                    if (draggedIndex !== null && draggedIndex !== droppedIndex) {
                        const seating = this.gameState.config.seating;
                        [seating[draggedIndex], seating[droppedIndex]] = [seating[droppedIndex], seating[draggedIndex]];
                        this._updateSeatingDisplay();
                    }
                }
                draggedIndex = null;
            });
        });
    },

    renderGame() {
        const appDiv = document.getElementById('app');
        appDiv.innerHTML = `
            <div class="max-w-4xl mx-auto min-h-screen">
                <div class="bg-gray-800 dark:bg-gray-950 text-white flex justify-center safe-pt-game-header pb-2 rounded-b-lg md:rounded-b-none md:rounded-t-lg relative sticky top-0 z-30 shadow-lg transition-colors">
                    <button id="exit-game-btn" class="absolute left-2 top-1/2 -translate-y-1/2 mt-[calc(var(--safe-top)/2)] px-3 py-2 text-gray-400 hover:text-white font-bold transition-colors" title="Back to Matches">
                        <span class="text-xl">🏠</span>
                    </button>
                    <button data-view="scoring" class="flex-1 px-2 py-3 font-semibold view-btn active-view ml-10 transition-colors">Game</button>
                    <div class="flex-1 relative text-center">
                        <button id="action-dropdown-btn" class="w-full h-full px-2 py-3 font-semibold hover:bg-gray-700 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-center">
                            Action <span class="ml-1 text-[10px]">▼</span>
                        </button>
                        <div id="action-dropdown-menu" class="hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-xl z-50 text-gray-800 dark:text-gray-200 border dark:border-gray-700 overflow-hidden transition-colors">
                            <button id="btn-rollback" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">復原 (Undo)</button>
                            <button id="btn-draw" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">流局 (Draw)</button>
                            <button id="btn-set-wind" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定風圈/局數 (Set Wind/Game)</button>
                            <button id="btn-set-dealer" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定莊家 (Set Dealer)</button>
                            <button id="btn-set-seating" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定座位 (Set Seating)</button>
                            <button id="btn-active-streaks" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">連拉/投降 (Streaks/ Surrender)</button>
                            <button id="btn-settle-debts" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors text-purple-600 dark:text-purple-400">結算找數 (Settle Debts)</button>
                            <button id="btn-share-result" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors text-pink-600 dark:text-pink-400">分享戰果 (Share Result)</button>
                            <button id="btn-export-match" class="block w-full text-left px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors text-blue-600 dark:text-blue-400">匯出牌局 (Export Match)</button>
                        </div>
                    </div>
                    <button data-view="history" class="flex-1 px-2 py-3 font-semibold view-btn transition-colors">History</button>
                    <button data-view="dashboard" class="flex-1 px-2 py-3 font-semibold view-btn transition-colors">Stats</button>
                </div>
                
                <div id="scoring-view" class="view">
                    <!-- Scoring content will be rendered here -->
                </div>

                <div id="history-view" class="view hidden">
                    <div id="history-table-container"></div>
                </div>
                 
                 <div id="dashboard-view" class="view hidden">
                    <div id="dashboard-table-container" class="mb-4"></div>
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4 transition-colors">
                        <canvas id="score-chart" style="height: 400px;"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Exit Button Logic
        document.getElementById('exit-game-btn').addEventListener('click', () => {
            this._saveGame();
            this.renderLanding();
        });

        // Dropdown Menu Logic
        const actionBtn = document.getElementById('action-dropdown-btn');
        const actionMenu = document.getElementById('action-dropdown-menu');

        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            if (!actionMenu.classList.contains('hidden')) {
                actionMenu.classList.add('hidden');
            }
        });

        // Tab switching logic
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetView = e.target.dataset.view;
                document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
                document.getElementById(`${targetView}-view`).classList.remove('hidden');

                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active-view'));
                e.target.classList.add('active-view');
                
                if (targetView === 'history') {
                    this.renderHistoryView();
                } else if (targetView === 'dashboard') {
                    this.renderDashboardView();
                }
            });
        });

        document.getElementById('btn-rollback').addEventListener('click', () => {
            this.rollback();
        });

        document.getElementById('btn-draw').addEventListener('click', () => {
            if (confirm('確定要流局嗎？\n(莊家將替換，但所有拉莊連勝紀錄將保留)')) {
                this.saveStateForUndo();

                const brokerPlayer = this.gameState.players.find(p => p.isBroker);
                const eventBrokerId = brokerPlayer?.id;
                const eventRotationCount = this.gameState.rotationCount || 0;

                if (brokerPlayer) {
                    brokerPlayer.isBroker = false;
                    brokerPlayer.lianZhuangCount = 0;
                    
                    const currentSeatIndex = this.gameState.config.seating.findIndex(id => id === brokerPlayer.id);
                    // Rotate counter-clockwise (previous seat index)
                    const nextSeatIndex = (currentSeatIndex - 1 + this.gameState.config.seating.length) % this.gameState.config.seating.length;
                    const nextBrokerId = this.gameState.config.seating[nextSeatIndex];
                    
                    const nextBroker = this.gameState.players.find(p => p.id === nextBrokerId);
                    if (nextBroker) nextBroker.isBroker = true;
                }
                
                this.gameState.rotationCount = (this.gameState.rotationCount || 0) + 1;

                this.gameState.gameHistory.push({
                    type: 'draw',
                    brokerId: eventBrokerId,
                    rotationCount: eventRotationCount,
                    timestamp: new Date().toISOString()
                });

                this._saveGame();
                this.renderGame();
            }
        });

        document.getElementById('btn-set-wind').addEventListener('click', () => {
            this.renderWindSettingsModal();
        });

        document.getElementById('btn-set-dealer').addEventListener('click', () => {
            this.renderSetDealerModal();
        });

        document.getElementById('btn-active-streaks').addEventListener('click', () => {
            this.renderActiveStreaksModal();
        });

        document.getElementById('btn-set-seating').addEventListener('click', () => {
            this.renderSetSeatingModal();
        });

        document.getElementById('btn-settle-debts').addEventListener('click', () => {
            this.renderSettleDebtsModal();
        });

        document.getElementById('btn-share-result').addEventListener('click', () => {
            this.renderShareResultModal();
        });

        document.getElementById('btn-export-match').addEventListener('click', () => {
            if (!this.gameState.matchId) return;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.gameState, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `mahjong_score_keeper_match_${this.gameState.matchId}.json`);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
        });

        // Initial render of the scoring view
        this.renderScoringView();
    },
    
            renderHistoryView() {
                const historyContainer = document.getElementById('history-table-container');
                const state = this.gameState;
                const winds = ['東', '南', '西', '北'];
                
                let html = `
                    <div class="bg-gray-50 dark:bg-gray-800 p-1 md:p-2 rounded-b-lg shadow text-gray-700 dark:text-gray-300 w-full transition-colors">
                        <div class="w-full relative">
                            <!-- Vertical Timeline Line -->
                            <div class="absolute left-[30px] top-[75px] bottom-6 w-[2px] bg-gray-300 dark:bg-gray-600 z-0 transition-colors"></div>
        
                            <!-- Header -->
                            <div class="grid grid-cols-[60px_repeat(4,minmax(0,1fr))] gap-1 md:gap-2 mb-2 sticky safe-sticky-history-header z-20 pb-2 border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 pt-2 shadow-sm rounded-t-lg transition-colors">
                                <div class="col-span-1"></div>
                                ${state.players.map((p, idx) => `
                                    <div class="text-center flex flex-col items-center justify-end py-2 rounded-t-xl ${idx % 2 === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-transparent'} transition-colors">
                                        <span class="text-2xl">${p.icon}</span>
                                        <span class="text-sm font-semibold truncate w-full mt-1">${p.name}</span>
                                        <span class="text-xl font-bold mt-1 ${p.score >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${p.score > 0 ? '+' : ''}${p.score.toFixed(1).replace(/\.0$/, '')}</span>
                                        <div class="text-gray-400 dark:text-gray-500 text-[10px] mt-1 border-t border-gray-300 dark:border-gray-600 w-1/2 mx-auto pt-1 font-bold transition-colors">
                                            ${p.lianZhuangCount > 0 ? `<span class="text-green-600 dark:text-green-400">連${p.lianZhuangCount}</span>` : '&nbsp;'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
        
                            <!-- Rows -->
                            <div class="flex flex-col relative z-10">
                `;
        
            // Group history by identical timestamps
            const groupedHistory = [];
            state.gameHistory.forEach(entry => {
                const lastGroup = groupedHistory[groupedHistory.length - 1];
                if (lastGroup && lastGroup.timestamp === entry.timestamp) {
                    lastGroup.events.push(entry);
                } else {
                    groupedHistory.push({
                        timestamp: entry.timestamp,
                        rotationCount: entry.rotationCount,
                        brokerId: entry.brokerId,
                        events: [entry]
                    });
                }
            });
    
            groupedHistory.slice().reverse().forEach((group, reversedIdx) => {
                const idx = groupedHistory.length - 1 - reversedIdx;
                
                // Timeline Node Logic
                let timelineNode = `<div class="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 mx-auto mt-6 shadow-sm border border-white dark:border-gray-800 transition-colors"></div>`;
                
                if (group.rotationCount !== undefined) {
                    const windIdx = Math.floor(group.rotationCount / 4) % 4;
                    const gameIdx = group.rotationCount % 4;
                    const windChar = winds[windIdx];
                    const gameChar = winds[gameIdx];
                    
                    // Show Wind indicator for first game of a rotation
                    const isNewRotation = idx === 0 || (groupedHistory[idx - 1] && groupedHistory[idx - 1].rotationCount !== group.rotationCount);
                    
                    if (isNewRotation) {
                        timelineNode = `
                            <div class="bg-gray-800 dark:bg-gray-900 text-white text-[10px] w-10 h-10 rounded-full shadow-md flex flex-col items-center justify-center mx-auto relative z-10 mt-2 border-2 border-white dark:border-gray-600 transition-colors">
                                <span class="font-bold">${windChar}風</span>
                                <span class="text-[9px] opacity-80">${gameChar}局</span>
                            </div>
                        `;
                        
                        if (gameIdx === 0) {
                            html += `
                                <div class="flex mt-2 mb-2 relative z-10 w-full justify-start items-center">
                                    <div class="bg-yellow-200 dark:bg-yellow-900/60 border border-yellow-400 dark:border-yellow-700/60 text-yellow-800 dark:text-yellow-400 text-[10px] px-2 py-0.5 rounded shadow-sm ml-2 font-bold z-10 tracking-tight transition-colors">${windChar}圈 Round ${Math.floor(group.rotationCount/16)+1}</div>
                                </div>
                            `;
                        }
                    }
                } else if (idx === 0) {
                    timelineNode = `
                        <div class="bg-gray-800 dark:bg-gray-900 text-white text-[9px] w-10 h-10 rounded-full shadow-md flex items-center justify-center mx-auto relative z-10 mt-2 border-2 border-white dark:border-gray-600 font-bold transition-colors">
                            START
                        </div>
                    `;
                }
    
                const playerCells = state.players.map((p, pIndex) => {
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
                        }
                    });
    
                    if (isBroker) {
                        badges.push(`<div class="bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-400 text-[10px] px-2 py-0.5 rounded mt-1 shadow-sm font-bold border border-yellow-300 dark:border-yellow-700/60 transition-colors">莊</div>`);
                    }
    
                    const displayChange = change === 0 ? 0 : Math.round(change * 10) / 10;
                    const changeStr = displayChange === 0 
                        ? '<span class="text-gray-300 dark:text-gray-600 font-light text-lg transition-colors">0</span>' 
                        : `<span class="text-xl font-bold ${displayChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} transition-colors">${displayChange > 0 ? '+' : ''}${displayChange.toFixed(1).replace(/\.0$/, '')}</span>`;
    
                    const bgClass = (pIndex % 2 === 0) ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-transparent';
                    
                    return `
                        <div class="flex flex-col items-center justify-start py-4 ${bgClass} h-full border-b border-gray-200 dark:border-gray-700 transition-colors">
                            ${changeStr}
                            <div class="flex flex-col items-center space-y-1 mt-1">
                                ${badges.join('')}
                            </div>
                        </div>
                    `;
                });
    
                            html += `
                                <div class="grid grid-cols-[60px_repeat(4,minmax(0,1fr))] gap-1 md:gap-2 items-stretch min-h-[80px] w-full">
                                    <div class="flex flex-col justify-start pt-2 border-b border-gray-200 dark:border-gray-700 transition-colors">${timelineNode}</div>
                                    ${playerCells.join('')}
                                </div>
                            `;            });
    
            html += `
                        </div>
                    </div>
                </div>
            `;
            historyContainer.innerHTML = html;
        },

    calculateSettleDebts() {
        const players = this.gameState.players.map(p => ({ ...p })); // deep copy
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
    },

    renderSettleDebtsModal() {
        const transactions = this.calculateSettleDebts();
        
        const modal = document.createElement('div');
        modal.id = 'settle-debts-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]';
        
        let html = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col relative transition-colors">
                <button id="close-settle-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
                <h3 class="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100 transition-colors">結算找數 (Settle Debts)</h3>
                <div class="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 transition-colors">以下是最小交易次數建議 (Min. Transactions)</div>
                <div class="space-y-4 mb-6 overflow-y-auto pr-1">
        `;
        
        if (transactions.length === 0) {
            html += `<div class="text-center text-gray-500 dark:text-gray-400 font-bold py-4 transition-colors">目前沒有需要結算的款項<br>(All balances are zero).</div>`;
        } else {
            transactions.forEach(t => {
                html += `
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                        <div class="flex flex-col items-center justify-center w-16">
                            <span class="text-3xl mb-1 drop-shadow-sm">${t.from.icon}</span>
                            <span class="text-[11px] font-black text-red-600 dark:text-red-400 truncate w-full text-center tracking-tighter transition-colors">${t.from.name}</span>
                        </div>

                        <div class="flex-1 flex flex-col items-center justify-center px-2">
                            <span class="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-0.5 transition-colors">付款給</span>
                            <div class="w-full h-[2px] bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center transition-colors">
                                <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-300 dark:border-l-gray-600 transition-colors"></div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center justify-center px-3 mx-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded shadow-sm py-1 min-w-[70px] transition-colors">
                            <span class="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider transition-colors">Amount</span>
                            <span class="font-black text-xl text-purple-600 dark:text-purple-400 leading-none transition-colors">${t.amount}</span>
                        </div>

                        <div class="flex-1 flex flex-col items-center justify-center px-2">
                            <div class="w-full h-[2px] bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center transition-colors">
                                <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-300 dark:border-l-gray-600 transition-colors"></div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center justify-center w-16">
                            <span class="text-3xl mb-1 drop-shadow-sm">${t.to.icon}</span>
                            <span class="text-[11px] font-black text-green-600 dark:text-green-400 truncate w-full text-center tracking-tighter transition-colors">${t.to.name}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
                <div class="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 transition-colors">
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
    },

    renderShareResultModal() {
        const modal = document.createElement('div');
        modal.id = 'share-result-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[70] overflow-y-auto';

        // 1. Calculate Stats
        let stats = {};
        this.gameState.players.forEach(p => {
            stats[p.id] = { name: p.name, icon: p.icon, score: p.score, wu: 0, zimo: 0, chuchong: 0, bpFan: 0 };
        });
        
        this.gameState.gameHistory.forEach(game => {
            if (game.type === 'zimo') {
                if (stats[game.winnerId]) {
                    stats[game.winnerId].zimo++;
                    stats[game.winnerId].wu++;
                }
            } else if (game.type === 'post-game') {
                if (stats[game.loserId]) stats[game.loserId].chuchong++;
                if (game.winnerIds) {
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
                <button id="close-share-modal" class="absolute top-2 right-0 text-white hover:text-gray-300 text-3xl font-bold z-10">&times;</button>
                
                <div id="capture-area" class="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-2xl p-6 w-full text-gray-800 dark:text-gray-100">
                    <h2 class="text-2xl font-black text-center mb-2 tracking-tight">戰果總結 (Match Results)</h2>
                    <div class="text-center text-xs text-gray-500 mb-6">${dateStr}</div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">最終得分 (Final Scores)</h3>
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        ${this.gameState.players.map(p => {
                            const pStats = stats[p.id];
                            return `
                                <div class="p-3 rounded-lg shadow-sm bg-white dark:bg-gray-800 flex flex-col justify-center">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center space-x-2 overflow-visible">
                                            <span class="text-2xl drop-shadow-sm leading-none pb-1">${p.icon}</span>
                                            <span class="font-bold text-sm max-w-[70px] overflow-hidden whitespace-nowrap text-ellipsis inline-block leading-normal pb-1">${p.name}</span>
                                        </div>
                                        <span class="text-lg font-black ${p.score > 0 ? 'text-green-600 dark:text-green-400' : (p.score < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400')}">${p.score > 0 ? '+' : ''}${p.score.toFixed(1).replace(/\.0$/, '')}</span>
                                    </div>
                                    ${pStats.titles.length > 0 ? `
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            ${pStats.titles.map(t => `<span class="${t.color} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">${t.label}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `
                        }).join('')}
                    </div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">數據統計 (Stats)</h3>
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-6">
                        <table class="w-full text-center text-xs">
                            <thead class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                                <tr>
                                    <th class="p-2 text-left">玩家</th>
                                    <th class="p-2">糊</th>
                                    <th class="p-2">自摸</th>
                                    <th class="p-2">出銃</th>
                                    <th class="p-2">獎/罰 (番)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(stats).map((s, idx) => `
                                    <tr class="border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}">
                                        <td class="p-2 text-left font-bold flex items-center space-x-1 overflow-visible">
                                            <span class="text-lg leading-none pb-1">${s.icon}</span>
                                            <span class="max-w-[55px] overflow-hidden whitespace-nowrap text-ellipsis inline-block leading-normal pb-1">${s.name}</span>
                                        </td>
                                        <td class="p-2">${s.wu}</td>
                                        <td class="p-2 text-green-600 dark:text-green-400">${s.zimo}</td>
                                        <td class="p-2 text-red-600 dark:text-red-400">${s.chuchong}</td>
                                        <td class="p-2 ${s.bpFan > 0 ? 'text-blue-600 dark:text-blue-400' : (s.bpFan < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500')}">${s.bpFan > 0 ? '+' : ''}${Math.round(s.bpFan * 10)/10}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <h3 class="text-lg font-bold mb-3 border-b pb-1 dark:border-gray-300 dark:border-gray-700">結算找數 (Settle Debts)</h3>
                    <div class="space-y-3 mb-2">
                        ${transactions.length === 0 ? '<div class="text-center text-sm text-gray-500 py-2">無須結算 (All balanced).</div>' : transactions.map(t => `
                            <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <div class="flex flex-col items-center w-14 overflow-visible">
                                    <span class="text-xl leading-none pb-0.5">${t.from.icon}</span>
                                    <span class="text-[10px] font-bold text-red-600 overflow-hidden whitespace-nowrap text-ellipsis w-full text-center leading-normal pb-0.5">${t.from.name}</span>
                                </div>
                                <div class="flex-1 flex items-center px-1 h-full">
                                    <div class="w-full h-[2px] bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center">
                                        <span class="absolute -top-4 text-[9px] text-gray-400 bg-white dark:bg-gray-800 px-1">付款給</span>
                                        <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-300 dark:border-l-gray-600"></div>
                                    </div>
                                </div>
                                <div class="flex flex-col items-center px-2 mx-1">
                                    <span class="font-black text-sm text-purple-600">${t.amount}</span>
                                </div>
                                <div class="flex-1 flex items-center px-1 h-full">
                                    <div class="w-full h-[2px] bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center">
                                        <div class="absolute right-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-300 dark:border-l-gray-600"></div>
                                    </div>
                                </div>
                                <div class="flex flex-col items-center w-14 overflow-visible">
                                    <span class="text-xl leading-none pb-0.5">${t.to.icon}</span>
                                    <span class="text-[10px] font-bold text-green-600 overflow-hidden whitespace-nowrap text-ellipsis w-full text-center leading-normal pb-0.5">${t.to.name}</span>
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
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6',
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
    },

    renderScoringView() {
        const scoringDiv = document.getElementById('scoring-view');
        const state = this.gameState;
        const winds = ['東', '南', '西', '北'];
        const rCount = state.rotationCount || 0;
        const windIndex = Math.floor(rCount / 4) % 4;
        const gameIndex = rCount % 4;

        scoringDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-b-lg shadow transition-colors">
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
                        <div class="p-4 rounded-lg shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 player-card ${p.isBroker ? 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/60 dark:hover:bg-yellow-800/60' : 'bg-white dark:bg-gray-700'} text-gray-800 dark:text-gray-100 transition-colors" data-player-id="${p.id}">
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
    },

    renderWindSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'wind-settings-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        const rCount = this.gameState.rotationCount || 0;
        const currentWindIdx = Math.floor(rCount / 4) % 4;
        const currentGameIdx = rCount % 4;

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm relative transition-colors">
                <button id="close-wind-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
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

        document.getElementById('wind-settings-form').addEventListener('submit', (ev) => {
            ev.preventDefault();
            this.saveStateForUndo();
            const selectedWind = parseInt(document.getElementById('select-wind').value);
            const selectedGame = parseInt(document.getElementById('select-game').value);
            
            // Formula to map Wind/Game selection back to a strict rotation count logic
            // Note: If they were arbitrarily deep in game sets (like 4th round of North), this will reset them back to the 1st cycle.
            this.gameState.rotationCount = (selectedWind * 4) + selectedGame;
            
            this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
        });
    },

    renderSetDealerModal() {
        const modal = document.createElement('div');
        modal.id = 'set-dealer-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm relative transition-colors">
                <button id="close-dealer-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
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

        document.getElementById('set-dealer-form').addEventListener('submit', (ev) => {
            ev.preventDefault();
            this.saveStateForUndo();
            const selectedId = parseInt(document.querySelector('input[name="select-new-dealer"]:checked').value);
            
            this.gameState.players.forEach(p => {
                p.isBroker = (p.id === selectedId);
                // When manually changing the dealer, we reset LianZhuang for everyone.
                p.lianZhuangCount = 0;
            });
            
            this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
        });
    },

    renderSetSeatingModal() {
        const modal = document.createElement('div');
        modal.id = 'set-seating-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg overflow-y-auto overflow-x-hidden transition-colors" style="max-height: 90vh;">
                <button id="close-seating-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold z-10 transition-colors">&times;</button>
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

        document.getElementById('finish-set-seating').addEventListener('click', () => {
            this._saveGame();
            this.renderGame();
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        });

        // Re-use the existing display method to render the drag-and-drop elements
        this._updateSeatingDisplay();
    },

    renderActiveStreaksModal() {
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
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md relative max-h-[80vh] flex flex-col transition-colors">
                <button id="close-streaks-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-2xl font-bold transition-colors">&times;</button>
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
            btnSurrenderAll.addEventListener('click', () => {
                if (confirm('確定要一鍵清空所有的連勝與拉莊紀錄嗎？\n此操作無法單獨復原。')) {
                    this.saveStateForUndo();
                    
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

                    this._saveGame();
                    this.renderGame();
                    document.body.removeChild(modal);
                }
            });
        }

        document.querySelectorAll('.manual-surrender-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.currentTarget;
                const streakKey = btnEl.dataset.streakKey;
                const winnerId = parseInt(btnEl.dataset.winner);
                const loserId = parseInt(btnEl.dataset.loser);
                const winner = this.gameState.players.find(p => p.id === winnerId);
                const loser = this.gameState.players.find(p => p.id === loserId);
                const streakData = this.gameState.streaks[streakKey];
                const totalAmt = typeof streakData?.totalAmount === 'number' ? streakData.totalAmount.toFixed(1).replace(/\.0$/, '') : '0';

                if (confirm(`確定要讓 ${loser.name} 向 ${winner.name} 投降 (斷纜) 嗎？\n目前累積番數: ${totalAmt}\n此操作將清空雙方連勝/連拉累積紀錄。`)) {
                    this.saveStateForUndo();
                    this.gameState.streaks[streakKey] = { count: 0, totalAmount: 0 };
                    
                    this.gameState.gameHistory.push({
                        type: 'surrender',
                        winnerId: winnerId,
                        loserId: loserId,
                        brokerId: this.gameState.players.find(p => p.isBroker)?.id,
                        rotationCount: this.gameState.rotationCount || 0,
                        timestamp: new Date().toISOString()
                    });

                    this._saveGame();
                    this.renderGame();
                    document.body.removeChild(modal);
                }
            });
        });
    },

    renderActionModal(playerId) {
        const player = this.gameState.players.find(p => p.id === playerId);
        if (!player) return;

        const modal = document.createElement('div');
        modal.id = 'action-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg relative transition-colors text-gray-800 dark:text-gray-100">
                <button id="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold transition-colors">&times;</button>
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
                        html += `<div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center transition-colors"><span class="font-bold text-gray-800 dark:text-gray-200 text-sm transition-colors">Total:</span> <span class="font-black text-green-600 dark:text-green-400 text-lg transition-colors">+${grandTotal}</span></div>`;
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
                                <div class="flex flex-col mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-600 transition-colors">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-2 w-1/2">
                                            <span class="text-2xl">${p.icon}</span>
                                            <span class="font-bold truncate text-gray-800 dark:text-gray-100 transition-colors">${p.name}</span>
                                        </div>
                                        <div class="w-1/2 flex items-center">
                                            <input type="number" id="lose-input-${p.id}" data-loser="${playerId}" data-winner="${p.id}" class="lose-input-calc w-full p-2 border dark:border-gray-600 rounded text-right font-bold text-lg text-purple-700 dark:text-purple-400 bg-white dark:bg-gray-800 transition-colors" min="0" step="1" placeholder="番數" ${index === 0 ? 'autofocus' : ''}>
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
    },

    checkSurrenders(updatedStreaks) {
        const surrendersToPrompt = [];
        updatedStreaks.forEach(s => {
            const st = this.gameState.streaks[s.streakKey];
            if (st && st.count > 0 && st.count % 3 === 0) {
                surrendersToPrompt.push(s);
            }
        });
        
        this.processSurrenders(surrendersToPrompt);
    },

    processSurrenders(queue) {
        if (queue.length === 0) {
            // Queue is empty, finish saving and render the final state
            this._saveGame();
            this.renderGame();
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
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm text-center transition-colors">
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
    },

    _roundScore(value, actionType = 'neutral') {
        const precision = this.gameState.config.decimalRounding || 'integer';
        const advantage = this.gameState.config.roundingAdvantage || 'winner';
        
        let direction = 'nearest';
        if (actionType === 'pull') {
            direction = (advantage === 'winner') ? 'up' : 'down';
        } else if (actionType === 'cut') {
            direction = (advantage === 'winner') ? 'down' : 'up';
        }

        let multiplier = 1;
        if (precision === '0.1' || precision === 'none') multiplier = 10;
        else if (precision === '0.5' || precision === 'nearest-0.5') multiplier = 2;
        else if (precision === 'integer') multiplier = 1;

        if (direction === 'up') {
            return Math.ceil(value * multiplier) / multiplier;
        } else if (direction === 'down') {
            return Math.floor(value * multiplier) / multiplier;
        } else {
            return Math.round(value * multiplier) / multiplier;
        }
    },

    calculateMatchup(winnerId, loserId, inputScore) {
        const winner = this.gameState.players.find(p => p.id === winnerId);
        const loser = this.gameState.players.find(p => p.id === loserId);
        if (!winner || !loser) return { total: 0, breakdownHTML: '' };

        const di = this.gameState.config.baseScoreDi || 0;
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

        if (!this.gameState.streaks) this.gameState.streaks = {};
        
        const currentStreak = this.gameState.streaks[streakKey] ? this.gameState.streaks[streakKey].count : 0;
        const streakTotalAmount = this.gameState.streaks[streakKey] ? this.gameState.streaks[streakKey].totalAmount || 0 : 0;
        
        const currentPiBanAmt = this.gameState.streaks[reverseStreakKey] && this.gameState.streaks[reverseStreakKey].count > 0 
                                  ? this.gameState.streaks[reverseStreakKey].totalAmount : 0;

        if (currentStreak > 0) {
            const mult = 0.5;
            const streakBonusValue = this._roundScore(streakTotalAmount * mult, 'pull');
            streakWin = this._roundScore(baseScore + streakBonusValue, 'neutral');
            breakdownParts.push(`<span class="text-gray-600">拉:</span>${streakBonusValue}`);
        }

        let finalScoreChange = streakWin;
        let appliedPiBan = 0;

        if (currentPiBanAmt > 0) {
            appliedPiBan = this._roundScore(currentPiBanAmt * 0.5, 'cut');
            finalScoreChange += appliedPiBan;
            // Round one more time just in case floating point weirdness happens from adding
            finalScoreChange = this._roundScore(finalScoreChange, 'neutral');
            breakdownParts.push(`<span class="text-gray-600">劈半:</span>${appliedPiBan}`);
        }

        const breakdownHTML = breakdownParts.join(' <span class="mx-0.5 text-gray-500">|</span> ') + ` <span class="mx-0.5 text-gray-500">=></span> <strong class="text-purple-700 font-black text-sm">${finalScoreChange}</strong>`;

        return {
            total: finalScoreChange,
            streakWin: streakWin, // Need to track this separately for state updates
            hasPiBan: appliedPiBan > 0,
            breakdownHTML: breakdownHTML
        };
    },

    _calculateTitles(stats) {
        let maxWu = 0;
        let maxZimo = 0;
        let maxChuchong = 0;
        let maxBpFan = 0;
        let minScoreAbs = Infinity;
        let minParticipationPerRound = Infinity;

        const rotationCount = this.gameState.rotationCount || 0;
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
    },

    renderDashboardView() {
        const history = this.gameState.gameHistory;
        const container = document.getElementById('dashboard-table-container');

        // Calculate Stats
        let stats = {};
        this.gameState.players.forEach(p => {
            stats[p.id] = { name: p.name, icon: p.icon, score: p.score, wu: 0, zimo: 0, chuchong: 0, bpFan: 0 };
        });

        history.forEach(game => {
            if (game.type === 'zimo') {
                if (stats[game.winnerId]) {
                    stats[game.winnerId].zimo++;
                    stats[game.winnerId].wu++;
                }
            } else if (game.type === 'post-game') {
                if (stats[game.loserId]) stats[game.loserId].chuchong++;
                if (game.winnerIds) {
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
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
                <table class="w-full text-center text-sm">
                    <thead class="bg-gray-800 dark:bg-gray-900 text-white font-semibold transition-colors">
                        <tr>
                            <th class="p-3 text-left">玩家</th>
                            <th class="p-3">食糊</th>
                            <th class="p-3">自摸</th>
                            <th class="p-3">出銃</th>
                            <th class="p-3">獎/罰 (番)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(stats).map((s, idx) => `
                            <tr class="border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <td class="p-3 text-left flex flex-col justify-center">
                                    <div class="font-bold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                                        <span class="text-xl">${s.icon}</span>
                                        <span>${s.name}</span>
                                    </div>
                                    ${s.titles.length > 0 ? `
                                        <div class="flex flex-wrap gap-1 mt-1.5 ml-8">
                                            ${s.titles.map(t => `<span class="${t.color} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">${t.label}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </td>
                                <td class="p-3 font-mono text-gray-800 dark:text-gray-200">${s.wu}</td>
                                <td class="p-3 font-mono text-green-600 dark:text-green-400 font-bold">${s.zimo}</td>
                                <td class="p-3 font-mono text-red-600 dark:text-red-400 font-bold">${s.chuchong}</td>
                                <td class="p-3 font-mono ${s.bpFan > 0 ? 'text-blue-600 dark:text-blue-400' : (s.bpFan < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500')}">${s.bpFan > 0 ? '+' : ''}${Math.round(s.bpFan * 10)/10}</td>
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
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
