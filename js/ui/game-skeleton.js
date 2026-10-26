import { applyDraw } from '../engine/actions.js';

let _outsideClickHandler = null;

export function renderGame() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="max-w-4xl mx-auto min-h-screen">
            <div class="bg-gray-800 dark:bg-gray-950 text-white flex justify-center safe-pt-game-header pb-2 rounded-b-lg md:rounded-b-none md:rounded-t-lg relative sticky top-0 z-30 shadow-lg transition-colors">
                <button id="exit-game-btn" class="absolute left-2 top-1/2 -translate-y-1/2 mt-[calc(var(--safe-top)/2)] px-3 py-2 text-gray-400 hover:text-white font-bold transition-colors" title="Back to Matches" aria-label="Home">
                    <span class="text-xl">🏠</span>
                </button>
                <button data-view="scoring" class="flex-1 px-2 py-3 font-semibold view-btn active-view ml-10 transition-colors">Game</button>
                <div class="flex-1 relative text-center">
                    <button id="action-dropdown-btn" class="w-full h-full px-2 py-3 font-semibold hover:bg-gray-700 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-center">
                        Action <span class="ml-1 text-[10px]">▼</span>
                    </button>
                    <div id="action-dropdown-menu" class="hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-gray-50 dark:bg-gray-800 rounded-md shadow-xl z-50 text-gray-800 dark:text-gray-200 border dark:border-gray-700 overflow-hidden">
                        <button id="btn-fan-table" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold text-green-600 dark:text-green-400">📜 番數表</button>
                        <button id="btn-rollback" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">復原 (Undo)</button>
                        <button id="btn-draw" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">流局 (Draw)</button>
                        <button id="btn-set-wind" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">設定風圈/局數</button>
                        <button id="btn-set-dealer" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">設定莊家</button>
                        <button id="btn-set-seating" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">設定座位</button>
                        <button id="btn-active-streaks" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold">連拉/投降</button>
                        <button id="btn-settle-debts" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold text-purple-600 dark:text-purple-400">結算找數</button>
                        <button id="btn-share-result" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 border-b dark:border-gray-700 font-semibold text-pink-600 dark:text-pink-400">分享戰果</button>
                        <button id="btn-export-match" class="block w-full text-left px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-blue-600 dark:text-blue-400">匯出牌局</button>
                    </div>
                </div>
                <button data-view="history" class="flex-1 px-2 py-3 font-semibold view-btn transition-colors">History</button>
                <button data-view="dashboard" class="flex-1 px-2 py-3 font-semibold view-btn transition-colors">Stats</button>
            </div>

            <div id="scoring-view" class="view"></div>
            <div id="history-view" class="view hidden">
                <div id="history-table-container"></div>
            </div>
            <div id="dashboard-view" class="view hidden">
                <div id="dashboard-table-container" class="mb-4"></div>
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
                    <canvas id="score-chart" style="height: 400px;"></canvas>
                </div>
            </div>
        </div>
    `;

    document.getElementById('exit-game-btn').addEventListener('click', async () => {
        await this._saveGame();
        await this.renderLanding();
    });

    const actionBtn = document.getElementById('action-dropdown-btn');
    const actionMenu = document.getElementById('action-dropdown-menu');

    actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionMenu.classList.toggle('hidden');
    });

    // Replace previous outside-click handler to avoid stacking listeners across re-renders
    if (_outsideClickHandler) {
        document.removeEventListener('click', _outsideClickHandler);
    }
    _outsideClickHandler = () => {
        if (!actionMenu.classList.contains('hidden')) {
            actionMenu.classList.add('hidden');
        }
    };
    document.addEventListener('click', _outsideClickHandler);

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetView = e.currentTarget.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`${targetView}-view`).classList.remove('hidden');

            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active-view'));
            e.currentTarget.classList.add('active-view');

            if (targetView === 'history') this.renderHistoryView();
            else if (targetView === 'dashboard') this.renderDashboardView();
        });
    });

    const bind = (id, fn) => document.getElementById(id).addEventListener('click', fn);

    bind('btn-rollback', async () => { await this.rollback(); });
    bind('btn-fan-table', () => this.renderFanTableModal());
    bind('btn-set-wind', () => this.renderWindSettingsModal());
    bind('btn-set-dealer', () => this.renderSetDealerModal());
    bind('btn-active-streaks', () => this.renderActiveStreaksModal());
    bind('btn-set-seating', () => this.renderSetSeatingModal());
    bind('btn-settle-debts', () => this.renderSettleDebtsModal());
    bind('btn-share-result', () => this.renderShareResultModal());

    bind('btn-draw', async () => {
        if (!confirm('確定要流局嗎？\n(莊家將替換，但所有拉莊連勝紀錄將保留)')) return;
        await this.saveStateForUndo();
        const oldRot = this.gameState.rotationCount || 0;
        applyDraw(this.gameState);
        await this._saveGame();
        this.renderGame();
        await this.checkSeatChange(oldRot, this.gameState.rotationCount);
    });

    bind('btn-export-match', () => {
        if (!this.gameState.matchId) return;
        const blob = new Blob([JSON.stringify(this.gameState, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mahjong_score_keeper_match_${this.gameState.matchId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    this.renderScoringView();
}
