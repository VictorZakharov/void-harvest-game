import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';
import { EnemyMeshFactory } from './EnemyMeshFactory.js';

/**
 * Handles all Three.js visual representations for an Enemy.
 * Separates rendering concerns from game logic.
 */
export class EnemyVisuals {
    /**
     * @param {Enemy} enemy - The enemy instance this visualizer belongs to.
     */
    constructor(enemy) {
        this.enemy = enemy;

        // References to visual components
        this.mesh = null;
        this.bodyMesh = null;
        this.baseColor = null;
        this.healthBar = null;
        this.hbOpacity = 0;
        this.wasDamaged = false;

        // Initialize the mesh
        this.mesh = this.createMesh();
    }

    /**
     * Creates the main visual group for the enemy.
     * @returns {THREE.Group}
     */
    /**
     * Creates the main visual group for the enemy.
     * @returns {THREE.Group}
     */
    /**
     * Creates the main visual group for the enemy.
     * @returns {THREE.Group}
     */
    createMesh() {
        const group = new THREE.Group();

        // --- Health Bar ---
        // Simple billboard style
        // Dimensions increased for visibility
        const hbWidth = 24;
        const hbHeight = 5.0; // Thicker as requested

        // Background (Dark)
        const bgGeo = new THREE.PlaneGeometry(hbWidth, hbHeight);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        this.hbStats = { bgMat }; // Cache for updates
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.y = 70; // Float above head

        // Foreground (Green/Red)
        const fgGeo = new THREE.PlaneGeometry(hbWidth - 0.4, hbHeight - 0.4);
        fgGeo.translate((hbWidth - 0.4) / 2, 0, 0); // Pivot left for scaling
        const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 1.0 });
        this.hbStats.fgMat = fgMat;
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.position.set(-(hbWidth - 0.4) / 2, 0, 0.1); // Relative to bg center

        bg.add(fg);
        group.add(bg);

        this.healthBar = bg;
        this.healthBar.foreground = fg; // Ref for scaling
        this.healthBar.visible = false; // Hidden by default

        return group;
    }

    /**
     * Updates the visuals based on external visibility, fog, and current camera.
     * @param {number} visibility - 0 to 1 scaling of current biome visibility.
     * @param {number} fogColor - Color of the biome fog.
     * @param {THREE.Camera} camera - Active game camera for billboarding.
     * @param {number} dt - Delta time in milliseconds since last frame.
     */
    update(dt, camera) {
        const enemy = this.enemy;

        // Position the group at the enemy's location.
        // We DO NOT rotate the group, so that child billboards can align with camera easily.
        this.mesh.position.set(enemy.x + enemy.width / 2, 0, enemy.y + enemy.height / 2);

        // --- Health Bar Logic ---
        if (this.healthBar) {
            const isDamaged = enemy.health < enemy.maxHealth;
            // Only show if damaged and alive
            const shouldBeVisible = (isDamaged && enemy.health > 0);

            if (shouldBeVisible) {
                this.healthBar.visible = true;

                // Update Health Percent
                const pct = Math.max(0, enemy.health / enemy.maxHealth);
                this.healthBar.foreground.scale.x = pct;

                // Color tint (Green -> Red)
                const hue = pct * 0.3; // 0.3 = Green, 0 = Red
                this.healthBar.foreground.material.color.setHSL(hue, 1, 0.5);

                // Billboard: Align with Screen Plane
                if (camera) {
                    this.healthBar.quaternion.copy(camera.quaternion);
                }

            } else {
                this.healthBar.visible = false;
            }
        }
    }

    /**
     * Clean up Three.js resources when the enemy is removed.
     * @param {THREE.Scene} scene - The scene to remove visuals from.
     */
    dispose(scene) {
        if (this.mesh) {
            if (scene) scene.remove(this.mesh);

            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.mesh = null;
        }
    }
}
