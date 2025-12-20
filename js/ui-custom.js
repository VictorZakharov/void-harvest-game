// ==================== CUSTOM GAME MODE ====================
import { SKILLS } from './skills.js';
import { BIOMES } from './biomes.js';

export function renderCustomSkillSelection(game, customSkills, callback) {
    const container = document.getElementById('custom-skill-config');
    container.innerHTML = '';

    SKILLS.forEach(skill => {
        const currentLevel = customSkills[skill.id] || 0;

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
        const categoryClass = skill.category || 'defensive';
        skillDiv.className = `custom-skill-item ${categoryClass}`;
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
            const currentLevel = customSkills[skill.id] || 0;

            if (currentLevel >= skill.maxLevel) {
                // At max level, reset to 0
                customSkills[skill.id] = 0;
            } else {
                // Increase level
                customSkills[skill.id] = currentLevel + 1;
            }

            callback();
        });

        // Right click - decrease level
        skillDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const currentLevel = customSkills[skill.id] || 0;

            if (currentLevel <= 0) {
                // At 0, wrap to max level
                customSkills[skill.id] = skill.maxLevel;
            } else {
                // Decrease level
                customSkills[skill.id] = currentLevel - 1;
            }

            callback();
        });

        container.appendChild(skillDiv);
    });
}

export function renderCustomEnemySelection(game, customEnemies, callback) {
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
        const isSelected = customEnemies[enemy.id];

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
            customEnemies[enemy.id] = !customEnemies[enemy.id];
            callback();
        });

        container.appendChild(enemyDiv);
    });
}

export function renderCustomBiomeSelection(game, currentRef, callback) {
    // currentRef is an object { value: 'biomeId' or null } to allow mutation
    const container = document.getElementById('custom-biome-config');
    if (!container) return; // Should exist, but safety check

    container.innerHTML = '';

    // Add "Random" option
    const randomDiv = document.createElement('div');
    randomDiv.className = 'custom-enemy-item'; // Reuse styling for consistency
    const isRandom = !currentRef.value;
    if (isRandom) randomDiv.classList.add('active');

    randomDiv.innerHTML = `
        <div class="enemy-icon" style="color: #ffffff;">
            <div class="enemy-emoji">?</div>
        </div>
        <div class="custom-enemy-info">
            <div class="custom-enemy-name" style="color: #ffffff;">Random</div>
            <div class="custom-enemy-desc">Random biome each game</div>
        </div>
        <div class="custom-enemy-status">${isRandom ? '✓' : ''}</div>
    `;

    randomDiv.onclick = () => {
        currentRef.value = null;
        callback();
    };
    container.appendChild(randomDiv);


    Object.values(BIOMES).forEach(biome => {
        const isSelected = currentRef.value === biome.id;
        const colorHex = '#' + biome.groundColor.toString(16).padStart(6, '0');

        const div = document.createElement('div');
        div.className = 'custom-enemy-item';
        if (isSelected) div.classList.add('active');

        // Human readable weather
        const weatherName = biome.weather.charAt(0).toUpperCase() + biome.weather.slice(1);

        div.innerHTML = `
             <div class="enemy-icon" style="color: ${colorHex};">
                <div class="enemy-emoji">■</div>
            </div>
             <div class="custom-enemy-info">
                <div class="custom-enemy-name" style="color: ${colorHex};">${biome.name}</div>
                <div class="custom-enemy-desc">Weather: ${weatherName}</div>
            </div>
            <div class="custom-enemy-status">${isSelected ? '✓' : ''}</div>
        `;

        div.onclick = () => {
            currentRef.value = biome.id;
            callback();
        };

        container.appendChild(div);
    });
}
