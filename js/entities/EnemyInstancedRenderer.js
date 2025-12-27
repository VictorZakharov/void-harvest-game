import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

import { EnemyInstancedGeometry } from './EnemyInstancedGeometry.js';
import { EnemyInstancedAnimation } from './EnemyInstancedAnimation.js';

export class EnemyInstancedRenderer {
    constructor(scene, maxEnemies = 2500) {
        this.scene = scene;
        this.maxEnemies = maxEnemies;

        // --- Geometries ---
        const geos = EnemyInstancedGeometry.createAll();
        this.bodyGeo = geos.body;
        this.eyeGeo = geos.eyes;
        this.limbGeo = geos.limbs;
        this.gunGeo = geos.gun;

        // --- Materials ---
        this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Tinted per instance
        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        this.gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // --- Instanced Meshes ---
        this.meshes = {};

        // Body
        this.meshes.body = new THREE.InstancedMesh(this.bodyGeo, this.bodyMat, maxEnemies);
        this.meshes.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.body.castShadow = false;
        this.meshes.body.receiveShadow = false;
        this.meshes.body.frustumCulled = false; // Disable culling to ensure rendering map-wide

        // Eyes
        this.meshes.eyes = new THREE.InstancedMesh(this.eyeGeo, this.eyeMat, maxEnemies);
        this.meshes.eyes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.eyes.receiveShadow = false;
        this.meshes.eyes.frustumCulled = false;

        // Limbs (4 per enemy)
        this.meshes.limbs = new THREE.InstancedMesh(this.limbGeo, this.bodyMat, maxEnemies * 4);
        this.meshes.limbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.limbs.receiveShadow = false;
        this.meshes.limbs.frustumCulled = false;

        // Guns (1 per shooter, optimistically allocate maxEnemies)
        this.meshes.guns = new THREE.InstancedMesh(this.gunGeo, this.gunMat, maxEnemies);
        this.meshes.guns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.guns.receiveShadow = false;
        this.meshes.guns.frustumCulled = false;

        // Add to scene
        this.scene.add(this.meshes.body);
        this.scene.add(this.meshes.eyes);
        this.scene.add(this.meshes.limbs);
        this.scene.add(this.meshes.guns);

        // Helpers
        this.dummy = new THREE.Object3D();
        this._color = new THREE.Color();
    }



    update(enemies, dt, player, cursorTarget) {
        let bodyIdx = 0;
        let limbIdx = 0;
        let gunIdx = 0;

        const dummy = this.dummy;

        for (const enemy of enemies) {
            // Safety: Do not exceed buffer capacity
            if (bodyIdx >= this.maxEnemies) break;

            // --- Visibility Check (Fog of War) ---
            let isVisible = true;

            if (cursorTarget) {

                const dCursor = Math.sqrt((enemy.x - cursorTarget.x) ** 2 + (enemy.y - cursorTarget.z) ** 2);
                const radiusMultiplier = player ? (1 + player.lightRadiusBonus) : 1;
                const lightHeight = 300 * radiusMultiplier;
                // Cone logic: radius = height * tan(theta).
                // Max radius (cEnd) is at Pi/3 (tan=1.73). 300 * 1.73 = ~520.
                const cEnd = lightHeight * Math.tan(Math.PI / 3);

                if (dCursor > cEnd) {
                    // Outside light cone
                    isVisible = false;

                    // Extra check: Player Bullet light? 
                    // (Skipping bullet light check for perf, or TODO: pass bullets)
                }
            }

            // If hidden, scale to 0 and skip math
            if (!isVisible) {
                dummy.position.set(0, -1000, 0); // Move away to be safe
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();

                // Update all parts to hidden
                this.meshes.body.setMatrixAt(bodyIdx, dummy.matrix);
                this.meshes.eyes.setMatrixAt(bodyIdx, dummy.matrix);

                // Advance indices but don't draw limbs
                bodyIdx++;
                // Limbs (4)
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);

                // Gun
                const isShooter = (enemy.type === 'shooter' || enemy.type === 'ice');
                if (isShooter) {
                    this.meshes.guns.setMatrixAt(gunIdx++, dummy.matrix);
                }
                continue;
            }

            // --- 1. Animation Logic ---
            const animState = EnemyInstancedAnimation.calculateState(enemy, dt);
            const s = animState.scale;

            // --- 2. Body Transform ---
            EnemyInstancedAnimation.applyBodyTransform(dummy, enemy, animState);
            this.meshes.body.setMatrixAt(bodyIdx, dummy.matrix);

            // Set Color
            const col = ENEMY_SPRITE_COLORS[enemy.type].main;
            this._color.set(col);
            if (enemy.flashTime > 0) {
                this._color.setHex(0xffffff);
                enemy.flashTime -= dt;
            } else if (enemy.frozen) {
                this._color.setHex(0x00ffff); // Ice Blue
            }
            this.meshes.body.setColorAt(bodyIdx, this._color);

            // Set Eyes (welded)
            this.meshes.eyes.setMatrixAt(bodyIdx, dummy.matrix);

            bodyIdx++;

            // --- 3. Limbs ---
            // Calculate offsets based on scale
            const shoulderY = (40 + 10) * s + animState.torsoY;
            const hipY = (40 - 12) * s + animState.torsoY;
            const armX = (enemy.type === 'tank' ? 10 : 6) * s;
            const legX = (enemy.type === 'tank' ? 6 : 4) * s;

            const armL = 18 * s;
            const legL = 28 * s;
            const armW = 3 * s;
            const legW = 3 * s;

            // Helper for applying and setting
            const applyLimb = (rot, xOff, yOff, len, wid) => {
                EnemyInstancedAnimation.applyLimbTransform(dummy, enemy, animState, rot, xOff, yOff, len, wid);
                this.meshes.limbs.setMatrixAt(limbIdx, dummy.matrix);
                this.meshes.limbs.setColorAt(limbIdx, this._color);
                limbIdx++;
            };

            // Left Arm
            applyLimb(animState.limbs.lArmRot, -armX, shoulderY, armL, armW);
            // Right Arm
            applyLimb(animState.limbs.rArmRot, armX, shoulderY, armL, armW);
            // Left Leg
            applyLimb(animState.limbs.lLegRot, -legX, hipY, legL, legW);
            // Right Leg
            applyLimb(animState.limbs.rLegRot, legX, hipY, legL, legW);

            // --- 4. Gun ---
            if (animState.isShooter) {
                EnemyInstancedAnimation.applyGunTransform(dummy, enemy, animState, shoulderY, armX, armL, s);
                this.meshes.guns.setMatrixAt(gunIdx, dummy.matrix);

                const gCol = (enemy.type === 'ice') ? 0x88ccff : 0x333333;
                this._color.set(gCol);
                if (enemy.flashTime > 0) {
                    this._color.setHex(0xffffff);
                } else if (enemy.frozen) {
                    this._color.setHex(0x00ffff);
                }
                this.meshes.guns.setColorAt(gunIdx++, this._color);
            }

            // Note: Health Bars are handled by a separate system/layer.
        }

        // Finalize
        this.meshes.body.count = bodyIdx;
        this.meshes.body.instanceMatrix.needsUpdate = true;
        if (this.meshes.body.instanceColor) this.meshes.body.instanceColor.needsUpdate = true;

        this.meshes.eyes.count = bodyIdx;
        this.meshes.eyes.instanceMatrix.needsUpdate = true;
        if (this.meshes.eyes.instanceColor) this.meshes.eyes.instanceColor.needsUpdate = true;

        this.meshes.limbs.count = limbIdx;
        this.meshes.limbs.instanceMatrix.needsUpdate = true;
        if (this.meshes.limbs.instanceColor) this.meshes.limbs.instanceColor.needsUpdate = true;

        this.meshes.guns.count = gunIdx;
        this.meshes.guns.instanceMatrix.needsUpdate = true;
        if (this.meshes.guns.instanceColor) this.meshes.guns.instanceColor.needsUpdate = true;
    }
}
