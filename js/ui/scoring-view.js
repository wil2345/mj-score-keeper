import { applyZimo, applyPostGame, applyBonusPenalty, applySurrender } from '../engine/actions.js';
import { escapeHtml, formatScore, closeModal } from '../utils/ui-helpers.js';

const SEAT_POS = [
    'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'top-1/2 right-0 -translate-y-1/2 translate-x-1/2',
    'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
    'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2'
];

export function renderScoringView() {
    const scoringDiv = document.getElementById('scoring-view');
    const state = this.gameState;
    const winds = ['東', '南', '西', '北'];
    const rCount = state.rotationCount || 0;
    const windIndex = Math.floor(rCount / 4) % 4;
    const gameIndex = rCount % 4;

    scoringDiv.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-b-lg shadow transition-colors">
            <h2 class="text-xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">Current Seating</h2>
            <div class="relative w-64 h-64 mx-auto border-2 dark:border-gray-600 rounded-md mt-6 mb-14 bg-gradient-to-br from-gray-100/80 to-gray-200/40 dark:from-gray-700/40 dark:to-gray-900/40">
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-20 dark:opacity-40 pointer-events-none select-none text-gray-500 dark:text-gray-400">
                    <span class="text-5xl font-black tracking-widest">${winds[windIndex]}風</span>
                    <span class="text-5xl font-black tracking-widest">${winds[gameIndex]}局</span>
                </div>
                ${state.config.seating.map((playerId, index) => {
                    const player = state.players.find(p => p.id === playerId);
                    if (!player) return '';
                    return `
                        <div class="absolute ${SEAT_POS[index]} w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                            <div class="text-center text-gray-800 dark:text-gray-200">
                                <div class="text-3xl">${player.icon}</div>
                                <div class="text-xs font-semibold mt-1">${player.isBroker ? '<span class="text-yellow-500 font-bold mr-1">莊</span>' : ''}${escapeHtml(player.name)}</div>
                                ${player.lianZhuangCount > 0 ? `<div class="text-xs font-black text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 rounded-sm mt-0.5 animate-pulse">連${player.lianZhuangCount}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
                ${state.players.map(p => `
                    <div class="p-4 rounded-xl shadow-sm cursor-pointer active:scale-[0.98] player-card ${p.isBroker ? 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/60 dark:hover:bg-yellow-800/60' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650'} text-gray-800 dark:text-gray-100 transition-all" data-player-id="${p.id}">
                        <div class="text-3xl pointer-events-none">${p.icon}</div>
                        <div class="font-bold text-lg pointer-events-none truncate">${escapeHtml(p.name)}</div>
                        <div class="text-2xl font-light pointer-events-none tabular-nums ${p.score > 0 ? 'text-green-600 dark:text-green-400' : p.score < 0 ? 'text-red-600 dark:text-red-400' : ''}">${formatScore(p.score, { signed: true })}</div>
                        ${p.isBroker ? `<div class="text-xs font-bold text-yellow-700 dark:text-yellow-400 pointer-events-none mt-1">莊 ${p.lianZhuangCount > 0 ? `<span class="text-green-600 dark:text-green-400 font-black bg-green-100 dark:bg-green-900 px-1.5 rounded ml-1">連${p.lianZhuangCount}</span>` : ''}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    scoringDiv.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', (e) => {
            this.renderActionModal(parseInt(e.currentTarget.dataset.playerId, 10));
        });
    });
}

export function renderActionModal(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const modal = document.createElement('div');
    modal.id = 'action-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg relative text-gray-800 dark:text-gray-100 max-h-[90vh] overflow-y-auto">
            <button id="close-modal" class="absolute safe-top-btn right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold" aria-label="Close">&times;</button>
            <h2 class="text-2xl font-bold text-center mb-6">${player.icon} ${escapeHtml(player.name)}</h2>

            <div id="action-selection" class="flex flex-col space-y-3">
                <button class="action-btn bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="bonus_penalty">獎 / 罰</button>
                <button class="action-btn bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="zimo">自摸</button>
                <button class="action-btn bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" data-action="lose">出銃</button>
            </div>

            <div id="action-input-area" class="hidden mt-4"></div>
        </div>
    `;
    document.body.appendChild(modal);

    const dismiss = () => closeModal(modal);
    modal.querySelector('#close-modal').addEventListener('click', dismiss);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) dismiss();
    });

    modal.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            modal.querySelector('#action-selection').classList.add('hidden');
            const inputArea = modal.querySelector('#action-input-area');
            inputArea.classList.remove('hidden');

            if (action === 'bonus_penalty') {
                renderBonusPenaltyForm.call(this, inputArea, playerId, modal);
            } else if (action === 'zimo') {
                renderZimoForm.call(this, inputArea, playerId, modal);
            } else if (action === 'lose') {
                renderLoseForm.call(this, inputArea, playerId, modal);
            }

            inputArea.querySelectorAll('.back-btn').forEach(backBtn => {
                backBtn.addEventListener('click', () => {
                    inputArea.classList.add('hidden');
                    inputArea.innerHTML = '';
                    modal.querySelector('#action-selection').classList.remove('hidden');
                });
            });
        });
    });
}

function radioPill(name, value, label, { checked = false, checkedClass = 'peer-checked:text-gray-900 dark:peer-checked:text-gray-100' } = {}) {
    return `
        <label class="flex-1 text-center cursor-pointer">
            <input type="radio" name="${name}" value="${value}" class="hidden peer" ${checked ? 'checked' : ''}>
            <div class="py-3 rounded-md peer-checked:bg-white dark:peer-checked:bg-gray-600 peer-checked:shadow-sm ${checkedClass} transition-all text-gray-500 dark:text-gray-400">${label}</div>
        </label>
    `;
}

function renderBonusPenaltyForm(inputArea, playerId, modal) {
    inputArea.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-center">獎 / 罰</h3>
        <form id="bp-form">
            <div class="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-4 w-full text-lg font-bold select-none">
                ${radioPill('bp-type', 'bonus', '獎 (+)', { checked: true, checkedClass: 'peer-checked:text-blue-600 dark:peer-checked:text-blue-400' })}
                ${radioPill('bp-type', 'penalty', '罰 (-)', { checkedClass: 'peer-checked:text-red-600 dark:peer-checked:text-red-400' })}
            </div>
            <div class="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-6 w-full text-lg font-bold select-none">
                ${radioPill('bp-amount', '0.5', '半底')}
                ${radioPill('bp-amount', '1', '一底', { checked: true })}
                ${radioPill('bp-amount', '2', '兩底')}
            </div>
            <div class="flex space-x-2">
                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg">返回</button>
                <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">確認</button>
            </div>
        </form>
    `;

    inputArea.querySelector('#bp-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const mult = parseFloat(inputArea.querySelector('input[name="bp-amount"]:checked')?.value || '1');
        const bpType = inputArea.querySelector('input[name="bp-type"]:checked').value;
        if (!(mult > 0)) return;

        await this.saveStateForUndo();
        applyBonusPenalty(this.gameState, playerId, bpType, { mult });
        await this._saveGame();
        closeModal(modal);
        this.renderGame();
    });
}

function renderZimoForm(inputArea, playerId, modal) {
    inputArea.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-center">自摸</h3>
        <form id="zimo-form">
            <input type="number" id="zimo-score-input" data-winner="${playerId}" placeholder="每家番數" class="w-full p-3 border dark:border-gray-600 rounded-lg text-xl mb-4 text-center font-bold text-purple-700 dark:text-purple-400 bg-gray-50 dark:bg-gray-700" min="1" step="1" required inputmode="numeric">
            <div id="breakdown-zimo" class="w-full text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono space-y-1 text-center"></div>
            <div class="flex space-x-2">
                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg">返回</button>
                <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">確認</button>
            </div>
        </form>
    `;

    const zimoInput = inputArea.querySelector('#zimo-score-input');
    setTimeout(() => zimoInput?.focus(), 50);
    zimoInput.addEventListener('focus', e => e.target.select());
    zimoInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const breakdownDiv = inputArea.querySelector('#breakdown-zimo');
        if (!(val > 0)) {
            breakdownDiv.innerHTML = '';
            return;
        }
        const others = this.gameState.players.filter(p => p.id !== playerId);
        let html = '';
        let grandTotal = 0;
        for (const loser of others) {
            const result = this.calculateMatchup(playerId, loser.id, val);
            grandTotal += result.total;
            html += `<div class="flex justify-between items-center whitespace-nowrap"><span class="w-16 text-left truncate text-gray-700 dark:text-gray-300 mr-2">${escapeHtml(loser.name)}</span> <span class="flex-1 text-right text-[10px]">${result.breakdownHTML}</span></div>`;
        }
        html += `<div class="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center"><span class="font-bold text-gray-800 dark:text-gray-200 text-sm">Total:</span> <span class="font-black text-green-600 dark:text-green-400 text-lg">+${grandTotal}</span></div>`;
        breakdownDiv.innerHTML = html;
    });

    inputArea.querySelector('#zimo-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const inputScore = parseInt(zimoInput.value, 10);
        if (!(inputScore > 0)) return;

        await this.saveStateForUndo();
        const { updatedStreaks } = applyZimo(this.gameState, playerId, inputScore);
        closeModal(modal);
        await this.checkSurrenders(updatedStreaks);
    });
}

function renderLoseForm(inputArea, playerId, modal) {
    const otherPlayers = this.gameState.players.filter(p => p.id !== playerId);
    inputArea.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-center">出銃</h3>
        <form id="lose-form">
            ${otherPlayers.map((p, index) => `
                <div class="flex flex-col mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2 w-1/2 min-w-0">
                            <span class="text-2xl shrink-0">${p.icon}</span>
                            <span class="font-bold truncate text-gray-800 dark:text-gray-100">${escapeHtml(p.name)}</span>
                        </div>
                        <div class="w-1/2 flex items-center">
                            <input type="number" id="lose-input-${p.id}" data-loser="${playerId}" data-winner="${p.id}" class="lose-input-calc w-full p-2 border dark:border-gray-600 rounded text-right font-bold text-lg text-purple-700 dark:text-purple-400 bg-gray-50 dark:bg-gray-800" min="0" step="1" placeholder="番數" inputmode="numeric" ${index === 0 ? 'autofocus' : ''}>
                        </div>
                    </div>
                    <div id="breakdown-lose-${p.id}" class="text-[10px] text-gray-800 dark:text-gray-300 text-right font-mono min-h-[1rem] whitespace-nowrap"></div>
                </div>
            `).join('')}
            <div id="total-lose-summary" class="hidden mb-4 mt-2 px-2 py-3 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center">
                <span class="font-bold text-gray-800 dark:text-gray-200 text-sm">Total:</span>
                <span id="total-lose-amount" class="font-black text-red-600 dark:text-red-400 text-lg">0</span>
            </div>
            <div class="flex space-x-2 mt-2">
                <button type="button" class="back-btn flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg">返回</button>
                <button type="submit" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg">確認</button>
            </div>
        </form>
    `;

    setTimeout(() => inputArea.querySelector(`#lose-input-${otherPlayers[0].id}`)?.focus(), 50);

    const updateTotalLoss = () => {
        let total = 0;
        let activeInputs = 0;
        inputArea.querySelectorAll('.lose-input-calc').forEach(inp => {
            const val = parseInt(inp.value, 10);
            if (val > 0) {
                total += this.calculateMatchup(
                    parseInt(inp.dataset.winner, 10),
                    parseInt(inp.dataset.loser, 10),
                    val
                ).total;
                activeInputs++;
            }
        });
        const summaryDiv = inputArea.querySelector('#total-lose-summary');
        const amountSpan = inputArea.querySelector('#total-lose-amount');
        if (activeInputs > 0) {
            summaryDiv.classList.remove('hidden');
            amountSpan.textContent = `-${total}`;
        } else {
            summaryDiv.classList.add('hidden');
        }
    };

    inputArea.querySelectorAll('.lose-input-calc').forEach(input => {
        input.addEventListener('focus', e => e.target.select());
        input.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            const winnerId = parseInt(e.target.dataset.winner, 10);
            const loserId = parseInt(e.target.dataset.loser, 10);
            const breakdownDiv = inputArea.querySelector(`#breakdown-lose-${winnerId}`);
            breakdownDiv.innerHTML = (val > 0)
                ? this.calculateMatchup(winnerId, loserId, val).breakdownHTML
                : '';
            updateTotalLoss();
        });
    });

    inputArea.querySelector('#lose-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const winners = [];
        for (const p of otherPlayers) {
            const inputScore = parseInt(inputArea.querySelector(`#lose-input-${p.id}`).value, 10) || 0;
            if (inputScore > 0) winners.push({ winnerId: p.id, handFan: inputScore });
        }
        if (winners.length === 0) {
            alert('請輸入最少一家的分數 (Please enter a score for at least one winner).');
            return;
        }

        await this.saveStateForUndo();
        const { updatedStreaks } = applyPostGame(this.gameState, playerId, winners);
        closeModal(modal);
        await this.checkSurrenders(updatedStreaks);
    });
}

export async function checkSurrenders(updatedStreaks) {
    const surrendersToPrompt = updatedStreaks.filter(s => {
        const st = this.gameState.streaks[s.streakKey];
        return st && st.count > 0 && st.count % 3 === 0;
    });
    await this.processSurrenders(surrendersToPrompt);
}

export function renderSeatChangeModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100]';
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-200 dark:border-gray-700">
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
        modal.querySelector('#close-seating-reminder').addEventListener('click', () => {
            closeModal(modal);
            resolve();
        });
    });
}

export async function checkSeatChange(oldRotation, newRotation) {
    if (newRotation > 0 && Math.floor(newRotation / 16) > Math.floor(oldRotation / 16)) {
        await this.renderSeatChangeModal();
    }
}

export async function processSurrenders(queue) {
    if (queue.length === 0) {
        await this._saveGame();
        this.renderGame();

        const history = this.gameState.gameHistory;
        if (history.length > 0) {
            const lastEvent = history[history.length - 1];
            // Find the last scoring/draw event (surrender may be after it)
            const scoringEvent = [...history].reverse().find(e =>
                ['zimo', 'post-game', 'draw'].includes(e.type)
            );
            if (scoringEvent) {
                await this.checkSeatChange(scoringEvent.rotationCount, this.gameState.rotationCount);
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
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]';
    modal.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
            <h3 class="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">投降確認 (Surrender)</h3>
            <p class="text-lg mb-6 text-gray-800 dark:text-gray-200">
                <span class="font-bold">${escapeHtml(loser.name)}</span> 已連續輸給 <span class="font-bold">${escapeHtml(winner.name)}</span>
                <span class="text-red-500 dark:text-red-400 font-bold">${streakData.count}</span> 次。
                <br>
                目前累積番數: <span class="font-bold text-red-600 dark:text-red-400">${formatScore(streakData.totalAmount)}</span>
                <br><br>是否要投降 (斷纜)？<br><span class="text-sm text-gray-500 dark:text-gray-400">投降後將重新計算雙方連勝/連拉累積。</span>
            </p>
            <div class="flex space-x-4">
                <button id="btn-no-surrender" class="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg text-lg">否 (繼續)</button>
                <button id="btn-yes-surrender" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md">是 (投降)</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-no-surrender').addEventListener('click', async () => {
        closeModal(modal);
        await this.processSurrenders(queue);
    });

    modal.querySelector('#btn-yes-surrender').addEventListener('click', async () => {
        applySurrender(this.gameState, winner.id, loser.id);
        closeModal(modal);
        await this.processSurrenders(queue);
    });
}
