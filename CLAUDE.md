# Claude Maintenance Guide

This document provides instructions for AI assistants (like Claude) to maintain and extend this Void Harvest project.

> **⚠ Partially historical:** Parts of this guide predate the migration from 2D Canvas rendering to Three.js 3D. The workflow, skill/enemy recipes, and balance notes remain useful, but for the current file map and rendering architecture, trust **[ARCHITECTURE.md](ARCHITECTURE.md)** and **[AGENTS.md](AGENTS.md)** over the structure described below.

## Project Overview

**Tech Stack:**
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- Webpack 5 for bundling
- SCSS for UI styling (modular architecture)
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
├── main.js          - Entry point, imports SCSS and initializes Game
├── constants.js     - Comprehensive game configuration (all balance values)
├── sprites.js       - SpriteGenerator for procedural pixel art
├── particles.js     - Particle class for visual effects
├── entities.js      - Entity base + Player, Enemy, Bullet, Item classes
├── input.js         - InputHandler for keyboard/mouse
├── skills.js        - ICONS, SKILLS, META_UPGRADES definitions
├── stats.js         - StatsManager for tracking & localStorage
├── ui.js            - UIManager main coordinator
├── ui-hud.js        - HUD updates (health, XP, wave, status effects)
├── ui-levelup.js    - Level-up skill selection screen
├── ui-gameover.js   - Game over stats display
├── ui-meta.js       - Meta upgrades and reset functionality
├── ui-modals.js     - Pause, start, and guide modals
├── ui-custom.js     - Custom game mode configuration
└── game.js          - Game class with main loop and logic

styles/
├── main.scss        - Main entry point, imports all partials
├── _variables.scss  - Color palette, enemy colors, spacing, typography
├── _base.scss       - CSS reset and base styles
├── _layout.scss     - Game container and canvas layout
├── _hud.scss        - Health/XP bars, status effects, active skills, enemy indicators
├── _modals.scss     - All modal dialogs and overlays
├── _buttons.scss    - Button styles and interactions
├── _skills.scss     - Skill choices and meta upgrades
├── _guide.scss      - User guide modal styles
└── _custom-game.scss - Custom game mode configuration
```

## Module Dependencies

```
main.js
  ├─> styles/main.scss (imports all SCSS partials)
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

styles/main.scss
  ├─> _variables.scss (must be first - defines all colors and constants)
  ├─> _base.scss
  ├─> _layout.scss
  ├─> _hud.scss
  ├─> _modals.scss
  ├─> _buttons.scss
  ├─> _skills.scss
  ├─> _guide.scss
  └─> _custom-game.scss
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

### SCSS Style Guidelines
- All style changes should be made in SCSS files (not CSS)
- Variables are defined in `styles/_variables.scss` - use them consistently
- Follow the modular structure - put styles in the appropriate partial
- Use nesting for related selectors (but don't nest too deeply)
- Use SCSS variables for colors, spacing, and sizing
- Maintain the existing naming conventions

## Working with Styles

### Changing Enemy Colors

Enemy colors are centralized in `styles/_variables.scss`. To change an enemy's color throughout the entire UI:

```scss
// In styles/_variables.scss
$enemy-basic: #ff6666;   // Red - basic enemy
$enemy-fast: #ff3399;    // Pink - fast enemy
$enemy-tank: #cc00cc;    // Purple - tank enemy
$enemy-shooter: #ffaa44; // Orange - shooter enemy
$enemy-ice: #66ccff;     // Cyan - ice enemy
```

These variables are automatically used in:
- Guide modal enemy cards (`styles/_guide.scss`)
- Enemy-related UI elements throughout the application

### Changing Theme Colors

UI theme colors are also in `styles/_variables.scss`:

```scss
$color-primary: #00ffff;   // Cyan - primary theme color
$color-success: #00ff00;   // Green - success/XP
$color-danger: #ff0000;    // Red - health/danger
$color-info: #ffff00;      // Yellow - currency/info
```

### Adding New Styles

1. Identify which partial file is most appropriate:
   - HUD elements → `_hud.scss`
   - Modal dialogs → `_modals.scss`
   - Buttons → `_buttons.scss`
   - Skills/upgrades → `_skills.scss`
   - User guide → `_guide.scss`
   - Custom game → `_custom-game.scss`

2. Add your styles using existing variables when possible
3. If you need new variables, add them to `_variables.scss` first

## Working with Constants

### Comprehensive Game Configuration

All game balance and configuration values are centralized in `constants.js` for easy tuning:

```javascript
// In constants.js
export const WAVE_DURATION = 900; // Change wave timing
export const PLAYER_BASE_HEALTH = 100; // Adjust starting health
export const ENEMY_SCALING_PER_WAVE = 0.1; // Tune difficulty curve
```

**Key constant categories:**
- **Canvas & Layout** - Screen dimensions
- **Wave & Spawn System** - Enemy spawn rates, wave unlocks
- **Enemy Colors** - Match SCSS variables for consistency
- **Progression & XP** - Level-up curves
- **Player/Item/Bullet Defaults** - Base stats
- **Balance Modifiers** - Skill bonuses, scaling factors

**Best practice:** Always use constants instead of magic numbers in game logic.

## Working with UI Modules

The UI system is split into modular files for easier maintenance:

**ui.js** - Main coordinator with UIManager class
- Sets up event handlers
- Delegates to specific UI modules

**ui-hud.js** - Real-time HUD updates
- Health/XP bars
- Wave display with enemy indicators
- Status effects and active skills

**ui-levelup.js** - Skill selection
**ui-gameover.js** - End game stats
**ui-meta.js** - Permanent upgrades
**ui-modals.js** - Pause/start/guide screens
**ui-custom.js** - Custom game configuration

**Pattern:** Each module exports functions that accept `game` as first parameter.

## Common Maintenance Tasks

### Adding a New Enemy Type

1. **Add color variable in `styles/_variables.scss`:**
```scss
$enemy-newtype: #ff00ff;  // Choose appropriate color
```

2. **Add sprite in `js/sprites.js`:**
```javascript
case 'newtype':
    ctx.fillStyle = '#ff00ff';  // Use same color as SCSS variable
    // Draw sprite...
    break;
```

3. **Add stats in `js/entities.js` Enemy constructor:**
```javascript
case 'newtype':
    this.maxHealth = 50;
    this.speed = 2;
    this.damage = 15;
    this.xpValue = 3;
    break;
```

4. **Add spawn logic in `js/game.js` spawnEnemy():**
```javascript
if (this.wave >= X) {
    if (rand < 0.Y) type = 'newtype';
    // ...
}
```

5. **Update stats tracking in `js/stats.js`:**
```javascript
enemiesKilled: {
    // ...
    newtype: 0
}
```

6. **Add enemy card styling in `styles/_guide.scss`:**
```scss
.enemy-card.newtype {
    border-left-color: $enemy-newtype;
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

### Current Skills (17 Total)

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
15. **Light Radius** - Additive +50% light radius per level

**Special Skills:**
16. **Extra Choice** - Adds 4th skill option during level-up (max level 1, no stacking)
17. **Berserk Mode** - Additive +50% damage per level when health below threshold
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

The custom game mode allows players to test specific enemy types and skill builds:

**Implementation:**
1. **HTML (`index.html`):** Custom game button and config modal with visual card-based UI
2. **Enemy Selection (`js/ui.js` renderCustomEnemySelection()):**
   - Visual card system with colored circular icons for each enemy type
   - Click to toggle enemy types on/off
   - Active enemies show green border and checkmark
   - Stores config in `game.customEnemies` object: `{basic: bool, fast: bool, tank: bool, shooter: bool, ice: bool}`
   - Validates at least one type is selected
3. **Skill Pre-selection (`js/ui.js` renderCustomSkillSelection()):**
   - Grid of all 16 skills with visual icons
   - Left-click to increase level (wraps from max to 0)
   - Right-click to decrease level (wraps from 0 to max)
   - Shows skill values at each level (+1/2/3 format)
   - Pink badge shows current level in skill icon corner
   - Stores config in `this.customSkills` object
4. **Visual Indicators:**
   - Starting skills display in greyscale in active skills HUD
   - Upgraded custom skills become colored and move to end
   - `game.customSkillIds` Set tracks which skills were pre-selected
5. **Spawn Logic (`js/game.js` spawnEnemy()):**
   - Checks if `game.customEnemies` exists
   - Filters selected enemy type against enabled types
   - Randomly chooses from enabled types if selected type is disabled
6. **Restart Flow:**
   - On restart/death in custom mode, reopens config screen with previous selections
   - Both pause and game over restart buttons preserve custom game state

**Testing Custom Mode:**
- Test specific skill builds without RNG
- Practice against individual enemy types (e.g., ice slow stacking)
- Helpful for balancing and learning mechanics

### Status Effects System

**Architecture:**
- **Player Effects (`js/entities.js`):**
  - Ice slow: Array-based stacking system `slowEffects: [{amount, timer}]`
  - Each effect has independent timer (60 frames = 1 second)
  - Effects sum additively, capped at 100% (complete immobilization)

- **HUD Display (`js/ui.js` updateHUD()):**
  - Status effects container positioned **above health bar** (left side)
  - Active skills container positioned **above XP bar** (right side)
  - Symmetric layout with flex-wrap for overflow

  **Debuffs (Ice):**
  - Shows ice effect as `❄ [count]` with stack count
  - Light blue color (#66ccff)
  - Tooltip shows total slow percentage

  **Passive Skills:**
  - Shows skill icon + level number (e.g., shield icon + "2")
  - Red color (#ff4444) for all passive effects
  - Displays: Passive Heal, Vampiric Touch, Armor, Berserk Mode (when active)
  - Uses actual skill icons from SKILLS array
  - Berserk only appears when health is below threshold

- **Visual Feedback (`js/game.js` draw()):**
  - Blue glow overlay that intensifies with ice stacks
  - At 1-2 stacks: Subtle blue tint
  - At 3-5 stacks: Moderate tunnel vision effect
  - At 6+ stacks: Intense blue-white overlay
  - At 7+ stacks (100% slow): Near-complete whiteout
  - Inner radius shrinks from 40% to 5% of screen with stacks
  - Color transitions from ice blue to white at high stacks

- **Styling (`styles.css`):**
  - Absolutely positioned containers (bottom: 60px for effects/skills, bottom: 15px for HP/XP bars)
  - Status effects use glowing box-shadow and color-coding
  - Professional badge styling with consistent design

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
- [ ] Spacebar toggles "Quick Freeze", ignores held keys
- [ ] Pause menu has "Exit to Main Menu" option
- [ ] Enemies spawn off-screen (smart bounds checking)
- [ ] Camera shake stops on Game Over
- [ ] Custom game mode config screen appears with visual cards
- [ ] Enemy selection cards show colored circles and toggle properly
- [ ] Skill selection shows +X/Y/Z values and level badges
- [ ] Left/right click on custom skills works (increase/decrease)
- [ ] Custom game mode filters enemy spawns correctly
- [ ] Custom game restart returns to config screen with selections preserved
- [ ] Status effects display above health bar
- [ ] Ice slow effect stacks and shows count
- [ ] Passive skill effects (regen, vampire, armor, berserk) show with icons
- [ ] Visual ice effect intensifies with stacks
- [ ] Active skills display above XP bar
- [ ] Custom skills show greyscale, earned skills show colored
- [ ] Upgrading a custom skill makes it colored and moves to end
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
