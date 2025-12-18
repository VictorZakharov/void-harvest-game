import * as THREE from 'three';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    PLAYER_BASE_HEALTH, PLAYER_BASE_SPEED, PLAYER_BASE_DAMAGE, PLAYER_BASE_FIRE_RATE, PLAYER_SIZE, PLAYER_BASE_LIGHT_RADIUS,
    XP_LEVEL_MULTIPLIER, INITIAL_XP_REQUIRED,
    ITEM_MAGNET_BASE_RANGE, ITEM_MOVE_SPEED,
    BULLET_BASE_SPEED, BULLET_BASE_RANGE, BULLET_SIZE, BULLET_COLOR,
    XP_ITEM_BASE_VALUE,
    ENEMY_SPRITE_COLORS
} from './constants.js';
import { SpriteGenerator } from './sprites.js';

export class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
        this.mesh = null;
    }

    createMesh() {
        return null;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
            // 2D angle is usually 0 = Right (+X), PI/2 = Down (+Y on screen, +Z in 3D logic here)
            // So we rotate around Y axis (Up). 
            // In 3D: +X is Right, +Z is Forward/Down.
            // Angle corresponds to rotation around -Y (because 2D Y is down/inverted vs standard Cartesian)
            // Actually, Math.atan2(y,x) expects y up. Canvas y is down. 
            // So angle is inverted? 
            // Let's just try negative angle first.
            this.mesh.rotation.y = -this.angle;
        }
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2
        };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.left < b.right && a.right > b.left &&
            a.top < b.bottom && a.bottom > b.top;
    }
}

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

        // Vampire (lifesteal)
        this.vampire = 0; // HP per kill
        this.vampireTimer = 0;
        this.vampireCooldown = 30; // frames (0.5 sec at 60fps)

        // Slow effect (cumulative - multiple ice hits stack)
        this.slowEffects = []; // Array of {amount, timer} objects

        // Freeze chance
        this.freezeChance = 0; // 0-1, where 0.1 = 10% chance

        // Extra skill choice
        this.extraChoice = false; // If true, show 4 skills instead of 3

        // Berserk mode
        this.berserkBonus = 0; // Damage multiplier when below 30% health

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
    }

    update(input, mouseX, mouseY) {
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

        // Movement
        this.vx = 0;
        this.vy = 0;

        if (input.keys['w'] || input.keys['ArrowUp']) this.vy = -effectiveSpeed;
        if (input.keys['s'] || input.keys['ArrowDown']) this.vy = effectiveSpeed;
        if (input.keys['a'] || input.keys['ArrowLeft']) this.vx = -effectiveSpeed;
        if (input.keys['d'] || input.keys['ArrowRight']) this.vx = effectiveSpeed;

        // Normalize diagonal movement
        if (this.vx !== 0 && this.vy !== 0) {
            this.vx *= 0.707;
            this.vy *= 0.707;
        }

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



        return group;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
            this.mesh.rotation.y = -this.angle; // Rotate around Y axis
        }
    }
}

export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y, 32, 32);
        this.type = type;

        // Set stats based on type
        switch (type) {
            case 'basic':
                this.maxHealth = 30;
                this.speed = 1.5;
                this.damage = 10;
                this.xpValue = 1;
                this.width = this.height = 32;
                break;
            case 'fast':
                this.maxHealth = 15;
                this.speed = 3;
                this.damage = 5;
                this.xpValue = 2;
                this.width = this.height = 28;
                break;
            case 'tank':
                this.maxHealth = 100;
                this.speed = 0.8;
                this.damage = 20;
                this.xpValue = 5;
                this.width = this.height = 40;
                break;
            case 'shooter':
                this.maxHealth = 20;
                this.speed = 1;
                this.damage = 5;
                this.xpValue = 3;
                this.shootTimer = 0;
                this.shootRate = 120;
                this.width = this.height = 32;
                break;
            case 'ice':
                this.maxHealth = 25;
                this.speed = 0.9;
                this.damage = 5; // Contact damage (same as shooter)
                this.xpValue = XP_ITEM_BASE_VALUE;
                this.shootTimer = 0;
                this.shootRate = 180; // Slower fire rate than regular shooter
                this.width = this.height = 32;
                this.slowAmount = 0.15; // 15% slow
                this.slowDuration = 60; // 1 second (60 frames at 60fps)
                break;
        }

        this.sprite = SpriteGenerator.createEnemySprite(type, this.width);
        this.health = this.maxHealth;
        this.angle = 0; // For rotation (shooters face player)

        // Freeze effect
        this.frozen = false;
        this.frozen = false;
        this.freezeTimer = 0;

        this.mesh = this.createMesh();
    }

    update(playerX, playerY, speedModifier = 1) {
        // Update freeze timer
        if (this.freezeTimer > 0) {
            this.freezeTimer--;
            if (this.freezeTimer === 0) {
                this.frozen = false;
            }
        }

        // Skip movement if frozen
        if (this.frozen) {
            return;
        }

        // Move towards player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate angle to player
        this.angle = Math.atan2(dy, dx);

        if (dist > 0) {
            // Apply speed modifier (e.g. weather slow)
            const currentSpeed = this.speed * speedModifier;
            this.vx = (dx / dist) * currentSpeed;
            this.vy = (dy / dist) * currentSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Shooter and ice enemy shooting
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer !== undefined) {
            this.shootTimer++;
        }
    }

    canShoot() {
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer >= this.shootRate) {
            this.shootTimer = 0;
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    draw(ctx) {
        // 2D logic removed for 3D
    }

    createMesh() {
        const color = ENEMY_SPRITE_COLORS[this.type].main;
        const geometry = new THREE.BoxGeometry(this.width, 20, this.height);
        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true, // Re-enable transparency for blending
            opacity: 1.0
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = false; // Prevent self-shadowing acne (horizontal lines)

        this.bodyMesh = body; // Store reference for color updates
        this.baseColor = color; // Store original color

        // Group for body + ui
        const group = new THREE.Group();
        group.add(body);

        // Add "Face/Eyes" to indicate direction
        // Front is +X direction based on atan2(dy, dx) and rotation logic
        const eyeGeo = new THREE.BoxGeometry(4, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(this.width / 2 + 0.2, 5, -this.height / 4); // Offset +0.2 to avoid z-fighting

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(this.width / 2 + 0.2, 5, this.height / 4); // Offset +0.2 to avoid z-fighting

        group.add(leftEye);
        group.add(rightEye);

        // Add Gun for shooter types
        if (this.type === 'shooter' || this.type === 'ice') {
            const gunLength = 20;
            const gunGeo = new THREE.BoxGeometry(gunLength, 6, 6);
            const gunColor = this.type === 'ice' ? 0x88ccff : 0x333333; // Icy gun for ice enemy
            const gunMat = new THREE.MeshLambertMaterial({ color: gunColor, transparent: true, opacity: 1.0 });
            const gun = new THREE.Mesh(gunGeo, gunMat);

            // Mount on right side, pointing forward
            // Body extends to this.height/2 in Z.
            gun.position.set(this.width / 2, -2, this.height / 2 + 4);
            gun.castShadow = true;
            group.add(gun);
        }

        // Health Bar (Billboard Group)
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 40, 0); // Lift higher for visibility

        // BG (Large Dark Grey)
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0 });
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(54, 12),
            bgMat
        );
        bg.userData.isHealthBar = true; // Critical: Prevent Stealth logic from recoloring this black
        hpGroup.add(bg);
        hpGroup.bg = bg; // Store Ref

        // FG (Large Red)
        const fgGeo = new THREE.PlaneGeometry(50, 10);
        fgGeo.translate(25, 0, 0);

        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.userData.isHealthBar = true; // Critical: Prevent Stealth logic from recoloring this black
        fg.position.z = 1;
        fg.position.x = -25;
        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg; // Store Ref

        hpGroup.visible = false;

        group.add(hpGroup);
        this.healthBar = hpGroup;

        // Init opacity state
        this.hbOpacity = 0;

        return group;
    }

    updateMesh(visibility = 1.0, fogColor = 0x333333) {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);

            // Rotate all enemies to face player
            this.mesh.rotation.y = -this.angle;

            // Visual Stealth Handling
            // Interpolate between "Hidden Shadow" and "Visible Solid"
            // Hidden: Color=Black, Opacity=0.05 (Barely visible)
            // Visible: Color=Base, Opacity=1.0

            // Clamp visibility 0-1
            const v = Math.max(0, Math.min(1, visibility));

            if (this.bodyMesh) {
                // Recursively update opacity and color for ALL meshes in the group (Body, Eyes, Gun)
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Skip Health Bar (it handles its own opacity)
                        if (child.userData.isHealthBar) return;

                        // Interpolate Opacity
                        // From 0.05 (Hidden) to 1.0 (Visible)
                        const targetOpacity = 0.05 + (0.95 * v);
                        child.material.transparent = true;
                        child.material.opacity = targetOpacity;

                        // Interpolate Color
                        let targetColor = new THREE.Color(0x000000); // Shadow Base

                        if (child === this.bodyMesh) {
                            targetColor.lerp(new THREE.Color(this.baseColor), v);
                        } else if (child.geometry && child.geometry.type === 'BoxGeometry' && child.geometry.parameters.width === 4) {
                            // Eyes
                            targetColor.setHex(0x000000);
                        } else if (child.geometry && child.geometry.parameters.width === 20) {
                            // Gun
                            const gunColor = this.type === 'ice' ? 0x88ccff : 0x333333;
                            targetColor.lerp(new THREE.Color(gunColor), v);
                        }

                        child.material.color.copy(targetColor);
                    }
                });
            }

            // Update Health Bar
            if (this.healthBar) {
                // Determine target visibility/opacity
                const isDamaged = this.health < this.maxHealth;
                const shouldBeVisible = (v > 0.5 && isDamaged && this.health > 0);
                const targetOpacity = shouldBeVisible ? 1.0 : 0.0;

                // Initialize if missing
                if (this.hbOpacity === undefined) this.hbOpacity = 0;

                // Check for "First Hit" while visible -> Snap to 1.0
                if (shouldBeVisible && !this.wasDamaged) {
                    this.hbOpacity = 1.0;
                }
                // Regular Lerp
                else if (this.hbOpacity < targetOpacity) {
                    this.hbOpacity = Math.min(this.hbOpacity + 0.02, targetOpacity);
                } else if (this.hbOpacity > targetOpacity) {
                    this.hbOpacity = Math.max(this.hbOpacity - 0.02, targetOpacity);
                }

                this.wasDamaged = isDamaged;

                if (this.hbOpacity > 0.01) {
                    this.healthBar.visible = true;
                    if (this.healthBar.bg) this.healthBar.bg.material.opacity = this.hbOpacity;
                    if (this.healthBar.fg) this.healthBar.fg.material.opacity = this.hbOpacity;

                    const pct = this.health / this.maxHealth;
                    this.healthBar.foreground.scale.x = pct;

                    // Billboard effect (Counter rotation + Tilt)
                    this.healthBar.rotation.order = 'YXZ';
                    this.healthBar.rotation.y = this.angle;
                    this.healthBar.rotation.x = -Math.PI / 4;
                } else {
                    this.healthBar.visible = false;
                }
            }
        }
    }

}

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

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.distanceTraveled += this.speed;
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

        // Use Sprite with Additive Blending for "Light" look
        // We use the gradient texture to create a soft glow orb
        const map = SpriteGenerator.createGradientTexture(64, colorStr);
        const material = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(map),
            color: color, // Tint is in the texture but this ensures saturation
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false // Don't block other glows
        });

        const sprite = new THREE.Sprite(material);
        // Scale sprite reduced from 40 to 16 to look like a tight energy ball, not a snowball
        sprite.scale.set(16, 16, 1);

        // Add Fake Floor Light (Horizontal Plane) to illuminate ground cheaply
        // Real PointLights caused massive lag. This Additive Plane mimics light on the floor.
        if (this.isPlayer) {
            // Horizontal plane, lying flat on the ground
            const glowGeo = new THREE.PlaneGeometry(1, 1);
            const glowMat = new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(map), // Reuse the gradient
                color: color,
                transparent: true,
                opacity: 0.5, // Brighter floor spot
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const floorGlow = new THREE.Mesh(glowGeo, glowMat);

            // Bullet is at Y=10. Ground is at Y=0.
            // Place closer to ground (relative Y = -9.5 puts it at Abs Y = 0.5)
            // Scale up to 150 for large light radius
            floorGlow.position.set(0, -9.5, 0);
            floorGlow.rotation.x = -Math.PI / 2;
            floorGlow.scale.set(150, 150, 1);

            sprite.add(floorGlow);
        }

        return sprite;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
        }
    }
}

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
