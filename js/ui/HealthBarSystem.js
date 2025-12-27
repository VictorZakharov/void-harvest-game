import * as THREE from 'three';

/**
 * Manages all enemy health bar visuals.
 * Replaces the decentralized EnemyVisuals logic.
 */
export class HealthBarSystem {
    constructor(scene) {
        this.scene = scene;
        this.bars = new Map(); // Map<Enemy, THREE.Object3D>

        // Shared Materials for batching efficiency
        this.bgMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            depthTest: false, // Ensure visibility on top
            depthWrite: false
        });

        this.fgMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
        });

        // Geometries
        const hbWidth = 24;
        const hbHeight = 5.0;

        this.bgGeo = new THREE.PlaneGeometry(hbWidth, hbHeight);

        this.fgGeo = new THREE.PlaneGeometry(hbWidth - 0.4, hbHeight - 0.4);
        this.fgGeo.translate((hbWidth - 0.4) / 2, 0, 0); // Pivot left
    }

    /**
     * Creates a health bar for the given enemy.
     * @param {Enemy} enemy 
     */
    register(enemy) {
        if (this.bars.has(enemy)) return;

        const group = new THREE.Group();

        const bg = new THREE.Mesh(this.bgGeo, this.bgMat);
        bg.position.y = 0; // Pivot is now handled by group position

        const fg = new THREE.Mesh(this.fgGeo, this.fgMat.clone()); // Clone for unique color
        fg.position.set(-(24 - 0.4) / 2, 0, 0.1); // Relative to bg center

        bg.add(fg);
        group.add(bg);

        // Ensure drawing on top
        group.renderOrder = 999;
        bg.renderOrder = 999;
        fg.renderOrder = 999;

        // Store reference to foreground directly on group for easy access
        group.userData = {
            foreground: fg,
            background: bg,
            lastHealth: enemy.health,
            visibilityTimer: 0
        };
        group.visible = false;

        this.scene.add(group);
        this.bars.set(enemy, group);
    }

    /**
     * Removes the health bar for the enemy.
     * @param {Enemy} enemy 
     */
    unregister(enemy) {
        const group = this.bars.get(enemy);
        if (group) {
            this.scene.remove(group);
            // Dispose logic?
            // Geometries are shared, materials are shared (except fg clone? handle later)
            // Ideally we reuse objects (Pooling), but for now:
            group.userData.foreground.material.dispose();
            this.bars.delete(enemy);
        }
    }

    /**
     * Updates all active health bars.
     * @param {THREE.Camera} camera
     * @param {Player} player 
     * @param {THREE.Vector3} cursorTarget - World position of the cursor light.
     * @param {Array<Enemy>} activeEnemies - List of currently active enemies for reconciliation.
     */
    update(camera, player, cursorTarget, activeEnemies) {
        // Reconciliation: Detect and remove orphans
        // We create a Set of active enemy IDs (or objects) to verify validity
        // Optimization: Only run reconciliation check periodically or if counts mismatch?
        // But for reliability with < 1000 enemies, Set construction is fast enough.
        let activeSet = null;
        if (activeEnemies) {
            activeSet = new Set(activeEnemies);
        }

        // Time constant approx for 60fps (1.0 scale)
        const DECAY_RATE = 1.0 / 60.0;
        const toRemove = [];

        for (const [enemy, group] of this.bars) {
            // Check 1: Health (Dead)
            if (enemy.health <= 0) {
                group.visible = false;
                toRemove.push(enemy);
                continue;
            }

            // Check 2: Orphaned (Removed from game but stuck in UI)
            if (activeSet && !activeSet.has(enemy)) {
                group.visible = false;
                toRemove.push(enemy);
                continue;
            }

            // Detect Damage (Hit in darkness logic)
            if (enemy.health < group.userData.lastHealth) {
                // Enemy took damage, show bar for 1 second
                group.userData.visibilityTimer = 1.0;
                group.userData.lastHealth = enemy.health;
            } else if (enemy.health > group.userData.lastHealth) {
                // Healed? Just update tracker
                group.userData.lastHealth = enemy.health;
            }

            // Check Light Visibility
            if (player && cursorTarget) {
                // Check distance to CURSOR LIGHT, not player body
                // Because the cursor emits the light
                const dx = (enemy.x + enemy.width / 2) - cursorTarget.x;
                const dz = (enemy.y + enemy.height / 2) - cursorTarget.z;
                const distSq = dx * dx + dz * dz;

                const lightRad = player.getLightRadius ? player.getLightRadius() : 500;
                // Add buffer
                if (distSq < (lightRad + 50) * (lightRad + 50)) {
                    // In light: Refresh timer
                    group.userData.visibilityTimer = 1.0;
                }
            }

            // Decay Timer
            if (group.userData.visibilityTimer > 0) {
                // If we don't have delta time passed in, assume 1 frame at 60fps? 
                // Or rely on it checking next frame. 
                // Wait, update is called every frame. We need DT.
                // game.js calls `this.healthBarSystem.update(this.rendering.camera3D, this.player)`. 
                // It doesn't pass dt.
                // Changing signature to include dt would be cleaner, but let's assume 1/60 for now or passed via wrapper.
                // Let's rely on the fact that 1.0 = 1 second in this logic IF we decrement by dt/60 or similar.
                // Actually, let's just decrement by approx 0.016 (16ms) per call if game is running.
                // Better: Decrement by 1/60. 
                group.userData.visibilityTimer -= DECAY_RATE;
            }

            // Position
            // Tank is tall (~75), others ~60. 
            let heightOffset = 70;
            if (enemy.type === 'tank') heightOffset = 90;
            if (enemy.type === 'shooter') heightOffset = 75;

            group.position.set(enemy.x + enemy.width / 2, heightOffset, enemy.y + enemy.height / 2);

            // Update Height
            if (group.userData.background) {
                group.userData.background.position.y = 0;
            }

            const isDamaged = enemy.health < enemy.maxHealth;
            // Visible if: (Damaged AND (Timer > 0))
            // We only show full health bars if explicitly requested, but usually only damaged ones.
            // Wait, standard behavior is usually: Full hp bars hidden. Damaged visible.
            // So Timer applies to DAMAGED bars visibility.

            if (isDamaged && group.userData.visibilityTimer > 0) {
                group.visible = true;

                // Percent stuff
                const pct = Math.max(0, enemy.health / enemy.maxHealth);
                const fg = group.userData.foreground;

                fg.scale.x = pct;

                // Color tint (Green -> Red)
                const hue = pct * 0.3;
                fg.material.color.setHSL(hue, 1, 0.5);

                // Billboard
                if (camera) {
                    group.quaternion.copy(camera.quaternion);
                }
            } else {
                group.visible = false;
            }
        }

        // Process removals
        for (const enemy of toRemove) {
            this.unregister(enemy);
        }
    }

    /**
     * Clears all health bars from the scene.
     */
    clear() {
        for (const [enemy, group] of this.bars) {
            this.scene.remove(group);
            if (group.userData.foreground.material) group.userData.foreground.material.dispose();
        }
        this.bars.clear();
    }
}
