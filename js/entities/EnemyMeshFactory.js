import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

export class EnemyMeshFactory {
    /**
     * Creates the visual mesh hierarchy for an enemy.
     * @param {Object} enemy - The enemy entity.
     * @returns {Object} Structure containing group and component references.
     */
    static create(enemy) {
        // Initialize Cache
        if (!EnemyMeshFactory.geometries) EnemyMeshFactory.geometries = {};
        if (!EnemyMeshFactory.materials) EnemyMeshFactory.materials = {};

        // Helper to manually merge geometries (since BufferGeometryUtils might not be available)
        // Returns a single BufferGeometry with Groups for multi-material support
        const ensureMergedGeo = (name, isTank, startY, includeLimbs, includeRightArm) => {
            if (EnemyMeshFactory.geometries[name]) return;

            // Define parts
            const torsoWidth = isTank ? 12 : 4;
            const torsoDepth = isTank ? 12 : 4;

            // Part 1: Torso (Material 0)
            const torsoGeo = new THREE.BoxGeometry(torsoWidth, 25, torsoDepth);
            const torsoTx = new THREE.Matrix4().makeTranslation(0, startY, 0);

            // Part 2: Head (Material 0)
            const headGeo = new THREE.SphereGeometry(8, 16, 16);
            const headTx = new THREE.Matrix4().makeTranslation(0, startY + 15, 0);

            // Part 3: Eyes (Material 1)
            const eyeGeo = new THREE.SphereGeometry(1.5, 8, 8);
            const leftEyeTx = new THREE.Matrix4().makeTranslation(-3, startY + 17, 7);
            const rightEyeTx = new THREE.Matrix4().makeTranslation(3, startY + 17, 7);

            // Merge Logic
            const geometries = [
                { geo: torsoGeo, mat: 0, tx: torsoTx },
                { geo: headGeo, mat: 0, tx: headTx },
                { geo: eyeGeo, mat: 1, tx: leftEyeTx },
                { geo: eyeGeo, mat: 1, tx: rightEyeTx }
            ];

            if (includeLimbs) {
                const armGeo = new THREE.BoxGeometry(3, 18, 3);
                const legGeo = new THREE.BoxGeometry(3, 28, 3);

                const armX = isTank ? 10 : 6;
                const legX = isTank ? 6 : 4;
                const shoulderY = startY + 10;
                const hipY = startY - 12;

                // Legs (always welded if includeLimbs is true)
                // Left Leg
                const lLegTx = new THREE.Matrix4().makeTranslation(-legX, hipY - 14, 0);
                geometries.push({ geo: legGeo, mat: 0, tx: lLegTx });

                // Right Leg
                const rLegTx = new THREE.Matrix4().makeTranslation(legX, hipY - 14, 0);
                geometries.push({ geo: legGeo, mat: 0, tx: rLegTx });

                // Arms
                // Left Arm (always welded if includeLimbs)
                const lArmTx = new THREE.Matrix4().makeTranslation(-armX, shoulderY - 9, 0);
                geometries.push({ geo: armGeo, mat: 0, tx: lArmTx });

                // Right Arm (Only if includeRightArm is true)
                if (includeRightArm) {
                    const rArmTx = new THREE.Matrix4().makeTranslation(armX, shoulderY - 9, 0);
                    geometries.push({ geo: armGeo, mat: 0, tx: rArmTx });
                }
            }

            // 1. Calculate total counts
            let vertexCount = 0;
            let indexCount = 0;
            geometries.forEach(g => {
                vertexCount += g.geo.attributes.position.count;
                indexCount += g.geo.index ? g.geo.index.count : 0;
            });

            // 2. Create buffers
            const positions = new Float32Array(vertexCount * 3);
            const normals = new Float32Array(vertexCount * 3);
            const uvs = new Float32Array(vertexCount * 2);
            const indices = new Uint16Array(indexCount);

            // 3. Fill buffers
            let vOffset = 0;
            let iOffset = 0;
            let groupStart = 0;
            let currentMat = 0;

            const merged = new THREE.BufferGeometry();

            // Sort geometries to minimize groups
            geometries.sort((a, b) => a.mat - b.mat);

            geometries.forEach((g, i) => {
                // Check if material changed from previous (or start)
                if (i === 0) {
                    currentMat = g.mat;
                    groupStart = 0;
                } else if (g.mat !== currentMat) {
                    merged.addGroup(groupStart, iOffset - groupStart, currentMat);
                    groupStart = iOffset;
                    currentMat = g.mat;
                }

                const p = g.geo.attributes.position.array;
                const nReal = g.geo.attributes.normal.array;
                const uv = g.geo.attributes.uv.array;
                const idx = g.geo.index.array;

                const rMat = new THREE.Matrix3().getNormalMatrix(g.tx);

                for (let j = 0; j < p.length; j += 3) {
                    const v = new THREE.Vector3(p[j], p[j + 1], p[j + 2]);
                    v.applyMatrix4(g.tx);
                    positions[vOffset * 3 + 0] = v.x;
                    positions[vOffset * 3 + 1] = v.y;
                    positions[vOffset * 3 + 2] = v.z;

                    const nm = new THREE.Vector3(nReal[j], nReal[j + 1], nReal[j + 2]);
                    nm.applyMatrix3(rMat).normalize();
                    normals[vOffset * 3 + 0] = nm.x;
                    normals[vOffset * 3 + 1] = nm.y;
                    normals[vOffset * 3 + 2] = nm.z;

                    uvs[vOffset * 2 + 0] = uv[(j / 3) * 2];
                    uvs[vOffset * 2 + 1] = uv[(j / 3) * 2 + 1];

                    vOffset++;
                }

                for (let j = 0; j < idx.length; j++) {
                    indices[iOffset++] = idx[j] + (vOffset - (p.length / 3));
                }
            });

            // Final group
            merged.addGroup(groupStart, iOffset - groupStart, currentMat);

            merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
            merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            merged.setIndex(new THREE.BufferAttribute(indices, 1));

            // Cache it
            EnemyMeshFactory.geometries[name] = merged;

            // Cleanup temps
            geometries.forEach(g => g.geo.dispose());
        };

        // Generate variants
        // Base startY = 40 (Torso center).
        // 1. Merged Body Only (No Limbs) - For High Detail (Limbs attached separately)
        ensureMergedGeo('mergedBodyNormal', false, 40, false, false);
        ensureMergedGeo('mergedBodyTank', true, 40, false, false);

        // 2. Full Weld (Body + Limbs) - For Low Detail
        ensureMergedGeo('fullNormal', false, 40, true, true);  // All limbs welded
        ensureMergedGeo('fullTank', true, 40, true, true);     // All limbs welded
        // Note: Shooters in Low Detail will use 'fullXXX' (gun missing, but arms present) for now.

        // Limbs (Separate for High Detail)
        if (!EnemyMeshFactory.geometries.limbArm) EnemyMeshFactory.geometries.limbArm = new THREE.BoxGeometry(3, 18, 3);
        if (!EnemyMeshFactory.geometries.limbLeg) EnemyMeshFactory.geometries.limbLeg = new THREE.BoxGeometry(3, 28, 3);
        if (!EnemyMeshFactory.geometries.gun) EnemyMeshFactory.geometries.gun = new THREE.BoxGeometry(4, 4, 15);

        // Cache Base Material
        const colorHex = ENEMY_SPRITE_COLORS[enemy.type].main;
        const colorKey = enemy.type;

        if (!EnemyMeshFactory.materials[colorKey]) {
            EnemyMeshFactory.materials[colorKey] = new THREE.MeshStandardMaterial({ color: colorHex });
        }
        if (!EnemyMeshFactory.materials.eye) {
            EnemyMeshFactory.materials.eye = new THREE.MeshStandardMaterial({ color: 0x000000 });
        }

        const skinMat = EnemyMeshFactory.materials[colorKey].clone();
        const eyeMat = EnemyMeshFactory.materials.eye.clone();

        // Determine type
        const isTank = enemy.type === 'tank';
        const isShooter = (enemy.type === 'shooter' || enemy.type === 'ice');

        // Group for entire enemy
        const group = new THREE.Group();

        const skelGroup = new THREE.Group(); // High Detail Parent
        const staticGroup = new THREE.Group(); // Low Detail Parent

        // --- HIGH DETAIL (Animated Limbs) ---
        // 1. Core Body (Torso+Head+Eyes)
        const coreGeoName = isTank ? 'mergedBodyTank' : 'mergedBodyNormal';
        const coreBody = new THREE.Mesh(EnemyMeshFactory.geometries[coreGeoName], [skinMat, eyeMat]);
        coreBody.castShadow = false;
        skelGroup.add(coreBody);

        // 2. Limbs (Separate) - Helper Definition
        const createLimb = (geo, x, y, z, h, parent) => {
            const mesh = new THREE.Mesh(geo, skinMat);
            const container = new THREE.Group();
            container.position.set(x, y, z);
            mesh.position.y = -h / 2;
            mesh.castShadow = false;
            container.add(mesh);
            parent.add(container);
            return { container, mesh };
        };

        const armLength = 18;
        const legLength = 28;
        const armX = isTank ? 10 : 6;
        const legX = isTank ? 6 : 4;
        const sY = 40 + 10;
        const hY = 40 - 12;

        const lArm = createLimb(EnemyMeshFactory.geometries.limbArm, -armX, sY, 0, armLength, coreBody);
        const rArm = createLimb(EnemyMeshFactory.geometries.limbArm, armX, sY, 0, armLength, coreBody);
        const lLeg = createLimb(EnemyMeshFactory.geometries.limbLeg, -legX, hY, 0, legLength, coreBody);
        const rLeg = createLimb(EnemyMeshFactory.geometries.limbLeg, legX, hY, 0, legLength, coreBody);

        // Weapon (High Detail)
        if (isShooter) {
            const gunColor = enemy.type === 'ice' ? 0x88ccff : 0x333333;
            const gunMat = new THREE.MeshStandardMaterial({ color: gunColor });
            const gun = new THREE.Mesh(EnemyMeshFactory.geometries.gun, gunMat);
            gun.position.set(2, -armLength, 0);
            gun.rotation.x = Math.PI / 2;
            rArm.container.add(gun);

            // Initial pose
            rArm.container.rotation.x = -Math.PI / 2;
        }

        // --- LOW DETAIL (Welded) ---
        // Use the 'full' merged geometries (Torso+Head+Eyes+Limbs welded)
        const lodGeoName = isTank ? 'fullTank' : 'fullNormal';
        const lodMesh = new THREE.Mesh(EnemyMeshFactory.geometries[lodGeoName], [skinMat, eyeMat]);
        lodMesh.castShadow = false;
        staticGroup.add(lodMesh);
        staticGroup.visible = false; // Hidden by default

        // Add both to main group
        group.add(skelGroup);
        group.add(staticGroup);

        // --- Scale ---
        let scale = 0.85;
        if (enemy.type === 'tank') scale = 1.2;
        if (enemy.type === 'fast') scale = 0.7;

        group.scale.set(scale, scale, scale);

        // Health Bar
        const healthBar = EnemyMeshFactory.createHealthBar();
        group.add(healthBar);

        // Set references for Visuals
        const torso = coreBody;
        const bodyMesh = coreBody;
        const baseColor = colorHex;

        // High Detail Limb Refs
        const leftArm = lArm.container;
        const rightArm = rArm.container;
        const leftLeg = lLeg.container;
        const rightLeg = rLeg.container;

        return {
            group,
            bodyMesh,
            baseColor,
            torso,
            // head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            healthBar,
            // LOD Groups
            skelGroup,
            staticGroup
        };
    }

    static createHealthBar() {
        // Cache Health Bar Geometries
        if (!EnemyMeshFactory.geometries) EnemyMeshFactory.geometries = {};

        if (!EnemyMeshFactory.geometries.hpBg) {
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
            EnemyMeshFactory.geometries.hpBg = createPillGeo(54, 12);
            EnemyMeshFactory.geometries.hpFg = createPillGeo(50, 10);
        }

        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 70, 0);

        const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
        const bg = new THREE.Mesh(EnemyMeshFactory.geometries.hpBg, bgMat);
        bg.position.x = -27;
        bg.userData.isHealthBar = true;

        hpGroup.add(bg);
        hpGroup.bg = bg;

        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(EnemyMeshFactory.geometries.hpFg, fgMat);
        fg.userData.isHealthBar = true;
        fg.position.z = 1;
        fg.position.x = -25;

        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg;

        hpGroup.visible = false;
        return hpGroup;
    }
}
