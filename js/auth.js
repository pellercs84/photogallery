// Authentication module for basic password protection

/**
 * Verify password against configured password
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} - True if password is correct
 */
async function verifyPassword(password) {
    try {
        // Server-side verification (secure)
        const response = await fetch('/api/VerifyPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.valid === true;
        }

        return false;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated
 */
function isAuthenticated() {
    const auth = sessionStorage.getItem(CONFIG.SESSION_AUTH_KEY);
    const token = sessionStorage.getItem(CONFIG.SESSION_TOKEN_KEY);

    // Check if auth session exists
    if (!auth || auth !== 'true' || !token) {
        return false;
    }

    // We can't verify the token client-side anymore since we removed the password from config
    // The API endpoints should validate the token
    return true;
}

/**
 * Redirect to login page if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        // Store the attempted URL to redirect back after login
        sessionStorage.setItem('redirect_after_login', window.location.pathname);
        window.location.href = 'login.html';
    }
}

/**
 * Logout and clear authentication
 */
function logout() {
    sessionStorage.removeItem(CONFIG.SESSION_AUTH_KEY);
    sessionStorage.removeItem(CONFIG.SESSION_TOKEN_KEY);
    window.location.href = 'login.html';
}

/**
 * Get authentication token for API requests
 * @returns {string|null} - Authentication token
 */
function getAuthToken() {
    return sessionStorage.getItem(CONFIG.SESSION_TOKEN_KEY);
}
