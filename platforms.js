class PlatformRenderer {
    constructor(scene) {
        this.scene = scene;
        this.platformTextures = {};
        this.platformSprites = []; // Track created sprites for cleanup
        this.spritePool = {}; // Pool of reusable sprites by type
        this.groundTexture = null; // Static ground texture
        this.platformColors = {
            platform1: 0x3498db, // Blue - lowest heights
            platform2: 0x2ecc71, // Green 
            platform3: 0xe74c3c, // Red
            platform4: 0x9b59b6, // Purple
            platform5: 0xf39c12  // Orange - highest heights
        };
        this.heightRanges = [
            { min: 0, max: 1000, type: 'platform1' },
            { min: 1000, max: 2000, type: 'platform2' },
            { min: 2000, max: 3000, type: 'platform3' },
            { min: 3000, max: 4000, type: 'platform4' },
            { min: 4000, max: 5000, type: 'platform5' }
        ];
    }

    // Load platform images if they exist
    preloadPlatformImages() {
        // Try to load platform images from platforms/ folder
        const platformImages = ['platform1.png', 'platform2.png', 'platform3.png', 'platform4.png', 'platform5.png'];
        
        platformImages.forEach(imageName => {
            const key = imageName.replace('.png', '');
            const imagePath = `platforms/${imageName}`;
            try {
                this.scene.load.image(key, imagePath);
            } catch (error) {
                // Platform image not found, will use color fallback
            }
        });
    }

    // Get platform type based on height
    getPlatformType(height) {
        for (let range of this.heightRanges) {
            if (height >= range.min && height < range.max) {
                return range.type;
            }
        }
        return 'platform5'; // Default to highest type
    }

    // Assign platform types to existing platform data
    assignPlatformTypes(platformData, worldHeight = 5000) {
        platformData.forEach(platform => {
            // Calculate height from world bottom (higher y = lower height)
            // Ground is at y=5000 (height 0), so height = (5000 - y) / 10
            const height = Math.max(0, Math.floor((5000 - platform.y) / 10));
            platform.platformType = this.getPlatformType(height);
        });
        return platformData;
    }

    // Render platforms with variety
    renderPlatforms(platformData, graphics, includeGround = false) {
        // Clear previous graphics and sprites
        graphics.clear();
        this.clearAllSprites();
        
        // Draw ground first if requested
        if (includeGround) {
            this.drawDirtGround(graphics);
        }
        
        // Group platforms by type for efficient rendering
        const platformsByType = {};
        platformData.forEach(platform => {
            const type = platform.platformType || 'platform1';
            if (!platformsByType[type]) {
                platformsByType[type] = [];
            }
            platformsByType[type].push(platform);
        });

        // Render each type
        Object.keys(platformsByType).forEach(type => {
            this.renderPlatformType(type, platformsByType[type], graphics);
        });
    }

    // Draw brown ground with static dirt texture
    drawDirtGround(graphics) {
        // Create static ground texture if it doesn't exist
        if (!this.groundTexture) {
            this.createStaticGroundTexture();
        }
        
        // Draw the static ground texture
        if (this.groundTexture) {
            graphics.fillStyle(0x8B4513); // Saddle brown base
            graphics.fillRect(0, 4900, 800, 100);
            
            // Draw the static dirt pattern
            this.groundTexture.forEach(spot => {
                graphics.fillStyle(spot.color);
                if (spot.type === 'circle') {
                    graphics.fillCircle(spot.x, spot.y, spot.size);
                } else {
                    graphics.fillRect(spot.x, spot.y, spot.width, spot.height);
                }
            });
        }
    }
    
    // Create static ground texture pattern (only called once)
    createStaticGroundTexture() {
        this.groundTexture = [];
        
        // Use a fixed seed for consistent pattern
        const seed = 12345;
        let random = this.seededRandom(seed);
        
        // Create dirt spots with seeded random
        for (let i = 0; i < 60; i++) {
            this.groundTexture.push({
                type: 'circle',
                x: random() * 800,
                y: 4900 + random() * 100,
                size: 2 + random() * 4,
                color: 0x654321 // Darker brown for dirt spots
            });
        }
        
        // Add larger dirt clumps
        for (let i = 0; i < 20; i++) {
            this.groundTexture.push({
                type: 'rect',
                x: random() * 800,
                y: 4900 + random() * 100,
                width: 3 + random() * 6,
                height: 2 + random() * 4,
                color: 0x5D4037 // Even darker brown
            });
        }
    }
    
    // Simple seeded random number generator for consistent results
    seededRandom(seed) {
        let m = 0x80000000; // 2**31
        let a = 1103515245;
        let c = 12345;
        let state = seed;
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    // Render platforms of a specific type
    renderPlatformType(type, platforms, graphics) {
        // Check if we have a texture for this type
        const hasTexture = this.scene.textures.exists(type);
        
        if (hasTexture) {
            // Use texture - get sprites from pool or create new ones
            platforms.forEach(platform => {
                const sprite = this.getSpriteFromPool(type);
                sprite.setPosition(platform.x + platform.width/2, platform.y + platform.height/2);
                sprite.setDisplaySize(platform.width, platform.height);
                sprite.setVisible(true);
                this.platformSprites.push(sprite); // Track active sprites
            });
        } else {
            // Use color fallback
            const color = this.platformColors[type] || 0x3498db;
            graphics.fillStyle(color);
            
            platforms.forEach(platform => {
                graphics.fillRect(platform.x, platform.y, platform.width, platform.height);
            });
        }
    }
    


    // Create platform with type assignment
    createPlatformWithType(x, y, width, height, worldHeight = 5000) {
        // Ground is at y=5000 (height 0), so height = (5000 - y) / 10
        const platformHeight = Math.max(0, Math.floor((5000 - y) / 10));
        const platformType = this.getPlatformType(platformHeight);
        
        return {
            x: x - width/2,
            y: y - height/2,
            width: width,
            height: height,
            platformType: platformType
        };
    }

    // Get platform color for debugging
    getPlatformColor(type) {
        return this.platformColors[type] || 0x3498db;
    }

    // Get sprite from pool or create new one
    getSpriteFromPool(type) {
        if (!this.spritePool[type]) {
            this.spritePool[type] = [];
        }
        
        // Try to reuse an existing sprite
        const availableSprite = this.spritePool[type].find(sprite => !sprite.visible);
        if (availableSprite) {
            return availableSprite;
        }
        
        // Create new sprite if none available
        const newSprite = this.scene.add.image(0, 0, type);
        newSprite.setOrigin(0.5, 0.5);
        this.spritePool[type].push(newSprite);
        return newSprite;
    }

    // Return sprites to pool instead of destroying them
    clearAllSprites() {
        this.platformSprites.forEach(sprite => {
            if (sprite && sprite.setVisible) {
                sprite.setVisible(false); // Hide instead of destroy
            }
        });
        this.platformSprites = [];
    }

    // Destroy all sprites (for cleanup when scene ends)
    destroyAllSprites() {
        Object.values(this.spritePool).forEach(pool => {
            pool.forEach(sprite => {
                if (sprite && sprite.destroy) {
                    sprite.destroy();
                }
            });
        });
        this.spritePool = {};
        this.platformSprites = [];
    }
}
