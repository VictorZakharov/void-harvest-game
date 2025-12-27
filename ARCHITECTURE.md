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
│   ├── PhysicsSystem.js           - Centralized collision detection & resolution
│   └── SpatialHash.js             - O(1) spatial partitioning for collision optimization
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
