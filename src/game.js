import { InputHandler } from './input.js';
import { Particle } from './particles.js';
import { LEVEL_1_1, TILE_SIZE, TILE_TYPES } from './level.js';
import { Enemy } from './enemies.js';

export class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.paused = false;
        this.gameState = 'PLAYING'; // PLAYING, GAME_OVER, WIN
        this.input = new InputHandler();
        this.particles = [];
        this.enemies = [];
        this.camera = { x: 0 };
        this.levelData = LEVEL_1_1;
        this.init();
    }

    init() {
        this.score = 0;
        this.coins = 0;
        this.timer = 400;
        this.lastTimerUpdate = 0;
        this.camera.x = 0;
        this.particles = [];
        this.decorations = [];
        this.enemies = [];
        this.fadeAlpha = 0;
        this.gameState = 'PLAYING';
        
        this.generateDecorations();
        // Player State
        this.player = {
            x: 50,
            y: 100,
            width: 14, // Slightly smaller than tile for easier movement
            height: 16,
            velocityX: 0,
            velocityY: 0,
            onGround: false,
            color: '#f83800',
            state: 'IDLE',
            facing: 'RIGHT',
            animFrame: 0,
            animTimer: 0,
            isDead: false
        };

        // Physics Constants
        this.gravity = 0.45;
        this.friction = 0.85;
        this.airResistance = 0.95;
        this.jumpStrength = -8;
        this.minJumpHeight = -3;
        this.moveSpeed = 0.6;
        this.maxSpeed = 3;

        this.spawnEnemies();
    }

    spawnEnemies() {
        // Simple spawning based on level data or hardcoded for now
        this.enemies.push(new Enemy(200, 100, 'GOOMBA'));
        this.enemies.push(new Enemy(450, 100, 'GOOMBA'));
        this.enemies.push(new Enemy(700, 100, 'GOOMBA'));
    }

    generateDecorations() {
        const levelWidth = this.levelData[0].length;
        for (let i = 0; i < levelWidth; i += 5) {
            // Random Clouds
            if (Math.random() > 0.6) {
                this.decorations.push({
                    x: i * TILE_SIZE,
                    y: Math.random() * 50 + 20,
                    type: TILE_TYPES.CLOUD,
                    speed: 0.3
                });
            }
            // Random Mountains
            if (Math.random() > 0.7) {
                this.decorations.push({
                    x: i * TILE_SIZE,
                    y: this.height - 32 - 16,
                    type: TILE_TYPES.MOUNTAIN,
                    speed: 0.5
                });
            }
        }
    }

    start() {
        this.paused = false;
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    update(deltaTime) {
        if (this.paused || this.gameState !== 'PLAYING') return;

        // Update Timer
        this.lastTimerUpdate += deltaTime;
        if (this.lastTimerUpdate >= 1000) {
            this.timer = Math.max(0, this.timer - 1);
            this.lastTimerUpdate = 0;
            const timerEl = document.getElementById('time');
            if (timerEl) timerEl.innerText = String(this.timer).padStart(3, '0');
            if (this.timer === 0) this.die();
        }

        // --- Player Input & Horizontal Movement ---
        const isLeftPressed = this.input.isPressed('LEFT');
        const isRightPressed = this.input.isPressed('RIGHT');
        const isJumpPressed = this.input.isPressed('JUMP');
        const isDuckPressed = this.input.isPressed('DUCK');

        if (isLeftPressed) {
            this.player.velocityX -= this.moveSpeed;
            this.player.facing = 'LEFT';
        } else if (isRightPressed) {
            this.player.velocityX += this.moveSpeed;
            this.player.facing = 'RIGHT';
        } else {
            this.player.velocityX *= this.player.onGround ? this.friction : this.airResistance;
            if (Math.abs(this.player.velocityX) < 0.1) this.player.velocityX = 0;
        }

        // Limit Max Speed
        if (Math.abs(this.player.velocityX) > this.maxSpeed) {
            this.player.velocityX = Math.sign(this.player.velocityX) * this.maxSpeed;
        }

        // --- Vertical Movement (Jumping & Gravity) ---
        if (isJumpPressed && this.player.onGround) {
            this.player.velocityY = this.jumpStrength;
            this.player.onGround = false;
            this.player.state = 'JUMPING';
            this.createDust(this.player.x + 8, this.player.y + 16, 5);
        }

        if (!isJumpPressed && this.player.velocityY < this.minJumpHeight && !this.player.onGround) {
            this.player.velocityY = this.minJumpHeight;
        }

        // --- Apply X Velocity & Resolve X Collisions ---
        this.player.x += this.player.velocityX;
        this.handleCollisions('x');

        // --- Apply Y Velocity & Resolve Y Collisions ---
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        this.handleCollisions('y');

        // Bounds
        if (this.player.x < 0) this.player.x = 0;
        const maxLevelWidth = this.levelData[0].length * TILE_SIZE;
        if (this.player.x + this.player.width > maxLevelWidth) {
            this.player.x = maxLevelWidth - this.player.width;
        }

        // --- Enemies Update ---
        this.enemies.forEach(enemy => enemy.update(deltaTime, this));
        this.checkEnemyCollisions();

        // --- Camera Tracking ---
        this.updateCamera();

        // --- Animation State Management ---
        this.updatePlayerState(isDuckPressed);
        this.updateAnimation(deltaTime);

        // Update Particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());

        // Check if fell off
        if (this.player.y > this.height) this.die();

        // Update Fade
        if (this.gameState !== 'PLAYING' && this.fadeAlpha < 1) {
            this.fadeAlpha += deltaTime / 1000;
        }

        // Update HUD
        const scoreEl = document.getElementById('score');
        const coinsEl = document.getElementById('coins');
        if (scoreEl) scoreEl.innerText = String(this.score).padStart(6, '0');
        if (coinsEl) coinsEl.innerText = 'x ' + String(this.coins).padStart(2, '0');
    }

    checkEnemyCollisions() {
        this.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            // Simple AABB collision
            if (this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                
                // Stomp detection: player is falling and bottom is near enemy top
                if (this.player.velocityY > 0 && this.player.y + this.player.height < enemy.y + 10) {
                    enemy.isDead = true;
                    this.player.velocityY = -5; // Bounce off enemy
                    this.score += 100;
                } else {
                    this.die();
                }
            }
        });
    }

    die() {
        if (this.gameState === 'GAME_OVER') return;
        this.gameState = 'GAME_OVER';
        setTimeout(() => {
            const overlay = document.getElementById('overlay');
            const title = document.getElementById('overlay-title');
            if (overlay && title) {
                title.innerText = 'GAME OVER';
                overlay.classList.remove('hidden');
            }
        }, 1000); // Wait for fade
    }

    win() {
        if (this.gameState === 'WIN') return;
        this.gameState = 'WIN';
        setTimeout(() => {
            const overlay = document.getElementById('overlay');
            const title = document.getElementById('overlay-title');
            if (overlay && title) {
                title.innerText = 'LEVEL CLEAR!';
                overlay.classList.remove('hidden');
            }
        }, 1000);
    }

    handleCollisions(axis) {
        const p = this.player;
        const startX = Math.floor(p.x / TILE_SIZE);
        const endX = Math.floor((p.x + p.width - 0.1) / TILE_SIZE);
        const startY = Math.floor(p.y / TILE_SIZE);
        const endY = Math.floor((p.y + p.height - 0.1) / TILE_SIZE);

        for (let row = startY; row <= endY; row++) {
            for (let col = startX; col <= endX; col++) {
                const tile = this.getTileAt(row, col);
                if (this.isSolid(tile)) {
                    if (axis === 'x') {
                        if (p.velocityX > 0) {
                            p.x = col * TILE_SIZE - p.width;
                            p.velocityX = 0;
                        } else if (p.velocityX < 0) {
                            p.x = (col + 1) * TILE_SIZE;
                            p.velocityX = 0;
                        }
                    } else if (axis === 'y') {
                        if (p.velocityY > 0) {
                            // Landed
                            if (!p.onGround) this.createDust(p.x + 8, row * TILE_SIZE, 3);
                            p.y = row * TILE_SIZE - p.height;
                            p.velocityY = 0;
                            p.onGround = true;
                        } else if (p.velocityY < 0) {
                            // Hit head
                            p.y = (row + 1) * TILE_SIZE;
                            p.velocityY = 0;
                            this.handleTileHit(row, col, tile);
                        }
                    }
                }
            }
        }
        
        // If we are checking Y and no solid tiles were found below us, set onGround to false
        if (axis === 'y' && p.velocityY !== 0) {
             // We need a more reliable onGround check after moving
             this.checkGroundStatus();
        }
    }

    checkGroundStatus() {
        const p = this.player;
        const checkY = Math.floor((p.y + p.height + 1) / TILE_SIZE);
        const startX = Math.floor(p.x / TILE_SIZE);
        const endX = Math.floor((p.x + p.width - 0.1) / TILE_SIZE);
        
        let onSolid = false;
        for (let col = startX; col <= endX; col++) {
            if (this.isSolid(this.getTileAt(checkY, col))) {
                onSolid = true;
                break;
            }
        }
        this.player.onGround = onSolid;
    }

    getTileAt(row, col) {
        if (row < 0 || row >= this.levelData.length || col < 0 || col >= this.levelData[0].length) {
            return TILE_TYPES.EMPTY;
        }
        return this.levelData[row][col];
    }

    isSolid(tile) {
        return [TILE_TYPES.GROUND, TILE_TYPES.BRICK, TILE_TYPES.QUESTION, TILE_TYPES.HARD].includes(tile);
    }

    handleTileHit(row, col, tile) {
        if (tile === TILE_TYPES.BRICK) {
            // Future: Break brick or bounce it
            this.createDust(col * TILE_SIZE + 8, row * TILE_SIZE + 8, 8);
        } else if (tile === TILE_TYPES.QUESTION) {
            this.coins++;
            this.score += 200;
            // Spawn sparkles
            for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(col * TILE_SIZE + 8, row * TILE_SIZE, '#fff', 'SPARKLE'));
            }
        } else if (tile === TILE_TYPES.FLAG_POLE) {
            this.win();
        }
    }

    updateCamera() {
        // Keep player in center of screen horizontally
        const centerX = this.width / 2;
        this.camera.x = this.player.x - centerX;
        
        // Clamp camera
        if (this.camera.x < 0) this.camera.x = 0;
        const maxScroll = (this.levelData[0].length * TILE_SIZE) - this.width;
        if (this.camera.x > maxScroll) this.camera.x = maxScroll;
    }

    updatePlayerState(isDuckPressed) {
        if (!this.player.onGround) {
            this.player.state = this.player.velocityY < 0 ? 'JUMPING' : 'FALLING';
        } else if (isDuckPressed) {
            this.player.state = 'DUCKING';
        } else if (Math.abs(this.player.velocityX) > 0.1) {
            this.player.state = 'RUNNING';
        } else {
            this.player.state = 'IDLE';
        }
    }

    updateAnimation(deltaTime) {
        if (this.player.state === 'RUNNING') {
            this.player.animTimer += deltaTime;
            if (this.player.animTimer > 100) { // Cycle every 100ms
                this.player.animFrame = (this.player.animFrame + 1) % 3;
                this.player.animTimer = 0;
            }
        } else {
            this.player.animFrame = 0;
            this.player.animTimer = 0;
        }
    }

    draw(ctx) {
        // Draw Sky
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Parallax Background
        this.drawParallax(ctx);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.x), 0);

        // Draw Tiles
        this.drawLevel(ctx);

        // Draw Enemies
        this.enemies.forEach(enemy => enemy.draw(ctx));

        // Draw Particles
        this.particles.forEach(p => p.draw(ctx));

        this.drawPlayer(ctx);
        
        ctx.restore();

        // Draw Fade Transition
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    drawParallax(ctx) {
        this.decorations.forEach(dec => {
            const scrollX = -Math.floor(this.camera.x * dec.speed);
            const x = dec.x + scrollX;
            
            // Loop decoration for infinite feel (optional, but here we use level width)
            if (x + 32 > 0 && x < this.width) {
                if (dec.type === TILE_TYPES.CLOUD) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(x, dec.y, 24, 12);
                    ctx.fillRect(x + 4, dec.y - 4, 16, 4);
                } else if (dec.type === TILE_TYPES.MOUNTAIN) {
                    ctx.fillStyle = '#4da1ff'; // Lighter blue mountain
                    ctx.beginPath();
                    ctx.moveTo(x, dec.y + 16);
                    ctx.lineTo(x + 16, dec.y);
                    ctx.lineTo(x + 32, dec.y + 16);
                    ctx.fill();
                }
            }
        });
    }

    drawLevel(ctx) {
        // Only draw visible tiles for performance
        const startCol = Math.floor(this.camera.x / TILE_SIZE);
        const endCol = startCol + Math.ceil(this.width / TILE_SIZE) + 1;

        for (let row = 0; row < this.levelData.length; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = this.getTileAt(row, col);
                if (tile !== TILE_TYPES.EMPTY) {
                    this.drawTile(ctx, row, col, tile);
                }
            }
        }
    }

    drawTile(ctx, row, col, tile) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        switch (tile) {
            case TILE_TYPES.GROUND:
                ctx.fillStyle = '#e45c10';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#70f828'; // Grass top
                ctx.fillRect(x, y, TILE_SIZE, 2);
                break;
            case TILE_TYPES.BRICK:
                ctx.fillStyle = '#bc4c08';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                break;
            case TILE_TYPES.QUESTION:
                ctx.fillStyle = '#f8b800';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#fff';
                ctx.font = '8px Arial';
                ctx.fillText('?', x + 5, y + 11);
                break;
            case TILE_TYPES.HARD:
                ctx.fillStyle = '#949494';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                break;
            case TILE_TYPES.FLAG_POLE:
                ctx.fillStyle = '#fff';
                ctx.fillRect(x + 7, y, 2, TILE_SIZE);
                if (row === 11) { // Top of flag
                    ctx.fillStyle = '#70f828';
                    ctx.fillRect(x, y, 8, 8);
                }
                break;
        }
    }

    createDust(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, '#fff'));
        }
    }

    drawPlayer(ctx) {
        const p = this.player;
        ctx.save();
        
        // Horizontal Flip if facing left
        if (p.facing === 'LEFT') {
            ctx.translate(p.x + p.width, p.y);
            ctx.scale(-1, 1);
            ctx.translate(-(p.x + p.width), -p.y);
        }

        // Draw Player Body (Simulating a sprite)
        ctx.fillStyle = p.color;
        
        if (p.state === 'DUCKING') {
            ctx.fillRect(p.x, p.y + 8, 16, 8);
        } else if (p.state === 'JUMPING' || p.state === 'FALLING') {
            // Jump Pose
            ctx.fillRect(p.x, p.y, 16, 16);
            ctx.fillStyle = '#f8b800'; // Hat/Detail
            ctx.fillRect(p.x, p.y, 12, 4);
        } else if (p.state === 'RUNNING') {
            // Run Cycle (Shift body up/down or change leg position)
            const offset = p.animFrame === 1 ? -1 : 0;
            ctx.fillRect(p.x, p.y + offset, 16, 16);
            ctx.fillStyle = '#f8b800';
            ctx.fillRect(p.x + (p.animFrame * 2), p.y + offset, 10, 4);
        } else {
            // Idle
            ctx.fillRect(p.x, p.y, 16, 16);
            ctx.fillStyle = '#f8b800';
            ctx.fillRect(p.x, p.y, 12, 4);
        }

        // Eye
        ctx.fillStyle = '#000';
        const eyeY = p.state === 'DUCKING' ? p.y + 10 : p.y + 4;
        ctx.fillRect(p.x + 10, eyeY, 3, 3);

        ctx.restore();
    }
}
