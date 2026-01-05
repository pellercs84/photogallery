// Configuration for the Photo Gallery
const CONFIG = {
    // Gallery password (for basic authentication)
    // WARNING: This is NOT secure - password is visible in source code
    // For production, use Azure Static Web Apps Standard SKU with built-in password protection
    GALLERY_PASSWORD: 'family2024',
    
    // Azure Blob Storage API endpoints
    API_BASE_URL: '/api',
    
    // Session storage keys
    SESSION_AUTH_KEY: 'gallery_auth',
    SESSION_TOKEN_KEY: 'gallery_token',
    
    // LocalStorage keys
    STORAGE_ALBUMS_KEY: 'gallery_albums',
    STORAGE_MEDIA_CACHE_KEY: 'gallery_media_cache',
    
    // Media types
    IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    VIDEO_EXTENSIONS: ['.mp4', '.webm', '.ogg'],
    
    // UI Settings
    ITEMS_PER_PAGE: 50,
    THUMBNAIL_SIZE: 300,
    
    // Cache duration (in milliseconds)
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
