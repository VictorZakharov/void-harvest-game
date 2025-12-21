import * as THREE from 'three';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BULLET_BASE_RANGE, BULLET_SIZE
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

export class Bullet extends Entity {
    constructor(x, y, angle, speed, damage, isPlayer = true, piercing = 0, range = BULLET_BASE_RANGE, enemyType = null) {
        const bulletSize = BULLET_SIZE * 2; // Convert to sprite size
        super(x, y, bulletSize, bulletSize);
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.isPlayer = isPlayer;
        this.piercing = piercing;
        this.maxPiercing = piercing;
        this.distanceTraveled = 0;
        this.maxDistance = range;
        this.enemyType = enemyType; // Store enemy type for ice bullets
        this.sprite = SpriteGenerator.createBulletSprite(
            isPlayer ? 'player' : (enemyType === 'ice' ? 'ice' : 'enemy')
        );
        this.hitEnemies = new Set(); // Track which enemies this bullet has already hit

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.mesh = this.createMesh();
    }

    update(timeScale = 1.0) {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        this.distanceTraveled += this.speed * timeScale;
    }

    isOutOfBounds() {
        return this.x < -50 || this.x > CANVAS_WIDTH + 50 ||
            this.y < -50 || this.y > CANVAS_HEIGHT + 50 ||
            this.distanceTraveled > this.maxDistance;
    }

    onHit() {
        this.piercing--;
        return this.piercing < 0;
    }

    draw(ctx) {
        // Replaced by 3D
    }

    createMesh() {
        const color = this.isPlayer ? 0xffff00 : (this.enemyType === 'ice' ? 0x66ccff : 0xff0000);
        const colorStr = this.isPlayer ? '#ffff00' : (this.enemyType === 'ice' ? '#66ccff' : '#ff0000');
        const map = SpriteGenerator.createGradientTexture(64, colorStr);

        // Refactor: Return a Group
        const group = new THREE.Group();
        // group.add(sprite); // REMOVED: User wants only streaks, no "orb/circle" sprite

        // Add Fake Floor Light (Horizontal Plane) to illuminate ground cheaply
        // Real PointLights caused massive lag. This Additive Plane mimics light on the floor.
        if (this.isPlayer) {
            // Horizontal plane, lying flat on the ground
            const glowGeo = new THREE.PlaneGeometry(1, 1);
            const glowMat = new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(map), // Reuse the gradient
                color: color,
                transparent: true,
                opacity: 0.6, // Increased from 0.3 to restore contrast/glow (safe due to elongated shape)
                blending: THREE.AdditiveBlending, // Reverted to Additive for "Light" look (prevents muddy "crap" look on dark ground)
                depthWrite: false
            });
            const floorGlow = new THREE.Mesh(glowGeo, glowMat);

            // Bullet is at Y=10. Ground is at Y=0.
            // Place closer to ground (relative Y = -9.5 puts it at Abs Y = 0.5)
            // Scale to be elongated streak (X axis is forward) instead of circle
            floorGlow.position.set(0, -9.5, 0);
            floorGlow.rotation.x = -Math.PI / 2;
            floorGlow.scale.set(140, 50, 1); // Oval streak (Length 140, Width 50)

            group.add(floorGlow);
        }

        // Tracer Geometry
        // Long thin box. Length 40, Width 2, Height 2.
        const tracerGeo = new THREE.BoxGeometry(40, 2, 2);
        const tracerMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0, // Increased from 0.8 to 1.0 for maximum visibility/pop
            blending: THREE.NormalBlending, // Changed to Normal to preserve Yellow color on White snow (Additive makes it white)
        });
        const tracer = new THREE.Mesh(tracerGeo, tracerMat);

        group.add(tracer);

        return group;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 20, this.y + this.height / 2);
            // Rotate to face velocity
            // Velocity angle is -this.angle (standard canvas inverted Y)
            this.mesh.rotation.y = -this.angle;
        }
    }
}
