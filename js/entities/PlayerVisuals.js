import * as THREE from 'three';
import {
  POLAR_VORTEX_RADIUS, POLAR_VORTEX_INNER_RADIUS_RATIO
} from '../constants.js';
import { PlayerMeshFactory } from './PlayerMeshFactory.js';

/**
 * Manages all 3D visual components for the Player character,
 * including the stick figure mesh, lights, and special effect visuals.
 */
export class PlayerVisuals {
  /**
   * @param {THREE.Scene} scene - The main game scene.
   * @param {Object} player - The player logical instance.
   */
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    // Visual Objects
    this.mesh = null;
    this.vortexMesh = new THREE.Group(); // Non-rotating group for Polar Vortex
    this.selfLight = null;
    this.spotLight = null;
    this.shieldMesh = null;
    this.shockwaveMesh = null;
    this.stasisParticles = [];
    this.stasisParticles = [];
    this.shockwaveVisualTimer = 0;
    this.animTime = 0;
    this.vfxAnimTime = 0;
    this.lastVfxTime = undefined;

    // Animation parts
    this.torso = null;
    this.head = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.rightLeg = null;
    this.gun = null;
    this.secondGun = null;

    this.init();
  }

  /**
   * Initializes all 3D models and lights.
   */
  init() {
    const { group, components, vortexMesh, stasisParticles } = PlayerMeshFactory.create(this.player);
    this.mesh = group;
    this.vortexMesh = vortexMesh;
    this.stasisParticles = stasisParticles;

    // Assign components to properties (torso, head, arms, etc)
    Object.assign(this, components);

    if (this.scene) {
      this.scene.add(this.mesh);
      this.scene.add(this.vortexMesh);
    }
  }



  /**
   * Updates all visual components based on player logical state.
   */
  update(dt = 16) {
    if (!this.mesh) return;

    // Position & Main Rotation
    // Position
    this.mesh.position.set(this.player.x + this.player.width / 2, 0, this.player.y + this.player.height / 2);

    // 1. ROTATE TORSO TO AIM (Smooth Mouse Tracking)
    // This ensures Head and Arms always face the cursor smoothly.
    this.mesh.rotation.y = -this.player.angle + Math.PI / 2;

    // 2. ROTATE LEGS TO MOVEMENT (Independent "Strafing" footwork)
    const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
    const isMoving = speed > 0.1;

    let legOffset = 0;
    if (isMoving) {
      // Movement angle (Snapped to 45 deg via WASD)
      const moveAngle = Math.atan2(this.player.vy, this.player.vx);

      // Calculate leg rotation relative to torso (which faces aim direction)
      // GlobalLegRotation (-Move + PI/2) = GlobalTorsoRotation (-Aim + PI/2) + LocalRotation
      // LocalRotation = this.player.angle - moveAngle

      legOffset = this.player.angle - moveAngle;

      // Normalize to -PI..PI
      legOffset = Math.atan2(Math.sin(legOffset), Math.cos(legOffset));
    }

    // Apply Snap-Counter-Rotation to Legs
    // If YXZ order is set (which it is), this rotates the "hips" before swinging the legs.
    if (this.leftLeg) this.leftLeg.rotation.y = legOffset;
    if (this.rightLeg) this.rightLeg.rotation.y = legOffset;

    // Reset Arm Twists (Arms now naturally face forward/aim via Torso)
    if (this.head) this.head.rotation.y = 0;
    if (this.leftArm) this.leftArm.rotation.y = 0;
    if (this.rightArm) this.rightArm.rotation.y = 0;

    // Initialize this.animTime in constructor if not already done
    if (this.animTime === undefined) this.animTime = 0;

    // Accumulate proper time delta (scaled by movement speed relative to base speed)
    // Adjust animation speed based on movement vs idle state
    if (isMoving) {
      // Scale animation speed by movement intensity
      // 0.015 is the base time factor
      this.animTime += dt * 0.015 * (speed / this.player.speed);
    } else {
      // Slower breathing animation for idle state
      this.animTime += dt * 0.002;
    }

    const time = this.animTime;

    // Default Pose
    let lLegRot = 0;
    let rLegRot = 0;
    let lArmRot = 0;
    // Right Arm: Point straight forward (Raise arm to horizontal)
    let rArmRot = -Math.PI / 2;

    if (isMoving) {
      // Run Cycle (Sine waves)
      lLegRot = Math.sin(time) * 0.8;
      rLegRot = Math.sin(time + Math.PI) * 0.8;

      // Arms swing opposite to legs
      lArmRot = Math.sin(time + Math.PI) * 0.6;
      // Right arm stays mostly steady for aiming, slight bob
      rArmRot = -Math.PI / 2 + Math.sin(time) * 0.1;
    } else {
      // Breathing check
      // Already incrementing time
    }

    // --- Dual Wield Logic ---
    const isDualWielding = this.player.projectileCount > 1;
    if (this.secondGun) {
      this.secondGun.visible = isDualWielding;
    }

    if (isDualWielding) {
      // Left Arm aims forward just like Right Arm
      // We can add a slight phase offset to the bobbing so they are not perfectly synced (more natural)
      lArmRot = -Math.PI / 2 + Math.sin(time * 0.001 + 0.5) * 0.1;

      // If strictly moving, we might want to override the run swing.
      // But let's enforce aiming pose if dual wielding.
    } else if (!isMoving) {
      // Idle arm poses (already 0 by default)
    }

    // Apply Rotations (X axis for forward/backward swing)
    if (this.leftLeg) this.leftLeg.rotation.x = lLegRot;
    if (this.rightLeg) this.rightLeg.rotation.x = rLegRot;
    if (this.leftArm) this.leftArm.rotation.x = lArmRot;
    if (this.rightArm) this.rightArm.rotation.x = rArmRot;

    // Bobbing torso
    if (this.torso) {
      const bounce = isMoving ? Math.abs(Math.sin(time)) * 2 : Math.sin(time) * 0.1;
      this.torso.position.y = 40 + bounce;
    }


    // Vortex Mesh Position
    if (this.vortexMesh) {
      this.vortexMesh.position.copy(this.mesh.position);
      // Keep vortex at ground level
      this.vortexMesh.position.y = 10;
    }

    // Shield Visual Update
    if (this.shieldMesh) {
      this.shieldMesh.visible = this.player.shieldActive;
      if (this.player.shieldActive) {
        // Shield pulse effect
        const scale = 1 + Math.sin(time * 2.0) * 0.05;

        this.shieldMesh.position.y = 20; // Center on stick figure
        this.shieldMesh.scale.set(scale, scale, scale);
      }
    }

    // Shockwave Animation Update
    if (this.player.triggerShockwave) {
      this.player.triggerShockwave = false;
      if (this.shockwaveMesh) {
        this.shockwaveMesh.visible = true;
        this.shockwaveMesh.scale.set(1, 1, 1);
        this.shockwaveMesh.material.opacity = 1;
        this.shockwaveVisualTimer = 30; // 0.5s animation
      }
    }

    if (this.shockwaveVisualTimer > 0) {
      this.shockwaveVisualTimer -= dt / 16.0; // Scale timer decrement relative to 60fps frame
      const progress = 1 - (this.shockwaveVisualTimer / 30);
      const maxRadius = (this.player.shockwaveForce || 10) * 10;
      const scale = 1 + progress * maxRadius;
      this.shockwaveMesh.scale.set(scale, scale, 1);
      this.shockwaveMesh.material.opacity = 1 - progress;
      if (this.shockwaveVisualTimer <= 0) {
        this.shockwaveMesh.visible = false;
      }
    }

    // Use real-time clock for VFX to ignore game speed scaling
    const now = performance.now() / 1000;
    if (this.lastVfxTime === undefined) this.lastVfxTime = now;
    const realDt = now - this.lastVfxTime;
    this.lastVfxTime = now;

    // Advance VFX time at constant rate (e.g. 1.0 speed)
    // ONLY if the game is running (dt > 0). 
    // This prevents movement during freeze/pause, but maintains 
    // real-time speed (ignoring timeScale) when running.
    if (dt > 0) {
      this.vfxAnimTime += realDt;
    }

    // Polar Vortex Particle Update
    if (this.player.stasisUnlocked && this.stasisParticles) {
      const r = this.player.stasisRadius || POLAR_VORTEX_RADIUS;
      const innerR = r * POLAR_VORTEX_INNER_RADIUS_RATIO;

      this.stasisParticles.forEach(p => {
        p.mesh.visible = true;
        p.angle += p.speed * (dt / 16.0); // Scale speed relative to 60fps
        p.radius += (p.radiusDrift || 0) * (dt / 16.0);

        // Robust bounce logic: only reverse if moving OUT of bounds
        if (p.radius > r && p.radiusDrift > 0) p.radiusDrift *= -1;
        if (p.radius < innerR && p.radiusDrift < 0) p.radiusDrift *= -1;

        // Vertical phase needs continuous time.
        // Use vfxAnimTime instead of 'time' to decouple from running animation
        const verticalPhase = p.radius * 0.1;
        const relativeY = -10 + (Math.sin(this.vfxAnimTime * 2 + verticalPhase + p.angle) * 15 + 15);

        const x = Math.cos(p.angle) * p.radius;
        const z = Math.sin(p.angle) * p.radius;

        p.mesh.position.set(x, relativeY, z);
        p.mesh.rotation.y = -p.angle;
      });
    }

    // Freeze Visuals
    // Check if player has slow effects
    const totalSlow = this.player.slowEffects.reduce((sum, effect) => sum + effect.amount, 0);
    // Cap at 1.0 for intensity calculation
    const freezeIntensity = Math.min(1.0, totalSlow);
    const isFullyFrozen = totalSlow >= 1.0;

    if (this.mesh) {
      // Defines which parts should be frozen based on state
      const shouldFreeze = (child) => {
        if (freezeIntensity <= 0) return false;
        if (isFullyFrozen) return true; // Freeze everything

        // Partial freeze: Only legs
        // Check if this child is part of the legs hierarchy
        let parent = child.parent;
        while (parent) {
          if (parent === this.leftLeg || parent === this.rightLeg || child === this.leftLeg || child === this.rightLeg) {
            return true;
          }
          if (parent === this.mesh) break; // Optimization
          parent = parent.parent;
        }
        return false;
      };

      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          // Initialize original color if not saved
          if (!child.userData.originalColor) {
            child.userData.originalColor = child.material.color.clone();
            if (child.material.emissive) {
              child.userData.originalEmissive = child.material.emissive.clone();
              child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
            }
          }

          if (shouldFreeze(child)) {
            // Mix original color with Cyan based on intensity
            const targetColor = new THREE.Color(0x00ffff);
            child.material.color.copy(child.userData.originalColor).lerp(targetColor, freezeIntensity * 0.8);

            if (child.material.emissive) {
              child.material.emissive.setHex(0x00ffff);
              child.material.emissiveIntensity = freezeIntensity; // Glow stronger as you freeze
            }
          } else {
            // Restore original
            child.material.color.copy(child.userData.originalColor);
            if (child.material.emissive) {
              child.material.emissive.copy(child.userData.originalEmissive);
              child.material.emissiveIntensity = child.userData.originalEmissiveIntensity;
            }
          }
        }
      });
    }
  }

  /**
   * Updates light radius based on player stats.
   */
  updateLights() {
    const radiusMultiplier = 1 + this.player.lightRadiusBonus;
    if (this.selfLight) this.selfLight.distance = 400 * radiusMultiplier;
    if (this.spotLight) this.spotLight.distance = 2500 * radiusMultiplier;
  }

  /**
   * Cleans up all visual objects from the scene.
   */
  dispose() {
    if (this.scene) {
      this.scene.remove(this.mesh);
      this.scene.remove(this.vortexMesh);
    }
  }
}
