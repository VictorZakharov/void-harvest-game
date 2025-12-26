import { Particle } from '../particles.js';
import { ExplosionRing } from './ExplosionRing.js';

/**
 * Manages visual particle effects in the game.
 * Handles creation, updates, and cleanup of particles.
 */
export class ParticleManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene.
     */
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    /**
     * Creates a burst of particles at a specific location.
     * @param {number} x - The X coordinate.
     * @param {number} y - The Y coordinate.
     * @param {string} color - Hex color string.
     * @param {number} count - Number of particles to spawn.
     */
    create(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const p = new Particle(
                x, y, color,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            this.particles.push(p);
            this.scene.add(p.mesh);
        }
    }

    /**
     * Creates an expanding ring effect for explosions.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Hex color
     * @param {number} radius - Max radius of explosion
     */
    createExplosion(x, y, color, radius) {
        const ring = new ExplosionRing(x, y, color, radius);
        this.particles.push(ring);
        this.scene.add(ring.mesh);
    }

    /**
     * Updates all active particles and removes dead ones.
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            if (p.isDead()) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Clears all particles from the scene.
     */
    clear() {
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles.length = 0;
    }
}
