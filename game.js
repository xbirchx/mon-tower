class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        console.log('Preload started');
        
        // Initialize platform renderer and try to load images
        this.platformRenderer = new PlatformRenderer(this);
        this.platformRenderer.preloadPlatformImages();
        
        // Initialize background renderer and try to load images
        this.backgroundRenderer = new BackgroundRenderer(this);
        this.backgroundRenderer.preloadBackgroundImages();
        
        // Initialize wall renderer and try to load images
        this.wallRenderer = new WallRenderer(this);
        this.wallRenderer.preloadWallImages();
        
        // Load player sprite (fallback to graphics if not found)
        try {
            this.load.image('player', 'player.png');
        } catch (error) {
            console.log('Player sprite not found, will use graphics fallback');
        }
    }

    create() {
        console.log('Create started');
        
        // Game world bounds - make it tall for tower climbing to height 5000
        this.physics.world.setBounds(0, -45000, 800, 50000); // y=-45000 to y=5000 (50000 total height)

        // Create player sprite or fallback to graphics
        const hasPlayerSprite = this.textures.exists('player');
        
        if (hasPlayerSprite) {
            // Create invisible physics body
            this.player = this.physics.add.sprite(400, 4800);
            this.player.setVisible(false);
            
            // Create separate visual sprite that we can position independently
            this.playerSprite = this.add.sprite(400, 4800, 'player');
            this.playerSprite.setDisplaySize(78, 62); // 20% bigger (65*1.2, 52*1.2)
            this.playerSprite.setOrigin(0.5, 1); // Bottom-center origin
            this.playerSprite.setDepth(1000); // Make sure sprite appears on top of everything
            
            // Destroy any existing graphics from previous sessions
            if (this.playerGraphics) {
                this.playerGraphics.destroy();
            }
            this.playerGraphics = null; // Ensure no graphics fallback
        } else {
            // Fallback to graphics
            this.playerGraphics = this.add.graphics();
            this.playerGraphics.fillStyle(0xff6b6b); // Red color
            this.playerGraphics.fillRect(0, 0, 30, 40);
            
            // Create invisible physics body
            this.player = this.physics.add.sprite(400, 4800);
            this.player.setVisible(false);
        }
        
        this.player.body.setSize(30, 40);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(false); // Don't constrain to world bounds - let player climb higher!

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();
        
        // Create walls group
        this.walls = this.physics.add.staticGroup();

        // Create walls and initial platforms
        this.createWalls();
        this.createInitialPlatforms();

        // Player physics
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.walls);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');

        // Camera follows player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(100, 150);

        // Game variables (30% faster)
        this.playerSpeed = 208; // 160 * 1.3
        this.jumpVelocity = -650; // -500 * 1.3
        this.wallJumpVelocity = -520; // -400 * 1.3
        this.wallJumpForce = 260; // 200 * 1.3
        
        // Momentum variables (enhanced for Icy Tower feel)
        this.acceleration = 650; // Increased acceleration
        this.deceleration = 780; // 600 * 1.3
        this.maxSpeed = 600; // Increased max speed
        this.superMaxSpeed = 900; // Ultra-high speed achievable with combos
        
        // Variable jump variables
        this.minJumpVelocity = -400; // Minimum jump height
        this.maxJumpVelocity = -650; // Maximum jump height (current jumpVelocity)
        this.jumpHoldTime = 0; // How long jump is held
        this.maxJumpHoldTime = 0.3; // Max time to hold for full jump (300ms)
        this.isJumping = false;
        
        // Sprite direction tracking
        this.facingDirection = 1; // 1 = right, -1 = left
        
        // Combo system
        this.combo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.lastPlatformTouched = null;
        this.comboResetTimer = 0;
        this.comboResetDelay = 1000; // Reset combo after 1 second without platform touch
        
        // Speed and momentum tracking
        this.currentSpeed = 0;
        this.speedBoostActive = false;
        this.speedBoostTimer = 0;
        
        // Wall sliding
        this.wallSlideSpeed = 150;
        this.isWallSliding = false;
        this.wallSlideTimer = 0;
        this.maxWallSlideTime = 800; // Max wall slide time in ms
        
        // Falling duration tracking
        this.fallStartTime = 0;
        this.isFalling = false;
        this.fallDurationThreshold = 500; // 0.5 seconds in milliseconds
        
        // Platform generation variables
        this.highestPlatformY = 4900; // Track highest platform created
        this.basePlatformSpacing = 120; // Base spacing between platforms
        this.platformSpacing = 120; // Current spacing (increases with height)
        this.platformCount = 0; // Count of platforms created
        this.platformCleanupDistance = 2000; // Remove platforms this far below player
        this.lastPlatformCheck = 0; // Throttle platform generation checks
        this.platformCheckInterval = 100; // Check every 100ms instead of every frame
        
        // Danger zone (rising lava/water)
        this.dangerZoneY = 5200; // Start below ground
        this.dangerZoneSpeed = 0.5; // How fast it rises
        this.dangerZoneActive = false;
        
        // Game height limit  
        this.maxGameHeight = -45000; // Maximum height (y=-45000 = height 5000)
        this.minPlatformY = -45000; // Don't create platforms above this y value
        
        // Initialize particle manager
        this.particleManager = new ParticleManager(this);
        
        // Initialize background system
        this.backgroundRenderer.initialize();
        
        // Create danger zone visual
        this.dangerZoneGraphics = this.add.graphics();
        this.dangerZoneGraphics.setDepth(100); // Above platforms but below UI
        
        // Score display
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Height: 0', {
            fontSize: '24px',
            fill: '#ffffff'
        });
        this.scoreText.setScrollFactor(0); // Keep score fixed on screen
        
        // Combo display
        this.comboText = this.add.text(16, 50, '', {
            fontSize: '20px',
            fill: '#ffff00'
        });
        this.comboText.setScrollFactor(0);
        
        // Speed display
        this.speedText = this.add.text(16, 80, '', {
            fontSize: '18px',
            fill: '#00ff00'
        });
        this.speedText.setScrollFactor(0);
        
        // Combo celebration text (hidden initially)
        this.comboPopupText = this.add.text(400, 300, '', {
            fontSize: '32px',
            fill: '#ff6b6b',
            fontStyle: 'bold'
        });
        this.comboPopupText.setOrigin(0.5);
        this.comboPopupText.setScrollFactor(0);
        this.comboPopupText.setVisible(false);
    }

    createWalls() {
        // Create physics bodies for walls (invisible collision boxes)
        // Left wall - positioned to align with visual wall (right edge at x=0)
        let leftWall = this.physics.add.staticSprite(-25, -20000);
        leftWall.body.setSize(50, 50000);
        leftWall.setVisible(false);
        this.walls.add(leftWall);
        
        // Right wall - from ground (y=5000) to top (y=-45000)
        let rightWall = this.physics.add.staticSprite(775, -20000);
        rightWall.body.setSize(50, 50000);
        rightWall.setVisible(false);
        this.walls.add(rightWall);
        
        // Render visual walls with stone pattern
        this.wallRenderer.renderWalls();
    }

    createInitialPlatforms() {
        // Create graphics for all platforms
        this.platformGraphics = this.add.graphics();
        
        // Ground platform
        let ground = this.physics.add.staticSprite(400, 4950);
        ground.body.setSize(800, 100);
        ground.setVisible(false); // Hide physics sprite
        this.platforms.add(ground);
        
        // Ground visual will be drawn after platforms are created

        // Create initial platforms going up with variety
        this.platformData = []; // Store platform positions for drawing
        this.generateInitialPlatforms();
        
        // Draw all platforms with variety (including ground)
        this.platformRenderer.renderPlatforms(this.platformData, this.platformGraphics, true);
    }

    generateInitialPlatforms() {
        // Create continuous platforms from ground level up to height limit
        // Start from slightly above ground and go all the way up
        this.highestPlatformY = 4800; // Start closer to ground
        
        while (this.highestPlatformY - this.platformSpacing > this.minPlatformY) {
            const result = this.createSinglePlatform();
            if (!result) break; // Stop if we hit height limit
        }

    }

    createSinglePlatform() {
        // Don't create platforms above the height limit
        if (this.highestPlatformY - this.platformSpacing <= this.minPlatformY) {
            return null; // Reached height limit
        }
        
        this.platformCount++;
        
        // Gradually increase platform spacing with height for Icy Tower feel
        const currentHeight = Math.max(0, Math.floor((5000 - this.highestPlatformY) / 10));
        this.platformSpacing = this.basePlatformSpacing + Math.floor(currentHeight / 500) * 20; // Increase spacing every 500 height units
        
        let x = Phaser.Math.Between(100, 700);
        let y = this.highestPlatformY - this.platformSpacing;
        let width = Phaser.Math.Between(100, 200);
        
        // Create physics platform
        let platform = this.physics.add.staticSprite(x, y);
        platform.body.setSize(width, 28);
        platform.setVisible(false);
        this.platforms.add(platform);
        
        // Create visual platform data
        const platformData = this.platformRenderer.createPlatformWithType(x, y, width, 28, 50000);
        this.platformData.push(platformData);
        
        // Update highest platform position
        this.highestPlatformY = y;
        
        return platformData;
    }

    checkAndGeneratePlatforms() {
        let needsRerender = false;
        
        // Generate new platforms when player gets close to the top (but respect height limit)
        const playerDistanceFromTop = this.highestPlatformY - this.player.y;
        
        if (playerDistanceFromTop < 1000 && this.highestPlatformY > this.minPlatformY) {
            // Generate more platforms (up to height limit)
            for (let i = 0; i < 10; i++) {
                const newPlatform = this.createSinglePlatform();
                if (!newPlatform) break; // Hit height limit
            }
            needsRerender = true;
        }
        
        // Clean up old platforms to prevent lag
        const cleanedUp = this.cleanupOldPlatforms();
        if (cleanedUp > 0) {
            needsRerender = true;
        }
        
        // Only re-render if we actually changed something
        if (needsRerender) {
            this.platformRenderer.renderPlatforms(this.platformData, this.platformGraphics, true);
        }
    }

    cleanupOldPlatforms() {
        const playerY = this.player.y;
        const cleanupThreshold = playerY + this.platformCleanupDistance;
        
        // Find platforms that are too far below the player
        const platformsToRemove = [];
        const physicsSpritesToRemove = [];
        
        for (let i = this.platformData.length - 1; i >= 0; i--) {
            const platform = this.platformData[i];
            if (platform.y > cleanupThreshold) {
                // Mark for removal
                platformsToRemove.push(i);
                
                // Find corresponding physics sprite to remove
                this.platforms.children.entries.forEach((physicsSprite, index) => {
                    if (Math.abs(physicsSprite.y - (platform.y + platform.height/2)) < 5) {
                        physicsSpritesToRemove.push(physicsSprite);
                    }
                });
            }
        }
        
        // Remove platforms from data array
        platformsToRemove.forEach(index => {
            this.platformData.splice(index, 1);
        });
        
        // Remove physics sprites
        physicsSpritesToRemove.forEach(sprite => {
            this.platforms.remove(sprite);
            sprite.destroy();
        });
        

        
        return platformsToRemove.length;
    }

    update() {
        // Enhanced player visual sync with animations
        if (this.playerGraphics) {
            // Graphics fallback
            this.playerGraphics.x = this.player.x - 15;
            this.playerGraphics.y = this.player.y - 20;
        } else if (this.playerSprite) {
            // Sprite version with enhanced animations
            this.playerSprite.x = this.player.x;
            this.playerSprite.y = this.player.y + 25;
            
            // Character tilting based on movement speed and direction
            const speedRatio = Math.abs(this.player.body.velocity.x) / this.maxSpeed;
            const tiltAngle = speedRatio * 15 * this.facingDirection; // Up to 15 degrees tilt
            
            // Additional tilt when jumping/falling
            const verticalVel = this.player.body.velocity.y;
            let verticalTilt = 0;
            if (verticalVel < -200) {
                // Jumping - lean back slightly
                verticalTilt = -5;
            } else if (verticalVel > 200) {
                // Falling fast - lean forward
                verticalTilt = 10;
            }
            
            this.playerSprite.setRotation((tiltAngle + verticalTilt) * (Math.PI / 180));
            
            // Scale effects for speed (20% bigger)
            const baseScaleX = 78 / this.playerSprite.width;  // Scale to 78px width
            const baseScaleY = 62 / this.playerSprite.height; // Scale to 62px height
            
            if (speedRatio > 0.8) {
                // Slight horizontal stretch at high speed
                this.playerSprite.setScale(baseScaleX * 1.1, baseScaleY * 0.95);
            } else {
                this.playerSprite.setScale(baseScaleX, baseScaleY);
            }
            
            // Apply sprite direction (flip horizontally)
            this.playerSprite.setFlipX(this.facingDirection === -1);
            // Apply vertical flip when falling for extended time
            this.playerSprite.setFlipY(this.isFalling);
            
            // Speed trail effect
            if (speedRatio > 0.7) {
                this.particleManager.emitSpeedTrail(this.player.x, this.player.y, speedRatio);
            }
        }
        
        // Track falling duration for sprite flipping
        const fallCheckTime = this.time.now;
        if (this.player.body.velocity.y > 0 && !this.player.body.touching.down) {
            // Player is falling
            if (this.fallStartTime === 0) {
                // Start tracking fall time
                this.fallStartTime = fallCheckTime;
            } else if (fallCheckTime - this.fallStartTime > this.fallDurationThreshold) {
                // Been falling for more than 2 seconds
                this.isFalling = true;
            }
        } else {
            // Player is not falling (on ground, jumping up, etc.)
            this.fallStartTime = 0;
            this.isFalling = false;
        }
        
        // Enhanced momentum-based player movement with speed boost
        let currentVelX = this.player.body.velocity.x;
        let targetMaxSpeed = this.speedBoostActive ? this.superMaxSpeed : this.maxSpeed;
        
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            // Accelerate left
            let newVelX = currentVelX - this.acceleration * (1/60);
            newVelX = Math.max(newVelX, -targetMaxSpeed);
            this.player.setVelocityX(newVelX);
            this.facingDirection = -1;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            // Accelerate right
            let newVelX = currentVelX + this.acceleration * (1/60);
            newVelX = Math.min(newVelX, targetMaxSpeed);
            this.player.setVelocityX(newVelX);
            this.facingDirection = 1;
        } else {
            // Decelerate when no input
            if (Math.abs(currentVelX) > 0) {
                let decelAmount = this.deceleration * (1/60);
                if (currentVelX > 0) {
                    let newVelX = Math.max(0, currentVelX - decelAmount);
                    this.player.setVelocityX(newVelX);
                } else {
                    let newVelX = Math.min(0, currentVelX + decelAmount);
                    this.player.setVelocityX(newVelX);
                }
            }
        }

        // Enhanced jumping with momentum and combo system
        if (this.player.body.touching.down) {
            // Check if we landed on a platform (not ground) for combo system
            if (this.player.y < 4950) { // Not on ground
                this.handlePlatformLanding();
            } else {
                // Reset combo when touching ground
                this.resetCombo();
            }
            
            if ((this.cursors.up.isDown || this.wasd.W.isDown)) {
                if (!this.isJumping) {
                    // Momentum-based jumping - speed affects jump height
                    const speedRatio = Math.abs(this.player.body.velocity.x) / this.maxSpeed;
                    const momentumBonus = speedRatio * 200; // Up to 200 extra jump velocity
                    const comboBonus = Math.min(this.combo * 10, 100); // Up to 100 extra from combo
                    
                    const totalJumpVelocity = this.minJumpVelocity - momentumBonus - comboBonus;
                    this.player.setVelocityY(totalJumpVelocity);
                    
                    this.isJumping = true;
                    this.jumpHoldTime = 0;
                    
                    // Enhanced particles based on jump power
                    this.particleManager.emitJumpDust(this.player.x, this.player.y, 1 + speedRatio);
                }
            } else {
                // Reset when not holding jump
                this.isJumping = false;
            }
        }
        
        // Continue boosting jump while holding and still going up
        if (this.isJumping && (this.cursors.up.isDown || this.wasd.W.isDown) && this.player.body.velocity.y < 0) {
            this.jumpHoldTime += 1/60;
            if (this.jumpHoldTime <= this.maxJumpHoldTime) {
                // Add upward force while holding
                this.player.setVelocityY(this.player.body.velocity.y - 15); // Boost jump
            }
        }
        
        // Stop jump boost when released or falling
        if (!this.cursors.up.isDown && !this.wasd.W.isDown) {
            this.isJumping = false;
        }
        
        // Enhanced wall mechanics with sliding
        if (!this.player.body.touching.down && (this.player.body.touching.left || this.player.body.touching.right)) {
            // Wall sliding
            if (this.player.body.velocity.y > 0) { // Falling
                this.isWallSliding = true;
                this.wallSlideTimer = this.time.now;
                
                // Slow down fall speed when wall sliding
                if (this.player.body.velocity.y > this.wallSlideSpeed) {
                    this.player.setVelocityY(this.wallSlideSpeed);
                }
                
                // Emit wall slide particles
                const wallX = this.player.body.touching.left ? this.player.x - 15 : this.player.x + 15;
                this.particleManager.emitWallSlide(wallX, this.player.y);
            }
            
            // Wall jumping with combo reset
            if ((this.cursors.up.isDown || this.wasd.W.isDown)) {
                // Reset combo on wall jump (like in Icy Tower)
                this.resetCombo();
                
                if (this.player.body.touching.left) {
                    this.player.setVelocityY(this.wallJumpVelocity);
                    this.player.setVelocityX(this.wallJumpForce);
                } else if (this.player.body.touching.right) {
                    this.player.setVelocityY(this.wallJumpVelocity);
                    this.player.setVelocityX(-this.wallJumpForce);
                }
            }
        } else {
            this.isWallSliding = false;
        }

        // Check if we need to generate more platforms (throttled)
        const currentTime = this.time.now;
        if (currentTime - this.lastPlatformCheck > this.platformCheckInterval) {
            this.checkAndGeneratePlatforms();
            this.lastPlatformCheck = currentTime;
        }

        // Update air trail effect - show rainbow trail when player is in the air
        const isInAir = !this.player.body.touching.down;
        this.particleManager.updateAirTrail(this.player.x, this.player.y, isInAir, this.facingDirection, this.time.now);

        // Update score with combo multiplier
        let calculatedHeight = Math.floor((5000 - this.player.y) / 10);
        let height = Math.max(0, calculatedHeight);
        
        if (height > this.score) {
            const heightGain = height - this.score;
            const bonusScore = Math.floor(heightGain * this.comboMultiplier);
            this.score = height + bonusScore;
            this.scoreText.setText('Height: ' + this.score);
        }
        
        // Update UI displays
        this.updateUI();
        
        // Update danger zone
        this.updateDangerZone();
        
        // Update combo timer
        this.updateComboSystem();
        
        // Update background based on current height
        this.backgroundRenderer.updateBackground(height);
        
        // Update wall visibility for performance (cull off-screen walls)
        this.wallRenderer.updateWallVisibility(this.player.y);
        


        // Game over if player falls too far or hits danger zone
        if (this.player.y > 5100 || this.player.y > this.dangerZoneY) {
            this.gameOver();
        }
    }

    // Handle platform landing for combo system
    handlePlatformLanding() {
        // Find which platform we landed on
        let landedPlatform = null;
        this.platforms.children.entries.forEach(platform => {
            if (Math.abs(platform.y - this.player.y) < 50 && Math.abs(platform.x - this.player.x) < platform.body.width/2 + 20) {
                landedPlatform = platform;
            }
        });
        
        if (landedPlatform && landedPlatform !== this.lastPlatformTouched) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.comboMultiplier = 1 + (this.combo * 0.1); // 10% bonus per combo
            this.lastPlatformTouched = landedPlatform;
            this.comboResetTimer = this.time.now;
            
            // Show combo popup for high combos
            if (this.combo > 5 && this.combo % 5 === 0) {
                this.showComboPopup();
            }
            
            // Speed boost for high combos
            if (this.combo > 10) {
                this.speedBoostActive = true;
                this.speedBoostTimer = this.time.now;
            }
            
            // Emit combo particles
            this.particleManager.emitComboEffect(this.player.x, this.player.y, this.combo);
        }
    }
    
    // Reset combo system
    resetCombo() {
        if (this.combo > 0) {
            this.combo = 0;
            this.comboMultiplier = 1;
            this.lastPlatformTouched = null;
            this.speedBoostActive = false;
        }
    }
    
    // Show combo celebration popup
    showComboPopup() {
        this.comboPopupText.setText(`${this.combo}x COMBO!`);
        this.comboPopupText.setVisible(true);
        this.comboPopupText.setAlpha(1);
        this.comboPopupText.setScale(1.5);
        
        // Animate popup
        this.tweens.add({
            targets: this.comboPopupText,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.comboPopupText.setVisible(false);
            }
        });
    }
    

    
    // Update combo system timer
    updateComboSystem() {
        // Reset combo if too much time has passed without landing
        if (this.combo > 0 && this.time.now - this.comboResetTimer > this.comboResetDelay) {
            if (!this.player.body.touching.down) {
                // Only reset if player is in air for too long
                this.resetCombo();
            }
        }
        
        // Handle speed boost timer
        if (this.speedBoostActive && this.time.now - this.speedBoostTimer > 3000) {
            this.speedBoostActive = false;
        }
    }
    
    // Update danger zone
    updateDangerZone() {
        // Start danger zone after player reaches height 100
        if (this.score > 100 && !this.dangerZoneActive) {
            this.dangerZoneActive = true;
        }
        
        if (this.dangerZoneActive) {
            this.dangerZoneY -= this.dangerZoneSpeed;
            
            // Draw danger zone visual
            this.dangerZoneGraphics.clear();
            this.dangerZoneGraphics.fillGradientStyle(0xff4444, 0xff4444, 0xff0000, 0xff0000, 1);
            this.dangerZoneGraphics.fillRect(0, this.dangerZoneY, 800, 200);
            
            // Add danger zone warning particles
            if (this.time.now % 200 < 50) { // Flash effect
                this.particleManager.emitDangerZoneWarning(400, this.dangerZoneY);
            }
        }
    }
    
    // Update UI displays
    updateUI() {
        // Update combo display
        if (this.combo > 1) {
            this.comboText.setText(`Combo: ${this.combo}x (${this.comboMultiplier.toFixed(1)}x score)`);
            this.comboText.setVisible(true);
        } else {
            this.comboText.setVisible(false);
        }
        
        // Update speed display
        this.currentSpeed = Math.abs(this.player.body.velocity.x);
        const speedPercent = Math.floor((this.currentSpeed / this.maxSpeed) * 100);
        
        if (speedPercent > 30) {
            let speedText = `Speed: ${speedPercent}%`;
            if (this.speedBoostActive) speedText += ' BOOST!';
            this.speedText.setText(speedText);
            this.speedText.setVisible(true);
        } else {
            this.speedText.setVisible(false);
        }
    }

    // Cleanup resources before restart
    cleanupBeforeRestart() {
        // Stop all tweens
        this.tweens.killAll();
        
        // Clean up particle manager
        if (this.particleManager) {
            this.particleManager.destroy();
        }
        
        // Clean up platform renderer
        if (this.platformRenderer) {
            this.platformRenderer.destroyAllSprites();
        }
        
        // Clean up background renderer
        if (this.backgroundRenderer) {
            this.backgroundRenderer.destroy();
        }
        
        // Clean up wall renderer
        if (this.wallRenderer) {
            this.wallRenderer.destroy();
        }
        
        // Clear platform data
        this.platformData = [];
        
        // Clear graphics
        if (this.platformGraphics) {
            this.platformGraphics.clear();
        }
        if (this.dangerZoneGraphics) {
            this.dangerZoneGraphics.clear();
        }
        
        // Reset procedural textures to avoid conflicts
        if (this.textures.exists('proceduralStone')) {
            this.textures.remove('proceduralStone');
        }
        if (this.textures.exists('proceduralDarkStone')) {
            this.textures.remove('proceduralDarkStone');
        }
        
        // Clean up particle textures
        const particleTextures = ['dustParticle', 'impactParticle', 'sparkParticle', 'trailParticle', 
                                 'comboParticle', 'speedParticle', 'dangerParticle'];
        particleTextures.forEach(texture => {
            if (this.textures.exists(texture)) {
                this.textures.remove(texture);
            }
        });
    }

    gameOver() {
        this.physics.pause();
        this.player.setTint(0xff0000);
        
        // Display enhanced game over text with max combo
        let gameOverText = this.add.text(400, 300, 
            `Game Over!\nHeight: ${this.score}\nMax Combo: ${this.maxCombo}x\nPress R to restart`, {
            fontSize: '32px',
            fill: '#ffffff',
            align: 'center'
        });
        gameOverText.setOrigin(0.5);
        gameOverText.setScrollFactor(0);

        // Restart on R key
        this.input.keyboard.once('keydown-R', () => {
            // Proper cleanup before restart
            this.cleanupBeforeRestart();
            this.scene.restart();
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: window.innerHeight, // Use full screen height
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1040 }, // 800 * 1.3 for 30% faster
            debug: false
        }
    },
    scene: GameScene
};

// Start the game
console.log('Starting Phaser game...');
const game = new Phaser.Game(config);

// Add error handling
game.events.on('ready', () => {
    console.log('Game is ready!');
});

window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
});
