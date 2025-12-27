import * as THREE from 'three';
import { EnemyInstancedGeometry } from '../entities/EnemyInstancedGeometry.js';
import { EnemyInstancedAnimation } from '../entities/EnemyInstancedAnimation.js';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

export class UI3DRenderer {
    constructor(size = 128) {
        this.size = size;
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(size, size);
        this.renderer.setClearColor(0x000000, 0); // Transparent background

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        // Setup Lighting (High Intensity for UI popping)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Fill Light
        const fillLight = new THREE.DirectionalLight(0xccffff, 0.6);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        // Rim Light for pop
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
        rimLight.position.set(0, 10, -20);
        this.scene.add(rimLight);
    }

    renderEnemyToDataUrl(type) {
        // Clear previous meshes from scene
        if (this.subjectContainer) {
            this.scene.remove(this.subjectContainer);
        }
        this.subjectContainer = new THREE.Group();
        this.scene.add(this.subjectContainer);

        // Mock Enemy
        const mockEnemy = {
            type: type,
            x: 0, y: 0,
            width: (type === 'tank' ? 40 : (type === 'fast' ? 28 : 32)),
            height: (type === 'tank' ? 40 : (type === 'fast' ? 28 : 32)),
            angle: 0, vx: 0, vy: 0, isKneeling: false, frozen: false
        };

        // 1. Geometries & Materials
        const geos = EnemyInstancedGeometry.createAll();
        const color = ENEMY_SPRITE_COLORS[type].main;
        const bodyMat = new THREE.MeshStandardMaterial({ color: color });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const gunMat = new THREE.MeshStandardMaterial({ color: (type === 'ice' ? 0x88ccff : 0x333333) });

        // 2. Animation State
        const animState = EnemyInstancedAnimation.calculateState(mockEnemy, 0);
        const s = animState.scale;

        // 3. Meshes
        // Body
        const body = new THREE.Mesh(geos.body, bodyMat);
        EnemyInstancedAnimation.applyBodyTransform(body, mockEnemy, animState);
        this.subjectContainer.add(body);

        // Eyes
        const eyes = new THREE.Mesh(geos.eyes, eyeMat);
        eyes.position.copy(body.position);
        eyes.rotation.copy(body.rotation);
        eyes.scale.copy(body.scale);
        this.subjectContainer.add(eyes);

        // Limbs
        const shoulderY = (40 + 10) * s + animState.torsoY;
        const hipY = (40 - 12) * s + animState.torsoY;
        const armX = (mockEnemy.type === 'tank' ? 10 : 6) * s;
        const legX = (mockEnemy.type === 'tank' ? 6 : 4) * s;
        const armL = 18 * s;
        const legL = 28 * s;
        const armW = 3 * s;
        const legW = 3 * s;

        const createLimb = (rot, xOff, yOff, len, wid) => {
            const limb = new THREE.Mesh(geos.limbs, bodyMat);
            EnemyInstancedAnimation.applyLimbTransform(limb, mockEnemy, animState, rot, xOff, yOff, len, wid);
            this.subjectContainer.add(limb);
        };

        createLimb(animState.limbs.lArmRot, -armX, shoulderY, armL, armW);
        createLimb(animState.limbs.rArmRot, armX, shoulderY, armL, armW);
        createLimb(animState.limbs.lLegRot, -legX, hipY, legL, legW);
        createLimb(animState.limbs.rLegRot, legX, hipY, legL, legW);

        // Gun
        if (animState.isShooter) {
            const gun = new THREE.Mesh(geos.gun, gunMat);
            EnemyInstancedAnimation.applyGunTransform(gun, mockEnemy, animState, shoulderY, armX, armL, s);
            this.subjectContainer.add(gun);
        }

        // 4. Center and Rotate
        let yOffset = -31;
        let camDist = 65;
        if (type === 'tank') {
            yOffset = -45;
            camDist = 110;
        }

        this.subjectContainer.position.y = yOffset;
        this.subjectContainer.rotation.y = Math.PI / 8; // Aesthetic rotation

        // Camera Positioning
        // Close up, looking slightly down.
        this.camera.position.set(25, 5, camDist);
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL();
    }

    dispose() {
        this.renderer.dispose();
    }
}
