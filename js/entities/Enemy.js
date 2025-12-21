import * as THREE from 'three';
import {
    XP_ITEM_BASE_VALUE,
    ENEMY_SPRITE_COLORS
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

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

        // Knockback handling
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackTimer = 0;

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

        // Apply knockback if active
        if (this.knockbackTimer > 0) {
            this.knockbackTimer--;
            // Decay knockback
            this.knockbackVx *= 0.9;
            this.knockbackVy *= 0.9;
            this.x += this.knockbackVx;
            this.y += this.knockbackVy;

            // Still allow movement but severely reduced
            // or just Block movement? Block looks better for impact.
            return;
        }

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

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    applyKnockback(vx, vy, duration = 10) {
        this.knockbackVx = vx;
        this.knockbackVy = vy;
        this.knockbackTimer = duration; // frames
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

        // Helper to create pill geometry (Anchor: Left Center i.e. x=0, y=0)
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

        // BG (Large Dark Grey)
        // 54 width, 12 height
        const bgGeo = createPillGeo(54, 12);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0 });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.x = -27; // Center the 0..54 width bar
        bg.userData.isHealthBar = true;
        hpGroup.add(bg);
        hpGroup.bg = bg;

        // FG (Large Red)
        // 50 width, 10 height
        const fgGeo = createPillGeo(50, 10);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.userData.isHealthBar = true;
        fg.position.z = 1;
        fg.position.x = -25; // Center the 0..50 width bar relative to group center (left-aligned start)
        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg;

        hpGroup.visible = false;

        group.add(hpGroup);
        this.healthBar = hpGroup;

        // Init opacity state
        this.hbOpacity = 0;

        return group;
    }

    updateMesh(visibility = 1.0, fogColor = 0x333333, camera = null) {
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

                    // Billboard effect (Face Screen / Planar)
                    if (camera) {
                        // Planar Billboarding: Align with camera plane
                        // Look at a point infinitely far in the direction of the camera (Backwards from view)
                        const camDir = new THREE.Vector3();
                        camera.getWorldDirection(camDir);

                        const target = new THREE.Vector3();
                        this.healthBar.getWorldPosition(target);
                        target.sub(camDir.multiplyScalar(100)); // Point towards camera, parallel to view axis

                        this.healthBar.lookAt(target);
                    } else {
                        // Fallback (Counter rotation + Tilt)
                        this.healthBar.rotation.order = 'YXZ';
                        this.healthBar.rotation.y = this.angle;
                        this.healthBar.rotation.x = -Math.PI / 4;
                    }
                } else {
                    this.healthBar.visible = false;
                }
            }
        }
    }


}
