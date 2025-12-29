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

        // --- Instance Opacity Attribute ---
        // We add this to each geometry so the shader can access 'instanceOpacity'
        const opacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(maxEnemies).fill(1.0), 1);
        // Limbs have 4x count
        const limbOpacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(maxEnemies * 4).fill(1.0), 1);
        // Guns need their own buffer because they are indexed sparsely (only shooters)
        const gunOpacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(maxEnemies).fill(1.0), 1);

        this.bodyGeo.setAttribute('instanceOpacity', opacityAttribute);
        this.eyeGeo.setAttribute('instanceOpacity', opacityAttribute);
        this.gunGeo.setAttribute('instanceOpacity', gunOpacityAttribute);
        this.limbGeo.setAttribute('instanceOpacity', limbOpacityAttribute);

        // --- Materials ---
        // We modify materials to support per-instance opacity
        this.bodyMat = this._createOpacityMaterial(0xffffff); // Tinted per instance
        this.eyeMat = this._createOpacityMaterial(0x000000);
        this.gunMat = this._createOpacityMaterial(0x333333);

        // --- Instanced Meshes ---
        this.meshes = {};

        // Helper to create mesh with common settings
        const createMesh = (geo, mat, count) => {
            const mesh = new THREE.InstancedMesh(geo, mat, count);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.frustumCulled = false; // Disable culling to ensure rendering map-wide
            return mesh;
        };

        this.meshes.body = createMesh(this.bodyGeo, this.bodyMat, maxEnemies);
        this.meshes.eyes = createMesh(this.eyeGeo, this.eyeMat, maxEnemies);
        this.meshes.limbs = createMesh(this.limbGeo, this.bodyMat, maxEnemies * 4);
        this.meshes.guns = createMesh(this.gunGeo, this.gunMat, maxEnemies);

        // Add to scene
        this.scene.add(this.meshes.body);
        this.scene.add(this.meshes.eyes);
        this.scene.add(this.meshes.limbs);
        this.scene.add(this.meshes.guns);

        // Helpers
        this.dummy = new THREE.Object3D();
        this._color = new THREE.Color();
    }

    /**
     * Creates a MeshStandardMaterial extended to support 'instanceOpacity'.
     */
    _createOpacityMaterial(color) {
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true, // Enable transparency
            opacity: 1.0,
            depthWrite: true,  // Important: Keep depth write for correct sorting/occlusion where opaque
            // Note: Transparent sorting can be tricky. Z-write true helps "solid-looking" fade-ins.
        });

        mat.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                attribute float instanceOpacity;
                varying float vInstanceOpacity;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vInstanceOpacity = instanceOpacity;
                `
            );

            shader.fragmentShader = `
                varying float vInstanceOpacity;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                diffuseColor.a *= vInstanceOpacity;
                `
            );
        };

        return mat;
    }

    update(enemies, dt, player, cursorTarget) {
        let bodyIdx = 0;
        let limbIdx = 0;
        let gunIdx = 0;

        const dummy = this.dummy;
        const opacityAttr = this.bodyGeo.getAttribute('instanceOpacity');
        const limbOpacityAttr = this.limbGeo.getAttribute('instanceOpacity');

        for (const enemy of enemies) {
            // Safety: Do not exceed buffer capacity
            if (bodyIdx >= this.maxEnemies) break;

            // --- Visibility / Opacity Calculation ---
            let alpha = 1.0;
            let isVisible = true;

            if (cursorTarget) {
                const dCursor = Math.sqrt((enemy.x - cursorTarget.x) ** 2 + (enemy.y - cursorTarget.z) ** 2);
                const radiusMultiplier = player ? (1 + player.lightRadiusBonus) : 1;
                const lightHeight = 300 * radiusMultiplier;

                // Matches LightingManager logic: radius = height * 1.8
                const lightRadius = lightHeight * 1.8;
                const fadeDistance = 150; // Distance over which to fade from 0 to 1

                // Dist > lightRadius -> Alpha 0
                // Dist < lightRadius - fadeDistance -> Alpha 1

                if (dCursor > lightRadius) {
                    alpha = 0.0;
                    isVisible = false;
                } else if (dCursor > (lightRadius - fadeDistance)) {
                    // In fade zone
                    // Normalize: 0 at outer edge, 1 at inner edge
                    const distInFade = lightRadius - dCursor;
                    alpha = Math.min(1.0, Math.max(0.0, distInFade / fadeDistance));

                    // Optimization: If alpha is very low, treat as invisible cull?
                    if (alpha < 0.05) isVisible = false;
                } else {
                    alpha = 1.0;
                }
            }

            // If completely hidden, scale to 0 and skip math
            if (!isVisible) {
                dummy.position.set(0, -1000, 0); // Move away to be safe
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();

                // Update transforms to hide
                this.meshes.body.setMatrixAt(bodyIdx, dummy.matrix);
                this.meshes.eyes.setMatrixAt(bodyIdx, dummy.matrix);

                // Opacity 0
                opacityAttr.setX(bodyIdx, 0);

                bodyIdx++;

                // Limbs (4)
                for (let i = 0; i < 4; i++) {
                    this.meshes.limbs.setMatrixAt(limbIdx, dummy.matrix);
                    limbOpacityAttr.setX(limbIdx, 0);
                    limbIdx++;
                }

                // Gun
                const isShooter = (enemy.type === 'shooter' || enemy.type === 'ice');
                if (isShooter) {
                    this.meshes.guns.setMatrixAt(gunIdx, dummy.matrix);
                    // Gun Opacity
                    // We must access the specific attribute for gun geometry and use gunIdx,
                    // as guns are sparsely populated and their buffer index differs from the body index.
                    // This ensures the correct opacity is applied to the shooter's gun.
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

            // Set Opacity
            opacityAttr.setX(bodyIdx, alpha);

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
                limbOpacityAttr.setX(limbIdx, alpha);
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
                this.meshes.guns.setColorAt(gunIdx, this._color);

                // Gun Opacity
                // Access the specific attribute for gun geometry
                this.gunGeo.getAttribute('instanceOpacity').setX(gunIdx, alpha);

                gunIdx++;
            }

            // Note: Health Bars are handled by a separate system/layer.
        }

        // Finalize
        this.meshes.body.count = bodyIdx;
        this.meshes.body.instanceMatrix.needsUpdate = true;
        if (this.meshes.body.instanceColor) this.meshes.body.instanceColor.needsUpdate = true;
        opacityAttr.needsUpdate = true;

        this.meshes.eyes.count = bodyIdx;
        this.meshes.eyes.instanceMatrix.needsUpdate = true;
        if (this.meshes.eyes.instanceColor) this.meshes.eyes.instanceColor.needsUpdate = true;
        // Eyes share opacityAttr with body, so it is already marked for update

        this.meshes.limbs.count = limbIdx;
        this.meshes.limbs.instanceMatrix.needsUpdate = true;
        if (this.meshes.limbs.instanceColor) this.meshes.limbs.instanceColor.needsUpdate = true;
        limbOpacityAttr.needsUpdate = true;

        this.meshes.guns.count = gunIdx;
        this.meshes.guns.instanceMatrix.needsUpdate = true;
        if (this.meshes.guns.instanceColor) this.meshes.guns.instanceColor.needsUpdate = true;
        this.gunGeo.getAttribute('instanceOpacity').needsUpdate = true;
    }
}

