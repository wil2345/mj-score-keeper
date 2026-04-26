// Automatically extracted UI module

export function renderGame() {
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
                        <div id="action-dropdown-menu" class="hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-gray-50 dark:bg-gray-800 rounded-md shadow-xl z-50 text-gray-800 dark:text-gray-200 border dark:border-gray-700 overflow-hidden transition-colors">
                            <button id="btn-fan-table" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors text-green-600 dark:text-green-400">📜 番數表 (Fan Lookup)</button>
                            <button id="btn-rollback" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">復原 (Undo)</button>
                            <button id="btn-draw" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">流局 (Draw)</button>
                            <button id="btn-set-wind" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定風圈/局數 (Set Wind/Game)</button>
                            <button id="btn-set-dealer" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定莊家 (Set Dealer)</button>
                            <button id="btn-set-seating" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">設定座位 (Set Seating)</button>
                            <button id="btn-active-streaks" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors">連拉/投降 (Streaks/ Surrender)</button>
                            <button id="btn-settle-debts" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors text-purple-600 dark:text-purple-400">結算找數 (Settle Debts)</button>
                            <button id="btn-share-result" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold transition-colors text-pink-600 dark:text-pink-400">分享戰果 (Share Result)</button>
                            <button id="btn-export-match" class="block w-full text-left px-4 py-4 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold transition-colors text-blue-600 dark:text-blue-400">匯出牌局 (Export Match)</button>
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
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow mb-4 transition-colors">
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

        document.getElementById('btn-fan-table').addEventListener('click', () => {
            this.renderFanTableModal();
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
                this.checkSeatChange(eventRotationCount, this.gameState.rotationCount);
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
    }

