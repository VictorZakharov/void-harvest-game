import * as THREE from 'three';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BULLET_BASE_RANGE, BULLET_SIZE
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

export class Bullet extends Entity {
    constructor(x, y, angle, speed, damage, isPlayer = true, piercing = 0, range = BULLET_BASE_RANGE, enemyType = null, fromDummy = false) {
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
        this.fromDummy = fromDummy; // Flag for dummy bullets
        this.yHeight = isPlayer ? 20 : 42; // Higher spawn for enemies to match visual gun height
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
        // Initialize Static Cache if needed
        if (!Bullet.geometry) {
            // Tracer Geometry: Long thin box. Length 40, Width 2, Height 2.
            Bullet.geometry = new THREE.BoxGeometry(40, 2, 2);

            // Floor Glow Geometry: Horizontal plane
            Bullet.glowGeometry = new THREE.PlaneGeometry(1, 1);

            Bullet.materials = {};
            Bullet.glowMaterials = {};
        }

        const colorStr = this.isPlayer ? '#ffff00' : (this.enemyType === 'ice' ? '#66ccff' : '#ff0000');
        const colorHex = this.isPlayer ? 0xffff00 : (this.enemyType === 'ice' ? 0x66ccff : 0xff0000);

        // Cache Material
        if (!Bullet.materials[colorStr]) {
            Bullet.materials[colorStr] = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 1.0,
                blending: THREE.NormalBlending,
            });
        }

        // Cache Glow Material and Texture
        if (this.isPlayer && !Bullet.glowMaterials[colorStr]) {
            const map = SpriteGenerator.createGradientTexture(64, colorStr);
            Bullet.glowMaterials[colorStr] = new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(map),
                color: colorHex,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
        }

        const group = new THREE.Group();

        // Add Fake Floor Light (Horizontal Plane)
        if (this.isPlayer) {
            const floorGlow = new THREE.Mesh(Bullet.glowGeometry, Bullet.glowMaterials[colorStr]);
            // Bullet is at Y=10. Ground is at Y=0. Relative Y = -9.5 puts it at Abs Y = 0.5
            floorGlow.position.set(0, -9.5, 0);
            floorGlow.rotation.x = -Math.PI / 2;
            floorGlow.scale.set(140, 50, 1);
            group.add(floorGlow);
        }

        // Tracer
        const tracer = new THREE.Mesh(Bullet.geometry, Bullet.materials[colorStr]);
        group.add(tracer);

        return group;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, this.yHeight, this.y + this.height / 2);
            // Rotate to face velocity
            // Velocity angle is -this.angle (standard canvas inverted Y)
            this.mesh.rotation.y = -this.angle;
        }
    }
}
