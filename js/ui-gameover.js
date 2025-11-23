// ==================== GAME OVER SCREEN ====================

export function showGameOverStats(game, souls, isVictory = false) {
    // Load previous run stats
    const prevStats = game.loadPreviousStats();

    // Save current run stats
    game.saveCurrentStats();

    const modal = document.getElementById('gameover-modal');
    const statsDiv = document.getElementById('final-stats');

    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const accuracy = game.stats.shotsFired > 0
        ? Math.round((game.stats.shotsHit / game.stats.shotsFired) * 100)
        : 0;

    const totalDamageReceived = Object.values(game.stats.damageReceived).reduce((a, b) => a + b, 0);

    // Helper function to show comparison
    const showDelta = (current, previous, higherIsBetter = true) => {
        if (!previous && previous !== 0) return '';
        const delta = Math.round(current - previous);
        if (delta === 0) return ' <span style="color: #888;">(=)</span>';
        const color = (higherIsBetter && delta > 0) || (!higherIsBetter && delta < 0) ? '#00ff00' : '#ff6666';
        const sign = delta > 0 ? '+' : '';
        return ` <span style="color: ${color};">(${sign}${delta})</span>`;
    };

    let html = isVictory ? '<h3 style="color: #00ff00;">VICTORY!</h3><p>You survived 10 minutes!</p>' : '';

    html += `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-top: 15px;">
            <div>
                <h4 style="color: #00ffff; margin-bottom: 10px;">General Stats</h4>
                <p><strong>Time:</strong> ${minutes}:${secs.toString().padStart(2, '0')}</p>
                <p><strong>Final Wave:</strong> ${game.stats.finalWave}${showDelta(game.stats.finalWave, prevStats?.finalWave)}</p>
                <p><strong>Level:</strong> ${game.player.level}${showDelta(game.player.level, prevStats?.level)}</p>
                <p><strong>Souls:</strong> ${souls}</p>
            </div>
            <div>
                <h4 style="color: #00ffff; margin-bottom: 10px;">Combat Stats</h4>
                <p><strong>Damage Dealt:</strong> ${Math.floor(game.stats.damageDealt).toLocaleString()}${showDelta(Math.floor(game.stats.damageDealt), Math.floor(prevStats?.damageDealt || 0))}</p>
                <p><strong>Accuracy:</strong> ${accuracy}%${showDelta(accuracy, prevStats?.accuracy)}</p>
                <p><strong>Shots:</strong> ${game.stats.shotsHit}/${game.stats.shotsFired}</p>
                <p><strong>Dmg Taken:</strong> ${Math.floor(totalDamageReceived).toLocaleString()}${showDelta(Math.floor(totalDamageReceived), Math.floor(prevStats?.totalDamageReceived || 0), false)}</p>
            </div>
        </div>

        <div style="margin-top: 15px;">
            <h4 style="color: #00ffff; margin-bottom: 10px;">Enemies Killed</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                <div>
                    <p style="color: #ff8888;"><strong>Basic:</strong> ${game.stats.enemiesKilled.basic}${showDelta(game.stats.enemiesKilled.basic, prevStats?.enemiesKilled?.basic)}</p>
                </div>
                <div>
                    <p style="color: #ff66aa;"><strong>Fast:</strong> ${game.stats.enemiesKilled.fast}${showDelta(game.stats.enemiesKilled.fast, prevStats?.enemiesKilled?.fast)}</p>
                </div>
                <div>
                    <p style="color: #cc88cc;"><strong>Tank:</strong> ${game.stats.enemiesKilled.tank}${showDelta(game.stats.enemiesKilled.tank, prevStats?.enemiesKilled?.tank)}</p>
                </div>
                <div>
                    <p style="color: #ffaa44;"><strong>Shooter:</strong> ${game.stats.enemiesKilled.shooter}${showDelta(game.stats.enemiesKilled.shooter, prevStats?.enemiesKilled?.shooter)}</p>
                </div>
                <div>
                    <p style="color: #66ccff;"><strong>Ice:</strong> ${game.stats.enemiesKilled.ice}${showDelta(game.stats.enemiesKilled.ice, prevStats?.enemiesKilled?.ice)}</p>
                </div>
            </div>
        </div>

        <div style="margin-top: 15px;">
            <h4 style="color: #00ffff; margin-bottom: 10px;">Damage Received By Type</h4>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; font-size: 12px;">
                <p><strong>Basic:</strong> ${game.stats.damageReceived.basic}</p>
                <p><strong>Fast:</strong> ${game.stats.damageReceived.fast}</p>
                <p><strong>Tank:</strong> ${game.stats.damageReceived.tank}</p>
                <p><strong>Shooter:</strong> ${game.stats.damageReceived.shooter}</p>
                <p><strong>Ice:</strong> ${game.stats.damageReceived.ice}</p>
                <p><strong>Bullets:</strong> ${game.stats.damageReceived.bullet}</p>
            </div>
        </div>

        ${game.stats.skillsPicked.length > 0 ? `
            <div style="margin-top: 15px;">
                <h4 style="color: #00ffff; margin-bottom: 10px;">Skills Picked</h4>
                <div style="max-height: 100px; overflow-y: auto; font-size: 12px;">
                    ${game.stats.skillsPicked.map(s => `<p>Lv${s.level}: ${s.skill}</p>`).join('')}
                </div>
            </div>
        ` : ''}
    `;

    statsDiv.innerHTML = html;
    modal.classList.remove('hidden');
}
