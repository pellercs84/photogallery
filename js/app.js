// Main Application Logic for Photo Gallery

// Global state
let allMedia = [];
let currentView = 'all';
let currentYear = null;
let currentAlbum = null;
let albums = [];
let lightGalleryInstance = null;
let selectedMediaForAlbum = new Set();

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    requireAuth();

    // Load data
    await loadAlbums();
    await loadMedia();

    // Set up navigation
    setupNavigation();

    // Set up event listeners
    setupEventListeners();
});

/**
 * Load media from Azure Blob Storage
 */
async function loadMedia() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const galleryGrid = document.getElementById('galleryGrid');

    try {
        loadingSpinner.style.display = 'block';
        emptyState.style.display = 'none';

        // Check cache first
        const cachedData = getCachedMedia();
        if (cachedData) {
            allMedia = cachedData;
            renderGallery(allMedia);
            loadingSpinner.style.display = 'none';
            return;
        }

        // Fetch from API
        const response = await fetch(`${CONFIG.API_BASE_URL}/GetMediaIndex`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load media');
        }

        const data = await response.json();
        allMedia = data.media || [];

        // Cache the data
        cacheMedia(allMedia);

        // Render gallery
        renderGallery(allMedia);

    } catch (error) {
        console.error('Error loading media:', error);
        galleryGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error loading media. Please refresh the page.</p>';
    } finally {
        loadingSpinner.style.display = 'none';
        if (allMedia.length === 0) {
            emptyState.style.display = 'block';
        }
    }
}

/**
 * Render gallery grid
 */
function renderGallery(mediaItems) {
    const galleryGrid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyState');

    if (!mediaItems || mediaItems.length === 0) {
        galleryGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Clear existing gallery
    galleryGrid.innerHTML = '';

    // Destroy existing lightGallery instance
    if (lightGalleryInstance) {
        lightGalleryInstance.destroy();
    }

    // Create gallery items
    mediaItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.setAttribute('data-src', item.url);

        if (item.type === 'video') {
            itemDiv.setAttribute('data-video', `{"source": [{"src":"${item.url}", "type":"video/mp4"}], "attributes": {"preload": false, "controls": true}}`);

            itemDiv.innerHTML = `
                <img src="${item.thumbnailUrl}" alt="${item.name}" loading="lazy" />
                <div class="video-badge">▶ Video</div>
                <div class="gallery-item-overlay">
                    <div class="gallery-item-title">${item.name}</div>
                    <button class="btn-delete-icon" onclick="event.stopPropagation(); deleteMedia('${item.id}')" title="Delete">🗑️</button>
                </div>
            `;
        } else {
            // Use thumbnail for image preview
            itemDiv.innerHTML = `
                <img src="${item.thumbnailUrl}" alt="${item.name}" loading="lazy" />
                <div class="gallery-item-overlay">
                    <div class="gallery-item-title">${item.name}</div>
                    <button class="btn-delete-icon" onclick="event.stopPropagation(); deleteMedia('${item.id}')" title="Delete">🗑️</button>
                </div>
            `;
        }

        galleryGrid.appendChild(itemDiv);
    });

    // Initialize lightGallery
    lightGalleryInstance = lightGallery(galleryGrid, {
        plugins: [lgZoom, lgThumbnail, lgVideo, lgFullscreen],
        speed: 500,
        thumbnail: true,
        animateThumb: true,
        showThumbByDefault: false,
        mode: 'lg-fade',
        download: false,
        mobileSettings: {
            controls: true,
            showCloseIcon: true,
            download: false
        }
    });
}

/**
 * Set up navigation between views
 */
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            switchView(view);

            // Update active button
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Switch between different views
 */
function switchView(view) {
    currentView = view;

    // Hide all views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected view
    const breadcrumb = document.getElementById('breadcrumb');

    switch (view) {
        case 'all':
            document.getElementById('viewAll').classList.add('active');
            breadcrumb.innerHTML = '<span>All Media</span>';
            renderGallery(allMedia);
            break;

        case 'albums':
            document.getElementById('viewAlbums').classList.add('active');
            breadcrumb.innerHTML = '<span>Albums</span>';
            renderAlbums();
            break;

        case 'years':
            document.getElementById('viewYears').classList.add('active');
            breadcrumb.innerHTML = '<span>Years</span>';
            renderYears();
            break;
    }
}

/**
 * Render albums view
 */
function renderAlbums() {
    const albumsList = document.getElementById('albumsList');
    const emptyState = document.getElementById('albumEmptyState');

    if (!albums || albums.length === 0) {
        albumsList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    albumsList.innerHTML = '';

    albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.onclick = () => viewAlbum(album);

        // Get preview images
        const previewImages = album.mediaIds
            .slice(0, 3)
            .map(id => allMedia.find(m => m.id === id))
            .filter(m => m);

        const previewHtml = previewImages.length > 0
            ? `<div class="album-preview">
                ${previewImages.map(m => `<img src="${m.thumbnailUrl}" alt="${m.name}" />`).join('')}
               </div>`
            : '';

        albumCard.innerHTML = `
            <h3>${album.name}</h3>
            <div class="album-card-meta">${album.mediaIds.length} items</div>
            ${previewHtml}
        `;

        albumsList.appendChild(albumCard);
    });
}

/**
 * Render years view
 */
function renderYears() {
    const yearsList = document.getElementById('yearsList');

    // Group media by year
    const yearGroups = {};
    allMedia.forEach(item => {
        const year = item.year || 'Unknown';
        if (!yearGroups[year]) {
            yearGroups[year] = [];
        }
        yearGroups[year].push(item);
    });

    // Sort years descending
    const years = Object.keys(yearGroups).sort((a, b) => b - a);

    yearsList.innerHTML = '';

    years.forEach(year => {
        const yearCard = document.createElement('div');
        yearCard.className = 'year-card';
        yearCard.onclick = () => filterByYear(year);

        const count = yearGroups[year].length;
        yearCard.innerHTML = `
            <h2>${year}</h2>
            <div class="year-card-meta">${count} item${count !== 1 ? 's' : ''}</div>
        `;

        yearsList.appendChild(yearCard);
    });
}

/**
 * Filter media by year
 */
function filterByYear(year) {
    currentYear = year;

    // Switch to all view
    document.getElementById('viewAll').classList.add('active');
    document.getElementById('viewYears').classList.remove('active');

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `<span>Years</span> / <span>${year}</span>`;

    // Filter and render
    const filtered = allMedia.filter(item => item.year == year);
    renderGallery(filtered);
}

/**
 * View album modal
 */
function viewAlbum(album) {
    currentAlbum = album;

    const modal = document.getElementById('modalViewAlbum');
    const title = document.getElementById('albumTitle');
    const galleryGrid = document.getElementById('albumGalleryGrid');

    title.textContent = album.name;
    modal.classList.add('active');

    // Get album media
    const albumMedia = album.mediaIds
        .map(id => allMedia.find(m => m.id === id))
        .filter(m => m);

    // Render in modal
    renderAlbumGallery(albumMedia, galleryGrid);
}

/**
 * Render album gallery in modal
 */
function renderAlbumGallery(mediaItems, container) {
    container.innerHTML = '';

    mediaItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.setAttribute('data-src', item.url);

        if (item.type === 'video') {
            itemDiv.setAttribute('data-video', `{"source": [{"src":"${item.url}", "type":"video/mp4"}], "attributes": {"preload": false, "controls": true}}`);

            itemDiv.innerHTML = `
                <img src="${item.thumbnailUrl}" alt="${item.name}" loading="lazy" />
                <div class="video-badge">▶ Video</div>
            `;
        } else {
            itemDiv.innerHTML = `<img src="${item.thumbnailUrl}" alt="${item.name}" loading="lazy" />`;
        }

        container.appendChild(itemDiv);
    });

    // Initialize lightGallery for modal
    lightGallery(container, {
        plugins: [lgZoom, lgThumbnail, lgVideo, lgFullscreen],
        speed: 500,
        thumbnail: true
    });
}

/**
 * Close view album modal
 */
function closeViewAlbumModal() {
    document.getElementById('modalViewAlbum').classList.remove('active');
    currentAlbum = null;
}

/**
 * Delete current album
 */
async function deleteCurrentAlbum() {
    if (!currentAlbum) return;

    if (confirm(`Are you sure you want to delete the album "${currentAlbum.name}"?`)) {
        albums = albums.filter(a => a.id !== currentAlbum.id);
        await saveAlbumsToStorage();
        closeViewAlbumModal();
        renderAlbums();
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Create album button
    document.getElementById('btnCreateAlbum').addEventListener('click', openCreateAlbumModal);
}

/**
 * Open create album modal
 */
function openCreateAlbumModal() {
    const modal = document.getElementById('modalCreateAlbum');
    const mediaSelection = document.getElementById('mediaSelection');

    // Clear selections
    selectedMediaForAlbum.clear();
    document.getElementById('albumName').value = '';

    // Render media selection grid
    mediaSelection.innerHTML = '';
    allMedia.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'media-select-item';
        itemDiv.onclick = () => toggleMediaSelection(item.id, itemDiv);

        if (item.type === 'video') {
            itemDiv.innerHTML = `
                <img src="${item.thumbnailUrl}" alt="${item.name}" />
                <div class="media-select-checkbox">✓</div>
            `;
        } else {
            itemDiv.innerHTML = `
                <img src="${item.thumbnailUrl}" alt="${item.name}" />
                <div class="media-select-checkbox">✓</div>
            `;
        }

        mediaSelection.appendChild(itemDiv);
    });

    modal.classList.add('active');
}

/**
 * Close create album modal
 */
function closeCreateAlbumModal() {
    document.getElementById('modalCreateAlbum').classList.remove('active');
}

/**
 * Toggle media selection for album
 */
function toggleMediaSelection(mediaId, element) {
    if (selectedMediaForAlbum.has(mediaId)) {
        selectedMediaForAlbum.delete(mediaId);
        element.classList.remove('selected');
    } else {
        selectedMediaForAlbum.add(mediaId);
        element.classList.add('selected');
    }
}

/**
 * Save album
 */
async function saveAlbum() {
    const albumName = document.getElementById('albumName').value.trim();

    if (!albumName) {
        alert('Please enter an album name');
        return;
    }

    if (selectedMediaForAlbum.size === 0) {
        alert('Please select at least one photo or video');
        return;
    }

    const newAlbum = {
        id: Date.now().toString(),
        name: albumName,
        mediaIds: Array.from(selectedMediaForAlbum),
        createdAt: new Date().toISOString()
    };

    albums.push(newAlbum);
    await saveAlbumsToStorage();

    closeCreateAlbumModal();

    // Switch to albums view
    switchView('albums');
    document.querySelector('[data-view="albums"]').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') !== 'albums') {
            btn.classList.remove('active');
        }
    });
}

/**
 * Refresh gallery
 */
async function refreshGallery() {
    clearMediaCache();
    await loadMedia();
}

/**
 * Load albums from localStorage
 */
async function loadAlbums() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_ALBUMS_KEY);
        if (stored) {
            albums = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading albums:', error);
        albums = [];
    }
}

/**
 * Save albums to localStorage (and optionally to blob storage via API)
 */
async function saveAlbumsToStorage() {
    try {
        localStorage.setItem(CONFIG.STORAGE_ALBUMS_KEY, JSON.stringify(albums));

        // Optionally save to blob storage via API
        // Uncomment when API is implemented
        /*
        await fetch(`${CONFIG.API_BASE_URL}/SaveAlbums`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ albums })
        });
        */
    } catch (error) {
        console.error('Error saving albums:', error);
    }
}

/**
 * Cache media data
 */
function cacheMedia(media) {
    try {
        const cacheData = {
            media: media,
            timestamp: Date.now()
        };
        localStorage.setItem(CONFIG.STORAGE_MEDIA_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error caching media:', error);
    }
}

/**
 * Get cached media
 */
function getCachedMedia() {
    try {
        const cached = localStorage.getItem(CONFIG.STORAGE_MEDIA_CACHE_KEY);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        // Check if cache is still valid
        if (age < CONFIG.CACHE_DURATION) {
            return cacheData.media;
        }

        return null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

/**
 * Clear media cache
 */
function clearMediaCache() {
    localStorage.removeItem(CONFIG.STORAGE_MEDIA_CACHE_KEY);
}

/**
 * Delete media item
 */
async function deleteMedia(mediaId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this item?')) {
        return;
    }

    try {
        const response = await fetch(\\/DeleteMedia?id=\\, {
            method: 'DELETE',
            headers: {
                'Authorization': \Bearer \\
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete item');
        }

        // Remove from local array
        allMedia = allMedia.filter(m => m.id !== mediaId);
        
        // Remove from albums
        albums.forEach(album => {
            if (album.mediaIds.includes(mediaId)) {
                album.mediaIds = album.mediaIds.filter(id => id !== mediaId);
            }
        });
        saveAlbumsToStorage();

        // Update cache
        cacheMedia(allMedia);

        // Re-render
        if (currentView === 'all' || (currentView === 'years' && currentYear)) {
             if (currentView === 'years') filterByYear(currentYear);
             else renderGallery(allMedia);
        } else if (currentView === 'albums' && currentAlbum) {
             const albumMedia = currentAlbum.mediaIds
                .map(id => allMedia.find(m => m.id === id))
                .filter(m => m);
            const container = document.getElementById('albumGalleryGrid');
            renderAlbumGallery(albumMedia, container);
        }

    } catch (error) {
        console.error('Error deleting media:', error);
        alert('Failed to delete media. Please try again.');
    }
}
// Export to window
window.deleteMedia = deleteMedia;

