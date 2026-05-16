import { Game } from './src/game.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Resolution (Classic NES-like)
const GAME_WIDTH = 256;
const GAME_HEIGHT = 240;

// Setup Canvas size
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let game;
let lastTime = 0;

function init() {
    game = new Game(GAME_WIDTH, GAME_HEIGHT);
    
    // UI Elements
    const startBtn = document.getElementById('start-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    const startScreen = document.getElementById('start-screen');
    const overlay = document.getElementById('overlay');

    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        game.start();
        requestAnimationFrame(gameLoop);
    });

    resumeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        game.resume();
    });

    restartBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        game.init(); // Reset game state
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !startScreen.classList.contains('hidden')) {
            // Do nothing on start screen
        } else if (e.key === 'Escape') {
            togglePause();
        }
        game.input.handleKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
        game.input.handleKeyUp(e.code);
    });
}

function togglePause() {
    const overlay = document.getElementById('overlay');
    if (game.paused) {
        overlay.classList.add('hidden');
        game.resume();
    } else {
        overlay.classList.remove('hidden');
        document.getElementById('overlay-title').innerText = 'PAUSED';
        game.pause();
    }
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    game.update(deltaTime);
    game.draw(ctx);

    requestAnimationFrame(gameLoop);
}

// Start the initialization
init();
