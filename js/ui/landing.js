// Automatically extracted UI module

export async function renderLanding() {
        let matches = await idbKeyval.get('mahjong_app_matches') || [];
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
                if (m.players && m.players.includes('\n')) {
                    const parsed = m.players.split('\n');
                    rows = [
                        parsed[0].replace(' | ', ' 　'), 
                        parsed[1].replace(' | ', ' 　')
                    ];
                } else if (m.players && m.players.split(' | ').length === 4) {
                    const parts = m.players.split(' | ');
                    rows = [
                        `${parts[0]} 　${parts[1]}`,
                        `${parts[2]} 　${parts[3]}`
                    ];
                } else {
                    rows = [m.players || 'Unknown Players']; // Ultimate fallback
                }

                return `
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 flex flex-col mb-3 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors match-item" data-match-id="${m.id}">
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
            <div class="min-h-screen flex flex-col items-center justify-start safe-pt-landing safe-pb bg-gray-200 dark:bg-gray-900 overflow-y-auto w-full transition-colors duration-200">
                <button id="theme-toggle-btn" class="absolute safe-top-btn right-4 p-2 rounded-full bg-gray-50 dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    ${isDark ? '☀️' : '🌙'}
                </button>
                <h1 class="text-4xl font-black mb-2 text-center text-gray-800 dark:text-gray-100 tracking-tight">Score Keeper</h1>
                <p class="text-gray-500 dark:text-gray-400 mb-1 font-medium">Taiwan Mahjong</p>
                <div class="text-[10px] text-gray-400 dark:text-gray-500 mb-10 font-mono">v${this.version}</div>
                
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
                    
                    <div class="flex items-center justify-between mt-8 mb-4">
                        <h2 class="text-2xl font-bold text-gray-700 dark:text-gray-300">歷史牌局 (Match History)</h2>
                        <span class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full text-sm font-bold transition-colors">${matches.length}</span>
                    </div>
                    <div id="match-list" class="space-y-3 pb-8 w-full">
                        ${matchesHTML}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('theme-toggle-btn').addEventListener('click', async () => {
            this.toggleTheme();
            await this.renderLanding(); // Re-render to update the icon
        });

        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        
        const fileInput = document.getElementById('import-match-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const importedState = JSON.parse(event.target.result);
                        if (!importedState.matchId || !importedState.players || !importedState.gameHistory) {
                            alert('無效的牌局檔案 (Invalid match file).');
                            return;
                        }
                        
                        // Treat the imported game as a cloned new match to avoid ID collisions
                        importedState.matchId = Date.now().toString();
                        
                        // Automatically recalculate using the file's own settings to ensure parity
                        this.recalculateHistory(importedState);
                        
                        // Force save it into the system
                        this.gameState = importedState;
                        this.undoStack = []; // Reset undo stack since it's a new unique instance
                        await this._saveGame();
                        
                        // Clear any potential legacy undo data
                        await idbKeyval.set(`mahjong_app_undo_${importedState.matchId}`, this.undoStack);
                        
                        await this.renderLanding();
                        this.showNotification('牌局匯入成功！ (Match imported successfully!)');
                    } catch (err) {
                        this.showNotification('讀取檔案失敗 (Failed to parse JSON file).', 'error');
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
    }

