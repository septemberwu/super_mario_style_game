import { InputHandler } from './input.js';
import { Particle } from './particles.js';

export class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.paused = false;
        this.input = new InputHandler();
        this.particles = [];
        this.init();
    }

    init() {
        this.score = 0;
        this.coins = 0;
        this.timer = 400;
        this.lastTimerUpdate = 0;
        
        // Player State
        this.player = {
            x: 50,
            y: 100,
            width: 16,
            height: 16,
            velocityX: 0,
            velocityY: 0,
            onGround: false,
            color: '#f83800',
            state: 'IDLE', // IDLE, RUNNING, JUMPING, FALLING, DUCKING
            facing: 'RIGHT',
            animFrame: 0,
            animTimer: 0
        };

        // Physics Constants
        this.gravity = 0.45;
        this.friction = 0.85;
        this.airResistance = 0.95;
        this.jumpStrength = -8;
        this.minJumpHeight = -3; // For variable jump height
        this.moveSpeed = 0.6;
        this.maxSpeed = 3;
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
        if (this.paused) return;

        // Update Timer
        this.lastTimerUpdate += deltaTime;
        if (this.lastTimerUpdate >= 1000) {
            this.timer = Math.max(0, this.timer - 1);
            this.lastTimerUpdate = 0;
            const timerEl = document.getElementById('time');
            if (timerEl) timerEl.innerText = String(this.timer).padStart(3, '0');
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
            // Apply friction/air resistance
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

        // Variable Jump Height: If button released early, stop upward momentum
        if (!isJumpPressed && this.player.velocityY < this.minJumpHeight && !this.player.onGround) {
            this.player.velocityY = this.minJumpHeight;
        }

        this.player.velocityY += this.gravity;

        // Apply Velocity
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;

        // --- Collision (Basic Floor) ---
        const groundY = this.height - 32;
        if (this.player.y + this.player.height > groundY) {
            if (!this.player.onGround && this.player.velocityY > 0) {
                this.createDust(this.player.x + 8, groundY, 3);
            }
            this.player.y = groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
        } else {
            this.player.onGround = false;
        }

        // Bounds
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.width) this.player.x = this.width - this.player.width;

        // --- Animation State Management ---
        this.updatePlayerState(isDuckPressed);
        this.updateAnimation(deltaTime);

        // Update Particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());

        // Update HUD
        const scoreEl = document.getElementById('score');
        const coinsEl = document.getElementById('coins');
        if (scoreEl) scoreEl.innerText = String(this.score).padStart(6, '0');
        if (coinsEl) coinsEl.innerText = 'x ' + String(this.coins).padStart(2, '0');
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

        // Draw Ground
        ctx.fillStyle = '#e45c10';
        ctx.fillRect(0, this.height - 32, this.width, 32);
        
        // Draw Grid or simple grass top
        ctx.fillStyle = '#70f828'; // Mario Grass Green
        ctx.fillRect(0, this.height - 32, this.width, 4);

        // Draw Particles
        this.particles.forEach(p => p.draw(ctx));

        this.drawPlayer(ctx);
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
