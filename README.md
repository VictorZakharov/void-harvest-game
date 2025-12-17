# Void Harvest - Roguelite

A twin-stick shooter roguelite built with vanilla JavaScript and Canvas.

## Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete gameplay guide with all stats and strategies
- **[CLAUDE.md](CLAUDE.md)** - Maintenance guide for AI assistants and developers

## Features

- Twin-stick shooter mechanics (WASD + Mouse)
- 5 enemy types with unique behaviors (Basic, Fast, Tank, Shooter, Ice)
- 17 different skill upgrades with max levels
- Custom game mode with visual enemy and skill selection
- Status effects display for passive skills and debuffs
- Active skills HUD showing equipped abilities
- Meta-progression system with permanent unlocks
- Comprehensive stats tracking with run comparisons
- Wave-based difficulty scaling
- IMMERSIVE 3D VISUALS with dynamic lighting
- Tactical QUICK FREEZE mode (Spacebar)
- Smart enemy spawning (off-screen guaranteed)
- Procedurally generated pixel art sprites

## Controls

- **WASD** - Move
- **Mouse** - Aim and shoot
- **ESC** - Pause/Resume
- **SPACE** - Quick Freeze

## Development

### Setup

```bash
npm install
```

### Build Commands

```bash
# Development server on http://localhost:3000 with hot reload
npm run dev

# Production build (outputs to dist/ with content-hashed assets)
npm run build
```

The dev server includes:
- Hot module replacement (HMR) for instant updates
- Source maps for debugging
- Automatic browser opening
- Serves on http://localhost:3000

The production build creates:
- Minified JS and CSS
- Content-hashed filenames for cache busting
- Source maps for debugging
- Optimized bundle in `dist/` folder

### File Structure

```
arpg-shooter/
├── js/                    # Source files (modular)
│   ├── main.js           # Entry point (imports CSS & Game)
│   ├── constants.js      # Game constants
│   ├── sprites.js        # Sprite generation
│   ├── particles.js      # Particle system
│   ├── entities.js       # Player, Enemy, Bullet, Item classes
│   ├── input.js          # Input handler
│   ├── skills.js         # Skills and upgrades
│   ├── stats.js          # Stats tracking & persistence
│   ├── ui.js             # UI management (modals, screens)
│   └── game.js           # Main game class & loop
├── dist/                  # Production build output (gitignored)
│   ├── index.html        # HTML with hashed asset references
│   ├── game.[hash].js    # Bundled & minified JS
│   └── styles.[hash].css # CSS with content hash
├── index.html            # Main HTML file (webpack template)
├── styles.css            # Game styling (imported by JS)
├── webpack.config.js     # Webpack configuration
└── package.json          # Dependencies & scripts
```

## Game Systems

### Progression

1. **In-Run Leveling** - Kill enemies, gain XP, level up and choose skills
2. **Item Drops** - Collect XP orbs and health pickups
3. **Meta-Progression** - Spend Souls on permanent stat upgrades

### Skills

**Combat Skills:**
- Increased Damage, Rapid Fire, Multi-Shot, Piercing Shots
- Bullet Velocity, Extended Range, Freeze Chance

**Survivability Skills:**
- Max Health, Passive Heal, Vampiric Touch, Armor

**Utility Skills:**
- Movement Speed, Magnet Range, Lucky Drops, Light Radius

**Special Skills:**
- Extra Choice, Berserk Mode

All skills have multiple levels (max 3, except Extra Choice which is max 1)

### Custom Game Mode

Test specific builds and enemy types with the custom game configuration:
- **Enemy Selection**: Choose which enemy types to spawn (visual card-based UI)
- **Skill Pre-selection**: Start with any skills at any level for testing
- **Visual Indicators**: Greyscale for starting skills, colored for earned skills
- Perfect for practice, testing, and learning enemy patterns

### Difficulty Scaling

- Waves increase every 15 seconds
- Enemy stats scale +10% per wave
- Additional scaling after wave 15 and 25
- Survive 10 minutes to win!

## Stats Tracking

The game tracks detailed stats including:
- Enemies killed by type
- Damage received by source
- Accuracy percentage
- Skills picked during run
- Run-to-run comparison with delta highlights
