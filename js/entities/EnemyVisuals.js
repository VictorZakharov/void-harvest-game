import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

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
    createMesh() {
        const enemy = this.enemy;
        const color = ENEMY_SPRITE_COLORS[enemy.type].main;
        const geometry = new THREE.BoxGeometry(enemy.width, 20, enemy.height);
        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 1.0
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = false;

        this.bodyMesh = body;
        this.baseColor = color;

        // Group for body + ui
        const group = new THREE.Group();
        group.add(body);

        // Add "Face/Eyes"
        const eyeGeo = new THREE.BoxGeometry(4, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(enemy.width / 2 + 0.2, 5, -enemy.height / 4);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(enemy.width / 2 + 0.2, 5, enemy.height / 4);

        group.add(leftEye);
        group.add(rightEye);

        // Add Gun for shooter types
        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            const gunLength = 20;
            const gunGeo = new THREE.BoxGeometry(gunLength, 6, 6);
            const gunColor = enemy.type === 'ice' ? 0x88ccff : 0x333333;
            const gunMat = new THREE.MeshLambertMaterial({ color: gunColor, transparent: true, opacity: 1.0 });
            const gun = new THREE.Mesh(gunGeo, gunMat);

            gun.position.set(enemy.width / 2, -2, enemy.height / 2 + 4);
            gun.castShadow = true;
            group.add(gun);
        }

        // Health Bar (Billboard Group)
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 40, 0);

        const createPillGeo = (w, h) => {
            const shape = new THREE.Shape();
            const r = h / 2;
            shape.moveTo(r, -r);
            shape.lineTo(w - r, -r);
            shape.absarc(w - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
            shape.lineTo(r, r);
            shape.absarc(r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
            return new THREE.ShapeGeometry(shape);
        };

        // BG
        const bgGeo = createPillGeo(54, 12);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0 });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.x = -27;
        bg.userData.isHealthBar = true;
        hpGroup.add(bg);
        hpGroup.bg = bg;

        // FG
        const fgGeo = createPillGeo(50, 10);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.userData.isHealthBar = true;
        fg.position.z = 1;
        fg.position.x = -25;
        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg;

        hpGroup.visible = false;
        group.add(hpGroup);
        this.healthBar = hpGroup;

        return group;
    }

    /**
     * Updates the visuals based on external visibility, fog, and current camera.
     * @param {number} visibility - 0 to 1 scaling of current biome visibility.
     * @param {number} fogColor - Color of the biome fog.
     * @param {THREE.Camera} camera - Active game camera for billboarding.
     */
    update(visibility = 1.0, fogColor = 0x333333, camera = null) {
        if (!this.mesh) return;

        const enemy = this.enemy;
        this.mesh.position.set(enemy.x + enemy.width / 2, 10, enemy.y + enemy.height / 2);
        this.mesh.rotation.y = -enemy.angle;

        const v = Math.max(0, Math.min(1, visibility));

        if (this.bodyMesh) {
            const emissiveColor = enemy.frozen ? 0x00ffff : 0x000000;
            const emissiveIntensity = enemy.frozen ? 0.5 : 0;

            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.userData.isHealthBar) return;

                    if (child.material.emissive) {
                        child.material.emissive.setHex(emissiveColor);
                        child.material.emissiveIntensity = emissiveIntensity;
                    }

                    const targetOpacity = 0.05 + (0.95 * v);
                    child.material.transparent = true;
                    child.material.opacity = targetOpacity;

                    let targetColor = new THREE.Color(0x000000);

                    if (child === this.bodyMesh) {
                        targetColor.lerp(new THREE.Color(this.baseColor), v);
                    } else if (child.geometry && child.geometry.type === 'BoxGeometry' && child.geometry.parameters && child.geometry.parameters.width === 4) {
                        // Eyes
                        targetColor.setHex(0x000000);
                    } else if (child.geometry && child.geometry.parameters && child.geometry.parameters.width === 20) {
                        // Gun
                        const gunColor = enemy.type === 'ice' ? 0x88ccff : 0x333333;
                        targetColor.lerp(new THREE.Color(gunColor), v);
                    }

                    child.material.color.copy(targetColor);
                }
            });
        }

        // Update Health Bar
        if (this.healthBar) {
            const isDamaged = enemy.health < enemy.maxHealth;
            const shouldBeVisible = (v > 0.5 && isDamaged && enemy.health > 0);
            const targetOpacity = shouldBeVisible ? 1.0 : 0.0;

            if (shouldBeVisible && !this.wasDamaged) {
                this.hbOpacity = 1.0;
            } else if (this.hbOpacity < targetOpacity) {
                this.hbOpacity = Math.min(this.hbOpacity + 0.02, targetOpacity);
            } else if (this.hbOpacity > targetOpacity) {
                this.hbOpacity = Math.max(this.hbOpacity - 0.02, targetOpacity);
            }

            this.wasDamaged = isDamaged;

            if (this.hbOpacity > 0.01) {
                this.healthBar.visible = true;
                if (this.healthBar.bg) this.healthBar.bg.material.opacity = this.hbOpacity;
                if (this.healthBar.fg) this.healthBar.fg.material.opacity = this.hbOpacity;

                const pct = enemy.health / enemy.maxHealth;
                this.healthBar.foreground.scale.x = pct;

                if (camera) {
                    const camDir = new THREE.Vector3();
                    camera.getWorldDirection(camDir);
                    const target = new THREE.Vector3();
                    this.healthBar.getWorldPosition(target);
                    target.sub(camDir.multiplyScalar(100));
                    this.healthBar.lookAt(target);
                } else {
                    this.healthBar.rotation.order = 'YXZ';
                    this.healthBar.rotation.y = enemy.angle;
                    this.healthBar.rotation.x = -Math.PI / 4;
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
