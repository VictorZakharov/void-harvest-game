// ==================== UI MANAGEMENT ====================
import { SKILLS, META_UPGRADES } from './skills.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.customSkills = {}; // Store selected skill levels {skillId: level}
        this.customEnemies = { // Store selected enemy types
            basic: true,
            fast: true,
            tank: true,
            shooter: true,
            ice: true
        };
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.getElementById('start-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.game.start();
        };

        document.getElementById('meta-btn').onclick = () => {
            this.showMetaUpgrades();
        };

        document.getElementById('guide-btn').onclick = () => {
            this.showGuide();
        };

        document.getElementById('close-guide-btn').onclick = () => {
            document.getElementById('guide-modal').classList.add('hidden');

            // Return to start screen
            if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        document.getElementById('close-guide-x').onclick = () => {
            document.getElementById('guide-modal').classList.add('hidden');

            // Return to start screen
            if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        document.getElementById('custom-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.renderCustomEnemySelection();
            this.renderCustomSkillSelection();
            document.getElementById('custom-modal').classList.remove('hidden');
        };

        document.getElementById('start-custom-btn').onclick = () => {
            // Check that at least one type is selected
            if (!Object.values(this.customEnemies).some(v => v)) {
                alert('Please select at least one enemy type!');
                return;
            }

            document.getElementById('custom-modal').classList.add('hidden');
            this.game.customEnemies = { ...this.customEnemies };
            this.game.customSkills = { ...this.customSkills }; // Pass selected skills
            this.game.start();
        };

        document.getElementById('cancel-custom-btn').onclick = () => {
            document.getElementById('custom-modal').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        };

        document.getElementById('restart-btn').onclick = () => {
            document.getElementById('gameover-modal').classList.add('hidden');

            // If custom game, return to custom config screen
            if (this.game.customEnemies) {
                const wasCustom = this.game.customEnemies;
                this.game.reset();

                // Restore enemy selection
                this.customEnemies = { ...wasCustom };
                this.renderCustomEnemySelection();
                this.renderCustomSkillSelection();

                document.getElementById('custom-modal').classList.remove('hidden');
            } else {
                this.game.reset();
                this.game.start();
            }
        };

        document.getElementById('upgrades-btn').onclick = () => {
            document.getElementById('gameover-modal').classList.add('hidden');
            this.showMetaUpgrades();
        };

        document.getElementById('close-meta-btn').onclick = () => {
            document.getElementById('meta-modal').classList.add('hidden');

            // Return to appropriate screen
            if (this.game.state === 'gameover') {
                document.getElementById('gameover-modal').classList.remove('hidden');
            } else if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        // Pause screen buttons
        document.getElementById('resume-btn').onclick = () => {
            this.resumeGame();
        };

        document.getElementById('restart-pause-btn').onclick = () => {
            document.getElementById('pause-modal').classList.add('hidden');

            // If custom game, return to custom config screen
            if (this.game.customEnemies) {
                const wasCustom = this.game.customEnemies;
                this.game.reset();

                // Restore enemy selection
                this.customEnemies = { ...wasCustom };
                this.renderCustomEnemySelection();
                this.renderCustomSkillSelection();

                document.getElementById('custom-modal').classList.remove('hidden');
            } else {
                this.game.reset();
                this.game.start();
            }
        };

        document.getElementById('exit-pause-btn').onclick = () => {
            document.getElementById('pause-modal').classList.add('hidden');
            this.game.reset();
            this.game.state = 'start';
            document.getElementById('start-screen').classList.remove('hidden');
        };
    }

    updateHUD() {
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        const xpBar = document.getElementById('xp-bar');
        const levelText = document.getElementById('level-text');
        const timeText = document.getElementById('time-text');
        const killsText = document.getElementById('kills-text');
        const waveText = document.getElementById('wave-text');

        const healthPercent = (this.game.player.health / this.game.player.maxHealth) * 100;
        healthBar.style.width = healthPercent + '%';
        healthText.textContent = `${Math.max(0, Math.floor(this.game.player.health))}/${this.game.player.maxHealth}`;

        const xpPercent = (this.game.player.xp / this.game.player.xpToLevel) * 100;
        xpBar.style.width = xpPercent + '%';
        levelText.textContent = `Lv ${this.game.player.level}`;

        const seconds = Math.floor(this.game.gameTime / 60);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timeText.textContent = `Time: ${minutes}:${secs.toString().padStart(2, '0')}`;

        killsText.textContent = `Kills: ${this.game.kills}`;

        // Determine which enemies can spawn this wave
        const wave = this.game.wave;
        let enemyIcons = '';

        // Custom game mode: show only enabled enemies
        if (this.game.customEnemies) {
            if (this.game.customEnemies.basic) {
                enemyIcons += '<span style="color: #ff3333;">●</span> '; // Basic
            }
            if (this.game.customEnemies.fast) {
                enemyIcons += '<span style="color: #ff66aa;">●</span> '; // Fast
            }
            if (this.game.customEnemies.shooter) {
                enemyIcons += '<span style="color: #ffaa44;">●</span> '; // Shooter
            }
            if (this.game.customEnemies.tank) {
                enemyIcons += '<span style="color: #cc88cc;">●</span> '; // Tank
            }
            if (this.game.customEnemies.ice) {
                enemyIcons += '<span style="color: #66ccff;">●</span> '; // Ice
            }
            enemyIcons = enemyIcons.trim();
        } else {
            // Normal mode: show enemies based on wave progression
            enemyIcons = '<span style="color: #ff3333;">●</span>'; // Basic (always)

            if (wave >= 3) {
                enemyIcons += ' <span style="color: #ff66aa;">●</span>'; // Fast
            }
            if (wave >= 5) {
                enemyIcons += ' <span style="color: #ffaa44;">●</span>'; // Shooter
            }
            if (wave >= 7) {
                enemyIcons += ' <span style="color: #cc88cc;">●</span>'; // Tank
            }
            if (wave >= 8) {
                enemyIcons += ' <span style="color: #66ccff;">●</span>'; // Ice
            }
        }

        waveText.innerHTML = `Wave: ${this.game.wave} ${enemyIcons}`;

        // Update status effects
        const statusEffectsContainer = document.getElementById('status-effects');
        statusEffectsContainer.innerHTML = '';

        // Ice slow effect
        if (this.game.player.slowEffects.length > 0) {
            const iceEffect = document.createElement('div');
            iceEffect.className = 'status-effect ice';
            iceEffect.textContent = `❄ ${this.game.player.slowEffects.length}`;
            iceEffect.title = `Slowed ${Math.round(this.game.player.slowEffects.reduce((sum, e) => sum + e.amount, 0) * 100)}%`;
            statusEffectsContainer.appendChild(iceEffect);
        }

        // Passive Heal (Regen)
        const regenLevel = this.game.player.skills.regen || 0;
        if (regenLevel > 0) {
            const regenSkill = SKILLS.find(s => s.id === 'regen');
            const regenEffect = document.createElement('div');
            regenEffect.className = 'status-effect passive';
            regenEffect.innerHTML = `<div class="status-icon">${regenSkill.icon}</div><span class="status-level">${regenLevel}</span>`;
            regenEffect.title = `Passive Heal: ${this.game.player.healthRegen} HP per second`;
            statusEffectsContainer.appendChild(regenEffect);
        }

        // Vampiric Touch
        const vampireLevel = this.game.player.skills.vampire || 0;
        if (vampireLevel > 0) {
            const vampireSkill = SKILLS.find(s => s.id === 'vampire');
            const vampireEffect = document.createElement('div');
            vampireEffect.className = 'status-effect passive';
            vampireEffect.innerHTML = `<div class="status-icon">${vampireSkill.icon}</div><span class="status-level">${vampireLevel}</span>`;
            vampireEffect.title = `Vampiric Touch: ${this.game.player.vampire} HP per kill`;
            statusEffectsContainer.appendChild(vampireEffect);
        }

        // Armor
        const armorLevel = this.game.player.skills.armor || 0;
        if (armorLevel > 0) {
            const armorSkill = SKILLS.find(s => s.id === 'armor');
            const armorEffect = document.createElement('div');
            armorEffect.className = 'status-effect passive';
            armorEffect.innerHTML = `<div class="status-icon">${armorSkill.icon}</div><span class="status-level">${armorLevel}</span>`;
            armorEffect.title = `Armor: -${this.game.player.armor} damage reduction`;
            statusEffectsContainer.appendChild(armorEffect);
        }

        // Berserk Mode (only show when active)
        const berserkLevel = this.game.player.skills.berserk || 0;
        if (berserkLevel > 0) {
            const healthPercent = this.game.player.health / this.game.player.maxHealth;
            const berserkThreshold = this.game.player.berserkBonus * 0.1 + 0.05;
            if (healthPercent <= berserkThreshold) {
                const berserkSkill = SKILLS.find(s => s.id === 'berserk');
                const berserkEffect = document.createElement('div');
                berserkEffect.className = 'status-effect passive';
                const damageBonus = Math.round(this.game.player.berserkBonus * 100);
                berserkEffect.innerHTML = `<div class="status-icon">${berserkSkill.icon}</div><span class="status-level">${berserkLevel}</span>`;
                berserkEffect.title = `Berserk Mode: +${damageBonus}% damage`;
                statusEffectsContainer.appendChild(berserkEffect);
            }
        }

        // Update active skills
        const activeSkillsContainer = document.getElementById('active-skills');
        activeSkillsContainer.innerHTML = '';

        // Separate skills into custom (grey) and earned (colored)
        const customSkills = [];
        const earnedSkills = [];

        for (let skillId in this.game.player.skills) {
            const level = this.game.player.skills[skillId];
            if (level > 0) {
                const skillDef = SKILLS.find(s => s.id === skillId);
                if (skillDef) {
                    const isCustomSkill = this.game.customSkillIds && this.game.customSkillIds.has(skillId);
                    if (isCustomSkill) {
                        customSkills.push({ skillId, level, skillDef });
                    } else {
                        earnedSkills.push({ skillId, level, skillDef });
                    }
                }
            }
        }

        // Display earned skills first, then custom skills (reversed due to flex-direction: row-reverse)
        // This results in: grey custom skills on left, colored earned skills on right
        [...earnedSkills, ...customSkills].forEach(({ skillId, level, skillDef }) => {
            const skillBadge = document.createElement('div');
            const isCustomSkill = this.game.customSkillIds && this.game.customSkillIds.has(skillId);
            skillBadge.className = isCustomSkill ? 'active-skill custom-skill' : 'active-skill';

            skillBadge.innerHTML = `
                <div class="skill-icon">
                    ${skillDef.icon}
                    <div class="active-skill-level">${level}</div>
                </div>
            `;
            skillBadge.title = `${skillDef.name} (Level ${level}/${skillDef.maxLevel})${isCustomSkill ? ' - Starting skill' : ''}`;
            activeSkillsContainer.appendChild(skillBadge);
        });
    }

    showLevelUpScreen() {
        this.game.state = 'paused';

        // Determine number of choices (3 by default, 4 if player has Extra Choice)
        const numChoices = this.game.player.extraChoice ? 4 : 3;

        // Filter out skills that have reached max level
        const available = SKILLS.filter(skill => {
            const currentLevel = this.game.player.skills[skill.id] || 0;
            return currentLevel < (skill.maxLevel || Infinity);
        });

        // Choose random skills
        const choices = [];
        const tempAvailable = [...available];
        for (let i = 0; i < numChoices; i++) {
            if (tempAvailable.length === 0) break;
            const index = Math.floor(Math.random() * tempAvailable.length);
            choices.push(tempAvailable.splice(index, 1)[0]);
        }

        // Display choices
        const modal = document.getElementById('levelup-modal');
        const choicesContainer = document.getElementById('skill-choices');
        choicesContainer.innerHTML = '';

        choices.forEach(skill => {
            const currentLevel = this.game.player.skills[skill.id] || 0;
            const nextLevel = currentLevel + 1;

            // Build description based on skill
            const space = skill.unit === '%' ? '' : ' ';
            let description = `+${skill.baseValue}${space}${skill.unit}`;
            if (skill.unit === 'projectile') {
                // Projectile count includes base of 1
                const currentValue = 1 + (currentLevel * skill.baseValue);
                const nextValue = 1 + (nextLevel * skill.baseValue);
                description = currentLevel > 0
                    ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}s`
                    : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
            } else if (skill.unit === 'pierce') {
                // Pierce shows just the count (no base)
                const currentValue = currentLevel * skill.baseValue;
                const nextValue = nextLevel * skill.baseValue;
                description = currentLevel > 0
                    ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}`
                    : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
            } else if (currentLevel > 0) {
                // For percentages and other stats
                const currentValue = currentLevel * skill.baseValue;
                const nextValue = nextLevel * skill.baseValue;
                description = `${currentValue}${space}${skill.unit} → <span style="color: #00ff00; font-weight: bold;">${nextValue}${space}${skill.unit}</span>`;
            }

            const div = document.createElement('div');
            div.className = 'skill-option';
            div.innerHTML = `
                <div class="skill-icon">
                    ${skill.icon}
                    ${currentLevel > 0 ? `<div class="skill-level">${currentLevel}</div>` : ''}
                </div>
                <div class="skill-info">
                    <h3>${skill.name}</h3>
                    <p>${description}</p>
                </div>
            `;
            div.onclick = () => {
                skill.apply(this.game.player);
                // Track skill selection
                this.game.stats.skillsPicked.push({
                    level: this.game.player.level,
                    skill: skill.name
                });
                // Remove from custom skills set when upgraded during run
                if (this.game.customSkillIds && this.game.customSkillIds.has(skill.id)) {
                    this.game.customSkillIds.delete(skill.id);
                }
                // Update HUD immediately to show new skill
                this.updateHUD();
                modal.classList.add('hidden');
                this.game.state = 'frozen'; // Freeze game to give player a breather
                this.game.lastTime = performance.now(); // Reset time to avoid time jump
            };
            choicesContainer.appendChild(div);
        });

        modal.classList.remove('hidden');
    }

    showGameOverStats(souls, isVictory = false) {
        // Load previous run stats
        const prevStats = this.game.loadPreviousStats();

        // Save current run stats
        this.game.saveCurrentStats();

        const modal = document.getElementById('gameover-modal');
        const statsDiv = document.getElementById('final-stats');

        const seconds = Math.floor(this.game.gameTime / 60);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        const accuracy = this.game.stats.shotsFired > 0
            ? Math.round((this.game.stats.shotsHit / this.game.stats.shotsFired) * 100)
            : 0;

        const totalDamageReceived = Object.values(this.game.stats.damageReceived).reduce((a, b) => a + b, 0);

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
                    <p><strong>Final Wave:</strong> ${this.game.stats.finalWave}${showDelta(this.game.stats.finalWave, prevStats?.finalWave)}</p>
                    <p><strong>Level:</strong> ${this.game.player.level}${showDelta(this.game.player.level, prevStats?.level)}</p>
                    <p><strong>Souls:</strong> ${souls}</p>
                </div>
                <div>
                    <h4 style="color: #00ffff; margin-bottom: 10px;">Combat Stats</h4>
                    <p><strong>Damage Dealt:</strong> ${Math.floor(this.game.stats.damageDealt).toLocaleString()}${showDelta(Math.floor(this.game.stats.damageDealt), Math.floor(prevStats?.damageDealt || 0))}</p>
                    <p><strong>Accuracy:</strong> ${accuracy}%${showDelta(accuracy, prevStats?.accuracy)}</p>
                    <p><strong>Shots:</strong> ${this.game.stats.shotsHit}/${this.game.stats.shotsFired}</p>
                    <p><strong>Dmg Taken:</strong> ${Math.floor(totalDamageReceived).toLocaleString()}${showDelta(Math.floor(totalDamageReceived), Math.floor(prevStats?.totalDamageReceived || 0), false)}</p>
                </div>
            </div>

            <div style="margin-top: 15px;">
                <h4 style="color: #00ffff; margin-bottom: 10px;">Enemies Killed</h4>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                    <div>
                        <p style="color: #ff8888;"><strong>Basic:</strong> ${this.game.stats.enemiesKilled.basic}${showDelta(this.game.stats.enemiesKilled.basic, prevStats?.enemiesKilled?.basic)}</p>
                    </div>
                    <div>
                        <p style="color: #ff66aa;"><strong>Fast:</strong> ${this.game.stats.enemiesKilled.fast}${showDelta(this.game.stats.enemiesKilled.fast, prevStats?.enemiesKilled?.fast)}</p>
                    </div>
                    <div>
                        <p style="color: #cc88cc;"><strong>Tank:</strong> ${this.game.stats.enemiesKilled.tank}${showDelta(this.game.stats.enemiesKilled.tank, prevStats?.enemiesKilled?.tank)}</p>
                    </div>
                    <div>
                        <p style="color: #ffaa44;"><strong>Shooter:</strong> ${this.game.stats.enemiesKilled.shooter}${showDelta(this.game.stats.enemiesKilled.shooter, prevStats?.enemiesKilled?.shooter)}</p>
                    </div>
                    <div>
                        <p style="color: #66ccff;"><strong>Ice:</strong> ${this.game.stats.enemiesKilled.ice}${showDelta(this.game.stats.enemiesKilled.ice, prevStats?.enemiesKilled?.ice)}</p>
                    </div>
                </div>
            </div>

            <div style="margin-top: 15px;">
                <h4 style="color: #00ffff; margin-bottom: 10px;">Damage Received By Type</h4>
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; font-size: 12px;">
                    <p><strong>Basic:</strong> ${this.game.stats.damageReceived.basic}</p>
                    <p><strong>Fast:</strong> ${this.game.stats.damageReceived.fast}</p>
                    <p><strong>Tank:</strong> ${this.game.stats.damageReceived.tank}</p>
                    <p><strong>Shooter:</strong> ${this.game.stats.damageReceived.shooter}</p>
                    <p><strong>Ice:</strong> ${this.game.stats.damageReceived.ice}</p>
                    <p><strong>Bullets:</strong> ${this.game.stats.damageReceived.bullet}</p>
                </div>
            </div>

            ${this.game.stats.skillsPicked.length > 0 ? `
                <div style="margin-top: 15px;">
                    <h4 style="color: #00ffff; margin-bottom: 10px;">Skills Picked</h4>
                    <div style="max-height: 100px; overflow-y: auto; font-size: 12px;">
                        ${this.game.stats.skillsPicked.map(s => `<p>Lv${s.level}: ${s.skill}</p>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        statsDiv.innerHTML = html;
        modal.classList.remove('hidden');
    }

    showMetaUpgrades() {
        // Stop screen shake when viewing upgrades
        this.game.camera.shake = 0;

        const modal = document.getElementById('meta-modal');
        const container = document.getElementById('meta-upgrades');
        const currencyText = document.getElementById('currency-text');

        currencyText.textContent = `Souls: ${this.game.totalSouls}`;
        container.innerHTML = '';

        META_UPGRADES.forEach(upgrade => {
            const currentLevel = this.game.metaProgress.upgrades[upgrade.id] || 0;
            const cost = upgrade.cost * (currentLevel + 1);
            const canAfford = this.game.totalSouls >= cost;
            const maxed = currentLevel >= upgrade.maxLevel;

            const div = document.createElement('div');
            div.className = 'meta-upgrade';
            if (maxed) div.classList.add('unlocked');
            else if (canAfford) div.classList.add('affordable');

            div.innerHTML = `
                <div class="meta-icon">${upgrade.icon}</div>
                <h4>${upgrade.name}</h4>
                <p>${upgrade.description}</p>
                <p>Level: ${currentLevel}/${upgrade.maxLevel}</p>
                ${!maxed ? `<p class="cost">Cost: ${cost} souls</p>` : '<p style="color: #00ff00;">MAX</p>'}
            `;

            if (!maxed && canAfford) {
                div.onclick = () => {
                    this.game.totalSouls -= cost;
                    this.game.metaProgress.upgrades[upgrade.id] = currentLevel + 1;
                    this.game.metaProgress.souls = this.game.totalSouls;
                    this.game.saveMetaProgress();
                    this.showMetaUpgrades();
                };
            }

            container.appendChild(div);
        });

        modal.classList.remove('hidden');
    }

    showPauseScreen() {
        const modal = document.getElementById('pause-modal');
        const statsDiv = document.getElementById('pause-stats');

        const seconds = Math.floor(this.game.gameTime / 60);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        let html = `
            <div style="text-align: left; margin: 20px 0;">
                <h4 style="color: #00ffff; margin-bottom: 10px;">Current Run</h4>
                <p><strong>Time:</strong> ${minutes}:${secs.toString().padStart(2, '0')}</p>
                <p><strong>Wave:</strong> ${this.game.wave}</p>
                <p><strong>Level:</strong> ${this.game.player.level}</p>
                <p><strong>Kills:</strong> ${this.game.kills}</p>
            </div>
        `;

        if (this.game.stats.skillsPicked.length > 0) {
            html += `
                <div style="margin-top: 15px; text-align: left;">
                    <h4 style="color: #00ffff; margin-bottom: 10px;">Skills Picked This Run</h4>
                    <div style="max-height: 150px; overflow-y: auto; font-size: 13px;">
                        ${this.game.stats.skillsPicked.map(s => `<p>Lv${s.level}: ${s.skill}</p>`).join('')}
                    </div>
                </div>
            `;
        }

        statsDiv.innerHTML = html;
        modal.classList.remove('hidden');
    }

    resumeGame() {
        document.getElementById('pause-modal').classList.add('hidden');
        this.game.state = 'playing';
        this.game.lastTime = performance.now(); // Reset time to avoid jump
    }

    showGuide() {
        document.getElementById('start-screen').classList.add('hidden');
        const modal = document.getElementById('guide-modal');
        const content = document.getElementById('guide-content');

        content.innerHTML = `
            <div class="guide-intro">
                <p style="font-size: 16px; color: #fff;">
                    <strong>Welcome, Survivor.</strong>
                </p>
                <p>
                    The invasion has begun. Waves of hostile entities materialize from the void,
                    and you stand as humanity's last line of defense. Your mission: <span class="stat-highlight">survive 10 minutes</span>
                    against the relentless onslaught.
                </p>
                <p>
                    Each kill makes you stronger. Each death teaches you something new.
                    Your collected Souls will ensure your next attempt starts with greater power.
                </p>
            </div>

            <h3>🎯 Your Objective</h3>
            <div class="guide-section">
                <p><span class="stat-highlight">Win Condition:</span> Survive for 10 minutes (600 seconds)</p>
                <p><span class="stat-highlight">Lose Condition:</span> Health reaches 0</p>
                <p style="margin-top: 12px;">
                    As you fight, you'll gain experience and level up, choosing powerful skills to enhance your combat abilities.
                    Collect Souls from fallen enemies to unlock permanent upgrades that persist between runs.
                </p>
            </div>

            <h3>🎮 Game Modes</h3>
            <div class="guide-section">
                <p><span class="stat-highlight">Normal Game:</span> The standard roguelite experience. All enemy types spawn according to wave progression.</p>
                <p style="margin-top: 8px;"><span class="stat-highlight">Custom Game:</span> Practice mode for testing specific enemies!</p>
                <ul>
                    <li>Select which enemy types can spawn by checking/unchecking boxes</li>
                    <li>Perfect for learning enemy patterns or testing mechanics (like ice slow stacking!)</li>
                    <li>Can select just one type for focused practice</li>
                    <li>After death, returns to config screen so you can quickly adjust and retry</li>
                </ul>
            </div>

            <h3>⚔️ Know Your Enemy</h3>
            <p>Four types of hostile entities will hunt you. Learn their patterns to survive.</p>

            <div class="enemy-card basic">
                <h4 style="color: #ff3333; margin-top: 0;">⬤ Basic Enemy</h4>
                <p><strong>Health:</strong> 30 | <strong>Speed:</strong> Medium | <strong>Damage:</strong> 10</p>
                <p>The most common threat. They move directly toward you and deal moderate damage on contact.
                Easy to kill individually, but deadly in swarms.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 1</p>
            </div>

            <div class="enemy-card fast">
                <h4 style="color: #ff66aa; margin-top: 0;">⬤ Fast Enemy</h4>
                <p><strong>Health:</strong> 15 | <strong>Speed:</strong> Fast | <strong>Damage:</strong> 5</p>
                <p>Fragile but quick. These enemies close the distance rapidly and are hard to avoid.
                They die easily but yield double the XP as a reward for your precision.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 3</p>
            </div>

            <div class="enemy-card tank">
                <h4 style="color: #cc88cc; margin-top: 0;">⬤ Tank Enemy</h4>
                <p><strong>Health:</strong> 100 | <strong>Speed:</strong> Slow | <strong>Damage:</strong> 20</p>
                <p>Living walls that soak tremendous damage. They move slowly but hit hard.
                Killing one grants massive XP. Often block your escape routes.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 7</p>
            </div>

            <div class="enemy-card shooter">
                <h4 style="color: #ffaa44; margin-top: 0;">⬤ Shooter Enemy</h4>
                <p><strong>Health:</strong> 20 | <strong>Speed:</strong> Medium | <strong>Damage:</strong> 5 (contact + ranged)</p>
                <p>The most dangerous foe. They maintain distance and fire projectiles at you every 2 seconds.
                Priority targets - eliminate them before they overwhelm you with bullets.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 5</p>
            </div>

            <div class="enemy-card" style="border-left-color: #66ccff;">
                <h4 style="color: #66ccff; margin-top: 0;">⬤ Ice Shooter Enemy</h4>
                <p><strong>Health:</strong> 25 | <strong>Speed:</strong> Medium-Slow | <strong>Damage:</strong> 5 (contact), Slow (ranged)</p>
                <p>A chilling threat that fires ice projectiles. Each bullet applies a <span class="stat-highlight">15% slow for 1 second</span>, and <strong>effects stack cumulatively!</strong>
                Multiple hits can reduce your speed by 30%, 45%, or even freeze you completely at 100% slow.
                Watch for the ❄ counter next to your health bar - it shows how many slow stacks you have. Screen glow intensifies dramatically with more stacks!</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 8</p>
            </div>

            <h3>📈 Difficulty Scaling</h3>
            <div class="guide-section">
                <p>Every <span class="stat-highlight">15 seconds</span>, a new wave begins. The challenge escalates rapidly:</p>
                <ul>
                    <li>Enemy stats increase by <strong>10% per wave</strong></li>
                    <li>Spawn rate accelerates (more enemies, less time between spawns)</li>
                    <li>Wave 15+: Additional 5% stat boost per wave</li>
                    <li>Wave 25+: Additional 10% stat boost per wave</li>
                </ul>
                <p>By wave 40, enemies have roughly <span class="stat-highlight">5x their base stats</span>.
                Fortunately, you only need to survive to wave 40 to win!</p>
            </div>

            <h3>⚡ Skills & Power-Ups</h3>
            <p>Each time you level up, choose 1 of 3 random skills. Stack them to build your perfect loadout.</p>

            <div class="guide-section" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                ${SKILLS.map(skill => {
                    let description;
                    if (skill.id === 'berserk') {
                        description = '+50% damage/level when health below 10% HP + 5%/level';
                    } else if (skill.id === 'luck') {
                        description = '+2% health pickup drop rate per level (5% without skill)';
                    } else {
                        const space = skill.unit === '%' ? '' : ' ';
                        description = `+${skill.baseValue}${space}${skill.unit}${skill.maxLevel > 1 ? ' per level' : ''}`;
                    }
                    return `
                    <div style="background: rgba(0, 255, 255, 0.05); padding: 12px; border-radius: 8px; border-left: 3px solid #00ffff; display: flex; align-items: start; gap: 12px; position: relative;">
                        <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 3px;">
                            ${Array(skill.maxLevel || 3).fill(0).map(() => '<div style="width: 8px; height: 8px; border-radius: 50%; background: rgba(0, 255, 255, 0.6);"></div>').join('')}
                        </div>
                        <div style="width: 40px; height: 40px; flex-shrink: 0; color: #00ffff; display: flex; align-items: center; justify-content: center; background: rgba(0, 255, 255, 0.1); border-radius: 6px;">
                            ${skill.icon}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="color: #00ffff; margin: 0 0 6px 0; font-size: 15px;">${skill.name}</h4>
                            <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.4;">${description}</p>
                        </div>
                    </div>
                `}).join('')}
            </div>

            <h3>💀 Souls & Meta Progression</h3>
            <div class="guide-section">
                <p>Death is not the end—it's progress. Souls persist between runs and unlock permanent power.</p>
                <p><span class="stat-highlight">Earning Souls:</span></p>
                <ul>
                    <li>1 Soul per 5 kills (on defeat)</li>
                    <li>1 Soul per 3 kills + 50 bonus (on victory)</li>
                </ul>
                <p style="margin-top: 12px;"><span class="stat-highlight">Permanent Upgrades:</span></p>
                <ul>
                    <li><strong>Base Damage I:</strong> +10% starting damage per level (max 5)</li>
                    <li><strong>Base Health I:</strong> +20 max HP per level (max 5)</li>
                    <li><strong>Base Speed I:</strong> +5% starting speed per level (max 3)</li>
                    <li><strong>XP Boost:</strong> +10% XP gain per level (max 3) - Level up faster!</li>
                </ul>
            </div>

            <h3>🧠 Survival Tips</h3>

            <div class="tip-box">
                <p><strong>Tip:</strong> Always keep moving. Standing still means death. Circle the arena to
                bunch up enemies behind you, then turn and unleash your full firepower.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> Prioritize Shooter enemies! Their ranged attacks stack up fast.
                Kill them before dealing with the melee swarm.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> XP orbs are magnetic within 80 pixels. Use this to your advantage—
                kite enemies through uncollected XP to gather it safely.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> Health pickups (5% drop rate) restore 20 HP. Don't waste them at full health!
                Leave them on the ground and grab them when you're injured.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> Your first investment should be <span class="stat-highlight">Base Health I</span>.
                More HP means more room for mistakes while you learn enemy patterns.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> Watch the status effects counter next to your health bar! The ❄ number shows ice slow stacks.
                If it hits 7+, you'll be completely frozen. Movement speed is your best defense against ice.</p>
            </div>

            <div class="tip-box">
                <p><strong>Tip:</strong> Press ESC to pause. From the pause menu, you can restart or exit to main menu without finishing your run.
                Perfect for when you want to test a different build or enemy configuration!</p>
            </div>

            <h3>🎮 Build Archetypes</h3>

            <div class="guide-section">
                <h4>Glass Cannon</h4>
                <p><strong>Focus:</strong> Damage, Fire Rate, Multi-Shot, Bullet Velocity</p>
                <p>Obliterate everything before it reaches you. High risk, high reward. Requires excellent positioning.</p>
            </div>

            <div class="guide-section">
                <h4>Immortal Tank</h4>
                <p><strong>Focus:</strong> Max Health, Health Regen, Vampiric Touch</p>
                <p>Become unkillable. Slower clear speed, but very forgiving. Great for first victories.</p>
            </div>

            <div class="guide-section">
                <h4>Piercing Artillery</h4>
                <p><strong>Focus:</strong> Multi-Shot, Piercing, Extended Range, Bullet Velocity</p>
                <p>Turn yourself into a crowd-control machine. Projectiles tear through entire enemy formations.</p>
            </div>

            <div class="guide-section">
                <h4>Balanced Survivor</h4>
                <p><strong>Focus:</strong> Mix of offense and defense</p>
                <p>Jack of all trades. Flexible and forgiving. Recommended for beginners.</p>
            </div>

            <h3>⏱️ Timeline of Survival</h3>
            <div class="guide-section">
                <p><strong>0:00 - 1:15 (Waves 1-5):</strong> Early game. Focus on learning patterns and stacking Damage/Fire Rate.</p>
                <p><strong>1:15 - 3:45 (Waves 6-15):</strong> Mid game. Shooters and Tanks appear. Pick defensive skills and crowd control.</p>
                <p><strong>3:45 - 6:15 (Waves 16-25):</strong> Late game. Survival becomes paramount. Prioritize health and regeneration.</p>
                <p><strong>6:15 - 10:00 (Waves 26-40):</strong> Extreme difficulty. Just stay alive. Victory is at 10:00!</p>
            </div>

            <div class="guide-intro" style="margin-top: 25px;">
                <p style="text-align: center; font-size: 18px; color: #00ffff;">
                    <strong>The invasion waits for no one.</strong>
                </p>
                <p style="text-align: center;">
                    Every run makes you stronger. Every death teaches you more. <br>
                    The question isn't if you'll survive—it's <span class="stat-highlight">how long</span> it will take.
                </p>
                <p style="text-align: center; margin-top: 15px; color: #00ff00;">
                    Good luck, Survivor. 🎯
                </p>
            </div>
        `;

        modal.classList.remove('hidden');

        // Scroll to top when opening guide
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }

    renderCustomSkillSelection() {
        const container = document.getElementById('custom-skill-config');
        container.innerHTML = '';

        SKILLS.forEach(skill => {
            const currentLevel = this.customSkills[skill.id] || 0;

            // Build description showing values at each level
            let description = '+';
            const space = skill.unit === '%' ? '' : ' ';
            for (let i = 1; i <= skill.maxLevel; i++) {
                const value = skill.baseValue * i;
                const isActive = i <= currentLevel;
                const colorClass = isActive ? 'active-value' : 'inactive-value';

                if (i > 1) {
                    description += `<span class="${colorClass}">/</span>`;
                }
                description += `<span class="${colorClass}">${value}</span>`;
            }
            description += `<span class="${currentLevel > 0 ? 'active-value' : 'inactive-value'}">${space}${skill.unit}</span>`;

            const skillDiv = document.createElement('div');
            skillDiv.className = 'custom-skill-item';
            if (currentLevel > 0) {
                skillDiv.classList.add('active');
            }

            skillDiv.innerHTML = `
                <div class="skill-icon">
                    ${skill.icon}
                    ${currentLevel > 0 ? `<div class="custom-skill-level-badge">${currentLevel}</div>` : ''}
                </div>
                <div class="custom-skill-name">${skill.name}</div>
                <div class="custom-skill-desc">${description}</div>
            `;

            // Tooltip with instructions
            skillDiv.title = `${skill.name}\nLeft click: increase level\nRight click: decrease level\nMax level: ${skill.maxLevel}`;

            // Left click - increase level
            skillDiv.addEventListener('click', (e) => {
                e.preventDefault();
                const currentLevel = this.customSkills[skill.id] || 0;

                if (currentLevel >= skill.maxLevel) {
                    // At max level, reset to 0
                    this.customSkills[skill.id] = 0;
                } else {
                    // Increase level
                    this.customSkills[skill.id] = currentLevel + 1;
                }

                this.renderCustomSkillSelection();
            });

            // Right click - decrease level
            skillDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const currentLevel = this.customSkills[skill.id] || 0;

                if (currentLevel <= 0) {
                    // At 0, wrap to max level
                    this.customSkills[skill.id] = skill.maxLevel;
                } else {
                    // Decrease level
                    this.customSkills[skill.id] = currentLevel - 1;
                }

                this.renderCustomSkillSelection();
            });

            container.appendChild(skillDiv);
        });
    }

    renderCustomEnemySelection() {
        const container = document.getElementById('enemy-type-config');
        container.innerHTML = '';

        const enemies = [
            { id: 'basic', name: 'Basic Enemy', color: '#ff3333', icon: '⬤', desc: 'Balanced stats' },
            { id: 'fast', name: 'Fast Enemy', color: '#ff66aa', icon: '⬤', desc: 'High speed' },
            { id: 'tank', name: 'Tank Enemy', color: '#cc88cc', icon: '⬤', desc: 'High HP' },
            { id: 'shooter', name: 'Shooter Enemy', color: '#ffaa44', icon: '⬤', desc: 'Ranged attacks' },
            { id: 'ice', name: 'Ice Shooter', color: '#66ccff', icon: '⬤', desc: 'Slows player' }
        ];

        enemies.forEach(enemy => {
            const isSelected = this.customEnemies[enemy.id];

            const enemyDiv = document.createElement('div');
            enemyDiv.className = 'custom-enemy-item';
            if (isSelected) {
                enemyDiv.classList.add('active');
            }

            enemyDiv.innerHTML = `
                <div class="enemy-icon" style="color: ${enemy.color};">
                    <div class="enemy-emoji">${enemy.icon}</div>
                </div>
                <div class="custom-enemy-info">
                    <div class="custom-enemy-name" style="color: ${enemy.color};">${enemy.name}</div>
                    <div class="custom-enemy-desc">${enemy.desc}</div>
                </div>
                <div class="custom-enemy-status">${isSelected ? '✓' : '✗'}</div>
            `;

            enemyDiv.addEventListener('click', (e) => {
                e.preventDefault();
                this.customEnemies[enemy.id] = !this.customEnemies[enemy.id];
                this.renderCustomEnemySelection();
            });

            container.appendChild(enemyDiv);
        });
    }
}
