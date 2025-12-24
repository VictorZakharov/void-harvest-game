// ==================== CUSTOM GAME MODE ====================
import { SKILLS } from './skills.js';
import { BIOMES } from './biomes.js';
import { UI3DRenderer } from './ui/UI3DRenderer.js';

export class CustomGameUI {
  constructor(game, dom) {
    this.game = game;
    this.dom = dom;
    this.renderer3D = null;
  }

  renderSkillSelection(customSkills, callback) {
    if (!this.dom.customSkillConfig) return;
    this.dom.setHTML(this.dom.customSkillConfig, '');

    const categories = [
      {id: 'offensive', name: 'Attack'},
      {id: 'defensive', name: 'Defense'},
      {id: 'survival', name: 'Survival'}
    ];

    categories.forEach(cat => {
      // Create Section
      const section = document.createElement('div');
      section.className = 'skill-category-section';

      // Header
      const header = document.createElement('div');
      header.className = 'skill-category-header';
      header.textContent = cat.name;
      section.appendChild(header);

      // Grid
      const grid = document.createElement('div');
      grid.className = 'skill-category-grid';

      // Filter and Render Skills
      const categorySkills = SKILLS.filter(s => (s.category || 'defensive') === cat.id);

      categorySkills.forEach(skill => {
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
        // Reuse existing item class
        skillDiv.className = `custom-skill-item ${cat.id}`;
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

        grid.appendChild(skillDiv);
      });

      section.appendChild(grid);
      this.dom.customSkillConfig.appendChild(section);
    });
  }

  renderEnemySelection(customEnemies, callback) {
    if (!this.dom.enemyTypeConfig) return;
    this.dom.setHTML(this.dom.enemyTypeConfig, '');

    // Initialize renderer if needed
    if (!this.renderer3D) {
      this.renderer3D = new UI3DRenderer(128);
    }

    const enemies = [
      {id: 'basic', name: 'Basic Enemy', color: '#ff3333', desc: 'Balanced stats'},
      {id: 'fast', name: 'Fast Enemy', color: '#ff66aa', desc: 'High speed'},
      {id: 'tank', name: 'Tank Enemy', color: '#cc88cc', desc: 'High HP'},
      {id: 'shooter', name: 'Shooter Enemy', color: '#ffaa44', desc: 'Ranged attacks'},
      {id: 'ice', name: 'Ice Shooter', color: '#66ccff', desc: 'Slows player'}
    ];

    // Handle Select All Checkbox
    if (this.dom.enemySelectAll) {
      // Check if all are currently selected
      const allSelected = enemies.every(e => customEnemies[e.id]);
      this.dom.enemySelectAll.checked = allSelected;

      // Override onclick to prevent multiple listeners accumulation (simple approach)
      this.dom.enemySelectAll.onclick = (e) => {
        // e.target.checked is the NEW state after click
        const newState = e.target.checked;
        enemies.forEach(enemy => {
          customEnemies[enemy.id] = newState;
        });
        callback();
      };
    }

    enemies.forEach(enemy => {
      const isSelected = customEnemies[enemy.id];

      const enemyDiv = document.createElement('div');
      enemyDiv.className = 'custom-enemy-item';
      if (isSelected) {
        enemyDiv.classList.add('active');
      }

      // Generate 3D Icon
      const iconUrl = this.renderer3D.renderEnemyToDataUrl(enemy.id);

      enemyDiv.innerHTML = `
                <div class="enemy-icon" style="color: ${enemy.color}; padding: 0;">
                    <img src="${iconUrl}" alt="${enemy.name}" style="width: 100%; height: 100%; object-fit: contain;">
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

      this.dom.enemyTypeConfig.appendChild(enemyDiv);
    });
  }

  renderBiomeSelection(currentRef, callback) {
    // currentRef is an object { value: 'biomeId' or null } to allow mutation
    if (!this.dom.customBiomeConfig) return;

    this.dom.setHTML(this.dom.customBiomeConfig, '');

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
    this.dom.customBiomeConfig.appendChild(randomDiv);


    Object.values(BIOMES).forEach(biome => {
      const isSelected = currentRef.value === biome.id;
      const colorHex = '#' + biome.groundColor.toString(16).padStart(6, '0');

      // Use brighter colors for text to ensure contrast
      let textColor = colorHex;
      if (biome.id === 'neutral') textColor = '#55aa55'; // Brighten Plains green
      if (biome.id === 'snow') textColor = '#ffffff';    // Pure white for Tundra
      if (biome.id === 'desert') textColor = '#ddcc88';  // Brighter sand

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
                    <div class="custom-enemy-name" style="color: ${textColor};">${biome.name}</div>
                    <div class="custom-enemy-desc">Weather: ${weatherName}</div>
                </div>
                <div class="custom-enemy-status">${isSelected ? '✓' : ''}</div>
            `;

      div.onclick = () => {
        currentRef.value = biome.id;
        callback();
      };

      this.dom.customBiomeConfig.appendChild(div);
    });
  }
}
