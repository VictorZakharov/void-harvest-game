# Void Harvest - Project Architecture

This document provides a comprehensive technical guide to the Void Harvest codebase, detailing the project structure, file responsibilities, and core design patterns.

## Project Structure (JS)

```text
js/
├── entities/
│   ├── bullet-manager.js          - Pooled management of all projectiles
│   ├── Bullet.js                  - Individual projectile logic and 3D mesh
│   ├── enemy-spawner.js           - Difficulty scaling and wave-based spawning
│   ├── Enemy.js                   - Enemy logic/AI state (no rendering)
│   ├── EnemyInstancedAnimation.js - CPU-side animation state calculator
│   ├── EnemyInstancedGeometry.js  - Shared geometry definitions for instancing
│   ├── EnemyInstancedRenderer.js  - High-perf InstancedMesh renderer (2500+ entities)
│   ├── EnemyMeshFactory.js        - Visual asset generation for enemies
│   ├── Entity.js                  - Base class for all physical game objects
│   ├── ExplosionRing.js           - Visual effect for periodic explosions
│   ├── item-manager.js            - Spawning and collection of XP/Health packs
│   ├── Item.js                    - Logical item representation and visual behavior
│   ├── particle-manager.js        - High-performance effect system
│   ├── Player.js                  - Player movement, logic, and skill application
│   ├── PlayerMeshFactory.js       - Procedural mesh generation for player
│   └── PlayerVisuals.js           - Three.js rendering component for the player
├── systems/
│   ├── CameraSystem.js            - Camera follow, smoothing, and shake logic
│   ├── GameInputSystem.js         - Global state toggles (Pause, Freeze, Training)
│   ├── PhysicsSystem.js           - Centralized collision detection & resolution
│   ├── ResurrectionSystem.js      - Multiplayer revive mechanics and input handling
│   ├── SpatialHash.js             - O(1) spatial partitioning for collision optimization
│   └── TargetingSystem.js         - Centralized enemy detection logic for autoshoot/AI
├── ui/
│   ├── UISkillDetail.js     - Logic for skill bonus/scaling calculations
│   ├── UIStatItem.js        - Component for interactive stat rows/tooltips
│   ├── UIUtils.js           - Shared UI formatting and helper functions
│   ├── UI3DRenderer.js      - 3D rendering context for UI elements (cards)
│   └── HealthBarSystem.js   - Optimized planar HTML overlay for health bars
├── biomes.js                - Environment configuration (fog, ground, weather)
├── constants.js             - Global game constants and balancing parameters
├── entities.js              - Centralized export point for entity classes
├── game.js                  - Main Orchestrator; manages the core loop
├── icons.js                 - Consolidated SVG asset repository
├── input.js                 - Keyboard/Mouse handler with delta tracking
├── LightingManager.js       - Encapsulates Three.js lighting and glow logic
├── main.js                  - Entry point; initializes the Game instance
├── particles.js             - Individual particle logic and visuals
├── PersistenceManager.js    - Clean interface for save/load operations
├── RenderingManager.js      - Encapsulates Three.js scene/camera setup
├── skills.js                - Skill definitions, descriptions, and effects
├── sprites.js               - 2D Canvas sprite generation for UI/FX
├── stats.js                 - Lower-level statistics persistence logic
├── texture-generator.js     - Procedural ground and noise texture generation
├── ui.js                    - Main UI entry point and event delegation
├── ui-custom.js             - Custom HUD and character sheet logic
├── ui-gameover.js           - Game Over screen and results summary
├── ui-hud.js                - In-game overlay (health, XP bar, mini-map)
├── ui-levelup.js            - Level-up choice modal logic
├── ui-meta.js               - Meta-progression and upgrade menu logic
├── ui-modals.js             - Shared modal system (e.g., In-game Guide)
├── ui-pause.js              - High-level orchestrator for the pause menu
├── ui-templates.js          - HTML template strings for UI components
├── WeatherManager.js        - Synchronizes weather states with visuals
└── weather-system.js        - Low-level particle and fog systems for biomes
```

---

## Core Design Principles

### 1. Orchestration & Delegation
The `Game` class in `game.js` is the central hub. It does not implement complex logic directly; instead, it coordinates actions between specialized **Managers** (Rendering, Lighting, Weather) and **Entities**.

### 2. Logic vs. Visuals (Separation of Concerns)
Complex entities like `Player` and `Enemy` follow a component-like split:
- **`Entity.js`**: Core gameplay data (Position, HP, Stats).
- **`Visuals.js`**: Three.js code, mesh manipulation, and material effects.
This allows us to update the graphics engine without touching the gameplay math.

### 3. Manager Pattern
Subsystems are encapsulated in managers to keep the main loop clean:
- **`RenderingManager`**: Isolated Three.js boilerplate.
- **`bullet-manager`**: Performance-optimized projectile tracking.
- **`WeatherManager`**: High-level state management for environment effects.

### 4. Componentized UI
The UI is modularized into the `js/ui/` directory. Complex elements like stat-rows-with-tooltips are rendered via `UIStatItem.render()`, allowing for consistent styling and behavior across different modal screens.

### 5. Procedural Generation
To minimize asset load times and repository size, the game generates its own textures (`texture-generator.js`) and sprites (`sprites.js`) at runtime using HTML5 Canvas.

### 6. Centralized Configuration
Balanced game data is never hardcoded. It resides in:
- **`constants.js`**: Numerical values (speed, range, costs).
- **`skills.js`**: Content-rich skill definitions and descriptions.
- **`biomes.js`**: Environmental aesthetics and weather types.

### 7. Instanced Rendering
To support massive enemy counts (up to 2500 active entities) without dropping frames, we use **Three.js InstancedMesh**.
- **`EnemyInstancedRenderer`**: Manages a single draw call per mesh part (Body, Eyes, Limbs, Gun).
- **`EnemyInstancedAnimation`**: CPU-side matrix calculations for walking/shooting animations, updated directly into the instance buffer.
- This decoupling allows the `Enemy` logical class to remain lightweight, while the renderer handles the heavy lifting of matrix composition.

### 8. Spatial Hashing & Physics
Collision detection is cached via a **Spatial Hash Grid** (`SpatialHash.js`).
- The world is divided into fixed-size cells.
- Entities register their cell occupancy each frame.
- **`PhysicsSystem`** queries only adjacent cells for collisions, reducing checks from O(N²) to near O(N).

### 9. Factory Pattern for Visuals
Mesh generation complexity is extracted into Factories:
- **`PlayerMeshFactory`** & **`EnemyMeshFactory`**: Isolate the procedural geometry construction code.
- This separates the "recipe" for a 3D model from the class that controls it.

---

## Technical Gotchas & Development Tips

- **Compounding Math**: Most offensive skills (Damage, Fire Rate, Range) use **multiplicative** scaling (e.g., `dmg *= 1.2`). This is critical because enemy HP/count scales exponentially. Additive scaling will cause the player to fall behind drastically after Wave 15.
- **2D Logic, 3D World**: Game coordinates are strictly `(X, Y)`. When translating to Three.js, these map to `(X, 0, Y)`. Always check the `Y` (height) value in 3D if objects aren't visible—they might be under the ground plane.
- **GPU Memory Management**: When removing an entity (Player or Enemy), you **must** call `entity.dispose(scene)`. Removing the mesh from the scene is not enough; Three.js geometries and materials must be explicitly disposed to prevent memory leaks during long runs.
- **No Static Assets**: You will not find `.png` or `.jpg` files for textures. All world textures and UI sprites are generated at runtime via `texture-generator.js` and `sprites.js`. To change the "look" of the game, you must modify the canvas drawing logic.
- **Orchestrator Dependency**: Refrain from adding heavy logic to the main update loop in `game.js`. If you are adding a new feature (e.g., a new weapon system or weather effect), create a new Manager and hook it into the orchestrator.

---

## Project Size Analysis
- **Generated At**: 2025-12-29
- **Total JS Files**: 55
- **Total Project Size**: 392.0 KB
- **Total Raw LOC**: 10409
- **Total Logical LOC**: 6982

- **Generating:** `node scripts/analyze-project-size.js` will recurse through the directory, count LOC, and generate the markdown table below.
- **Why?** Keeping track of file bloat helps identify candidates for refactoring (like `game.js`, which was recently split).

### Full File List (Sorted by Logic LOC)
| File | Size | Raw LOC | Logic LOC ▼ |
|---|---|---|---|
| `js/game.js` | 29.8 KB | 853 | 554 |
| `js/ui.js` | 16.7 KB | 560 | 417 |
| `js/entities/PlayerVisuals.js` | 21.0 KB | 594 | 356 |
| `js/skills.js` | 11.7 KB | 360 | 336 |
| `js/entities/bullet-manager.js` | 22.0 KB | 456 | 281 |
| `js/entities/Player.js` | 11.0 KB | 400 | 249 |
| `js/weather-system.js` | 13.3 KB | 371 | 242 |
| `js/entities/EnemyMeshFactory.js` | 13.5 KB | 336 | 221 |
| `js/entities/Enemy.js` | 11.2 KB | 332 | 216 |
| `js/ui-templates.js` | 13.4 KB | 242 | 211 |
| `js/texture-generator.js` | 11.1 KB | 293 | 209 |
| `js/entities/enemy-spawner.js` | 10.6 KB | 290 | 188 |
| `js/ui-levelup.js` | 11.7 KB | 279 | 186 |
| `js/entities/EnemyInstancedRenderer.js` | 11.8 KB | 290 | 185 |
| `js/ui-custom.js` | 9.0 KB | 252 | 179 |
| `js/LightingManager.js` | 9.4 KB | 246 | 166 |
| `js/ui-pause.js` | 10.9 KB | 227 | 165 |
| `js/ui-hud.js` | 9.7 KB | 232 | 164 |
| `js/sprites.js` | 6.6 KB | 169 | 134 |
| `js/entities/PlayerMeshFactory.js` | 6.6 KB | 174 | 129 |
| `js/ui/HealthBarSystem.js` | 8.0 KB | 225 | 124 |
| `js/DOMCache.js` | 9.2 KB | 204 | 123 |
| `js/systems/GameInputSystem.js` | 4.7 KB | 142 | 115 |
| `js/entities/EnemyInstancedAnimation.js` | 7.5 KB | 218 | 101 |
| `js/ui/UISkillDetail.js` | 5.3 KB | 115 | 101 |
| `js/ui/PlayerOverheadUI.js` | 5.1 KB | 156 | 99 |
| `js/entities/Bullet.js` | 4.9 KB | 137 | 97 |
| `js/WeatherManager.js` | 5.6 KB | 155 | 97 |
| `js/RenderingManager.js` | 5.7 KB | 158 | 93 |
| `js/ui/UI3DRenderer.js` | 4.9 KB | 132 | 91 |
| `js/entities/item-manager.js` | 5.5 KB | 155 | 90 |
| `js/ui/UIStatItem.js` | 5.0 KB | 118 | 86 |
| `js/ui-gameover.js` | 5.3 KB | 96 | 79 |
| `js/ui-meta.js` | 3.8 KB | 112 | 77 |
| `js/input.js` | 4.0 KB | 115 | 76 |
| `js/constants.js` | 5.2 KB | 157 | 73 |
| `js/entities/Item.js` | 4.1 KB | 107 | 70 |
| `js/systems/ResurrectionSystem.js` | 5.1 KB | 115 | 69 |
| `js/stats.js` | 2.0 KB | 68 | 59 |
| `js/entities/EnemyInstancedGeometry.js` | 3.4 KB | 110 | 57 |
| `js/systems/PhysicsSystem.js` | 2.5 KB | 76 | 56 |
| `js/systems/CameraSystem.js` | 2.1 KB | 70 | 46 |
| `js/systems/SpatialHash.js` | 2.6 KB | 78 | 45 |
| `js/entities/particle-manager.js` | 2.1 KB | 73 | 38 |
| `js/biomes.js` | 1.2 KB | 39 | 36 |
| `js/entities/Entity.js` | 1.2 KB | 45 | 36 |
| `js/particles.js` | 1.3 KB | 46 | 34 |
| `js/entities/ExplosionRing.js` | 1.4 KB | 45 | 31 |
| `js/systems/TargetingSystem.js` | 1.8 KB | 53 | 31 |
| `js/PersistenceManager.js` | 1.5 KB | 54 | 23 |
| `js/icons.js` | 7.8 KB | 27 | 22 |
| `js/ui-modals.js` | 498 B | 20 | 9 |
| `js/ui/UIUtils.js` | 443 B | 18 | 7 |
| `js/main.js` | 207 B | 8 | 3 |
| `js/entities.js` | 234 B | 6 | 0 |

### How to Update This Report
Run the following command to regenerate the project size analysis:
```bash
node scripts/analyze-project-size.js
```
Then copy the output and replace this section.

