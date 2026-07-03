import * as THREE from 'three';
import {
    LEVELUP_ANIM_SURGE_MS, LEVELUP_ANIM_BURST_MS, LEVELUP_ANIM_SWEEP_HEIGHT
} from '../constants.js';

const DUST_COUNT = 46;
// Two mote systems: lots of fine particles + fewer chunky ones
const SPARK_SYSTEMS = [
    { count: 70, size: 3.5 },
    { count: 30, size: 6.5 }
];

/**
 * Plays the level-up "invigoration" sequence: time freezes, an energy ring
 * sweeps the player from toe to head (with an additive energy shell and
 * spiraling sparks), health slowly refills to full in sync with the sweep,
 * XP-bar dust streams across the screen into the player along curved paths,
 * and the HUD level badge pops to the new level at the peak. A burst flash
 * then hands off to the skill-selection screen.
 *
 * Runs on real time (dt from the render loop) while game.state is 'paused',
 * so gameplay stays frozen underneath. update() must be called AFTER
 * PlayerVisuals.update() each frame so the emissive glow wins the write.
 */
export class LevelUpEffectSystem {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;

        this.active = false;
        this.player = null;
        this.onComplete = null;
        this.elapsed = 0;
        this.startHealth = 0;

        // Screen-space dust (XP bar -> player)
        this._dust = [];
        this._ripples = [];
        this._absorb = 0; // extra body glow fed by arriving dust

        // HUD level badge
        this._badgeEl = null;
        this._prevLevel = 1;
        this._badgeSwapped = false;

        this._buildMeshes();
        this._buildOverlay();
    }

    _buildMeshes() {
        const additive = {
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false
        };

        // Rising ring (flat, additive, tinted per player at play())
        const ringGeo = new THREE.RingGeometry(18, 26, 48);
        ringGeo.rotateX(-Math.PI / 2);
        this.ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, ...additive });
        this.ring = new THREE.Mesh(ringGeo, this.ringMat);
        this.ring.visible = false;
        this.ring.renderOrder = 900;
        this.scene.add(this.ring);

        // Thin echo ring trailing below the main one
        const echoGeo = new THREE.RingGeometry(22, 24.5, 48);
        echoGeo.rotateX(-Math.PI / 2);
        this.echoMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, ...additive });
        this.echoRing = new THREE.Mesh(echoGeo, this.echoMat);
        this.echoRing.visible = false;
        this.echoRing.renderOrder = 900;
        this.scene.add(this.echoRing);

        // Ground pulse: wide ring expanding outward at the player's feet on start
        const pulseGeo = new THREE.RingGeometry(10, 30, 48);
        pulseGeo.rotateX(-Math.PI / 2);
        this.pulseMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, ...additive });
        this.groundPulse = new THREE.Mesh(pulseGeo, this.pulseMat);
        this.groundPulse.visible = false;
        this.groundPulse.renderOrder = 898;
        this.scene.add(this.groundPulse);

        // Double helix: two glowing ribbons winding up the body. Geometry is
        // full-height; scale.y = sweep progress reveals it from the feet up.
        class HelixCurve extends THREE.Curve {
            getPoint(t) {
                const a = t * Math.PI * 4;
                return new THREE.Vector3(
                    Math.cos(a) * 16,
                    t * LEVELUP_ANIM_SWEEP_HEIGHT,
                    Math.sin(a) * 16
                );
            }
        }
        const helixGeo = new THREE.TubeGeometry(new HelixCurve(), 80, 1.1, 6, false);
        this.helixMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, ...additive });
        this.helix = new THREE.Group();
        for (let i = 0; i < 2; i++) {
            const strand = new THREE.Mesh(helixGeo, this.helixMat);
            strand.rotation.y = i * Math.PI; // opposite strand
            this.helix.add(strand);
        }
        this.helix.visible = false;
        this.helix.renderOrder = 899;
        this.scene.add(this.helix);

        // Rising light pillars: thin planes around the player, heights swaying
        // smoothly out of phase (like flames of energy licking upward)
        const pillarGeo = new THREE.PlaneGeometry(2.5, 1);
        pillarGeo.translate(0, 0.5, 0);
        this.pillarMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, ...additive });
        this.pillars = [];
        this.pillarGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const m = new THREE.Mesh(pillarGeo, this.pillarMat);
            const a = (i / 6) * Math.PI * 2;
            m.position.set(Math.cos(a) * 22, 0, Math.sin(a) * 22);
            m.rotation.y = -a;
            this.pillars.push({ mesh: m, phase: a * 1.7 });
            this.pillarGroup.add(m);
        }
        this.pillarGroup.visible = false;
        this.pillarGroup.renderOrder = 899;
        this.scene.add(this.pillarGroup);

        // Rotating dashed tech-rings at the feet (counter-rotating pair)
        this.dashRings = [];
        [[30, 1], [24, -1]].forEach(([radius, dir]) => {
            const pts = new THREE.EllipseCurve(0, 0, radius, radius).getPoints(72)
                .map(p => new THREE.Vector3(p.x, 0, p.y));
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineDashedMaterial({
                color: 0x00ffff,
                dashSize: 6,
                gapSize: 5,
                transparent: true,
                opacity: 0,
                toneMapped: false
            });
            const line = new THREE.LineLoop(geo, mat);
            line.computeLineDistances();
            line.visible = false;
            line.renderOrder = 898;
            this.scene.add(line);
            this.dashRings.push({ line, mat, dir });
        });

        // Spiraling mote fountains (Points, additive). Orbit parameters are
        // randomized once at play(); motion itself is smooth and deterministic.
        this._sparkSystems = SPARK_SYSTEMS.map(cfg => {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position',
                new THREE.BufferAttribute(new Float32Array(cfg.count * 3), 3));
            const mat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: cfg.size,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true,
                toneMapped: false
            });
            const points = new THREE.Points(geo, mat);
            points.visible = false;
            points.renderOrder = 901;
            this.scene.add(points);
            return { points, mat, count: cfg.count, data: [] };
        });

        // Temporary glow light that ramps with the sweep.
        // Stays visible at intensity 0 when idle: toggling a light's
        // visibility changes the scene's light count and forces THREE to
        // recompile every shader program (a visible hitch, worst in 2P).
        this.light = new THREE.PointLight(0x00ffff, 0, 320, 2);
        this.scene.add(this.light);
    }

    /** Full-screen 2D canvas for the XP-dust stream (above HUD, below modals). */
    _buildOverlay() {
        this.overlay = document.createElement('canvas');
        this.overlay.id = 'levelup-fx-canvas';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            inset: '0',
            // Explicit CSS size: without it the canvas displays at its
            // intrinsic (dpr-scaled) size and everything lands off-target
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '90',
            display: 'none'
        });
        document.body.appendChild(this.overlay);
        this.overlayCtx = this.overlay.getContext('2d');
    }

    /**
     * Starts the sequence for a player. Freezes the game and invokes
     * onComplete (e.g. show the skill screen) when the animation ends.
     */
    play(player, onComplete) {
        // Never overlap: if somehow re-triggered mid-run, finish the old one first
        if (this.active) this._finish();

        this.active = true;
        this.player = player;
        this.onComplete = onComplete;
        this.elapsed = 0;

        // Freeze the world (render loop keeps running; update() does not)
        this.game.state = 'paused';
        if (this.game.weather) this.game.weather.hideWarning();
        if (this.game.resurrectionSystem) this.game.resurrectionSystem.hidePrompt();

        // A level-up fully restores the player — a downed player gets back up
        if (player.isDowned) {
            player.isDowned = false;
            player.downedTimer = 0;
            player.reviveProgress = 0;
        }
        this.startHealth = Math.max(0, player.health);

        // Tint everything with the player's color
        const color = new THREE.Color(player.color || '#44ccff');
        this.ringMat.color.copy(color);
        this.echoMat.color.copy(color);
        this.pulseMat.color.copy(color);
        this.helixMat.color.copy(color);
        this.pillarMat.color.copy(color).lerp(new THREE.Color(0xffffff), 0.3);
        this.dashRings.forEach(r => r.mat.color.copy(color));
        this.light.color.copy(color);

        // Randomize mote orbits once per run: each mote endlessly rises from
        // the feet, spiraling around the body, wrapping back to the ground.
        for (const sys of this._sparkSystems) {
            sys.mat.color.copy(color).lerp(new THREE.Color(0xffffff), 0.55);
            sys.data.length = 0;
            for (let i = 0; i < sys.count; i++) {
                sys.data.push({
                    phase: Math.random() * Math.PI * 2,
                    radius: 10 + Math.random() * 14,
                    speed: 1.6 + Math.random() * 2.4,   // orbit rad/s
                    rise: 0.45 + Math.random() * 0.5,   // body-lengths/s
                    offset: Math.random(),              // starting height fraction
                    twist: 1.5 + Math.random() * 2.5,   // extra spiral while rising
                    burstDir: Math.random() * Math.PI * 2
                });
            }
        }

        this._setupBadge(player);
        this._setupDust(player);

        this.ring.visible = true;
        this.echoRing.visible = true;
        this.groundPulse.visible = true;
        this.helix.visible = true;
        this.pillarGroup.visible = true;
        this.dashRings.forEach(r => { r.line.visible = true; });
        this._sparkSystems.forEach(s => { s.points.visible = true; });
    }

    /** Holds the HUD badge at the previous level until the pop moment. */
    _setupBadge(player) {
        const prefix = player.id === 1 ? 'p2' : 'p1';
        this._badgeEl = this.game.ui.dom[prefix + 'LevelText'] || null;
        this._prevLevel = Math.max(1, player.level - 1);
        this._badgeSwapped = false;
        if (this._badgeEl) this._badgeEl.classList.remove('level-pop');
    }

    /** Seeds the dust motes along the player's XP bar with curved flight paths. */
    _setupDust(player) {
        this._dust.length = 0;
        this._ripples.length = 0;
        this._absorb = 0;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.overlay.width = window.innerWidth * dpr;
        this.overlay.height = window.innerHeight * dpr;
        this._overlayDpr = dpr;
        this.overlay.style.display = 'block';

        const prefix = player.id === 1 ? 'p2' : 'p1';
        const barEl = this.game.ui.dom[prefix + 'XpBar'];
        const rect = barEl ? barEl.parentElement.getBoundingClientRect()
            : { left: 100, top: window.innerHeight - 40, width: 300, height: 14 };

        // Departures staggered so every mote lands before the surge ends
        const lastDeparture = Math.max(1, LEVELUP_ANIM_SURGE_MS - 750);
        for (let i = 0; i < DUST_COUNT; i++) {
            const sx = rect.left + Math.random() * rect.width;
            const sy = rect.top + rect.height / 2 + (Math.random() - 0.5) * 8;
            this._dust.push({
                sx, sy,
                t0: (i / DUST_COUNT) * lastDeparture,
                dur: 550 + Math.random() * 180,
                // Curvature: perpendicular swing of the two bezier handles
                swing1: (Math.random() - 0.5) * 500,
                swing2: (Math.random() - 0.5) * 260,
                size: 1.6 + Math.random() * 2.2,
                white: Math.random() * 0.7,
                wobblePhase: Math.random() * Math.PI * 2,
                arrived: false
            });
        }
    }

    /** Projects the player's chest to overlay-canvas CSS pixels. */
    _playerScreenPoint() {
        const p = this.player;
        const cam = this.game.rendering.camera3D;
        const v = new THREE.Vector3(p.x + p.width / 2, 30, p.y + p.height / 2);
        v.project(cam);
        const canvasRect = this.game.canvas.getBoundingClientRect();
        return {
            x: canvasRect.left + (v.x * 0.5 + 0.5) * canvasRect.width,
            y: canvasRect.top + (-v.y * 0.5 + 0.5) * canvasRect.height
        };
    }

    /** True while the intro animation owns the screen (blocks pause/freeze toggles). */
    isPlaying() {
        return this.active;
    }

    /**
     * Advances the animation. Call every render frame with real dt (ms),
     * after PlayerVisuals.update() so the body glow is applied last.
     */
    update(dt) {
        if (!this.active || !this.player) return;

        // Honor the game-speed modifier: at slow-motion the invigoration
        // plays out slower too (all motion below is keyed off this.elapsed)
        const speed = this.game.timeScale || 1;
        dt *= speed;
        this.elapsed += dt;
        const player = this.player;
        const cx = player.x + player.width / 2;
        const cz = player.y + player.height / 2;

        const surgeT = Math.min(1, this.elapsed / LEVELUP_ANIM_SURGE_MS);
        const burstT = Math.max(0, Math.min(1,
            (this.elapsed - LEVELUP_ANIM_SURGE_MS) / LEVELUP_ANIM_BURST_MS));

        // Eased sweep: slow start, fast finish (energy accelerating upward)
        const sweep = surgeT * surgeT * (3 - 2 * surgeT);
        const sweepY = 2 + sweep * LEVELUP_ANIM_SWEEP_HEIGHT;

        // --- Health refill, synced to the sweep ---
        const targetHealth = this.startHealth +
            (player.maxHealth - this.startHealth) * sweep;
        player.health = Math.min(player.maxHealth, targetHealth);
        if (surgeT >= 1) player.health = player.maxHealth;
        this.game.ui.updateHUD();
        this._updateBadge(burstT);

        const t = this.elapsed / 1000; // seconds, for all rotation/sway motion

        // Ground pulse: quick expanding ripple during the first 500ms
        const pulseT = Math.min(1, this.elapsed / 500);
        const pulseScale = 1 + pulseT * 4;
        this.groundPulse.position.set(cx, 1.5, cz);
        this.groundPulse.scale.set(pulseScale, 1, pulseScale);
        this.pulseMat.opacity = 0.5 * (1 - pulseT);

        if (burstT === 0) {
            // --- Surge phase: ring + shell rise from feet to head ---
            const taper = 1 - sweep * 0.25; // body narrows toward the head
            this.ring.position.set(cx, sweepY, cz);
            this.ring.scale.set(taper, 1, taper);
            this.ringMat.opacity = 0.85 * Math.min(1, surgeT * 6);

            // Echo ring lags a few units below, slightly wider and dimmer
            const echoY = Math.max(1.5, sweepY - 9);
            this.echoRing.position.set(cx, echoY, cz);
            this.echoRing.scale.set(taper * 1.12, 1, taper * 1.12);
            this.echoMat.opacity = 0.35 * Math.min(1, surgeT * 6);

            // Helix ribbons reveal from the feet up and slowly rotate
            this.helix.position.set(cx, 0, cz);
            this.helix.scale.set(1, Math.max(0.001, sweep), 1);
            this.helix.rotation.y = t * 1.4;
            this.helixMat.opacity = 0.55 * Math.min(1, surgeT * 6);

            // Light pillars sway upward out of phase around the body
            this.pillarGroup.position.set(cx, 0.5, cz);
            for (const pl of this.pillars) {
                const h = sweepY * (0.45 + 0.35 * Math.sin(pl.phase + t * 2.4));
                pl.mesh.scale.y = Math.max(0.001, h);
            }
            this.pillarMat.opacity = 0.30 * Math.min(1, surgeT * 6);

            // Dashed tech-rings counter-rotate at the feet
            for (const r of this.dashRings) {
                r.line.position.set(cx, 1.2, cz);
                r.line.rotation.y = t * 0.9 * r.dir;
                r.mat.opacity = 0.6 * Math.min(1, surgeT * 6);
            }

            const sparkAlpha = 0.95 * Math.min(1, surgeT * 6);
            this._sparkSystems.forEach(s => { s.mat.opacity = sparkAlpha; });
            this.light.position.set(cx, sweepY + 10, cz);
            this.light.intensity = 1.5 + sweep * 5.0 + this._absorb * 2.0;
        } else {
            // --- Burst phase: ring blows outward at head height and fades ---
            const bloom = 1 + burstT * 5;
            this.ring.position.set(cx, 2 + LEVELUP_ANIM_SWEEP_HEIGHT, cz);
            this.ring.scale.set(bloom, 1, bloom);
            this.ringMat.opacity = 0.85 * (1 - burstT);

            // Echo ring bursts a beat behind, wider
            const echoBloom = 1 + burstT * 7;
            this.echoRing.position.set(cx, 2 + LEVELUP_ANIM_SWEEP_HEIGHT - 4, cz);
            this.echoRing.scale.set(echoBloom, 1, echoBloom);
            this.echoMat.opacity = 0.4 * (1 - burstT);

            // Helix spins up, flares outward and dissolves
            this.helix.position.set(cx, 0, cz);
            this.helix.scale.set(1 + burstT * 1.5, 1, 1 + burstT * 1.5);
            this.helix.rotation.y = t * 1.4 + burstT * burstT * 4;
            this.helixMat.opacity = 0.55 * (1 - burstT);

            // Pillars snap to full height and fade
            this.pillarGroup.position.set(cx, 0.5, cz);
            for (const pl of this.pillars) {
                pl.mesh.scale.y = Math.max(0.001, LEVELUP_ANIM_SWEEP_HEIGHT * (1 - burstT * 0.4));
            }
            this.pillarMat.opacity = 0.30 * (1 - burstT);

            // Tech-rings spin out with the shockwave
            for (const r of this.dashRings) {
                r.line.position.set(cx, 1.2, cz);
                r.line.rotation.y = t * 0.9 * r.dir + burstT * 1.5 * r.dir;
                r.line.scale.setScalar(1 + burstT * 2);
                r.mat.opacity = 0.6 * (1 - burstT);
            }

            const burstAlpha = 0.95 * (1 - burstT);
            this._sparkSystems.forEach(s => { s.mat.opacity = burstAlpha; });
            this.light.position.set(cx, LEVELUP_ANIM_SWEEP_HEIGHT, cz);
            this.light.intensity = 6.5 * (1 - burstT);
        }

        // --- Mote fountains: particles endlessly rise and spiral up the body,
        // capped by the sweep line; on burst they eject outward from the head ---
        for (const sys of this._sparkSystems) {
            const pos = sys.points.geometry.attributes.position;
            for (let i = 0; i < sys.count; i++) {
                const s = sys.data[i];
                if (burstT === 0) {
                    // Height fraction loops 0..1 (feet to sweep line)
                    const hf = (s.offset + t * s.rise) % 1;
                    const a = s.phase + t * s.speed + hf * s.twist;
                    // Body-hugging radius: widest at the hips, tighter at the top
                    const r = s.radius * (0.55 + 0.45 * Math.sin(hf * Math.PI));
                    pos.setXYZ(i,
                        cx + Math.cos(a) * r,
                        1 + hf * Math.max(2, sweepY - 2),
                        cz + Math.sin(a) * r);
                } else {
                    // Radial ejection from the head
                    const eject = burstT * burstT * (70 + s.radius * 3);
                    const a = s.burstDir;
                    pos.setXYZ(i,
                        cx + Math.cos(a) * (s.radius * 0.5 + eject),
                        LEVELUP_ANIM_SWEEP_HEIGHT * (0.55 + s.offset * 0.5) + burstT * 14,
                        cz + Math.sin(a) * (s.radius * 0.5 + eject));
                }
            }
            pos.needsUpdate = true;
        }

        // --- XP dust stream (screen space) ---
        this._absorb = Math.max(0, this._absorb - dt * 0.002);
        this._drawDust();

        // --- Body glow: whole figure brightens with the sweep, peaks at burst ---
        const glowStrength = (burstT === 0 ? sweep : (1 - burstT * 0.85)) + this._absorb * 0.5;
        this._applyBodyGlow(glowStrength);

        if (this.elapsed >= LEVELUP_ANIM_SURGE_MS + LEVELUP_ANIM_BURST_MS) {
            this._finish();
        }
    }

    /** Holds the old level, then pops the badge with the new one at burst. */
    _updateBadge(burstT) {
        if (!this._badgeEl) return;
        if (burstT === 0) {
            // updateHUD just wrote the new level; keep showing the old one
            if (!this._badgeSwapped) this._badgeEl.textContent = `Lv ${this._prevLevel}`;
        } else if (!this._badgeSwapped) {
            this._badgeSwapped = true;
            this._badgeEl.textContent = `Lv ${this.player.level}`;
            // Restart the CSS pop even if the class lingered from a prior level
            this._badgeEl.classList.remove('level-pop');
            void this._badgeEl.offsetWidth;
            this._badgeEl.classList.add('level-pop');
        }
    }

    /** Renders the dust motes flying from the XP bar into the player. */
    _drawDust() {
        const ctx = this.overlayCtx;
        const dpr = this._overlayDpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.overlay.width / dpr, this.overlay.height / dpr);
        ctx.globalCompositeOperation = 'lighter';

        const target = this._playerScreenPoint();
        const color = this.player.color || '#44ccff';

        for (const d of this._dust) {
            const local = this.elapsed - d.t0;
            if (local <= 0 || d.arrived) continue;

            let f = local / d.dur;
            if (f >= 1) {
                d.arrived = true;
                this._absorb = Math.min(1, this._absorb + 0.12);
                this._ripples.push({ x: target.x, y: target.y, start: this.elapsed });
                continue;
            }

            // Cubic bezier with perpendicular swing handles = swooping path
            const dx = target.x - d.sx;
            const dy = target.y - d.sy;
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const nx = -dy / len; // unit normal
            const ny = dx / len;

            const c1x = d.sx + dx * 0.3 + nx * d.swing1;
            const c1y = d.sy + dy * 0.3 + ny * d.swing1;
            const c2x = d.sx + dx * 0.72 + nx * d.swing2;
            const c2y = d.sy + dy * 0.72 + ny * d.swing2;

            // Ease-in: dust accelerates as the player pulls it in
            const e = f * f * (3 - 2 * f);
            const omt = 1 - e;
            const wobble = Math.sin(d.wobblePhase + f * Math.PI * 4) * 6 * omt;
            const bx = omt * omt * omt * d.sx + 3 * omt * omt * e * c1x +
                3 * omt * e * e * c2x + e * e * e * target.x + nx * wobble;
            const by = omt * omt * omt * d.sy + 3 * omt * omt * e * c1y +
                3 * omt * e * e * c2y + e * e * e * target.y + ny * wobble;

            const alpha = f < 0.12 ? f / 0.12 : 1;
            const size = d.size * (1 + e * 0.4);

            // Soft glow dot with a bright core
            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, size * 3);
            grad.addColorStop(0, `rgba(255,255,255,${0.85 * alpha})`);
            grad.addColorStop(0.35, this._rgba(color, 0.55 * alpha * (1 - d.white * 0.4)));
            grad.addColorStop(1, this._rgba(color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, size * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Arrival ripples: small expanding rings at the player
        for (let i = this._ripples.length - 1; i >= 0; i--) {
            const r = this._ripples[i];
            const rt = (this.elapsed - r.start) / 320;
            if (rt >= 1) { this._ripples.splice(i, 1); continue; }
            ctx.strokeStyle = this._rgba(color, 0.5 * (1 - rt));
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4 + rt * 22, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _rgba(hex, a) {
        const n = parseInt(String(hex).replace('#', ''), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }

    /**
     * Emissive boost on the player figure. Runs after PlayerVisuals.update()
     * restored materials to their originals, so no state needs saving here.
     */
    _applyBodyGlow(strength) {
        const visuals = this.player.visuals;
        if (!visuals || !visuals.mesh) return;
        const glow = new THREE.Color(this.player.color || '#44ccff');
        visuals.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.copy(glow);
                child.material.emissiveIntensity = strength * 1.6;
            }
        });
    }

    _finish() {
        const done = this.onComplete;
        this._hide();
        this.active = false;
        this.player = null;
        this.onComplete = null;
        if (done) done();
    }

    /** Aborts without the completion callback (game reset / exit to menu). */
    cancel() {
        if (this._badgeEl) this._badgeEl.classList.remove('level-pop');
        this._hide();
        this.active = false;
        this.player = null;
        this.onComplete = null;
    }

    _hide() {
        this.ring.visible = false;
        this.echoRing.visible = false;
        this.groundPulse.visible = false;
        this.helix.visible = false;
        this.pillarGroup.visible = false;
        this.dashRings.forEach(r => { r.line.visible = false; r.line.scale.setScalar(1); });
        this._sparkSystems.forEach(s => { s.points.visible = false; });
        this.light.intensity = 0; // stays visible: see note in _buildMeshes
        this.overlay.style.display = 'none';
        this._dust.length = 0;
        this._ripples.length = 0;
    }
}
