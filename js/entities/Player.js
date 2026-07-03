import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_BASE_HEALTH,
  PLAYER_BASE_SPEED,
  PLAYER_BASE_DAMAGE,
  PLAYER_BASE_FIRE_RATE,
  PLAYER_SIZE,
  PLAYER_BASE_LIGHT_RADIUS,
  XP_LEVEL_MULTIPLIER,
  INITIAL_XP_REQUIRED,
  BULLET_BASE_SPEED,
  BULLET_BASE_RANGE,
  BULLET_SIZE,
  POLAR_VORTEX_RADIUS
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';
import { PlayerVisuals } from './PlayerVisuals.js';

/**
 * Represents the player character, managing stats, movement, and combat logic.
 * Visual representation is delegated to PlayerVisuals.
 */
export class Player extends Entity {
  /**
   * @param {number} x - Initial X position.
   * @param {number} y - Initial Y position.
   * @param {THREE.Scene} [scene] - The scene to add visuals to.
   * @param {number} [id=0] - Player ID for multiplayer.
   * @param {string|number} [color='#00ffff'] - Player color.
   */
  constructor(x, y, scene = null, id = 0, color = '#00ffff') {
    const pSize = PLAYER_SIZE * 2;
    super(x, y, pSize, pSize);
    this.id = id;
    this.color = color;
    this.maxHealth = PLAYER_BASE_HEALTH;
    this.health = this.maxHealth;
    this.speed = PLAYER_BASE_SPEED;
    this.sprite = SpriteGenerator.createPlayerSprite(pSize, id === 1 ? '#ffaa44' : '#44ccff'); // P1 Cyan, P2 Orange 
    // Player visual representation is managed by PlayerVisuals class. 
    // Passing ID to Visuals would be good, but for now let's set properties.

    // Multiplayer States
    this.isDowned = false;
    this.canBeRevived = false; // Set true in multiplayer (game.js); gates the revive ring
    this.isBledOut = false; // Downed timer expired: an inert grey husk, no revive, no level-up turns
    this.downedTimer = 0;
    this.reviveProgress = 0;
    this.maxDownedTime = 30 * 144; // 30 seconds (game ticks run at 144/sec)

    // Combat stats
    this.damage = PLAYER_BASE_DAMAGE;
    this.fireRate = PLAYER_BASE_FIRE_RATE;
    this.fireTimer = 0;
    this.bulletSpeed = BULLET_BASE_SPEED;
    this.bulletSize = BULLET_SIZE * 2;
    this.projectileCount = 1;
    this.piercing = 0;
    this.piercing = 0;
    this.range = BULLET_BASE_RANGE;

    // Splash Damage
    this.splashRadius = 0;
    this.splashDamageRatio = 0;

    // Visuals delegation
    this.visuals = new PlayerVisuals(scene, this);

    // XP and leveling
    this.xp = 0;
    this.level = 1;
    this.xpToLevel = INITIAL_XP_REQUIRED;

    // Aiming
    this.angle = 0;
    this.skills = {};

    // Buffs & Effects
    this.healthRegen = 0;
    this.regenTimer = 0;
    this.slowEffects = [];
    this.freezeChance = 0;
    this.extraChoice = false;

    // Defense
    this.armor = 0;
    this.shieldUnlocked = false;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldCooldown = 600;

    // Polar Vortex
    this.stasisUnlocked = false;
    this.stasisRadius = POLAR_VORTEX_RADIUS;
    this.stasisSlow = 0;

    // Deflect
    this.deflectUnlocked = false;
    this.deflectCharges = 0;
    this.deflectMaxCharges = 0;
    this.deflectRechargeTimer = 0;
    this.deflectRechargeInterval = 60;
    this.deflectRange = 150;

    // Utilities
    this.magnetBonus = 0;
    this.dropBonus = 0;
    this.lightRadiusBonus = 0;

    // Weapon Spread
    this.currentSpread = 0;
    this.maxSpread = 0.35;
    this.minSpread = 0.02;
    this.spreadPerShot = 0.08;
    this.spreadRecovery = 0.005;

    this.killedBy = null; // Track cause of death
  }

  /**
   * @returns {THREE.Group|null} The model mesh.
   */
  get mesh() {
    return this.visuals ? this.visuals.mesh : null;
  }

  /**
   * @param {THREE.Group|null} value - Ignored.
   */
  set mesh(value) {
    // Satisfies Entity constructor
  }

  /**
   * @returns {THREE.Group|null} The group for world-aligned effects.
   */
  get vortexMesh() {
    return this.visuals ? this.visuals.vortexMesh : null;
  }

  /**
   * @param {THREE.Group|null} value - Ignored.
   */
  set vortexMesh(value) {
    // Satisfies Entity constructor
  }

  /**
   * Updates player logic and synchronizes visuals.
   * @param {Object} input - Input handler.
   * @param {number} mouseX - Mouse X world coordinate.
   * @param {number} mouseY - Mouse Y world coordinate.
   * @param {number} [camYaw=0] - Current camera rotation.
   * @param {number} [timeScale=1.0] - Global game time scale.
   */
  update(input, mouseX, mouseY, camYaw = 0, timeScale = 1.0) {
    // Downed State logic
    if (this.isDowned) {
      // Bleed-out countdown: when it expires the player can no longer
      // be revived — the revive ring, HUD badge and rescue banner all
      // gate on canBeRevived and disappear with it. MP game over still
      // triggers only when BOTH players are down.
      if (this.downedTimer > 0) {
        this.downedTimer = Math.max(0, this.downedTimer - timeScale);
        if (this.downedTimer <= 0) {
          this.health = 0;
          this.canBeRevived = false;
          this.isBledOut = true;
        }
      }
      return; // No movement, no actions
    }

    if (this.health <= 0) return; // Dead but not processed?

    // Slow effects
    for (let i = this.slowEffects.length - 1; i >= 0; i--) {
      this.slowEffects[i].timer--;
      if (this.slowEffects[i].timer <= 0) {
        this.slowEffects.splice(i, 1);
      }
    }

    const totalSlowAmount = this.slowEffects.reduce((sum, effect) => sum + effect.amount, 0);
    const cappedSlowAmount = Math.min(1, totalSlowAmount);
    const effectiveSpeed = this.speed * (1 - cappedSlowAmount);

    // Movement
    let ivx = 0;
    let ivy = 0;

    // Player 1 (WASD)
    if (this.id === 0) {
      if (input.keys['w']) ivy = -effectiveSpeed;
      if (input.keys['s']) ivy = effectiveSpeed;
      if (input.keys['a']) ivx = -effectiveSpeed;
      if (input.keys['d']) ivx = effectiveSpeed;
    }
    // Player 2 (Arrow Keys)
    else if (this.id === 1) {
      if (input.keys['arrowup']) ivy = -effectiveSpeed;
      if (input.keys['arrowdown']) ivy = effectiveSpeed;
      if (input.keys['arrowleft']) ivx = -effectiveSpeed;
      if (input.keys['arrowright']) ivx = effectiveSpeed;
    }

    // Apply Time Scale to Movement Input
    ivx *= timeScale;
    ivy *= timeScale;

    if (ivx !== 0 && ivy !== 0) {
      ivx *= 0.707;
      ivy *= 0.707;
    }

    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);
    this.vx = ivx * cos + ivy * sin;
    this.vy = ivy * cos - ivx * sin;

    this.x += this.vx;
    this.y += this.vy;

    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));
    this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));

    // Aiming
    const bounds = this.getBounds();
    this.angle = Math.atan2(mouseY - bounds.centerY, mouseX - bounds.centerX);

    // Timers
    if (this.fireTimer > 0) this.fireTimer -= timeScale;
    if (this.fireTimer < 0) this.fireTimer = 0;

    if (this.healthRegen > 0) {
      this.regenTimer += timeScale;
      if (this.regenTimer >= 60) {
        this.regenTimer = 0;
        this.heal(this.healthRegen);
      }
    }

    // Spread
    if (this.fireTimer <= 0) {
      this.currentSpread = Math.max(this.minSpread, this.currentSpread - (this.spreadRecovery * timeScale));
    } else {
      this.currentSpread = Math.max(this.minSpread, this.currentSpread - (this.spreadRecovery * 0.5 * timeScale));
    }

    // Shield logic
    if (this.shieldUnlocked && !this.shieldActive) {
      this.shieldTimer -= timeScale;
      if (this.shieldTimer <= 0) {
        this.shieldActive = true;
      }
    }

    // Deflect Recharge Logic
    if (this.deflectUnlocked && this.deflectCharges < this.deflectMaxCharges) {
      this.deflectRechargeTimer -= timeScale;
      if (this.deflectRechargeTimer <= 0) {
        this.deflectCharges++;
        this.deflectRechargeTimer = this.deflectRechargeInterval;
      }
    }

    // Freeze DoT Logic
    // Only apply damage if FULLY frozen (movement speed reduced by 100% or more)
    const totalSlow = this.slowEffects.reduce((sum, e) => sum + e.amount, 0);

    if (totalSlow >= 1.0) {
      if (this.freezeDoTTimer === undefined) this.freezeDoTTimer = 0;
      this.freezeDoTTimer += timeScale;

      // 0.2 seconds = 12 frames (at 60fps)
      if (this.freezeDoTTimer >= 12) {
        this.freezeDoTTimer = 0;
        // Damage scaling: 1 damage per stack (Same DPS as 5 dmg/sec, but smoother ticks)
        const damage = this.slowEffects.length * 1;
        this.takeDamage(damage, 'ice');
      }
    } else {
      this.freezeDoTTimer = 0;
    }
  }

  /**
   * Defines if player can shoot. 
   * @param {boolean} mouseDown 
   */
  shoot(mouseDown) {
    if (this.isDowned || this.health <= 0) return false;
    // ... existing logic
    if (this.fireTimer === 0 && mouseDown) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  revive() {
    this.isDowned = false;
    this.health = this.maxHealth * 0.5; // Revive with 50% HP
    this.reviveProgress = 0;
    this.downedTimer = 0;
    // Trigger visual update (handled in updateHUD or Visuals)
  }

  /**
   * Checks if the player can shoot and increments fire timer.
   * @param {boolean} mouseDown - Whether the fire button is pressed.
   * @returns {boolean} True if a shot should be fired.
   */
  shoot(mouseDown) {
    if (this.isDowned || this.health <= 0) return false;
    if (this.fireTimer === 0 && mouseDown) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  /**
   * Adds experience points and handles level ups.
   * @param {number} amount - XP to add.
   * @returns {boolean} True if the player leveled up.
   */
  addXP(amount) {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpToLevel) {
      this.levelUp();
      leveledUp = true;
    }
    return leveledUp;
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToLevel;
    this.xpToLevel = Math.floor(this.xpToLevel * XP_LEVEL_MULTIPLIER);
  }

  /**
   * Applies damage to player, considering shield and armor.
   * @param {number} amount - Raw damage amount.
   * @param {string} source - Source of damage (id or enemyType).
   * @returns {boolean} True if dead.
   */
  takeDamage(amount, source = null) {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = this.shieldCooldown;
      return false;
    }

    if (this.armor > 0) {
      amount = Math.max(0, amount - this.armor);
    }

    this.health -= amount;

    if (this.health <= 0 && !this.isDowned) {
      this.health = 0; // Clamp
      this.isDowned = true;
      this.downedTimer = this.maxDownedTime;
      this.killedBy = source;
    }

    return this.isDowned; // Returns true if incapacitated
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  onKill() {
    if (this.vampire > 0 && this.vampireTimer === 0) {
      this.heal(this.vampire);
      this.vampireTimer = this.vampireCooldown;
    }
  }

  getLightRadius() {
    return PLAYER_BASE_LIGHT_RADIUS * (1 + this.lightRadiusBonus);
  }

  /**
   * Notifies visuals to update light parameters.
   */
  updateLights() {
    if (this.visuals) {
      this.visuals.updateLights();
    }
  }

  /**
   * Synchronizes mesh positions.
   */
  updateMesh(dt = 16) {
    this.visuals.update(dt);
  }
}
