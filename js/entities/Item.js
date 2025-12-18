import * as THREE from 'three';
import {
    ITEM_MAGNET_BASE_RANGE, ITEM_MOVE_SPEED
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

export class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 12, 12);
        this.type = type;
        this.sprite = SpriteGenerator.createItemSprite(type);
        this.magnetRange = ITEM_MAGNET_BASE_RANGE;
        this.magnetSpeed = ITEM_MOVE_SPEED;

        // Illumination Memory
        this.isDiscovered = false;
        // Determine color based on type to store properly
        switch (this.type) {
            case 'xp': this.color = 0x00ff00; break;
            case 'health': this.color = 0xff0000; break;
            case 'weapon': this.color = 0x0088ff; break;
            default: this.color = 0xffffff;
        }

        this.mesh = this.createMesh();
    }

    update(playerX, playerY, playerMagnetBonus = 0, playerSpeed = 3, playerEntity = null, cursorX = null, cursorY = null) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check for "Discovery" (Visual Memory)
        // Check if item is within Light Radius of the Cursor (Main Light Source)
        // OR close to player (Self Light fallback, usually smaller)
        if (!this.isDiscovered && playerEntity) {
            const lightRadius = playerEntity.getLightRadius();

            // Check cursor distance (Main Light)
            if (cursorX !== null && cursorY !== null) {
                const distToCursor = Math.sqrt((cursorX - this.x) ** 2 + (cursorY - this.y) ** 2);
                if (distToCursor < lightRadius) {
                    this.isDiscovered = true;
                }
            }

            // Check player distance (Self Light - smaller radius backup)
            if (!this.isDiscovered && dist < lightRadius * 0.6) {
                this.isDiscovered = true;
            }

            if (this.isDiscovered && this.mesh && this.mesh.material) {
                // Set emissive to 50% of base color to ensure minimum 50% brightness
                this.mesh.material.emissive.setHex(this.color);
                this.mesh.material.emissiveIntensity = 0.5;
            }
        }

        // Fallback for logic without entity ref or cursor ref
        if (!this.isDiscovered && !playerEntity && dist < 500) {
            // Backward compat fallback
            this.isDiscovered = true;
            if (this.mesh && this.mesh.material) {
                this.mesh.material.emissive.setHex(this.color);
                this.mesh.material.emissiveIntensity = 0.5;
            }
        }

        // Magnet effect with bonus range
        const effectiveMagnetRange = this.magnetRange * (1 + playerMagnetBonus);
        if (dist < effectiveMagnetRange && dist > 0) {
            // Magnet pull speed is always 10% faster than player speed
            const effectiveMagnetSpeed = playerSpeed * 1.1;
            this.vx = (dx / dist) * effectiveMagnetSpeed;
            this.vy = (dy / dist) * effectiveMagnetSpeed;
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx) {
        // Replaced by 3D
    }

    createMesh() {
        // Use Cone with 3 segments for a pyramid/tetrahedron shape
        // Radius, Height, RadialSegments
        // Double size: 0.8 -> 1.6, 1.2 -> 2.4
        const geometry = new THREE.ConeGeometry(this.width * 1.6, this.width * 2.4, 3);
        const material = new THREE.MeshLambertMaterial({ color: this.color });
        const mesh = new THREE.Mesh(geometry, material);

        // Slow down spinning (3x slower)
        mesh.userData = { rotationSpeed: (Math.random() * 0.1 + 0.05) / 3 };
        return mesh;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 5, this.y + this.height / 2);
            this.mesh.rotation.y += this.mesh.userData.rotationSpeed;
            // Removed X rotation to keep it spinning like a top
        }
    }
}
