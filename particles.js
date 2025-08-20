class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = {};
        this.init();
    }

    init() {
        // Create particle emitters for different effects
        this.createJumpDustEmitter();
        this.createLandingEmitter();
        this.createWallSlideEmitter();
        this.createAirTrailEmitter();
        this.createComboEmitter();
        this.createSpeedTrailEmitter();
        this.createDangerZoneEmitter();
    }

    createJumpDustEmitter() {
        // Create simple colored rectangles as particle textures - make them bigger and more visible
        if (!this.scene.textures.exists('dustParticle')) {
            const dustGraphics = this.scene.add.graphics();
            dustGraphics.fillStyle(0xffffff); // White instead of gray for better visibility
            dustGraphics.fillRect(0, 0, 8, 8); // Bigger particles
            dustGraphics.generateTexture('dustParticle', 8, 8);
            dustGraphics.destroy();
        }

        // Create jump dust emitter using new API
        this.particles.jumpDust = this.scene.add.particles(0, 0, 'dustParticle', {
            speed: { min: 50, max: 120 },
            scale: { start: 2, end: 0 }, // Start bigger
            alpha: { start: 1, end: 0 }, // Start fully opaque
            lifespan: 800, // Live longer
            quantity: 8, // More particles
            angle: { min: 200, max: 340 }, // Wider spread
            emitting: false
        });
    }

    createLandingEmitter() {
        // Create landing impact particles
        if (!this.scene.textures.exists('impactParticle')) {
            const impactGraphics = this.scene.add.graphics();
            impactGraphics.fillStyle(0xffffff);
            impactGraphics.fillRect(0, 0, 3, 3);
            impactGraphics.generateTexture('impactParticle', 3, 3);
            impactGraphics.destroy();
        }

        this.particles.landing = this.scene.add.particles(0, 0, 'impactParticle', {
            speed: { min: 40, max: 100 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 6,
            angle: { min: 200, max: 340 },
            emitting: false
        });
    }

    createWallSlideEmitter() {
        // Create wall slide spark particles - rainbow colored
        if (!this.scene.textures.exists('sparkParticle')) {
            const sparkGraphics = this.scene.add.graphics();
            sparkGraphics.fillStyle(0xffffff); // White base for tinting
            sparkGraphics.fillRect(0, 0, 6, 6); // Bigger
            sparkGraphics.generateTexture('sparkParticle', 6, 6);
            sparkGraphics.destroy();
        }

        this.particles.wallSlide = this.scene.add.particles(0, 0, 'sparkParticle', {
            speed: { min: 40, max: 100 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 6,
            angle: { min: 0, max: 360 },
            tint: [0xff0000, 0xff8000, 0xffff00, 0x80ff00, 0x00ff00, 0x00ff80, 0x00ffff, 0x0080ff, 0x0000ff, 0x8000ff, 0xff00ff, 0xff0080], // Rainbow colors
            emitting: false
        });
    }

    createAirTrailEmitter() {
        // Create air trail particles - rainbow colored like wall slide
        if (!this.scene.textures.exists('trailParticle')) {
            const trailGraphics = this.scene.add.graphics();
            trailGraphics.fillStyle(0xffffff); // White base for tinting
            trailGraphics.fillRect(0, 0, 8, 8); // Bigger particles for trail line
            trailGraphics.generateTexture('trailParticle', 8, 8);
            trailGraphics.destroy();
        }

        this.particles.airTrail = this.scene.add.particles(0, 0, 'trailParticle', {
            speed: { min: 5, max: 15 }, // Much slower speed so particles stay in line
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1500, // Much longer lifespan for longer trail
            quantity: 1, // Just one particle per emission for clean line
            angle: { min: 0, max: 360 }, // Random spread but low speed keeps them close
            tint: [0xff0000, 0xff8000, 0xffff00, 0x80ff00, 0x00ff00, 0x00ff80, 0x00ffff, 0x0080ff, 0x0000ff, 0x8000ff, 0xff00ff, 0xff0080], // Rainbow colors
            emitting: false
        });
        
        // Track air trail state and position history
        this.airTrailActive = false;
        this.lastAirTrailTime = 0;
        this.playerPositionHistory = []; // Store recent player positions
        this.maxHistoryLength = 30; // Keep last 30 positions for longer trail
    }

    // Emit jump dust when player jumps (enhanced with intensity)
    emitJumpDust(x, y, intensity = 1) {
        this.particles.jumpDust.setPosition(x, y + 20);
        const particleCount = Math.floor(4 * intensity);
        this.particles.jumpDust.explode(particleCount);
    }

    // Emit landing particles when player lands
    emitLanding(x, y, intensity = 1) {
        this.particles.landing.setPosition(x, y + 20);
        this.particles.landing.explode(Math.floor(6 * intensity));
    }

    // Emit wall slide sparks
    emitWallSlide(x, y) {
        this.particles.wallSlide.setPosition(x, y);
        this.particles.wallSlide.explode(6);
    }

    // Emit air trail particles when player is in air
    updateAirTrail(x, y, isInAir, facingDirection, currentTime) {
        if (isInAir) {
            // Update position history
            this.playerPositionHistory.push({ x: x, y: y, time: currentTime });
            
            // Keep only recent positions
            if (this.playerPositionHistory.length > this.maxHistoryLength) {
                this.playerPositionHistory.shift();
            }
            
            // Emit particles along the trail path (every 30ms for smoother trail)
            if (currentTime - this.lastAirTrailTime > 30) {
                // Emit particles at positions along the player's recent path
                for (let i = 0; i < this.playerPositionHistory.length; i += 3) { // Every 3rd position
                    const pos = this.playerPositionHistory[i];
                    const timeDiff = currentTime - pos.time;
                    
                    // Only emit at positions that are 100-800ms old (creating longer distance from player)
                    if (timeDiff > 100 && timeDiff < 800) {
                        this.particles.airTrail.setPosition(pos.x, pos.y);
                        this.particles.airTrail.explode(1);
                    }
                }
                this.lastAirTrailTime = currentTime;
            }
            this.airTrailActive = true;
        } else {
            // Clear position history when landing
            this.playerPositionHistory = [];
            this.airTrailActive = false;
        }
    }

    // Create combo celebration emitter
    createComboEmitter() {
        if (!this.scene.textures.exists('comboParticle')) {
            const comboGraphics = this.scene.add.graphics();
            comboGraphics.fillStyle(0xffffff);
            comboGraphics.fillCircle(0, 0, 4); // Circular particles
            comboGraphics.generateTexture('comboParticle', 8, 8);
            comboGraphics.destroy();
        }

        this.particles.combo = this.scene.add.particles(0, 0, 'comboParticle', {
            speed: { min: 100, max: 200 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 8,
            angle: { min: 0, max: 360 },
            tint: [0xffff00, 0xff8000, 0xff0080, 0x8000ff, 0x00ff80],
            emitting: false
        });
    }

    // Create speed trail emitter
    createSpeedTrailEmitter() {
        if (!this.scene.textures.exists('speedParticle')) {
            const speedGraphics = this.scene.add.graphics();
            speedGraphics.fillStyle(0xffffff);
            speedGraphics.fillRect(0, 0, 6, 2); // Streak-like particles
            speedGraphics.generateTexture('speedParticle', 6, 2);
            speedGraphics.destroy();
        }

        this.particles.speedTrail = this.scene.add.particles(0, 0, 'speedParticle', {
            speed: { min: 20, max: 50 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            quantity: 2,
            angle: { min: 160, max: 200 }, // Trail behind player
            tint: [0x00ffff, 0x0080ff, 0x8000ff],
            emitting: false
        });
        
        this.lastSpeedTrailTime = 0;
    }



    // Emit combo celebration particles
    emitComboEffect(x, y, comboCount) {
        this.particles.combo.setPosition(x, y);
        const intensity = Math.min(comboCount / 5, 3); // Scale with combo
        this.particles.combo.explode(Math.floor(8 * intensity));
    }

    // Emit speed trail particles
    emitSpeedTrail(x, y, speedRatio) {
        const currentTime = this.scene.time.now;
        if (currentTime - this.lastSpeedTrailTime > 50) { // Throttle emissions
            this.particles.speedTrail.setPosition(x - 20, y);
            this.particles.speedTrail.explode(Math.floor(2 * speedRatio));
            this.lastSpeedTrailTime = currentTime;
        }
    }



    // Create danger zone warning emitter
    createDangerZoneEmitter() {
        if (!this.scene.textures.exists('dangerParticle')) {
            const dangerGraphics = this.scene.add.graphics();
            dangerGraphics.fillStyle(0xffffff);
            dangerGraphics.fillCircle(0, 0, 3);
            dangerGraphics.generateTexture('dangerParticle', 6, 6);
            dangerGraphics.destroy();
        }

        this.particles.danger = this.scene.add.particles(0, 0, 'dangerParticle', {
            speed: { min: 30, max: 80 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 5,
            angle: { min: 200, max: 340 },
            tint: [0xff0000, 0xff4444, 0xff8888],
            emitting: false
        });
    }

    // Emit danger zone warning particles
    emitDangerZoneWarning(x, y) {
        this.particles.danger.setPosition(x, y);
        this.particles.danger.explode(5);
    }

    // Clean up particles when scene ends
    destroy() {
        Object.values(this.particles).forEach(emitter => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        this.particles = {};
    }
}
