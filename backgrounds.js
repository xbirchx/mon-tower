class BackgroundRenderer {
    constructor(scene) {
        this.scene = scene;
        this.backgroundTextures = {};
        this.backgroundSprites = []; // Track created sprites for cleanup
        this.spritePool = {}; // Pool of reusable sprites by type
        this.backgroundColors = {
            background1: 0x87CEEB, // Sky blue - lowest heights (0-1000)
            background2: 0x98D8E8, // Light blue - mid-low heights (1000-2000)
            background3: 0xB19CD9, // Light purple - mid heights (2000-3000)
            background4: 0x8E44AD, // Purple - high heights (3000-4000)
            background5: 0x2C3E50  // Dark blue/gray - highest heights (4000+)
        };
        this.heightRanges = [
            { min: 0, max: 1000, type: 'background1' },
            { min: 1000, max: 2000, type: 'background2' },
            { min: 2000, max: 3000, type: 'background3' },
            { min: 3000, max: 4000, type: 'background4' },
            { min: 4000, max: 5000, type: 'background5' }
        ];
        this.currentBackgroundType = null;
        this.backgroundSprites = [];
    }

    // Load background images if they exist
    preloadBackgroundImages() {
        // Try to load background images from backgrounds/ folder
        const backgroundImages = ['background1.png', 'background2.png', 'background3.png', 'background4.png', 'background5.png'];
        
        backgroundImages.forEach(imageName => {
            const key = imageName.replace('.png', '');
            const imagePath = `backgrounds/${imageName}`;
            try {
                this.scene.load.image(key, imagePath);
            } catch (error) {
                // Background image not found, will use color fallback
            }
        });
    }

    // Get background type based on height
    getBackgroundType(height) {
        for (let range of this.heightRanges) {
            if (height >= range.min && height < range.max) {
                return range.type;
            }
        }
        return 'background5'; // Default to highest type for heights above 4000
    }

    // Update background based on player height
    updateBackground(playerHeight) {
        const backgroundType = this.getBackgroundType(playerHeight);
        
        // Only update if background type has changed
        if (this.currentBackgroundType !== backgroundType) {
            this.currentBackgroundType = backgroundType;
            this.renderBackground(backgroundType);
        }
    }

    // Render background of a specific type
    renderBackground(type) {
        // Remove existing background sprites if any
        if (this.backgroundSprites && this.backgroundSprites.length > 0) {
            this.backgroundSprites.forEach(sprite => sprite.destroy());
            this.backgroundSprites = [];
        }

        // Check if we have a texture for this type
        const hasTexture = this.scene.textures.exists(type);
        
        if (hasTexture) {
            // Use texture - create tiled background sprites
            this.backgroundSprites = [];
            
            // Get the texture dimensions to calculate how many tiles we need
            const texture = this.scene.textures.get(type);
            const textureWidth = texture.source[0].width;
            const textureHeight = texture.source[0].height;
            
            // Calculate how many tiles we need to cover the game world
            const gameWidth = 800;
            const gameHeight = 50000; // Total game world height
            const tilesHorizontal = Math.ceil(gameWidth / textureWidth);
            const tilesVertical = Math.ceil(gameHeight / textureHeight);
            
            // Create tiled background sprites
            for (let row = 0; row < tilesVertical; row++) {
                for (let col = 0; col < tilesHorizontal; col++) {
                    const x = col * textureWidth + textureWidth / 2;
                    const y = -45000 + (row * textureHeight) + textureHeight / 2; // Start from top of game world
                    
                    const sprite = this.scene.add.image(x, y, type);
                    sprite.setOrigin(0.5, 0.5);
                    sprite.setDepth(-1000); // Make sure it's behind everything
                    sprite.setScrollFactor(0.1); // Parallax effect - moves slower than camera
                    
                    this.backgroundSprites.push(sprite);
                }
            }
        } else {
            // Use color fallback - change the scene background color
            const color = this.backgroundColors[type] || 0x87CEEB;
            this.scene.cameras.main.setBackgroundColor(color);
        }
    }

    // Get background color for debugging
    getBackgroundColor(type) {
        return this.backgroundColors[type] || 0x87CEEB;
    }

    // Initialize background system
    initialize() {
        // Set initial background
        this.updateBackground(0);
    }

    // Cleanup when scene ends
    destroy() {
        if (this.backgroundSprites && this.backgroundSprites.length > 0) {
            this.backgroundSprites.forEach(sprite => sprite.destroy());
            this.backgroundSprites = [];
        }
        this.currentBackgroundType = null;
    }
}
