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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; gap: 10px;">
            <button id="upgrades-btn" class="btn" style="width: 130px; font-size: 13px; flex-shrink: 0; padding: 8px 5px; display: flex; align-items: center; justify-content: center;">${upgradeIcon}Upgrades</button>
            
            <div style="flex-grow: 1; text-align: center;">
                <h2 style="margin: 0; font-size: 26px; line-height: 1.1; color: #00ffff; text-shadow: 0 0 10px rgba(0,255,255,0.5);">${isVictory ? 'Victory!' : 'Game Over'}</h2>
                ${isVictory ?
            '<p style="color: #00ff00; font-size: 14px; margin: 3px 0 0 0;">You survived the void!</p>' :
            `<p style="font-size: 14px; color: #ff6666; margin: 3px 0 0 0; opacity: 0.9;">Killed by: <strong style="color: #ff4444;">${causeLabel}</strong></p>`
        }
            </div>

            <button id="view-stats-btn" class="btn" style="width: 130px; font-size: 13px; flex-shrink: 0; padding: 8px 5px; display: flex; align-items: center; justify-content: center;">Stats${statsIcon}</button>
        </div>

        <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
            <h4 style="color: #00ffff; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">Soul Payout</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Directly Collected <span class="help-icon"><div class="tooltip"><strong>Direct Souls</strong>Souls dropped by elite enemies during the run.</div></span></span>
                <span>${game.runSouls || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Kill Bonus <span class="help-icon"><div class="tooltip"><strong>Kill Bonus</strong>You earn 1 Soul per 5 enemies defeated.<div class="example-box">Example: 100 kills = 20 Souls.</div></div></span></span>
                <span>${killBonus}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Level Bonus <span class="help-icon"><div class="tooltip"><strong>Level Bonus</strong>You earn 2 Souls per level reached (starting from Level 2).<div class="example-box">Example: Level 10 = (10-1) * 2 = 18 Souls.</div></div></span></span>
                <span>${levelBonus}</span>
            </div>
            ${isVictory ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #00ff00;">
                <span>Victory Bonus <span class="help-icon"><div class="tooltip"><strong>Victory Bonus</strong>A flat bonus for surviving the full 10 minute invasion.</div></span></span>
                <span>+50</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px solid #555; font-size: 18px; font-weight: bold; color: #b388ff;">
                <span>Earned this Run:</span>
                <span>${runTotal}</span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; color: #888;">
                <span>Existing Bank:</span>
                <span>${previousTotal}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 22px; font-weight: bold; color: #00ffd0; border-top: 1px dashed #444; padding-top: 5px;">
                <span>Grand Total:</span>
                <span>${game.totalSouls}</span>
            </div>
        </div>
        ${game.isCustomGame ? '<p style="color: #ffaa44; font-weight: bold; margin-bottom: 20px; text-shadow: 0 0 5px #000;">⚠️ Custom Game: No souls banked.</p>' : ''}

        <div style="grid-template-columns: 1.2fr 1fr; display: grid; gap: 15px; margin-top: 20px;">
            <button id="gameover-exit-btn" class="btn" style="background: #444; width: 100%; font-size: 18px; font-weight: bold; padding: 15px 0; display: flex; align-items: center; justify-content: center;">${backIcon}Main Menu</button>
            <button id="restart-btn" class="btn btn-large" style="width: 100%; border: 1px solid #00ffff !important; white-space: nowrap; font-size: 20px;">Play Again</button>
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
        if (delta === 0) return ' <span style="color: #888;">(=)</span>';
        const color = (higherIsBetter && delta > 0) || (!higherIsBetter && delta < 0) ? '#00ff00' : '#ff6666';
        const sign = delta > 0 ? '+' : '';
        return ` <span style="color: ${color}; font-size: 0.9em;">(${sign}${delta})</span>`;
    };

    const backIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 6px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

    let html = `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 20px;">
            <button id="view-summary-btn" class="btn" style="width: 200px; font-size: 14px; padding: 10px; display: flex; align-items: center; justify-content: center;">${backIcon}Back to Summary</button>
        </div>

        <h2 style="margin-bottom: 5px;">Run Statistics</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-top: 10px; max-height: 420px; overflow-y: auto; padding-right: 8px;">
            <div>
                <h4 style="color: #00ffff; margin-bottom: 8px;">General Stats</h4>
                <p><strong>Time:</strong> ${minutes}:${secs.toString().padStart(2, '0')}</p>
                <p><strong>Final Wave:</strong> ${game.stats.finalWave}${showDelta(game.stats.finalWave, prevStats?.finalWave)}</p>
                <p><strong>Level:</strong> ${game.player.level}${showDelta(game.player.level, prevStats?.level)}</p>
                <p><strong>Souls Earned:</strong> ${souls}</p>
            </div>
            <div>
                <h4 style="color: #00ffff; margin-bottom: 8px;">Combat Stats</h4>
                <p><strong>Damage Dealt:</strong> ${Math.floor(game.stats.damageDealt).toLocaleString()}${showDelta(Math.floor(game.stats.damageDealt), Math.floor(prevStats?.damageDealt || 0))}</p>
                <p><strong>Accuracy:</strong> ${accuracy}%${showDelta(accuracy, prevStats?.accuracy)}</p>
                <p><strong>Shots:</strong> ${game.stats.shotsHit}/${game.stats.shotsFired}</p>
                <p><strong>Dmg Taken:</strong> ${Math.floor(totalDamageReceived).toLocaleString()}${showDelta(Math.floor(totalDamageReceived), Math.floor(prevStats?.totalDamageReceived || 0), false)}</p>
            </div>

            <div style="grid-column: span 2; margin-top: 5px;">
                <h4 style="color: #00ffff; margin-bottom: 8px; text-align: center;">Enemies Killed</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                    <p style="color: #ff8888;"><strong>Basic:</strong> ${game.stats.enemiesKilled.basic}${showDelta(game.stats.enemiesKilled.basic, prevStats?.enemiesKilled?.basic)}</p>
                    <p style="color: #ff66aa;"><strong>Fast:</strong> ${game.stats.enemiesKilled.fast}${showDelta(game.stats.enemiesKilled.fast, prevStats?.enemiesKilled?.fast)}</p>
                    <p style="color: #cc88cc;"><strong>Tank:</strong> ${game.stats.enemiesKilled.tank}${showDelta(game.stats.enemiesKilled.tank, prevStats?.enemiesKilled?.tank)}</p>
                    <p style="color: #ffaa44;"><strong>Shooter:</strong> ${game.stats.enemiesKilled.shooter}${showDelta(game.stats.enemiesKilled.shooter, prevStats?.enemiesKilled?.shooter)}</p>
                    <p style="color: #66ccff;"><strong>Ice:</strong> ${game.stats.enemiesKilled.ice}${showDelta(game.stats.enemiesKilled.ice, prevStats?.enemiesKilled?.ice)}</p>
                </div>
            </div>

            <div style="grid-column: span 2; margin-top: 5px;">
                <h4 style="color: #00ffff; margin-bottom: 8px; text-align: center;">Damage Received By Type</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 13px; text-align: center;">
                    <p>Basic: ${game.stats.damageReceived.basic}</p>
                    <p>Fast: ${game.stats.damageReceived.fast}</p>
                    <p>Tank: ${game.stats.damageReceived.tank}</p>
                    <p>Shooter: ${game.stats.damageReceived.shooter}</p>
                    <p>Ice: ${game.stats.damageReceived.ice}</p>
                    <p>Bullets: ${game.stats.damageReceived.bullet}</p>
                </div>
            </div>

            ${game.stats.skillsPicked.length > 0 ? `
            <div style="grid-column: span 2; margin-top: 10px;">
                <h4 style="color: #00ffff; margin-bottom: 8px;">Skills Picked</h4>
                <div style="max-height: 120px; overflow-y: auto; font-size: 13px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                        ${game.stats.skillsPicked.map(s => `<div><strong>Lv${s.level}:</strong> ${s.skill}</div>`).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; margin-top: 20px;">
            <button id="gameover-exit-btn" class="btn" style="background: #444; width: 100%; font-size: 18px; font-weight: bold; padding: 15px 0; display: flex; align-items: center; justify-content: center;">${backIcon}Main Menu</button>
            <button id="restart-btn" class="btn btn-large" style="width: 100%; border: 1px solid #00ffff !important; white-space: nowrap; font-size: 20px;">Play Again</button>
        </div>
    `;

    return html;
}
