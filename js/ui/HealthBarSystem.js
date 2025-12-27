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
        bg.position.y = 70; // Float above head

        const fg = new THREE.Mesh(this.fgGeo, this.fgMat.clone()); // Clone for unique color
        fg.position.set(-(24 - 0.4) / 2, 0, 0.1); // Relative to bg center

        bg.add(fg);
        group.add(bg);

        // Ensure drawing on top
        group.renderOrder = 999;
        bg.renderOrder = 999;
        fg.renderOrder = 999;

        // Store reference to foreground directly on group for easy access
        group.userData = { foreground: fg, background: bg };
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
     */
    update(camera) {
        for (const [enemy, group] of this.bars) {
            // Position
            // Tank is tall (~75), others ~60. 
            let heightOffset = 70;
            if (enemy.type === 'tank') heightOffset = 90;
            if (enemy.type === 'shooter') heightOffset = 75; // Gun raises profile?

            // Adjust visual Y relative to Enemy position (ground)
            // Note: group is set to enemy X/Y. 
            // The mesh inside group is at y=70 (by default).
            // We can adjust group.position.y to be floating + height.
            // Actually, bg.position.y is fixed at 70 in register.
            // Let's adjust here if needed, or just set group.position.y to 0 and rely on local Y.
            // But we can override local Y of the background mesh if we want dynamic.

            group.position.set(enemy.x + enemy.width / 2, 0, enemy.y + enemy.height / 2);

            // Update Height
            if (group.userData.background) {
                group.userData.background.position.y = heightOffset;
            }

            const isDamaged = enemy.health < enemy.maxHealth;
            const shouldBeVisible = (isDamaged && enemy.health > 0);

            if (shouldBeVisible) {
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
