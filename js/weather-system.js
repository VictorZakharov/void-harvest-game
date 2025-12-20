import * as THREE from 'three';
import { WEATHER_TYPES } from './biomes.js';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.activeType = WEATHER_TYPES.NONE;

        // Dynamic Wind System (for Sandstorm)
        this.windTimer = 0;
        this.windVector = new THREE.Vector3(-20, 0, 0); // Default Left

        // Textures for Weather
        this.dustTexture = this.createDustTexture();
        this.snowTexture = this.createSnowTexture();

        // Configuration per weather type
        this.configs = {
            [WEATHER_TYPES.RAIN]: {
                count: 3000,     // Reduced count as streaks cover more area
                color: 0x88bbff, // Slightly more blue
                size: 25.0,      // Vertical Length of streak
                velocityY: -60,  // Fast fall
                velocityX: -2,
                opacity: 0.4,     // Transparent
                transparent: true,
                map: null,
                blending: THREE.AdditiveBlending
            },
            [WEATHER_TYPES.SNOW]: {
                count: 6000,     // Increased from 4000 for "blizzard" feel
                color: 0xffffff,
                size: 4.0,       // Larger flakes (up from 3.0)
                velocityY: -4,   // Faster fall (was -3)
                velocityX: 0.8,  // More drift (was 0.5)
                opacity: 0.95,   // Almost solid
                transparent: true,
                map: this.snowTexture,
                blending: THREE.AdditiveBlending
            },
            [WEATHER_TYPES.SANDSTORM]: {
                count: 1500,     // Reduced from 2200 for less clutter
                color: 0xccaa88, // Desaturated sand
                size: 140.0,
                velocityY: 0,
                velocityZ: 0,
                opacity: 0.15,    // Much lower opacity since we use Normal blending
                transparent: true,
                map: this.dustTexture,
                blending: THREE.NormalBlending // Fixes the "glowing snow paddle" artifact
            }
        };
    }

    createDustTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64; // Increased height for noise
        const ctx = canvas.getContext('2d');

        // Draw a refined, noisy horizontal streak
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
        grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.3)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
        grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
        grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = grad;

        // Draw multiple thin, staggered lines with noise
        for (let i = 0; i < 5; i++) {
            const y = 10 + i * 10;
            const h = 2 + Math.random() * 4;
            const xOff = Math.random() * 50;
            const w = 150 + Math.random() * 100;
            ctx.fillRect(xOff, y, w, h);
        }

        // Add some "grit" (noise dots)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 200; i++) {
            ctx.fillRect(Math.random() * 256, Math.random() * 64, 2, 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createSnowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a soft circle
        const rad = 32;
        const grad = ctx.createRadialGradient(rad, rad, 0, rad, rad, rad);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rad, rad, rad, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    startWeather(type) {
        if (this.activeType === type) return;

        // Cleanup existing
        this.cleanup();

        this.activeType = type;
        if (type === WEATHER_TYPES.NONE) return;

        const config = this.configs[type];
        if (!config) return;

        // InstancedMesh Weather (Streaks)
        // Used for Sandstorm (Horizontal) and Rain (Vertical)
        if (type === WEATHER_TYPES.SANDSTORM || type === WEATHER_TYPES.RAIN) {
            // Recalculate Wind for Sandstorm (Rain ignores this)
            if (type === WEATHER_TYPES.SANDSTORM) this.updateWindDirection();

            this.startStreakWeather(config, type);
            return;
        }

        // Standard Point-based weather (Snow)
        this.startPointWeather(type, config);
    }

    startStreakWeather(config, type) {
        // Use InstancedMesh for physical 3D lines (streaks)
        let geometry;

        if (type === WEATHER_TYPES.SANDSTORM) {
            // Horizontal Plane for Streaks: Width = config.size, Height = much thicker
            // Using Plane instead of Box to avoid 3D side highlights
            geometry = new THREE.PlaneGeometry(config.size, 12.0);
            geometry.rotateX(-Math.PI / 2); // Make it sit flat/horizontal
        } else {
            // Vertical Box (Rain): Height = config.size
            // Thin width/depth
            geometry = new THREE.BoxGeometry(0.5, config.size, 0.5);
        }

        const material = new THREE.MeshBasicMaterial({
            color: config.color,
            map: config.map || null, // APPLY MAP
            transparent: true,
            opacity: config.opacity,
            depthWrite: false,
            side: THREE.DoubleSide, // Ensure visibility from both sides of the plane
            blending: config.blending || THREE.AdditiveBlending
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, config.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.activeConfig = config;

        // Initialize positions
        const dummy = new THREE.Object3D();
        const positions = [];
        const range = 2000;

        for (let i = 0; i < config.count; i++) {
            const x = (Math.random() - 0.5) * range;
            // Rain falls from high up, Sandstorm is ground level
            const y = type === WEATHER_TYPES.RAIN
                ? Math.random() * 800 + 100
                : Math.random() * 300;
            const z = (Math.random() - 0.5) * range;

            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);

            // Store positions for update loop
            positions.push({ x, y, z, velocity: (Math.random() * 0.5 + 0.5) });
        }

        this.instancePositions = positions;
        this.mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.mesh);
    }

    startPointWeather(type, config) {
        // Defensive: Do NOT create points for Sandstorm (it uses InstancedMesh now)
        if (type === WEATHER_TYPES.SANDSTORM) return;

        // Create Geometry
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        const range = 2000;

        for (let i = 0; i < config.count; i++) {
            const x = (Math.random() - 0.5) * range;
            const y = Math.random() * 800 + 50;
            const z = (Math.random() - 0.5) * range;

            positions.push(x, y, z);

            if (type === WEATHER_TYPES.SNOW) {
                velocities.push(
                    config.velocityX + (Math.random() - 0.5) * 2,
                    config.velocityY + (Math.random() - 0.5) * 1,
                    0
                );
            } else { // RAIN
                velocities.push(config.velocityX, config.velocityY, 0);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

        const material = new THREE.PointsMaterial({
            color: config.color,
            size: config.size,
            transparent: true,
            opacity: config.opacity,
            blending: config.blending || THREE.AdditiveBlending,
            depthWrite: false,
            map: config.map || null // Apply snow/point texture here
        });

        this.particles = new THREE.Points(geometry, material);
        this.activeConfig = config;
        this.scene.add(this.particles);
    }

    updateWindDirection() {
        // Pick a random direction, STRICTLY Horizontal (X-axis)
        let angle;
        if (Math.random() < 0.5) {
            angle = 0; // Exactly Right
        } else {
            angle = Math.PI; // Exactly Left
        }

        const speed = 80 + Math.random() * 40; // Very Fast
        this.windVector.set(Math.cos(angle) * speed, 0, 0);
        this.windTimer = 300 + Math.random() * 180;
    }

    stopWeather() {
        this.cleanup();
        this.activeType = WEATHER_TYPES.NONE;
    }

    cleanup() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
            this.instancePositions = null;
        }
    }

    update(playerX, playerZ, fadeFactor = 1.0) {
        if (this.activeType === WEATHER_TYPES.NONE) return;

        // --- Streak Weather Update (InstancedMesh: Sandstorm / Rain) ---
        if (this.mesh && (this.activeType === WEATHER_TYPES.SANDSTORM || this.activeType === WEATHER_TYPES.RAIN)) {
            // Update Opacity
            if (this.mesh.material) {
                this.mesh.material.opacity = this.activeConfig.opacity * fadeFactor;
            }
            this.updateStreakWeather(playerX, playerZ);
            return;
        }

        // --- Point Weather Update (Snow) ---
        if (this.particles) {
            // Update Opacity
            if (this.particles.material) {
                this.particles.material.opacity = this.activeConfig.opacity * fadeFactor;
            }
            this.updatePointWeather(playerX, playerZ);
        }
    }

    updateStreakWeather(playerX, playerZ) {
        const isSand = (this.activeType === WEATHER_TYPES.SANDSTORM);

        // Wind Logic (Sandstorm only)
        let wx = 0;
        let rotY = 0;

        if (isSand) {
            this.windTimer--;
            if (this.windTimer <= 0) this.updateWindDirection();
            wx = this.windVector.x;
            rotY = wx > 0 ? 0 : Math.PI;
        }

        const range = 2000;
        const halfRange = range / 2;
        const dummy = new THREE.Object3D();

        const config = this.activeConfig;

        for (let i = 0; i < config.count; i++) {
            const data = this.instancePositions[i];

            if (isSand) {
                // Horizontal Movement
                data.x += wx * data.velocity;
            } else {
                // Vertical Movement (Rain)
                data.y += config.velocityY * data.velocity;
                // Slight wind drift
                data.x += config.velocityX * data.velocity;
            }

            // Wrap positions relative to player

            // X Axis
            if (data.x < playerX - halfRange) data.x += range;
            if (data.x > playerX + halfRange) data.x -= range;

            // Z Axis
            if (data.z < playerZ - halfRange) data.z += range;
            if (data.z > playerZ + halfRange) data.z -= range;

            // Y Axis (Height)
            if (data.y < 0) data.y += 800;
            if (data.y > 800 && config.velocityY < 0) data.y -= 800; // Just in case

            // Update Matrix
            dummy.position.set(data.x, data.y, data.z);
            dummy.rotation.y = rotY;

            // Rain rotation? Rain falls straight or slightly slanted. 
            // Box is vertical by default (0.5, size, 0.5).
            // If we want slanted rain, we rotate Z slightly around X/Z axis.
            if (!isSand) {
                // Slant based on velocityX
                dummy.rotation.z = config.velocityX * 0.05;
            }

            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    updatePointWeather(playerX, playerZ) {
        // The original code had a check for this.particles, but the new structure ensures it's present here.
        // if (!this.particles || this.activeType === WEATHER_TYPES.NONE) return; // Removed as redundant

        // The original code had wind update logic here, but it's now moved to updateSandstorm.
        // if (this.activeType === WEATHER_TYPES.SANDSTORM) { ... } // Removed

        const positions = this.particles.geometry.attributes.position.array;
        const velocities = this.particles.geometry.attributes.velocity.array;

        this.particles.position.set(0, 0, 0); // Keep mesh at 0,0,0

        const range = 2000; // Match spawn range
        const halfRange = range / 2;

        // We assume 3D coordinate system where Y is Up.
        // Game Logic: playerX is X, playerZ is Z (in 3D terms).

        // Removed sandstorm specific velocity logic from here.
        // const isSand = this.activeType === WEATHER_TYPES.SANDSTORM; // Removed
        // const wx = this.windVector.x; // Removed
        // const wz = this.windVector.z; // Removed

        for (let i = 0; i < this.activeConfig.count; i++) {
            const i3 = i * 3;

            // Logic: velocity attribute holds:
            // Rain/Snow: The actual full velocity
            // Sandstorm: Turbulence only. We add Wind Vector. (This logic is now in updateSandstorm)

            let vx, vy, vz;

            // Original sandstorm velocity logic removed.
            // if (isSand) { ... } else { ... }

            vx = velocities[i3];
            vy = velocities[i3 + 1];
            vz = velocities[i3 + 2];

            // Update Position
            positions[i3] += vx;
            positions[i3 + 1] += vy;
            positions[i3 + 2] += vz;

            // Bounds Checking & Wrapping relative to Player
            // X Axis
            if (positions[i3] < playerX - halfRange) positions[i3] += range;
            if (positions[i3] > playerX + halfRange) positions[i3] -= range;

            // Z Axis
            if (positions[i3 + 2] < playerZ - halfRange) positions[i3 + 2] += range;
            if (positions[i3 + 2] > playerZ + halfRange) positions[i3 + 2] -= range;

            // Y Axis (Height) - Constant wrapping
            if (positions[i3 + 1] < 0) positions[i3 + 1] += 800;
            if (positions[i3 + 1] > 850 && velocities[i3 + 1] > 0) positions[i3 + 1] -= 800; // If moving up? Unlikely for rain/snow.
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}
