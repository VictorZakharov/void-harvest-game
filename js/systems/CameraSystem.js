export class CameraSystem {
    constructor(renderingManager, inputHandler) {
        this.rendering = renderingManager;
        this.input = inputHandler;
        this.shake = 0;

        // Smoothing state
        this._smoothCamX = 0;
        this._smoothCamZ = 0;
        this._initialized = false;
    }

    /**
     * Updates the camera position based on players and input.
     * @param {number} dt - Delta time
     * @param {Array<Player>} players - List of active players
     * @param {string} state - Current game state
     */
    update(dt, players, state) {
        // 1. Calculate Target Position (Average of live players)
        let camX = 0, camZ = 0;
        let livePlayers = players.filter(p => !p.isDowned && p.health > 0);

        // Fallback if all dead
        if (livePlayers.length === 0) livePlayers = players;

        if (livePlayers.length > 0) {
            livePlayers.forEach(p => {
                const bounds = p.getBounds();
                camX += bounds.centerX;
                camZ += bounds.centerY;
            });
            camX /= livePlayers.length;
            camZ /= livePlayers.length;
        }

        // 2. Initialize smoothing on first run
        if (!this._initialized) {
            this._smoothCamX = camX;
            this._smoothCamZ = camZ;
            this._initialized = true;
        }

        // 3. Apply LERP Smoothing
        const lerpFactor = 0.1;
        this._smoothCamX += (camX - this._smoothCamX) * lerpFactor;
        this._smoothCamZ += (camZ - this._smoothCamZ) * lerpFactor;

        // 4. Update Rendering Manager
        this.rendering.updateCamera(this._smoothCamX, this._smoothCamZ, this.input);

        // 5. Apply Shake
        if (this.shake > 0) {
            this.rendering.applyShake(this.shake, state);
            this.shake--; // Decay shake
        } else {
            this.rendering.applyShake(0, state);
        }
    }

    addShake(amount) {
        this.shake = amount;
    }

    reset() {
        this.shake = 0;
        this._initialized = false;
    }
}
