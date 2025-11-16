// ==================== INITIALIZE GAME ====================
import '../styles.css';
import { Game } from './game.js';

window.addEventListener('load', () => {
    window.game = new Game();
});
