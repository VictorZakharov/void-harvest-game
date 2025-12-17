# Gemini Agent Onboarding & Context

## 🚀 Quick Start
**Read `CLAUDE.md` first.** It contains the complete architectural map, file responsibilities, and style guides.
This file serves as a **Speed Supplement** covering recent refactors, critical specific logic, and "gotchas".

## 🛠️ Recent Architecture Changes (Dec 2025)

### 1. Pause Screen Refactor
The Pause Screen logic has been extracted from the generic modals file to improve maintainability.
- **Logic**: `js/ui-pause.js` (Exports `showPauseScreen`, `resumeGame`)
- **Styles**: `styles/_pause.scss` (Imports into `main.scss`)
- **Entry**: `js/ui.js` imports these functions directly.

**Key Feature**: "Fancy Tooltips" in the pause screen calculate *exact* current stats (Base + Bonus) dynamically.

### 2. File Map Updates
| Feature | Logic File | Style File | Notes |
| :--- | :--- | :--- | :--- |
| **HUD** | `js/ui-hud.js` | `styles/_hud.scss` | Real-time bars, active skills |
| **Pause** | `js/ui-pause.js` | `styles/_pause.scss` | *New!* Grid stats, fancy tooltips |
| **Level Up** | `js/ui-levelup.js` | `styles/_skills.scss` | Skill selection cards |
| **Game Over** | `js/ui-gameover.js` | `styles/_modals.scss` | End stats |
| **Settings** | `js/ui-custom.js` | `styles/_custom-game.scss` | Custom run config |

## ⚖️ Critical Game Logic (DO NOT BREAK)

### 💀 Damage Scaling (Compounding vs Additive)
**Rule**: Player damage MUST scale **multiplicatively (compounding)**.
- **Code**: `player.damage *= 1.2;` (in `js/skills.js`)
- **Math**:
    - **Enemy HP**: accelerate linearly (+10% -> +15% -> +25% per wave). Wave 30 ≈ **5.15x Base HP**.
    - **Additive Dmg**: `1 + (0.2 * 10)` = 3.0x (Player loses).
    - **Compounding Dmg**: `1.2 ^ 10` = 6.2x (Player keeps up).
- **Context**: If you change this to additive, the game becomes mathematically impossible past Wave 25.

### ❄️ Status Effects (Ice)
- **Stacking**: Ice slows stack exclusively.
- **Visuals**: `game.js/draw()` renders a blue vignette that grows with stacks.
- **Logic**: `player.slowEffects` array.

## ⚡ Quick Task Cheatsheet

### "Add a new Skill"
1.  **Define**: Add to `SKILLS` array in `js/skills.js`.
    -   Need an SVG icon in `ICONS` object.
    -   `apply(player)` function handles the stat change.
2.  **Mechanics**:
    -   **Simple Stat**: Just modify `player[stat]`.
    -   **Complex**: Logic often lives in `js/entities.js` (Player class) or `js/game.js` (Bullet creation).
3.  **Tooltips**:
    -   Update `getSkillDetail` in `js/ui-pause.js` to show Fancy Stats for the new skill.

### "Adjust Balance"
-   **ALL** constants are in `js/constants.js`.
-   Do not hardcode numbers in `game.js`.

## 🧪 Testing
-   **Custom Game Mode**: Use the "Custom Game" button on the start screen to test specific enemy interactions or skill builds immediately without playing 10 minutes.
