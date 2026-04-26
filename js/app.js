import { VERSION, ICONS } from './constants.js';
import { showNotification, toggleTheme } from './utils/ui-helpers.js';
import { calculateMatchup, calculateSettleDebts } from './engine/scoring.js';
import { saveGame, loadMatch, deleteMatch, saveStateForUndo, recalculateHistory, migrateFromLocalStorage } from './engine/state.js';
import { calculateTitles } from './engine/stats.js';

import { roundScore } from './utils/math-helpers.js';
import { renderLanding } from './ui/landing.js';
import { startNewGame, renderSetupModal, _updateIconPickers, _updateSeatingDisplay } from './ui/setup.js';
import { renderGame } from './ui/game-skeleton.js';
import { renderScoringView, renderActionModal, checkSurrenders, processSurrenders, checkSeatChange, renderSeatChangeModal } from './ui/scoring-view.js';
import { renderHistoryView } from './ui/history-view.js';
import { renderDashboardView } from './ui/dashboard-view.js';
import { 
    renderWindSettingsModal, renderSetDealerModal, renderSetSeatingModal, 
    renderActiveStreaksModal, renderSettleDebtsModal, renderFanTableModal, 
    _generateFanListHTML, renderShareResultModal 
} from './ui/shared-modals.js';

const App = {
    version: VERSION,
    gameState: {},
    undoStack: [],
    icons: ICONS,
    playerHistory: [],

    // Bound Extracted Methods
    showNotification,
    toggleTheme,
    async _saveGame() { await saveGame(this.gameState); },
    _roundScore(val, type) { 
        return roundScore(val, this.gameState.config, type); 
    },
    calculateMatchup(wId, lId, score) { return calculateMatchup(this.gameState, wId, lId, score); },
    calculateSettleDebts() { return calculateSettleDebts(this.gameState); },
    _calculateTitles(stats) { return calculateTitles(this.gameState, stats); },
    recalculateHistory(state) { recalculateHistory(state); this.gameState = state; },

    // UI Modules
    renderLanding,
    startNewGame, renderSetupModal, _updateIconPickers, _updateSeatingDisplay,
    renderGame,
    renderScoringView, renderActionModal, checkSurrenders, processSurrenders,
    checkSeatChange, renderSeatChangeModal,
    renderHistoryView,
    renderDashboardView,
    renderWindSettingsModal, renderSetDealerModal, renderSetSeatingModal, 
    renderActiveStreaksModal, renderSettleDebtsModal, renderFanTableModal, 
    _generateFanListHTML, renderShareResultModal,

    // Unextracted / Glue Methods
    async init() {
        if (localStorage.getItem('mahjong_theme') === 'dark' || (!('mahjong_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Perform data migration if needed
        await migrateFromLocalStorage();
        
        await this.loadPlayerHistory();
        await this.renderLanding();
    },

    async loadMatch(matchId) {
        const result = await loadMatch(matchId);
        if (result) {
            this.gameState = result.gameState;
            this.undoStack = result.undoStack;
            this.renderGame();
        } else {
            alert('Cannot find this match data.');
        }
    },

    async deleteMatch(matchId) {
        if (confirm('確定要刪除這筆牌局紀錄嗎？ (Are you sure you want to delete this match?)')) {
            await deleteMatch(matchId);
            await this.renderLanding();
        }
    },

    async saveStateForUndo() {
        if (!this.gameState.matchId) return;
        await saveStateForUndo(this.gameState, this.undoStack);
    },

    async rollback() {
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
        await this._saveGame();
        
        // Save the updated undo stack back to IndexedDB
        await idbKeyval.set(`mahjong_app_undo_${this.gameState.matchId}`, this.undoStack);
        
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

    async loadPlayerHistory() {
        const history = await idbKeyval.get('mahjong_app_player_history');
        this.playerHistory = history || [];
    },

    async savePlayerHistory() {
        const currentNames = this.gameState.players.map(p => p.name.trim()).filter(n => n);
        const newHistory = [...new Set([...this.playerHistory, ...currentNames])];
        this.playerHistory = newHistory;
        await idbKeyval.set('mahjong_app_player_history', this.playerHistory);
    },

};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
