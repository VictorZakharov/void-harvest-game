# Void Harvest - User Guide

Welcome to Void Harvest, a fast-paced twin-stick roguelite where you fight waves of enemies, level up, and unlock permanent upgrades!

## Table of Contents
- [Getting Started](#getting-started)
- [Game Objective](#game-objective)
- [Game Modes](#game-modes)
- [Controls](#controls)
- [Game Mechanics](#game-mechanics)
- [Enemy Types](#enemy-types)
- [Skills & Upgrades](#skills--upgrades)
- [Meta Progression](#meta-progression)
- [Stats & Tracking](#stats--tracking)
- [Tips & Strategy](#tips--strategy)

## Getting Started

### Installation
1. Clone or download the project
2. Open terminal in project folder
3. Run `npm install`
4. Run `npm run dev`
5. Game opens automatically at http://localhost:3000

### First Run
- Click "Start Game" to begin
- Use WASD to move, mouse to aim and shoot
- Kill enemies to gain XP
- Level up and choose skills
- Survive 10 minutes to win!

## Game Objective

**Win Condition:** Survive for 10 minutes (600 seconds)

**Lose Condition:** Health reaches 0

**Progression:**
1. Kill enemies to gain experience points (XP)
2. Level up to choose powerful skills
3. Collect Souls from defeated enemies
4. Spend Souls on permanent meta-upgrades
5. Start new runs with stronger base stats

## Game Modes

### Normal Game
- Standard roguelite experience
- All enemy types spawn according to wave progression
- Balanced difficulty curve
- Enemies gradually introduced (Basic → Fast → Shooter → Tank → Ice)

### Custom Game
- **Access:** Click "Custom Game" button on main menu
- **Purpose:** Test specific enemy types or practice against particular threats
- **Configuration:** Choose which enemy types can spawn by checking/unchecking boxes
  - Basic Enemy (Red blob)
  - Fast Enemy (Pink)
  - Tank Enemy (Purple)
  - Shooter Enemy (Orange)
  - Ice Shooter (Light blue)
- **Features:**
  - Can select a single enemy type for focused practice
  - Can combine any mix of enemy types
  - Must select at least one type to start
  - Configuration screen shows after restart/death for quick retries
  - Perfect for testing ice mechanics or practicing against specific threats

### 2-Player Co-op Mode
- **Access:** Toggle "2 Player Mode" on the main menu
- **Type:** Local "Hotseat" Co-op (Shared Screen)
- **Gameplay:**
  - Two players share the same screen and fight together
  - **Shared Camera:** Camera dynamically follows the midpoint between players
  - **Revive System:** If a player loses all health, they are "Downed". The other player can revive them by standing close and holding the interaction key (E for P1, Right Ctrl for P2).
  - **Game Over:** Game only ends when BOTH players are downed/dead.
  - **XP & Leveling:** XP is shared evenly; both players level up simultaneously and choose skills from their own menus.

## Controls

| Input | Action |
|-------|--------|
| **W** | Move Up |
| **A** | Move Left |
| **S** | Move Down |
| **D** | Move Right |
| **Mouse Movement** | Aim weapon |
| **Mouse Button** | Hold to shoot |
| **Right Mouse (Hold)** | Orbit Camera (Rotate View) |
| **Mouse Wheel** | Zoom In / Out |
| **ESC** | Open Pause Menu |
| **Q** | Toggle Autoshoot |
| **SPACE** | Quick Freeze (Toggle) |

### 2-Player Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| **Move** | **WASD** | **Arrow Keys** |
| **Shoot** | **Mouse Click** (or Autoshoot) | **Autoshoot** (Always On)* |
| **Aim** | **Mouse Cursor** | **Nearest Enemy** (Auto) |
| **Revive Ally** | **E** (Hold) | **Right Ctrl** (Hold)** |
| **Choose Skill**| **WASD + E/Space** | **Arrows + Enter/RCtrl** |

*\*Note: Player 2 currently relies on Autoshoot for targeting. Manual aim for P2 is experimental/TBD.*
*\*\*Note: Revive keys are only active when near a downed ally.*

**Notes:**
*   **Camera-Relative Movement:** "Forward" (W) always moves your character away from the camera view.
*   **Diagonal Movement:** Normalized for consistent speed.

### Pause Menu Options
When you press ESC, the game pauses and shows:
- **Resume (ESC):** Continue playing
- **Restart:** Start a new run
  - Normal game: Immediately restarts with same settings
  - Custom game: Returns to enemy selection screen
- **Exit to Main Menu:** Return to start screen (game is reset)

### Quick Freeze (Spacebar)
Pressing **SPACE** toggles a tactical "frozen" state overlay:
- The game pauses instantly, but keeps the action visible.
- Press **SPACE** again to resume.
- **Smart Resume:** You can also resume by pressing any *new* movement or attack key. Keys that were already held when you froze are ignored to prevent accidental resumption.

## Game Mechanics

### Wave System
- New wave every **15 seconds**
- Enemy spawn rate increases each wave
- Enemy stats scale up by **10% per wave**
- Waves 15+: Additional 5% scaling per wave
- Waves 25+: Additional 10% scaling per wave
- Wave 40 difficulty is approximately 5x base difficulty

### Experience & Leveling
- Enemies drop **XP orbs** (green crystals)
- XP orbs are magnetic - auto-collect when nearby (80px range, pulls 10% faster than player speed)
- XP needed per level: Previous × 1.5 (exponential growth)
- Excess XP carries over to next level (can level up multiple times at once)
- Choose 1 of 3 random skills on level up
- Game pauses during skill selection

### Health System
- Base max health: **100 HP**
- Health displayed in top-left corner
- Red health bar shows current/max HP
- Can be increased with skills and meta-upgrades
- Health pickups (red hearts) restore **20 HP** (5% drop rate)

### Shooting Mechanics
- **Autoshoot:** Enabled by default (toggle with **Q**). Automatically targets nearest enemy within range.
- **Manual Override:** Clicking mouse temporarily disables autoshoot for 2 seconds to allow manual aiming.
- Default fire rate: 1 shot per 10 frames (~6 shots/second at 60 FPS)
- Default damage: 10 per bullet
- Default bullet speed: 8 pixels/frame
- Default range: 427 pixels (~30% of screen diagonal)
- Bullets destroyed on hit (unless piercing)

### Difficulty Scaling
| Wave | Enemy Spawn Rate | New Enemy Types | Stat Multiplier |
|------|------------------|-----------------|-----------------|
| 1-2 | 60 frames | Basic only | 1.0x |
| 3-4 | 54 frames | + Fast | 1.2x |
| 5-6 | 48 frames | + Shooter | 1.4x |
| 7-9 | 42-36 frames | + Tank | 1.6-1.8x |
| 10-14 | 30-24 frames | All types | 2.0-2.4x |
| 15-19 | 22-20 frames | Mostly tanks/shooters | 2.75-3.25x |
| 20-24 | 20 frames (min) | Heavy composition | 4.0-4.5x |
| 25+ | 20 frames | Extreme difficulty | 5.0x+ |

### Status Effects

#### Ice Slow (Cumulative)
- **Source:** Ice Shooter projectiles
- **Effect:** Reduces movement speed by 15% per stack for 1 second
- **Stacking:** Multiple ice bullets each add their own 15% slow effect
- **Duration:** Each stack has independent 1-second timer
- **Visual Indicators:**
  - Status icon appears next to health bar showing stack count (❄ #)
  - Blue glow on screen edges that intensifies with more stacks
  - At low stacks (1-2): Subtle blue tint
  - At medium stacks (3-4): Moderate blue-white glow, vision starts narrowing
  - At high stacks (5-6): Strong tunnel vision, intense blue-white overlay
  - At maximum stacks (7+): Near-complete whiteout, player frozen in place (100% slow)
- **Maximum Effect:** 100% slow (complete immobilization)
- **Counter-play:** Avoid ice projectiles, use movement speed to dodge
- **Tooltip:** Hover over status icon to see total slow percentage

## Enemy Types

### Basic Enemy (Red Blob)
- **HP:** 30
- **Speed:** 1.5 px/frame
- **Damage:** 10 (contact)
- **XP Value:** 1 orb
- **Behavior:** Moves directly toward player
- **First Appears:** Wave 1

### Fast Enemy (Pink)
- **HP:** 15
- **Speed:** 3.0 px/frame
- **Damage:** 5 (contact)
- **XP Value:** 2 orbs
- **Behavior:** Quickly chases player
- **Threat:** High mobility, hard to avoid
- **First Appears:** Wave 3

### Tank Enemy (Purple)
- **HP:** 100
- **Speed:** 0.8 px/frame
- **Damage:** 20 (contact)
- **XP Value:** 5 orbs
- **Behavior:** Slow but tanky
- **Threat:** Blocks paths, soaks damage
- **First Appears:** Wave 7

### Shooter Enemy (Orange)
- **HP:** 20
- **Speed:** 1.0 px/frame
- **Contact Damage:** 5
- **Bullet Damage:** 5
- **XP Value:** 3 orbs
- **Fire Rate:** Burst of 3 shots every 120 frames
- **Bullet Speed:** 4 px/frame
- **Behavior:** Maintains distance, stops and kneels to fire
- **Threat:** Ranged burst damage, slight spread on bullets
- **Threat:** Ranged attacks, multiple damage sources
- **First Appears:** Wave 5

### Ice Shooter Enemy (Light Blue)
- **HP:** 25
- **Speed:** 0.9 px/frame
- **Contact Damage:** 5
- **Bullet Effect:** Applies "Deep Freeze" stack (DoT)
- **Damage over Time:** Deals 1 damage every 0.2s when player is frozen (100% slow)
- **XP Value:** 3 orbs
- **Fire Rate:** Every 180 frames (3 seconds)
- **Bullet Speed:** 4 px/frame
- **Behavior:** Maintains distance, stops to shoot
- **Threat:** High control threat. Does NOT deal direct contact damage with bullets, but freezing allows other enemies to catch you.
- **Visual Effect:** Blue glow on screen edges when hit (intensity increases with stacks)
- **First Appears:** Wave 8

## Skills & Upgrades

### Available Skills (17 Total)

#### 1. Increased Damage
- **Effect:** +20% damage per level
- **Stacks:** Multiplicative
- **Example:** Base 10 → 12 → 14.4 → 17.3
- **Best For:** All builds

#### 2. Faster Fire Rate
- **Effect:** -15% fire delay per level
- **Stacks:** Multiplicative
- **Example:** 10 frames → 8.5 → 7.2 → 6.1
- **Minimum:** 1 frame
- **Best For:** Sustained DPS builds

#### 3. Movement Speed
- **Effect:** +8% speed per level
- **Stacks:** Multiplicative
- **Example:** 3.0 → 3.24 → 3.5 → 3.78
- **Best For:** Dodging, kiting

#### 4. Max Health
- **Effect:** +30 HP per level
- **Stacks:** Additive
- **Example:** 100 → 130 → 160 → 190
- **Also:** Heals +30 HP when picked
- **Best For:** Survivability

#### 5. Multi-Shot
- **Effect:** +1 projectile per level
- **Spread:** 0.3 radians between projectiles
- **Example:** 1 → 2 → 3 → 4 bullets
- **Cost:** Each shot consumes ammo
- **Best For:** Area coverage, multiple enemies

#### 6. Piercing Shots
- **Effect:** +1 enemy pierced per level
- **Example:** 0 → 1 → 2 → 3 enemies
- **Note:** Bullet survives after hit
- **Best For:** Crowded situations, lines of enemies

#### 7. Explosive Rounds
- **Effect:** Bullets explode on impact, dealing % of damage to nearby enemies
- **Damage:** 10% / 20% / 30% of hit damage to neighbors
- **Radius:** 80 pixels
- **Visual:** "Explosion Ring" shockwave effect
- **Best For:** Crowd clearing, tightly packed groups

#### 8. Extended Range
- **Effect:** +50% bullet range per level
- **Stacks:** Multiplicative
- **Example:** 427 → 641 → 961 → 1442 pixels (max = full screen diagonal)
- **Best For:** Safety, kiting strategies

#### 9. Health Regeneration
- **Effect:** +1 HP/second per level
- **Ticks:** Every 60 frames
- **Example:** 0 → 1 → 2 → 3 HP/sec
- **Best For:** Long survival, tanky builds

#### 10. Vampiric Touch
- **Effect:** +1 HP per kill
- **Cooldown:** 0.5 seconds (30 frames)
- **Max Healing:** 2 HP/second from kills
- **Best For:** Aggressive playstyles

#### 11. Freeze Chance
- **Effect:** +10% chance per level to freeze enemies for 1 second
- **Stacks:** Additive
- **Example:** Level 1 = 10%, Level 2 = 20%, Level 3 = 30%
- **Visual Effect:** Frozen enemies glow with ice blue color and cannot move
- **Best For:** Crowd control, buying time to reposition

#### 12. Extra Choice
- **Effect:** Adds a 4th skill option during level-up selection
- **Max Level:** 1 (single upgrade only)
- **Example:** Choose from 4 skills instead of 3
- **Note:** Does not stack - only one level available
- **Best For:** All builds - more flexibility in skill selection

#### 13. Berserk Mode
- **Effect:** +50% damage per level when health drops below threshold
- **Thresholds:**
  - Level 1: +50% damage when ≤10% HP
  - Level 2: +100% damage when ≤15% HP
  - Level 3: +150% damage when ≤20% HP
- **Stacks:** Additive per level
- **Example:** Level 3 at 18% HP = 2.5x damage multiplier
- **Best For:** High-risk aggressive builds, glass cannon strategies

#### 14. Armor
- **Effect:** +1 armor per level (permanent damage reduction)
- **Mechanic:** Reduces all incoming damage by armor amount
- **Example:** With 3 armor, taking 5 damage results in only 2 damage to HP (armor stays at 3)
- **Stacks:** Additive
- **Max Level:** 3 (total 3 permanent damage reduction)
- **Best For:** Survivability, tanky builds, reducing all damage sources

#### 15. Magnet Range
- **Effect:** +50% pickup range per level
- **Base Range:** 80 pixels
- **Stacks:** Multiplicative
- **Example:** 80 → 120 → 180 → 270 pixels
- **Applies To:** XP orbs and health pickups
- **Best For:** Safer item collection, avoiding risky pickups

#### 16. Lucky Drops
- **Effect:** +2% health drop rate per level
- **Base Rate:** 5% (without skill)
- **Stacks:** Additive
- **Example:** 5% → 7% → 9% → 11%
- **Max Level:** 3
- **Best For:** Sustainability, reduced reliance on health regen

#### 17. Light Radius
- **Effect:** +50% light radius per level
- **Stacks:** Additive (+0.5 per level)
- **Example:** +50% → +100% → +150% visible area diameter
- **Best For:** Scouting enemies early, spotting XP from afar

## Meta Progression

### Soul Currency
- **Earn:** 1 Soul per 5 kills (defeat)
- **Earn:** 1 Soul per 3 kills + 50 bonus (victory)
- **Persistent:** Souls saved between runs
- **Use:** Purchase permanent upgrades

### Permanent Upgrades

#### Base Damage I
- **Cost:** 10, 20, 30, 40, 50 Souls
- **Max Level:** 5
- **Effect:** Start with +10% damage per level
- **Total at Max:** +50% starting damage

#### Base Health I
- **Cost:** 15, 30, 45, 60, 75 Souls
- **Max Level:** 5
- **Effect:** Start with +10 max HP per level
- **Total at Max:** +50 HP (150 total)

#### Base Speed I
- **Cost:** 20, 40, 60 Souls
- **Max Level:** 3
- **Effect:** Start with +5% speed per level
- **Total at Max:** +15% starting speed

#### XP Boost
- **Cost:** 20, 40, 60 Souls
- **Max Level:** 3
- **Effect:** Gain +20% more XP per level
- **Total at Max:** +60% XP gain
- **Impact:** Faster leveling, more skills per run

### Reset Upgrades

You can reset all permanent upgrades at any time:

- **Reset All Button:** Available in the permanent upgrades menu
- **Refund:** Returns all souls spent on upgrades
- **Confirmation:** Custom dialog shows exact refund amount before resetting
- **Disabled State:** Button is grayed out when no upgrades have been purchased
- **Strategy:** Allows you to respec and try different upgrade combinations

## Stats & Tracking

### In-Game HUD
- **Bottom-Left:** Health bar and HP counter (red)
- **Status Effects:** To the right of health bar, shows active effects with stacks
  - Ice effect: ❄ with stack count (e.g., "❄ 3" = 3 slow stacks = 45% slow)
  - Hover for total slow percentage
- **Bottom-Right:** XP bar and level (green)
- **Top-Left:** Time elapsed and current wave
- **Top-Right:** Total kills

### End Game Statistics

#### General Stats
- Time survived (MM:SS format)
- Final wave reached
- Final level achieved
- Souls earned this run

#### Combat Stats
- **Damage Dealt:** Total damage to all enemies
- **Accuracy:** (Hits / Shots Fired) × 100% (displayed as whole number)
- **Shots Fired/Hit:** Detailed accuracy breakdown

#### Enemies Killed (by type)
- Basic enemies killed
- Fast enemies killed
- Tank enemies killed
- Shooter enemies killed

#### Damage Received (by source)
- Damage from Basic enemies
- Damage from Fast enemies
- Damage from Tank enemies
- Damage from Shooter enemies
- Damage from enemy bullets

#### Skills Picked
- Chronological list of all skills chosen
- Shows level when each skill was picked
- Example: "Lv2: Increased Damage"

### Run Comparison
After your first run, stats show **delta comparison** in green/red:
- **Green (+):** Improvement over last run
- **Red (-):** Worse than last run
- **Gray (=):** Same as last run

Example: `Damage Dealt: 5,234 (+1,123)` means you dealt 1,123 more damage than last run.

## Tips & Strategy

### Early Game (Waves 1-5)
- **Priority Skills:** Damage, Fire Rate
- **Strategy:** Learn enemy patterns
- **Movement:** Practice kiting in circles
- **Goal:** Reach level 5+ before wave 5

### Mid Game (Waves 6-15)
- **Priority Skills:** Multi-Shot, Piercing, Health
- **Strategy:** Focus on crowd control
- **Watch For:** Shooter enemies (ranged threat)
- **Goal:** Build a synergistic skill set

### Late Game (Waves 16-25)
- **Priority Skills:** Health Regen, Max Health, Speed
- **Strategy:** Survival over damage
- **Watch For:** Tank swarms, multiple shooters
- **Goal:** Stay alive until 10:00

### Extreme Late Game (Waves 26+)
- **Priority Skills:** Everything defensive
- **Strategy:** Constant movement, avoid corners
- **Watch For:** Screen full of enemies
- **Note:** Victory already achieved at 10:00

### Build Archetypes

#### Glass Cannon
- **Skills:** Damage, Fire Rate, Multi-Shot, Bullet Speed
- **Pros:** Massive DPS, fast clearing
- **Cons:** Low survivability
- **Difficulty:** Hard (requires perfect dodging)

#### Tank Build
- **Skills:** Max Health, Health Regen, Vampiric Touch
- **Pros:** Very hard to kill
- **Cons:** Slow enemy clear, risky late game
- **Difficulty:** Medium

#### Balanced Build
- **Skills:** Mix of offense and defense
- **Pros:** Flexible, forgiving
- **Cons:** Not exceptional at anything
- **Difficulty:** Easy (recommended for first win)

#### Piercing/Multi-Shot Combo
- **Skills:** Multi-Shot, Piercing, Bullet Velocity, Range
- **Pros:** Handles crowds extremely well
- **Cons:** Requires good positioning
- **Difficulty:** Medium

### Meta-Progression Strategy

1. **First Goal:** Save 50 Souls
2. **Invest In:** Base Health I (2 levels)
3. **Next:** Base Damage I (2 levels)
4. **Then:** XP Boost (all 3 levels)
5. **Finally:** Max everything out

### Advanced Techniques

**Kiting:** Move in large circles around the arena, enemies bunch up behind you

**Corner Avoidance:** Never back yourself into a corner - always leave escape routes

**Shooter Priority:** Kill ranged enemies first to reduce incoming damage

**XP Timing:** Grab XP right before leveling to clear enemies safely

**Health Management:** Don't heal at full HP - save health pickups for emergencies

**Bullet Conservation:** In early waves, tap-fire to save shots and improve accuracy

## Frequently Asked Questions

**Q: What happens if I die?**
A: Game over screen shows stats, comparison to last run, and Souls earned. You can restart or view upgrades.

**Q: Can I pause mid-wave?**
A: Yes! Press ESC to pause. Game state is frozen, showing current stats.

**Q: Do skills stack?**
A: Yes! Most skills can be picked multiple times with increasing effects.

**Q: What's the best skill?**
A: Depends on your build, but Health Regen is very strong for survivability.

**Q: Can I rebind controls?**
A: Not currently. WASD and mouse are hardcoded.

**Q: Does the game save automatically?**
A: Meta-progression (Souls and upgrades) saves automatically. Run stats save at game over.

**Q: What happens after 10 minutes?**
A: Victory! You get bonus Souls and can continue playing if you want.

**Q: Can I play offline?**
A: Yes, it's a fully client-side game with no server requirements.

**Q: How do I reset my progress?**
A: Open browser DevTools > Application > Local Storage > delete arpg_* entries.

## Changelog & Version History

See README.md for current version and feature list.

## Credits

Built with vanilla JavaScript, HTML5 Canvas, and Webpack.

Procedurally generated pixel art sprites.

No external game libraries - everything built from scratch!

---

**Good luck, and may you survive the waves!** 🎮
