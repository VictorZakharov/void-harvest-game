// ==================== GAME OVER SCREEN ====================

export function showGameOverStats(game, dom, souls, isVictory = false) {
    // Load previous run stats
    const prevStats = game.loadPreviousStats();

    // Save current run stats
    game.saveCurrentStats();

    let currentView = 'summary';

    const render = () => {
        let html = '';
        if (currentView === 'summary') {
            html = renderSummaryView(game, souls, isVictory);
        } else {
            html = renderStatsView(game, prevStats, souls, isVictory);
        }

        // Use gameover-content (from index.html updated source) or fallback to finalStats
        const container = document.getElementById('gameover-content') || dom.finalStats;
        if (container) {
            container.innerHTML = html;
            attachEventListeners(game, container);
        }
    };

    // Initial render
    render();
    dom.show(dom.gameoverModal);

    function attachEventListeners(game, container) {
        const statsBtn = container.querySelector('#view-stats-btn');
        if (statsBtn) {
            statsBtn.onclick = () => {
                currentView = 'stats';
                render();
            };
        }

        const summaryBtn = container.querySelector('#view-summary-btn');
        if (summaryBtn) {
            summaryBtn.onclick = () => {
                currentView = 'summary';
                render();
            };
        }

        const restartBtn = container.querySelector('#restart-btn');
        if (restartBtn) {
            restartBtn.onclick = () => {
                dom.hide(dom.gameoverModal);
                game.sessionManager.start();
            };
        }

        const upgradesBtn = container.querySelector('#upgrades-btn');
        if (upgradesBtn) {
            upgradesBtn.onclick = () => {
                dom.hide(dom.gameoverModal);
                if (game.ui && game.ui.showMetaUpgrades) {
                    game.ui.showMetaUpgrades();
                }
            };
        }

        const exitBtn = container.querySelector('#gameover-exit-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                dom.hide(dom.gameoverModal);
                game.reset();
                game.state = 'start';
                dom.show(dom.startScreen);
                if (game.ui && game.ui.updateMainMenuSouls) {
                    game.ui.updateMainMenuSouls();
                }
            };
        }
    }
}

function renderSummaryView(game, souls, isVictory) {
    const causeNames = {
        'basic': 'Basic Swarmer',
        'fast': 'Fast Scouter',
        'tank': 'Heavy Tank',
        'shooter': 'Void Shooter',
        'ice': 'Ice Stalker',
        'bullet': 'Enemy Projectile',
        'friendly': 'Friendly Fire'
    };

    const killedBy = game.player.killedBy;
    const causeLabel = killedBy ? (causeNames[killedBy] || killedBy) : 'Unknown Void Entity';

    const killBonus = Math.floor(game.kills / 5);
    const levelBonus = Math.max(0, (game.player.level - 1) * 2);
    const victoryBonus = isVictory ? 50 : 0;
    const runTotal = game.isCustomGame ? 0 : (game.runSouls || 0) + killBonus + levelBonus + victoryBonus;
    const previousTotal = game.totalSouls - runTotal;

    // Icons
    const upgradeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 6px;"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    const backIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 6px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
    const statsIcon = `<span style="margin-left: 6px;">📊</span>`;

    return `
        <div class="go-header">
            <button id="upgrades-btn" class="btn">${upgradeIcon}Upgrades</button>

            <div class="go-title">
                <h2 class="${isVictory ? 'victory' : ''}">${isVictory ? 'Victory' : 'Game Over'}</h2>
                ${isVictory ?
            '<p class="go-subtitle victory">You survived the void!</p>' :
            `<p class="go-subtitle">Killed by: <strong>${causeLabel}</strong></p>`
        }
            </div>

            <button id="view-stats-btn" class="btn">Stats${statsIcon}</button>
        </div>

        <div class="go-panel">
            <div class="go-panel-title">Soul Payout</div>
            <div class="go-row">
                <span>Directly Collected <span class="help-icon"><div class="tooltip"><strong>Direct Souls</strong>Souls dropped by elite enemies during the run.</div></span></span>
                <span class="go-value">${game.runSouls || 0}</span>
            </div>
            <div class="go-row">
                <span>Kill Bonus <span class="help-icon"><div class="tooltip"><strong>Kill Bonus</strong>You earn 1 Soul per 5 enemies defeated.<div class="example-box">Example: 100 kills = 20 Souls.</div></div></span></span>
                <span class="go-value">${killBonus}</span>
            </div>
            <div class="go-row">
                <span>Level Bonus <span class="help-icon"><div class="tooltip"><strong>Level Bonus</strong>You earn 2 Souls per level reached (starting from Level 2).<div class="example-box">Example: Level 10 = (10-1) * 2 = 18 Souls.</div></div></span></span>
                <span class="go-value">${levelBonus}</span>
            </div>
            ${isVictory ? `
            <div class="go-row bonus">
                <span>Victory Bonus <span class="help-icon"><div class="tooltip"><strong>Victory Bonus</strong>A flat bonus for surviving the full 10 minute invasion.</div></span></span>
                <span class="go-value">+50</span>
            </div>
            ` : ''}
            <div class="go-row total">
                <span>Earned this Run</span>
                <span class="go-value">${runTotal}</span>
            </div>
            <div class="go-row bank">
                <span>Existing Bank</span>
                <span class="go-value">${previousTotal}</span>
            </div>
            <div class="go-row grand">
                <span>Grand Total</span>
                <span class="go-value">${game.totalSouls}</span>
            </div>
        </div>
        ${game.isCustomGame ? '<p class="go-custom-warning">⚠️ Custom Game: No souls banked.</p>' : ''}

        <div class="go-actions">
            <button id="gameover-exit-btn" class="btn">${backIcon}Main Menu</button>
            <button id="restart-btn" class="btn btn-large">Play Again</button>
        </div>
    `;
}

function renderStatsView(game, prevStats, souls, isVictory) {
    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const accuracy = game.stats.shotsFired > 0
        ? Math.round((game.stats.shotsHit / game.stats.shotsFired) * 100)
        : 0;

    const totalDamageReceived = Object.values(game.stats.damageReceived).reduce((a, b) => a + b, 0);

    const showDelta = (current, previous, higherIsBetter = true) => {
        if (!previous && previous !== 0) return '';
        const delta = Math.round(current - previous);
        if (delta === 0) return ' <span class="go-delta same">(=)</span>';
        const better = (higherIsBetter && delta > 0) || (!higherIsBetter && delta < 0);
        const sign = delta > 0 ? '+' : '';
        return ` <span class="go-delta ${better ? 'up' : 'down'}">(${sign}${delta})</span>`;
    };

    const statCell = (label, value) => `
        <div class="go-stat">
            <span class="go-stat-label">${label}</span>
            <span class="go-stat-value">${value}</span>
        </div>`;

    const enemyChip = (type, label, value) => `
        <span class="enemy-indicator ${type}"><span class="dot"></span>${label} <span class="count">${value}</span></span>`;

    const backIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 6px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

    const ek = game.stats.enemiesKilled;
    const dr = game.stats.damageReceived;
    const pk = prevStats?.enemiesKilled;

    let html = `
        <div class="go-header">
            <button id="view-summary-btn" class="btn" style="width: 200px;">${backIcon}Back to Summary</button>

            <div class="go-title">
                <h2>Run Statistics</h2>
            </div>

            <div style="width: 200px; flex-shrink: 0;"></div>
        </div>

        <div class="go-stats-scroll">
            <div class="go-stats-columns">
                <div class="go-panel" style="margin-bottom: 0;">
                    <div class="go-panel-title">General</div>
                    ${statCell('Time', `${minutes}:${secs.toString().padStart(2, '0')}`)}
                    ${statCell('Final Wave', `${game.stats.finalWave}${showDelta(game.stats.finalWave, prevStats?.finalWave)}`)}
                    ${statCell('Level', `${game.player.level}${showDelta(game.player.level, prevStats?.level)}`)}
                    ${statCell('Souls Earned', souls)}
                </div>
                <div class="go-panel" style="margin-bottom: 0;">
                    <div class="go-panel-title">Combat</div>
                    ${statCell('Damage Dealt', `${Math.floor(game.stats.damageDealt).toLocaleString()}${showDelta(Math.floor(game.stats.damageDealt), Math.floor(prevStats?.damageDealt || 0))}`)}
                    ${statCell('Accuracy', `${accuracy}%${showDelta(accuracy, prevStats?.accuracy)}`)}
                    ${statCell('Shots', `${game.stats.shotsHit}/${game.stats.shotsFired}`)}
                    ${statCell('Dmg Taken', `${Math.floor(totalDamageReceived).toLocaleString()}${showDelta(Math.floor(totalDamageReceived), Math.floor(prevStats?.totalDamageReceived || 0), false)}`)}
                </div>
            </div>

            <div class="go-panel" style="margin-top: 14px;">
                <div class="go-panel-title" style="text-align: center;">Enemies Killed</div>
                <div class="go-chips">
                    ${enemyChip('basic', 'Basic', `${ek.basic}${showDelta(ek.basic, pk?.basic)}`)}
                    ${enemyChip('fast', 'Fast', `${ek.fast}${showDelta(ek.fast, pk?.fast)}`)}
                    ${enemyChip('tank', 'Tank', `${ek.tank}${showDelta(ek.tank, pk?.tank)}`)}
                    ${enemyChip('shooter', 'Shooter', `${ek.shooter}${showDelta(ek.shooter, pk?.shooter)}`)}
                    ${enemyChip('ice', 'Ice', `${ek.ice}${showDelta(ek.ice, pk?.ice)}`)}
                </div>
            </div>

            <div class="go-panel" style="margin-top: 14px; margin-bottom: 0;">
                <div class="go-panel-title" style="text-align: center;">Damage Received By Type</div>
                <div class="go-chips">
                    ${enemyChip('basic', 'Basic', dr.basic)}
                    ${enemyChip('fast', 'Fast', dr.fast)}
                    ${enemyChip('tank', 'Tank', dr.tank)}
                    ${enemyChip('shooter', 'Shooter', dr.shooter)}
                    ${enemyChip('ice', 'Ice', dr.ice)}
                    ${enemyChip('shooter', 'Bullets', dr.bullet)}
                </div>
            </div>

            ${game.stats.skillsPicked.length > 0 ? `
            <div class="go-panel" style="margin-top: 14px; margin-bottom: 0;">
                <div class="go-panel-title">Skills Picked</div>
                <div class="go-skill-list">
                    ${game.stats.skillsPicked.map(s => `<div><strong>Lv${s.level}</strong> ${s.skill}</div>`).join('')}
                </div>
            </div>
            ` : ''}
        </div>

        <div class="go-actions">
            <button id="gameover-exit-btn" class="btn">${backIcon}Main Menu</button>
            <button id="restart-btn" class="btn btn-large">Play Again</button>
        </div>
    `;

    return html;
}
