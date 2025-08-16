class PlatformRenderer {
    constructor(scene) {
        this.scene = scene;
        this.platformTextures = {};
        this.platformColors = {
            platform1: 0x3498db, // Blue - lowest heights
            platform2: 0x2ecc71, // Green 
            platform3: 0xe74c3c, // Red
            platform4: 0x9b59b6, // Purple
            platform5: 0xf39c12  // Orange - highest heights
        };
        this.heightRanges = [
            { min: 0, max: 100, type: 'platform1' },
            { min: 100, max: 500, type: 'platform2' },
            { min: 500, max: 2000, type: 'platform3' },
            { min: 2000, max: 4000, type: 'platform4' },
            { min: 4000, max: 10000, type: 'platform5' }
        ];
    }

    // Load platform images if they exist
    preloadPlatformImages() {
        // Try to load platform images from platforms/ folder
        const platformImages = ['platform1.jpg', 'platform2.jpg', 'platform3.jpg', 'platform4.jpg', 'platform5.jpg'];
        
        platformImages.forEach(imageName => {
            const key = imageName.replace('.jpg', '');
            const imagePath = `platforms/${imageName}`;
            try {
                this.scene.load.image(key, imagePath);
                console.log(`Loading platform image: ${imagePath}`);
            } catch (error) {
                console.log(`Platform image ${imagePath} not found, will use color fallback`);
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
            const height = Math.max(0, Math.floor((worldHeight - platform.y) / 10));
            platform.platformType = this.getPlatformType(height);
        });
        return platformData;
    }

    // Render platforms with variety
    renderPlatforms(platformData, graphics, includeGround = false) {
        // Clear previous graphics
        graphics.clear();
        
        // Draw ground first if requested
        if (includeGround) {
            graphics.fillStyle(0x8e44ad); // Purple ground
            graphics.fillRect(0, 4900, 800, 100);
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

    // Render platforms of a specific type
    renderPlatformType(type, platforms, graphics) {
        // Check if we have a texture for this type
        const hasTexture = this.scene.textures.exists(type);
        
        if (hasTexture) {
            // Use texture - create sprites instead of graphics
            platforms.forEach(platform => {
                const sprite = this.scene.add.image(platform.x + platform.width/2, platform.y + platform.height/2, type);
                sprite.setDisplaySize(platform.width, platform.height);
                sprite.setOrigin(0.5, 0.5);
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
        const platformHeight = Math.max(0, Math.floor((worldHeight - y) / 10));
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
}
