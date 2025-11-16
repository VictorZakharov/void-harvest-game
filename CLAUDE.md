# Claude Maintenance Guide

This document provides instructions for AI assistants (like Claude) to maintain and extend this Void Harvest project.

## Project Overview

**Tech Stack:**
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- Webpack 5 for bundling
- CSS for UI styling
- localStorage for persistence

**Architecture:**
- Modular ES6 architecture (10 modules)
- Game loop with requestAnimationFrame
- Entity-component pattern for game objects
- State machine for game states
- Event-driven UI system

## File Structure & Responsibilities

```
js/
├── main.js          - Entry point, imports CSS and initializes Game
├── constants.js     - Game configuration (canvas size, duration)
├── sprites.js       - SpriteGenerator for procedural pixel art
├── particles.js     - Particle class for visual effects
├── entities.js      - Entity base + Player, Enemy, Bullet, Item classes
├── input.js         - InputHandler for keyboard/mouse
├── skills.js        - ICONS, SKILLS, META_UPGRADES definitions
├── stats.js         - StatsManager for tracking & localStorage
├── ui.js            - UIManager for all modals and screens
└── game.js          - Game class with main loop and logic
```

## Module Dependencies

```
main.js
  ├─> styles.css (imported)
  └─> game.js
       ├─> constants.js
       ├─> entities.js
       │    ├─> constants.js
       │    └─> sprites.js
       ├─> particles.js
       ├─> input.js
       │    └─> constants.js
       ├─> skills.js
       ├─> stats.js
       └─> ui.js
            └─> skills.js
```

## Development Workflow

### Starting Development
```bash
npm run dev    # Opens http://localhost:3000 with HMR
```

### Building for Production
```bash
npm run build  # Creates dist/ with hashed assets
```

### Code Style Guidelines
- Use ES6 modules (import/export)
- Use arrow functions for callbacks
- Use template literals for strings
- Use const/let, never var
- Keep functions small and focused
- Document complex algorithms with comments

## Common Maintenance Tasks

### Adding a New Enemy Type

1. **Add sprite in `js/sprites.js`:**
```javascript
case 'newtype':
    ctx.fillStyle = '#color';
    // Draw sprite...
    break;
```

2. **Add stats in `js/entities.js` Enemy constructor:**
```javascript
case 'newtype':
    this.maxHealth = 50;
    this.speed = 2;
    this.damage = 15;
    this.xpValue = 3;
    break;
```

3. **Add spawn logic in `js/game.js` spawnEnemy():**
```javascript
if (this.wave >= X) {
    if (rand < 0.Y) type = 'newtype';
    // ...
}
```

4. **Update stats tracking in `js/stats.js`:**
```javascript
enemiesKilled: {
    // ...
    newtype: 0
}
```

### Adding a New Skill

1. **Add icon SVG in `js/skills.js` ICONS object**

2. **Add skill definition in SKILLS array:**
```javascript
{
    id: 'skillname',
    name: 'Display Name',
    baseValue: 10,
    unit: '%',
    icon: ICONS.skillname,
    apply: (player) => {
        // Modify player stats
        player.skills.skillname = (player.skills.skillname || 0) + 1;
    }
}
```

3. **Add skill tracking in `js/entities.js` Player constructor if needed**

### Adding a New Meta Upgrade

Add to `js/skills.js` META_UPGRADES array:
```javascript
{
    id: 'upgrade_id',
    name: 'Upgrade Name',
    description: 'What it does',
    cost: 10,
    maxLevel: 5,
    icon: ICONS.iconname,
    apply: (player, level) => {
        // Apply based on level
    }
}
```

### Current Skills (16 Total)

All skills have a max level of 3, except Extra Choice which has max level 1.

**Combat Skills:**
1. **Increased Damage** - Multiplicative +20% damage per level
2. **Faster Fire Rate** - Multiplicative -15% fire delay per level (min 1 frame)
3. **Multi-Shot** - Additive +1 projectile per level (0.3 radian spread)
4. **Piercing Shots** - Additive +1 enemy pierced per level
5. **Bullet Velocity** - Multiplicative +25% bullet speed per level
6. **Extended Range** - Multiplicative +50% bullet range per level
7. **Freeze Chance** - Additive +10% freeze chance per level (1 second freeze duration)

**Survivability Skills:**
8. **Max Health** - Additive +30 HP per level (also heals +30 when picked)
9. **Health Regeneration** - Additive +1 HP/second per level (ticks every 60 frames)
10. **Vampiric Touch** - Additive +1 HP per kill (0.5 second cooldown)
11. **Armor** - Additive +1 armor per level (permanent damage reduction)

**Utility Skills:**
12. **Movement Speed** - Multiplicative +8% speed per level
13. **Magnet Range** - Multiplicative +50% pickup range per level (base 80px)
14. **Lucky Drops** - Additive +2% health drop rate per level (base 5%)

**Special Skills:**
15. **Extra Choice** - Adds 4th skill option during level-up (max level 1, no stacking)
16. **Berserk Mode** - Additive +50% damage per level when health below threshold
   - Level 1: +50% at ≤10% HP
   - Level 2: +100% at ≤15% HP
   - Level 3: +150% at ≤20% HP
   - Formula: `threshold = berserkBonus * 0.1 + 0.05`

**Key Implementation Details:**

**Armor System** (`js/entities.js` Player.takeDamage()):
```javascript
takeDamage(amount) {
    // Armor reduces damage (permanent damage reduction)
    if (this.armor > 0) {
        amount = Math.max(0, amount - this.armor);
    }
    // Apply damage to health
    this.health -= amount;
    return this.health <= 0;
}
```

**Berserk Mode** (`js/game.js` createPlayerBullets()):
```javascript
let effectiveDamage = this.player.damage;
if (this.player.berserkBonus > 0) {
    const healthPercent = this.player.health / this.player.maxHealth;
    const berserkThreshold = this.player.berserkBonus * 0.1 + 0.05;
    const isBerserk = healthPercent <= berserkThreshold;
    effectiveDamage = this.player.damage * (isBerserk ? (1 + this.player.berserkBonus) : 1);
}
```

**Magnet Range** (`js/entities.js` Item.update()):
```javascript
update(playerX, playerY, playerMagnetBonus = 0) {
    const effectiveMagnetRange = this.magnetRange * (1 + playerMagnetBonus);
    if (dist < effectiveMagnetRange && dist > 0) {
        // Pull toward player
    }
}
```

**Lucky Drops** (`js/game.js` dropItems()):
```javascript
const healthDropRate = 0.05 + (this.player.dropBonus || 0);
if (Math.random() < healthDropRate) {
    this.items.push(new Item(x, y, 'health'));
}
```

### Modifying UI Screens

All UI is in `js/ui.js`. Each screen has a method:
- `showLevelUpScreen()` - Skill selection
- `showGameOverStats()` - End game stats
- `showMetaUpgrades()` - Permanent upgrades
- `showPauseScreen()` - Pause screen
- `updateHUD()` - In-game HUD

To modify a screen, edit the corresponding method and update the HTML template strings.

### Custom Game Mode

The custom game mode allows players to test specific enemy types:

**Implementation:**
1. **HTML (`index.html`):** Custom game button and config modal with checkboxes for each enemy type
2. **UI Handler (`js/ui.js`):**
   - Reads checkbox states when "Start Custom Game" is clicked
   - Stores config in `game.customEnemies` object: `{basic: bool, fast: bool, tank: bool, shooter: bool, ice: bool}`
   - Validates at least one type is selected
   - On restart/death in custom mode, reopens config screen with previous selections
3. **Spawn Logic (`js/game.js` spawnEnemy()):**
   - Checks if `game.customEnemies` exists
   - Filters selected enemy type against enabled types
   - Randomly chooses from enabled types if selected type is disabled
4. **Reset Logic (`js/game.js` reset()):**
   - Clears `customEnemies` property to return to normal mode

**Testing Custom Mode:**
- Use to test individual enemy mechanics (e.g., ice slow stacking)
- Helpful for balancing specific enemy types
- Validates config to prevent empty enemy pool

### Status Effects System

**Architecture:**
- **Player Effects (`js/entities.js`):**
  - Ice slow: Array-based stacking system `slowEffects: [{amount, timer}]`
  - Each effect has independent timer (60 frames = 1 second)
  - Effects sum additively, capped at 100% (complete immobilization)

- **HUD Display (`js/ui.js` updateHUD()):**
  - Status effects container positioned right of health bar
  - Shows ice effect as `❄ [count]` with stack count
  - Tooltip shows total slow percentage
  - Updates every frame in `updateHUD()`

- **Visual Feedback (`js/game.js` draw()):**
  - Blue glow overlay that intensifies with stacks
  - At 1-2 stacks: Subtle blue tint
  - At 3-5 stacks: Moderate tunnel vision effect
  - At 6+ stacks: Intense blue-white overlay
  - At 7+ stacks (100% slow): Near-complete whiteout
  - Inner radius shrinks from 40% to 5% of screen with stacks
  - Color transitions from ice blue to white at high stacks

- **Styling (`styles.css`):**
  - Absolutely positioned status effects container
  - Ice effect has glowing box-shadow
  - Professional badge styling with color-coding

### Pause Menu Features

**Exit to Main Menu:**
- Button added in `index.html` pause modal
- Handler in `js/ui.js`: Resets game, sets state to 'start', shows start screen
- Allows quick return without finishing run

**Custom Game Restart Flow:**
- Both pause and game over restart buttons check `game.customEnemies`
- If custom mode: Returns to config screen with previous selections preserved
- If normal mode: Immediate restart (previous behavior)
- Checkbox states restored from `customEnemies` object

### Adjusting Game Balance

**Enemy Scaling** - `js/game.js` spawnEnemy():
- Base stats in `js/entities.js` Enemy constructor
- Wave scaling factor: `1 + ((this.wave - 1) * 0.1)` (10% per wave)
- Late game scaling at waves 15 and 25

**Player Progression** - `js/entities.js` Player class:
- Base stats in constructor
- XP to level: `Math.floor(this.xpToLevel * 1.5)` per level
- Skill effects in `js/skills.js` SKILLS array

**Difficulty Curve** - `js/game.js`:
- Wave timer: 900 frames (15 seconds)
- Spawn rate reduction: 2 frames per wave, minimum 20
- Game duration: 600 seconds (10 minutes)

## Testing Checklist

When making changes, verify:
- [ ] Game starts correctly
- [ ] Player movement and shooting work
- [ ] Enemies spawn and move toward player
- [ ] Collision detection works
- [ ] Level-up screen appears and skills apply
- [ ] Pause (ESC) works and resumes correctly
- [ ] Pause menu has "Exit to Main Menu" option
- [ ] Custom game mode config screen appears
- [ ] Custom game mode filters enemy spawns correctly
- [ ] Custom game restart returns to config screen
- [ ] Status effects display next to health bar
- [ ] Ice slow effect stacks and shows count
- [ ] Visual ice effect intensifies with stacks
- [ ] Game over shows stats correctly (accuracy as whole number)
- [ ] Meta upgrades save/load from localStorage
- [ ] Build succeeds without errors
- [ ] No console errors during gameplay

## Build System Details

**Webpack Configuration** (`webpack.config.js`):
- Development: HMR, source maps, CSS injected
- Production: Minified, content hashing, extracted CSS
- HTML plugin injects assets automatically

**Key Features:**
- Content hashing for cache busting
- Source maps in both modes
- Dev server serves from memory (no disk writes)
- Clean dist folder on each build

## localStorage Schema

**Previous Run Stats** (`arpg_previous_run`):
```javascript
{
    finalWave: number,
    level: number,
    damageDealt: number,
    accuracy: number,
    totalDamageReceived: number,
    enemiesKilled: { basic, fast, tank, shooter, ice }
}
```

**Meta Progression** (`arpg_meta_progress`):
```javascript
{
    souls: number,
    upgrades: { [upgradeId]: level }
}
```

## Performance Considerations

- Particle system auto-removes dead particles
- Bullets removed when out of bounds
- Enemies/items removed when collected/killed
- Arrays iterated backwards when removing items
- Canvas cleared each frame for redraw
- No memory leaks in event listeners

## Common Pitfalls to Avoid

1. **Don't** reset player stats in wrong order (meta upgrades must apply AFTER player creation)
2. **Don't** modify arrays while iterating forward (use backwards iteration)
3. **Don't** forget to update both UI display AND localStorage saves
4. **Don't** add skills without updating skill tracking system
5. **Don't** forget to handle state transitions (playing → paused → playing)
6. **Don't** modify constants.js without checking all imports

## Debugging Tips

- Check browser console for errors
- Use source maps to debug bundled code
- Verify localStorage in DevTools > Application
- Check game state in `window.game` object
- Monitor frame rate with DevTools Performance tab
- Test skill applications by logging player stats

## Future Enhancement Ideas

- Sound effects and music
- More enemy types and behaviors
- Boss enemies at certain waves
- Different weapon types
- Power-up items (temporary buffs)
- Multiple character classes
- Achievements system
- Leaderboard (requires backend)
- Mobile touch controls
- Gamepad support

## When Things Break

**Build fails:**
1. Check webpack.config.js syntax
2. Verify all imports/exports are correct
3. Run `npm install` to restore dependencies

**Game won't start:**
1. Check browser console for errors
2. Verify all modules are imported correctly
3. Check that HTML has correct structure

**Stats not saving:**
1. Check localStorage isn't disabled
2. Verify StatsManager methods are called
3. Check console for localStorage errors

**HMR not working:**
1. Ensure webpack-dev-server is running
2. Check that files are saved correctly
3. Restart dev server if needed

## Contribution Guidelines

When extending this project:
1. Maintain modular structure
2. Keep game.js under 500 lines (extract to new modules if needed)
3. Update this CLAUDE.md with new features
4. Test thoroughly before committing
5. Update USER_GUIDE.md if adding user-facing features
6. Maintain backward compatibility with saved localStorage data
