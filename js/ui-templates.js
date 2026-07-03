import { SKILLS } from './skills.js';

export function getGuideHTML() {
    return `
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

        <h3>⌨️ Controls</h3>
        <div class="guide-section">
            <p><span class="stat-highlight">WASD:</span> Move</p>
            <p><span class="stat-highlight">Mouse Left:</span> Aim & Shoot</p>
            <p><span class="stat-highlight">Mouse Right:</span> Rotate Camera</p>
            <p><span class="stat-highlight">Scroll:</span> Zoom In/Out</p>
            <p><span class="stat-highlight">ESC:</span> Pause Menu</p>
            <p><span class="stat-highlight">SPACE:</span> Quick Freeze (Tactical Pause)</p>
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

        <h3>🤝 2 Player Co-op</h3>
        <div class="guide-section">
            <p>Two survivors, one screen, one light. <span class="stat-highlight">P1 moves with WASD</span> and aims/shoots with the mouse;
            <span class="stat-highlight">P2 moves with the arrow keys</span> and fires automatically. The mouse controls the shared light —
            coordinate to stay inside it.</p>
            <ul>
                <li><span class="stat-highlight">Shared XP:</span> pickups are split evenly, so both players level up together</li>
                <li><span class="stat-highlight">Level-up heal:</span> leveling up restores a standing player to full health</li>
                <li><span class="stat-highlight">Going down:</span> at 0 HP a player is downed, not dead. A rescue call marks them on screen
                (with an edge arrow if they're off-screen) — but after 30 seconds they bleed out: body and HUD turn grey,
                no more revives, no more level-ups. The run continues on one survivor</li>
                <li><span class="stat-highlight">Reviving:</span> stand next to your partner and hold <strong>[E]</strong> (P1) or
                <strong>[R-Ctrl]</strong> (P2) for 2 seconds — the dashed ring fills as you channel. They get back up at 50% HP</li>
                <li><span class="stat-highlight">Leveling while down:</span> a downed player still gains the level, but skips the skill pick
                and gets no heal — their XP dust circles the body and scatters skyward. Get them up before the next level!</li>
                <li><span class="stat-highlight">Game Over</span> only when BOTH players are down</li>
                <li><span class="stat-highlight">Friendly Fire</span> is off by default; enable it in the Custom Game config if you like danger</li>
            </ul>
        </div>

        <h3>⚔️ Know Your Enemy</h3>
        <p>Four types of hostile entities will hunt you. Learn their patterns to survive.</p>

        <div class="enemy-card basic">
            <div class="enemy-card-model"><img data-enemy-model="basic" alt="Basic Enemy"></div>
            <div class="enemy-card-body">
                <h4 style="color: #ff3333; margin-top: 0;">Basic Enemy</h4>
                <p><strong>Health:</strong> 30 | <strong>Speed:</strong> Medium | <strong>Damage:</strong> 10</p>
                <p>The most common threat. They move directly toward you and deal moderate damage on contact.
                Easy to kill individually, but deadly in swarms.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 1</p>
            </div>
        </div>

        <div class="enemy-card fast">
            <div class="enemy-card-model"><img data-enemy-model="fast" alt="Fast Enemy"></div>
            <div class="enemy-card-body">
                <h4 style="color: #ff66aa; margin-top: 0;">Fast Enemy</h4>
                <p><strong>Health:</strong> 15 | <strong>Speed:</strong> Fast | <strong>Damage:</strong> 5</p>
                <p>Fragile but quick. These enemies close the distance rapidly and are hard to avoid.
                They die easily but yield double the XP as a reward for your precision.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 3</p>
            </div>
        </div>

        <div class="enemy-card tank">
            <div class="enemy-card-model"><img data-enemy-model="tank" alt="Tank Enemy"></div>
            <div class="enemy-card-body">
                <h4 style="color: #cc88cc; margin-top: 0;">Tank Enemy</h4>
                <p><strong>Health:</strong> 100 | <strong>Speed:</strong> Slow | <strong>Damage:</strong> 20</p>
                <p>Living walls that soak tremendous damage. They move slowly but hit hard.
                Killing one grants massive XP. Often block your escape routes.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 7</p>
            </div>
        </div>

        <div class="enemy-card shooter">
            <div class="enemy-card-model"><img data-enemy-model="shooter" alt="Shooter Enemy"></div>
            <div class="enemy-card-body">
                <h4 style="color: #ffaa44; margin-top: 0;">Shooter Enemy</h4>
                <p><strong>Health:</strong> 20 | <strong>Speed:</strong> Medium | <strong>Damage:</strong> 5 (contact + ranged)</p>
                <p>The most dangerous foe. They maintain distance and fire projectiles at you every 2 seconds.
                Priority targets - eliminate them before they overwhelm you with bullets.</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 5</p>
            </div>
        </div>

        <div class="enemy-card ice">
            <div class="enemy-card-model"><img data-enemy-model="ice" alt="Ice Shooter Enemy"></div>
            <div class="enemy-card-body">
                <h4 style="color: #66ccff; margin-top: 0;">Ice Shooter Enemy</h4>
                <p><strong>Health:</strong> 25 | <strong>Speed:</strong> Medium-Slow | <strong>Damage:</strong> 5 (contact), Slow (ranged)</p>
                <p>A chilling threat that fires ice projectiles. Each bullet applies a <span class="stat-highlight">15% slow for 1 second</span>, and <strong>effects stack cumulatively!</strong>
                Multiple hits can reduce your speed by 30%, 45%, or even freeze you completely at 100% slow.
                Watch for the ❄ counter next to your health bar - it shows how many slow stacks you have. Screen glow intensifies dramatically with more stacks!</p>
                <p><span class="stat-highlight">First Appears:</span> Wave 8</p>
            </div>
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

        <div class="guide-skills-grid">
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
                <div class="guide-skill-card">
                    <div class="guide-skill-pips">
                        ${Array(skill.maxLevel || 3).fill(0).map(() => '<div class="pip"></div>').join('')}
                    </div>
                    <div class="guide-skill-icon">
                        ${skill.icon}
                    </div>
                    <div class="guide-skill-body">
                        <h4>${skill.name}</h4>
                        <p>${description}</p>
                    </div>
                </div>
            `;
    }).join('')}
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
            <p><strong>Tip:</strong> Press <strong>ESC</strong> for the Pause Menu (Restart/Exit).
            Press <strong>SPACE</strong> for "Quick Freeze" to tactically pause the action while keeping the battlefield visible.</p>
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
}
