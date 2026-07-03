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
    this.reviveRing = null;
    this.orbitShields = []; // Array of 3 shield meshes
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

    // Animation Transitions
    this.downAnimationProgress = 0; // 0 = standing, 1 = fully downed

    this.init();
  }

  /**
   * Initializes all 3D models and lights.
   */
  init() {
    const { group, components, vortexMesh, stasisParticles } = PlayerMeshFactory.create(this.player, this.player.color);
    this.mesh = group;
    this.vortexMesh = vortexMesh;
    this.stasisParticles = stasisParticles;

    // Assign components to properties (torso, head, arms, etc)
    Object.assign(this, components);

    if (this.scene) {
      this.scene.add(this.mesh);
      this.scene.add(this.mesh);
      this.scene.add(this.vortexMesh);

      // Create Orbiting Shields (Cyan Plates)
      // Custom Heater Shield Shape
      const shieldShape = new THREE.Shape();
      const sw = 6; // Half width
      const sh = 10; // Height
      shieldShape.moveTo(-sw, sh);
      shieldShape.lineTo(sw, sh);
      shieldShape.lineTo(sw, 0);
      shieldShape.quadraticCurveTo(sw, -sh, 0, -sh * 1.5); // Pointed bottom
      shieldShape.quadraticCurveTo(-sw, -sh, -sw, 0);
      shieldShape.lineTo(-sw, sh);

      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
        depth: 2,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 1,
        bevelThickness: 1
      });
      // Center geometry?
      shieldGeo.center();

      const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });

      for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(shieldGeo, shieldMat);
        s.visible = false;
        // Initialize Scale 0 for transition
        s.scale.set(0, 0, 0);
        this.orbitShields.push(s);
        this.scene.add(s);
      }

      // --- Revive Ring (Shader Based) ---
      // A dashed ring background + A solid progress arc
      // Uniforms: uProgress (0..1), uColor
      // Geometry: Plane 1x1, scaled to radius

      const reviveGeo = new THREE.PlaneGeometry(220, 220); // 100 radius + padding
      // Rotate to lie flat
      reviveGeo.rotateX(-Math.PI / 2);

      const reviveMat = new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0.0 }, // 0 to 1
          uColor: { value: new THREE.Color(0xffff00) },
          uTime: { value: 0 }
        },
        transparent: true,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uProgress;
          uniform vec3 uColor;
          uniform float uTime;
          varying vec2 vUv;
          
          #define PI 3.14159265359

          void main() {
            vec2 center = vec2(0.5);
            vec2 d = vUv - center;
            float dist = length(d);
            float angle = atan(d.y, d.x); // -PI to PI
            // Normalize angle to 0..1 starting from top (PI/2)?
            // standard atan is 0 at right.
            // Rotate -PI/2 to align with top. 
            // angle -= PI/2.0; 
            
            // Map -PI..PI to 0..1
            if (angle < 0.0) angle += 2.0 * PI;
            float angle01 = angle / (2.0 * PI);
            
            // Ring Radius range (0.35 to 0.45 in UV space = 70 to 90 units approx)
            // Radius 100 means diameter 200. UV 0.5 is center. 0.45 is 90% radius.
            float inner = 0.38;
            float outer = 0.45;
            
            if (dist < inner || dist > outer) discard;

            // Dashed Background
            // 8 Dashes
            float dash = sin(angle * 8.0 + uTime * 2.0); // Animate spin? No user didn't ask spin.
            dash = step(0.0, sin(angle * 8.0)); // simple dashes
            
            float alpha = 0.0;
            
            // Background Layer (Dim Dashes)
            if (dash > 0.0) alpha = 0.2;
            
            // Progress Layer (Solid, fills over dashes)
            // Reverse direction or start from top? 
            // angle01 goes CCW from Right.
            // visual wants Clockwise? or CCW? CCW is standard.
            
            // Rotate start point to Top
            float effectiveAngle = angle01 + 0.25; 
            if (effectiveAngle > 1.0) effectiveAngle -= 1.0;
            
            // If angle is within progress
            // But we want "sections will fill up". 
            // Continuous fill is fine per user "fill up as revive button is pressed".
            
            // Invert to Clockwise rotation if necessary.
            // If uProgress > effectiveAngle, it's filled.
            // But we want to handle the wrap around logic or just use simple angle.
            
            // Simplest: Linear fill 0..1
            // Shift so 0 degrees is at Top (0.25 offset).
            
            // Check if fragment angle is "less than" progress angle.
            // Since we use effectiveAngle (0..1), if uProgress > effectiveAngle
            if (uProgress > effectiveAngle) {
                 alpha = 1.0;
            }

            if (alpha < 0.01) discard;

            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        depthWrite: false
      });

      this.reviveRing = new THREE.Mesh(reviveGeo, reviveMat);
      this.reviveRing.visible = false;
      this.reviveRing.renderOrder = 999; // On top of floor
      this.scene.add(this.reviveRing);
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
      // Enforce aiming pose when dual wielding.
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
      // Calculate Animation Progress
      const targetDown = this.player.isDowned ? 1.0 : 0.0;
      const animationSpeed = 0.1; // Speed of falling/standing (approx 10 frames or 0.16s at 60fps? No, 0.1 per frame is fast. Let's use dt.)

      // Move progress towards target
      // dt is approx 16ms usually. 0.0016 * dt approx 0.025 per frame (~0.6-0.7s duration)
      const step = 0.0016 * dt;
      if (this.downAnimationProgress < targetDown) {
        this.downAnimationProgress = Math.min(targetDown, this.downAnimationProgress + step);
      } else if (this.downAnimationProgress > targetDown) {
        this.downAnimationProgress = Math.max(targetDown, this.downAnimationProgress - step);
      }

      // 0 = Standing, 1 = Downed
      const t = this.downAnimationProgress;
      const easeT = t * t * (3 - 2 * t); // Smoothstep

      // Standard Animation Values (Standing)
      const visibleBounce = isMoving ? Math.abs(Math.sin(time)) * 2 : Math.sin(time) * 0.1;
      const standY = 40 + visibleBounce;
      const standRotX = 0;

      // Downed Values
      const downedY = 5;
      const downedRotX = -Math.PI / 2;

      // Interpolate Torso
      this.torso.position.y = standY + (downedY - standY) * easeT;
      this.torso.rotation.x = standRotX + (downedRotX - standRotX) * easeT;

      // Interpolate Limbs to "Ragdoll" / Flat Interaction
      if (t > 0) {
        // Target Limb Rotations for Downed State
        // Arms back (-PI), Legs straight (0)
        const deadArmRot = -Math.PI;
        const deadLegRot = 0;

        // Lerp from current animated value to dead value
        // Note: lArmRot, etc are calculated above for the current frame's "alive" state.
        // We act as if the player is still trying to run while falling, which is funny, 
        // effectively blending from "Run" to "Fall".

        if (this.leftArm) this.leftArm.rotation.x = this.leftArm.rotation.x * (1 - easeT) + deadArmRot * easeT;
        if (this.rightArm) this.rightArm.rotation.x = this.rightArm.rotation.x * (1 - easeT) + deadArmRot * easeT;

        if (this.leftLeg) this.leftLeg.rotation.x = this.leftLeg.rotation.x * (1 - easeT) + deadLegRot * easeT;
        if (this.rightLeg) this.rightLeg.rotation.x = this.rightLeg.rotation.x * (1 - easeT) + deadLegRot * easeT;
      }
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



    // Orbiting Shields (Deflect Charges)
    if (this.orbitShields.length > 0) {
      const charges = this.player.deflectCharges || 0;
      const radius = 35;

      // Bobbing Effect (Sine wave based on time)
      const bobOffset = Math.sin(this.vfxAnimTime * 3.0) * 2.0;

      // Frontal Arc layout
      // Slot 0 (Center): 0 deg (Front)
      // Slot 1 (Left): -35 deg
      // Slot 2 (Right): +35 deg

      // Smooth Interpolation Factor
      const lerpFactor = 0.1;

      for (let i = 0; i < 3; i++) {
        const shield = this.orbitShields[i];

        // Determine Target State
        let targetVisible = (i < charges);
        let targetAngleOffset = 0;

        if (targetVisible) {
          if (charges === 1) targetAngleOffset = 0;
          else if (charges === 2) targetAngleOffset = (i === 0 ? -0.35 : 0.35);
          else { // 3
            if (i === 0) targetAngleOffset = 0;
            if (i === 1) targetAngleOffset = -0.6; // Wider spread for 3
            if (i === 2) targetAngleOffset = 0.6;
          }
        }

        // Handle Visibility / Scale transition
        // If not visible, target scale is 0. If visible, target scale is 1.
        const targetScale = targetVisible ? 1 : 0;
        shield.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerpFactor);

        // Optim: If scale is tiny, hide it completely to save draw calls?
        shield.visible = (shield.scale.x > 0.01);

        if (shield.visible) {
          // Target Position Calculation
          const baseAngle = this.player.angle;
          const targetTotalAngle = baseAngle + targetAngleOffset;

          const targetX = this.player.x + this.player.width / 2 + Math.cos(targetTotalAngle) * radius;
          const targetZ = this.player.y + this.player.height / 2 + Math.sin(targetTotalAngle) * radius;
          const targetY = 25 + bobOffset;

          // Lerp Position
          shield.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), lerpFactor);

          // Rotation
          // Face outward from Player Center.
          const dx = shield.position.x - (this.player.x + this.player.width / 2);
          const dz = shield.position.z - (this.player.y + this.player.height / 2);
          const currentAngle = Math.atan2(dz, dx);
          shield.rotation.y = -currentAngle + Math.PI / 2;
        } else {
          // Keep it at player center if hidden so it spawns from there? 
          shield.position.set(this.player.x + this.player.width / 2, 25, this.player.y + this.player.height / 2);
        }
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
        p.angle += p.speed * (dt / 16.0);
        p.radius += (p.radiusDrift || 0) * (dt / 16.0);

        if (p.radius > r && p.radiusDrift > 0) p.radiusDrift *= -1;
        if (p.radius < innerR && p.radiusDrift < 0) p.radiusDrift *= -1;

        const verticalPhase = p.radius * 0.1;
        const relativeY = -10 + (Math.sin(this.vfxAnimTime * 2 + verticalPhase + p.angle) * 15 + 15);

        const x = Math.cos(p.angle) * p.radius;
        const z = Math.sin(p.angle) * p.radius;

        p.mesh.position.set(x, relativeY, z);
        p.mesh.rotation.y = -p.angle;
      });
    }

    // Freeze Visuals
    // Check if player has slow effects. A bled-out husk is immune to
    // tinting — it stays grey no matter what lands on the body.
    const totalSlow = this._bledOutGrey ? 0 :
        this.player.slowEffects.reduce((sum, effect) => sum + effect.amount, 0);
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

    // Bled-out: the body desaturates to an inert grey husk. One-way —
    // bleed-out is irreversible within a run, and a new run builds
    // fresh visuals.
    if (this.player.isBledOut && !this._bledOutGrey) {
      this._bledOutGrey = true;
      // Lights out — a husk doesn't glow in the dark. Intensity, not
      // .visible: toggling a light's visibility forces THREE to
      // recompile every shader program (visible hitch).
      if (this.selfLight) this.selfLight.intensity = 0;
      if (this.spotLight) this.spotLight.intensity = 0;
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.color) {
          const mat = child.material;
          // Grey from the true original (not the current color, which
          // may be freeze-tinted or already greyed via a shared mat)
          const base = child.userData.originalColor || mat.color;
          const l = 0.3 * base.r + 0.59 * base.g + 0.11 * base.b;
          const grey = new THREE.Color(l * 0.5, l * 0.5, l * 0.5);
          mat.color.copy(grey);
          // The freeze-visuals pass restores color/emissive from these
          // userData "originals" every frame — rewrite them so the
          // restore keeps the husk grey and dark instead of stomping it
          child.userData.originalColor = grey.clone();
          if (mat.emissive) {
            mat.emissive.setRGB(0, 0, 0);
            mat.emissiveIntensity = 0;
            if (child.userData.originalEmissive) {
              child.userData.originalEmissive.setRGB(0, 0, 0);
            }
            child.userData.originalEmissiveIntensity = 0;
          }
        }
      });
    }

    // Revive Ring Visibility (only when a partner could actually revive us)
    if (this.reviveRing) {
      if (this.player.isDowned && this.player.canBeRevived) {
        this.reviveRing.visible = true;
        this.reviveRing.position.set(this.player.x + this.player.width / 2, 5, this.player.y + this.player.height / 2);
        // Rotate slowly
        this.reviveRing.rotation.y += dt * 0.001;
      } else {
        this.reviveRing.visible = false;
      }
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
      if (this.reviveRing) this.scene.remove(this.reviveRing);
      this.orbitShields.forEach(s => this.scene.remove(s));
    }
  }
  /**
   * Updates the visual state of the revive ring.
   * @param {number} progress - 0.0 to 1.0 (Revive completion)
   * @param {string|number} [color] - Optional override color (hex)
   */
  setReviveProgress(progress, color) {
    if (!this.reviveRing) return;

    if (this.player.isDowned) {
      this.reviveRing.visible = true;
      this.reviveRing.material.uniforms.uProgress.value = progress;
      if (color !== undefined) {
        this.reviveRing.material.uniforms.uColor.value.set(color);
      } else {
        this.reviveRing.material.uniforms.uColor.value.set(this.player.color);
      }
      // Synchronize ring position with player mesh
      this.reviveRing.position.set(this.mesh.position.x, 2, this.mesh.position.z);
    } else {
      this.reviveRing.visible = false;
    }
  }
}
