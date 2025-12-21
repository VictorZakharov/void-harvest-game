import * as THREE from 'three';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    PLAYER_BASE_HEALTH, PLAYER_BASE_SPEED, PLAYER_BASE_DAMAGE, PLAYER_BASE_FIRE_RATE, PLAYER_SIZE, PLAYER_BASE_LIGHT_RADIUS,
    XP_LEVEL_MULTIPLIER, INITIAL_XP_REQUIRED,
    BULLET_BASE_SPEED, BULLET_BASE_RANGE, BULLET_SIZE,
    POLAR_VORTEX_RADIUS, POLAR_VORTEX_INNER_RADIUS_RATIO
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(x, y) {
        const playerSize = PLAYER_SIZE * 2 + 8; // Convert radius to sprite size (12*2 + 8 = 32)
        super(x, y, playerSize, playerSize);
        this.maxHealth = PLAYER_BASE_HEALTH;
        this.health = this.maxHealth;
        this.speed = PLAYER_BASE_SPEED;
        this.sprite = SpriteGenerator.createPlayerSprite(playerSize);

        // Combat stats
        this.damage = PLAYER_BASE_DAMAGE;
        this.fireRate = PLAYER_BASE_FIRE_RATE;
        this.fireTimer = 0;
        this.bulletSpeed = BULLET_BASE_SPEED;
        this.bulletSize = BULLET_SIZE * 2; // Convert to sprite size
        this.projectileCount = 1;
        this.piercing = 0;
        this.range = BULLET_BASE_RANGE; // Base range

        // Create 3D mesh
        this.vortexMesh = new THREE.Group(); // Non-rotating group for Polar Vortex
        this.mesh = this.createMesh();

        // XP and leveling
        this.xp = 0;
        this.level = 1;
        this.xpToLevel = INITIAL_XP_REQUIRED;

        // Rotation for aiming
        this.angle = 0;

        // Skill tracking
        this.skills = {};

        // Health regeneration
        this.healthRegen = 0; // HP per second
        this.regenTimer = 0;



        // Slow effect (cumulative - multiple ice hits stack)
        this.slowEffects = []; // Array of {amount, timer} objects

        // Freeze chance
        this.freezeChance = 0; // 0-1, where 0.1 = 10% chance

        // Extra skill choice
        this.extraChoice = false; // If true, show 4 skills instead of 3

        // Berserk mode


        // Armor
        this.armor = 0; // Absorbs damage before HP

        // Magnet range
        this.magnetBonus = 0; // Increases pickup range

        // Drop rate
        this.dropBonus = 0; // Increases health drop rate

        // Light Radius
        this.lightRadiusBonus = 0; // Increases light radius (+50% per level)

        // Weapon Spread / Recoil
        this.currentSpread = 0; // Current spread angle in radians
        this.maxSpread = 0.35; // ~20 degrees max spread (Wide)
        this.minSpread = 0.02; // Tiny base spread for "human" feel
        this.spreadPerShot = 0.08; // Jump per shot
        this.spreadRecovery = 0.005; // Recovery per frame

        // Energy Shield
        this.shieldUnlocked = false;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 600; // 10 seconds at 60fps

        // Shockwave (Defensive)
        this.shockwaveUnlocked = false;
        this.shockwaveTimer = 0;
        this.shockwaveCooldown = 180; // 3 seconds (nerfed from 2s)
        this.shockwaveForce = 0;

        // Stasis Field (Defensive)
        this.stasisUnlocked = false;
        this.stasisRadius = POLAR_VORTEX_RADIUS;
        this.stasisSlow = 0; // % Slow amount (0.3 = 30%)

    }

    update(input, mouseX, mouseY, camYaw = 0) {
        // Update slow effect timers and remove expired effects
        for (let i = this.slowEffects.length - 1; i >= 0; i--) {
            this.slowEffects[i].timer--;
            if (this.slowEffects[i].timer <= 0) {
                this.slowEffects.splice(i, 1);
            }
        }

        // Calculate total slow amount from all active effects
        const totalSlowAmount = this.slowEffects.reduce((sum, effect) => sum + effect.amount, 0);

        // Cap at 100% slow (can't go negative speed)
        const cappedSlowAmount = Math.min(1, totalSlowAmount);

        // Calculate effective speed with cumulative slow effect
        const effectiveSpeed = this.speed * (1 - cappedSlowAmount);

        // Movement (Input Vector)
        let ivx = 0;
        let ivy = 0;

        if (input.keys['w'] || input.keys['ArrowUp']) ivy = -effectiveSpeed;
        if (input.keys['s'] || input.keys['ArrowDown']) ivy = effectiveSpeed;
        if (input.keys['a'] || input.keys['ArrowLeft']) ivx = -effectiveSpeed;
        if (input.keys['d'] || input.keys['ArrowRight']) ivx = effectiveSpeed;

        // Normalize if diagonal
        if (ivx !== 0 && ivy !== 0) {
            ivx *= 0.707;
            ivy *= 0.707;
        }

        // Apply Camera Rotation to Input Vector
        // We rotate the vector by the camera's yaw to align "Up" with Camera Forward.
        // Rotated Vector (vx, vy):
        // vx = ivx * cos(yaw) + ivy * sin(yaw)
        // vy = ivy * cos(yaw) - ivx * sin(yaw)
        // Note: Sign convention verified against standard orbital cam (Yaw=0 -> +Z, Looking -Z/North)
        const cos = Math.cos(camYaw);
        const sin = Math.sin(camYaw);

        this.vx = ivx * cos + ivy * sin;
        this.vy = ivy * cos - ivx * sin;

        this.x += this.vx;
        this.y += this.vy;

        // Keep in bounds
        this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));

        // Calculate aim angle
        const bounds = this.getBounds();
        this.angle = Math.atan2(mouseY - bounds.centerY, mouseX - bounds.centerX);

        // Fire timer
        if (this.fireTimer > 0) this.fireTimer--;

        // Health regeneration (60 frames = 1 second)
        if (this.healthRegen > 0) {
            this.regenTimer++;
            if (this.regenTimer >= 60) {
                this.regenTimer = 0;
                this.heal(this.healthRegen);
            }
        }

        // Vampire cooldown
        if (this.vampireTimer > 0) this.vampireTimer--;

        // Recover Spread (Recoil Decay)
        if (this.fireTimer <= 0) {
            // Only recover when NOT firing (or fireTimer acts as cooldown)
            // Actually, recover constantly but shooting adds jumps
            this.currentSpread = Math.max(this.minSpread, this.currentSpread - this.spreadRecovery);
        } else {
            // Slower recovery while actively firing?
            this.currentSpread = Math.max(this.minSpread, this.currentSpread - (this.spreadRecovery * 0.5));
        }

        // Shield Recharge Logic
        if (this.shieldUnlocked && !this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = true;
                // Visuals will be updated in updateLights or separate render pass
            }
        }

        // Update Shield Visuals
        if (this.shieldMesh) {
            this.shieldMesh.visible = this.shieldActive;
            if (this.shieldActive) {
                // Pulse effect?
                const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
                this.shieldMesh.scale.set(scale, scale, scale);
            }
        }

        // Shockwave Logic
        if (this.shockwaveUnlocked) {
            this.shockwaveTimer++;
            if (this.shockwaveTimer >= this.shockwaveCooldown) {
                this.shockwaveTimer = 0;
                this.triggerShockwave = true;

                // Start Visual Animation
                if (this.shockwaveMesh) {
                    this.shockwaveMesh.visible = true;
                    this.shockwaveMesh.scale.set(1, 1, 1);
                    this.shockwaveMesh.material.opacity = 1;
                    this.shockwaveVisualTimer = 30; // 0.5s animation
                }
            }
        }

        // Animate Shockwave Visual
        if (this.shockwaveVisualTimer > 0) {
            this.shockwaveVisualTimer--;
            if (this.shockwaveMesh) {
                const progress = 1 - (this.shockwaveVisualTimer / 30);
                // Radius = Force * 10 (Base 10 * 10 = 100)
                const maxRadius = (this.shockwaveForce || 10) * 10;

                const scale = 1 + progress * maxRadius;
                this.shockwaveMesh.scale.set(scale, scale, 1);
                this.shockwaveMesh.material.opacity = 1 - progress;
            }
            if (this.shockwaveVisualTimer <= 0) {
                if (this.shockwaveMesh) this.shockwaveMesh.visible = false;
            }
        }

        // Polar Vortex Visuals (Ice Storm)
        if (this.stasisUnlocked && this.stasisParticles) {
            const r = this.stasisRadius || POLAR_VORTEX_RADIUS;
            const innerR = r * POLAR_VORTEX_INNER_RADIUS_RATIO;

            this.stasisParticles.forEach(p => {
                p.mesh.visible = true;

                // Orbit
                p.angle += p.speed;

                // Smooth Radial Drift
                p.radius += (p.radiusDrift || 0);
                if (p.radius > r || p.radius < innerR) p.radiusDrift *= -1;

                // Smooth Vertical Motion (Sine wave)
                const time = Date.now() * 0.001;
                const verticalPhase = p.radius * 0.1;
                const relativeY = -10 + (Math.sin(time * 2 + verticalPhase + p.angle) * 15 + 15);

                const x = Math.cos(p.angle) * p.radius;
                const z = Math.sin(p.angle) * p.radius;

                p.mesh.position.set(x, relativeY, z);

                // Rotation: Streak should point in direction of movement (Tangent).
                p.mesh.rotation.y = -p.angle;
            });
        }

    }

    shoot(mouseDown) {
        if (this.fireTimer === 0 && mouseDown) {
            this.fireTimer = this.fireRate;
            return true;
        }
        return false;
    }

    addXP(amount) {
        this.xp += amount;
        let leveledUp = false;

        // Handle multiple level-ups if enough XP collected
        while (this.xp >= this.xpToLevel) {
            this.levelUp();
            leveledUp = true;
        }

        return leveledUp;
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToLevel; // Carry over excess XP to next level
        this.xpToLevel = Math.floor(this.xpToLevel * XP_LEVEL_MULTIPLIER);
    }

    takeDamage(amount) {
        // Shield Check
        if (this.shieldActive) {
            this.shieldActive = false;
            this.shieldTimer = this.shieldCooldown;
            return false; // Blocked logic (return value indicates isDead, implies 0 damage taken)
        }

        // Armor reduces damage (permanent damage reduction)
        if (this.armor > 0) {
            amount = Math.max(0, amount - this.armor);
        }

        // Apply damage to health
        this.health -= amount;
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    onKill() {
        // Vampire effect - heal on kill (with cooldown)
        if (this.vampire > 0 && this.vampireTimer === 0) {
            this.heal(this.vampire);
            this.vampireTimer = this.vampireCooldown;
        }
    }

    draw(ctx) {
        // 2D draw - replaced by 3D render
    }

    getLightRadius() {
        return PLAYER_BASE_LIGHT_RADIUS * (1 + this.lightRadiusBonus);
    }

    updateLights() {
        // Scale lighting based on bonus
        const radiusMultiplier = 1 + this.lightRadiusBonus;

        if (this.selfLight) {
            this.selfLight.distance = 400 * radiusMultiplier;
        }
        if (this.spotLight) {
            this.spotLight.distance = 2500 * radiusMultiplier;
            // Also widen the angle slightly? maybe capped?
            // Let's keep angle consistent directly, radius implies distance/intensity for SpotLight
        }
    }

    createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(this.width, 20, this.height);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ffff }); // Standard for lighting
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(this.width * 0.6, 15, this.height * 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 }); // Standard for lighting
        const head = new THREE.Mesh(headGeo, headMat);

        head.position.y = 10;
        head.position.z = -5;
        head.castShadow = true;
        group.add(head);

        // Weapon/Pointer (Visual direction indicator)
        const gunGeo = new THREE.BoxGeometry(30, 10, 10);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.set(25, 10, 10); // Offset to right/front
        gun.castShadow = true;
        group.add(gun);

        // Player Self-Light (To ensure player is visible in the dark)
        // 50% visibility feel relative to main light
        this.selfLight = new THREE.PointLight(0xffaa00, 1.0, 400, 2);
        this.selfLight.position.set(0, 50, 0);
        group.add(this.selfLight);

        // Flashlight (Directional SpotLight)
        // Pointing +X relative to player rotation
        this.spotLight = new THREE.SpotLight(0xffffff, 1.5); // Reduced intensity (1.5)
        this.spotLight.position.set(0, 50, 0);
        this.spotLight.angle = Math.PI / 3; // 60 degree cone (120 total) - Wide but directional
        this.spotLight.penumbra = 0.2; // Sharper edges
        this.spotLight.decay = 2;
        this.spotLight.distance = 2500;
        this.spotLight.castShadow = true;
        this.spotLight.shadow.mapSize.width = 1024;
        this.spotLight.shadow.mapSize.height = 1024;

        // Target for Spotlight
        const target = new THREE.Object3D();
        target.position.set(100, 0, 0); // Ahead in X
        group.add(target);
        this.spotLight.target = target;
        group.add(this.spotLight);

        // Shield Mesh (Hidden by default)
        const shieldGeo = new THREE.SphereGeometry(this.width, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.visible = false;
        group.add(this.shieldMesh);

        // Shockwave Mesh (Ring)
        const ringGeo = new THREE.RingGeometry(1, 2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        this.shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
        this.shockwaveMesh.rotation.x = -Math.PI / 2;
        this.shockwaveMesh.position.y = 5; // Just above ground
        this.shockwaveMesh.visible = false;
        group.add(this.shockwaveMesh);

        // Polar Vortex Particles (Ice Streaks)
        this.stasisParticles = [];
        const particleCount = 400;
        // Elongated Box for "Streak/Comet" look: (Width, Height, Length/Tail)
        // Z-axis length 6, X/Y width 0.8 (Thicker).
        const particleGeo = new THREE.BoxGeometry(0.8, 0.8, 6);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xccffff, // Brighter Cyan/White
            transparent: true,
            opacity: 0.9 // Almost opaque for visibility
        });

        for (let i = 0; i < particleCount; i++) {
            const mesh = new THREE.Mesh(particleGeo, particleMat);
            mesh.visible = false;

            // Random scales length slightly
            const lenScale = 0.8 + Math.random() * 1.5;
            mesh.scale.set(1, 1, lenScale);

            const innerR = POLAR_VORTEX_RADIUS * POLAR_VORTEX_INNER_RADIUS_RATIO;
            this.vortexMesh.add(mesh); // Add to non-rotating group
            this.stasisParticles.push({
                mesh: mesh,
                angle: Math.random() * Math.PI * 2,
                radius: innerR + Math.random() * (POLAR_VORTEX_RADIUS - innerR),
                radiusDrift: (Math.random() - 0.5) * 0.25, // Reduced drift for smaller radius
                speed: 0.01 + Math.random() * 0.02, // Slower, more majestic spin
                drift: 0.1 + Math.random() * 0.2
            });
        }

        return group;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
            this.mesh.rotation.y = -this.angle; // Rotate around Y axis
        }
        if (this.vortexMesh) {
            this.vortexMesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
            // DO NOT rotate vortexMesh, it stays world-aligned!
        }
    }
}
