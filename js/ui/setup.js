// Automatically extracted UI module

export function startNewGame() {
        // We will generate the matchId when they finish setup.
        this.undoStack = [];

        // Shuffle icons for random assignment
        const shuffledIcons = [...this.icons].sort(() => 0.5 - Math.random());

        // Attempt to find the last match metadata for defaults
        let lastPlayers = null;
        let lastConfig = {
            baseScoreDi: 5,
            decimalRounding: 'integer',
            roundingAdvantage: 'winner'
        };

        try {
            const matches = JSON.parse(localStorage.getItem('mahjong_app_matches') || '[]');
            if (matches.length > 0) {
                matches.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
                
                const latestMatchId = matches[0].id;
                const latestMatchData = localStorage.getItem(`mahjong_app_match_${latestMatchId}`);
                if (latestMatchData) {
                    const parsed = JSON.parse(latestMatchData);
                    if (parsed) {
                        if (parsed.players) lastPlayers = parsed.players;
                        if (parsed.config) {
                            lastConfig.baseScoreDi = parsed.config.baseScoreDi !== undefined ? parsed.config.baseScoreDi : 5;
                            lastConfig.decimalRounding = parsed.config.decimalRounding || 'integer';
                            lastConfig.roundingAdvantage = parsed.config.roundingAdvantage || 'winner';
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load last game defaults:", e);
        }

        this.gameState = {
            players: lastPlayers ? lastPlayers.map((p, i) => ({
                id: i + 1,
                name: p.name,
                icon: p.icon,
                score: 0
            })) : [
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
                ...lastConfig
            }
        };
        this.renderSetupModal();
    }

export function renderSetupModal() {
        let draggedIndex = null; // Declare draggedIndex in the outer scope
        const modal = document.createElement('div');
        modal.id = 'setup-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg overflow-y-auto overflow-x-hidden transition-colors text-gray-800 dark:text-gray-100" style="max-height: 90vh;">
                <h1 class="text-2xl font-bold text-center mb-4">Game Setup</h1>
                
                <datalist id="player-history-list">
                    ${(this.playerHistory || []).map(name => `<option value="${name}">`).join('')}
                </datalist>

                ${this.gameState.players.map((p, index) => `
                    <div class="grid grid-cols-4 gap-2 items-center mb-3">
                        <input type="text" list="player-history-list" value="${p.name}" data-player-id="${p.id}" maxlength="10" class="p-2 border dark:border-gray-600 rounded col-span-2 player-name-input bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" autocomplete="off" placeholder="Player ${index + 1}">
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
                            <input type="number" id="base-score-di" value="${this.gameState.config.baseScoreDi !== undefined ? this.gameState.config.baseScoreDi : 5}" class="p-2 border dark:border-gray-600 rounded w-16 text-center font-bold bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" min="0" step="1">
                        </div>
                        <div class="flex flex-col items-center">
                            <h2 class="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1 leading-tight text-center transition-colors">小數處理<br>(Rounding)</h2>
                            <select id="decimal-rounding" class="p-2 border dark:border-gray-600 rounded w-24 text-center font-bold text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
                                <option value="0.1" ${this.gameState.config.decimalRounding === '0.1' ? 'selected' : ''}>取至0.1</option>
                                <option value="0.5" ${this.gameState.config.decimalRounding === '0.5' ? 'selected' : ''}>取至0.5</option>
                                <option value="integer" ${this.gameState.config.decimalRounding === 'integer' || this.gameState.config.decimalRounding === undefined ? 'selected' : ''}>取整數</option>
                            </select>
                        </div>
                        <div class="flex flex-col items-center">
                            <h2 class="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1 leading-tight text-center transition-colors">進位優勢<br>(Advantage)</h2>
                            <select id="rounding-advantage" class="p-2 border dark:border-gray-600 rounded w-24 text-center font-bold text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors">
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
            input.addEventListener('focus', e => {
                e.target.select();
            });

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
             
             if (playerNames.some(name => name.length === 0)) {
                 alert('錯誤：玩家名稱不能為空。(Error: Player names cannot be empty.)');
                 return;
             }

             if (playerNames.some(name => name.length > 10)) {
                 alert('錯誤：玩家名稱長度不能超過 10 個字元。(Error: Player name is too long.)');
                 return;
             }

             if (new Set(playerNames).size !== playerNames.length) {
                 alert('錯誤：玩家名稱不可重複。(Error: Player names must be unique.)');
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

        const diInput = document.getElementById('base-score-di');
        if (diInput) diInput.addEventListener('focus', e => e.target.select());

        this._updateSeatingDisplay();
        this._updateIconPickers(); 
    }

export function _updateIconPickers() {
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
    }

export function _updateSeatingDisplay() {
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
    }

