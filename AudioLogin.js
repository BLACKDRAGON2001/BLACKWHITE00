// Secure AudioLogin.js - Backend Integration with Render
// This replaces your original AudioLogin.js with secure backend authentication

// Configuration - Updated for Render deployment
const SECURE_AUTH_CONFIG = {
    API_BASE_URL: 'https://audioplayerbackend.onrender.com',
    SESSION_TIMEOUT: 50 * 60 * 1000, // 50 minutes
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
};

// State Management
let authState = {
    currentUser: null,
    accessToken: null,
    refreshToken: null,
    loginAttempts: 0,
    lockoutUntil: 0
};

// Secure API Class
class SecureAuthAPI {
    static async request(endpoint, options = {}) {
        const url = `${SECURE_AUTH_CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(authState.accessToken && { 'Authorization': `Bearer ${authState.accessToken}` })
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('CANNOT CONNECT TO SERVER. PLEASE CHECK YOUR INTERNET CONNECTION.');
            }
            throw error;
        }
    }

    static async login(username, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    }

    static async logout() {
        return this.request('/api/auth/logout', {
            method: 'POST'
        });
    }

    static async getUserProfile() {
        return this.request('/api/user/profile');
    }

    static async refreshToken() {
        return this.request('/api/auth/refresh', {
            method: 'POST',
            body: { refreshToken: authState.refreshToken }
        });
    }

    static async testConnection() {
        try {
            const response = await fetch(`${SECURE_AUTH_CONFIG.API_BASE_URL}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('Backend connection successful:', data);
                return true;
            }
        } catch (error) {
            console.error('Backend connection test failed:', error);
        }
        return false;
    }
}

// Message Display Functions
function changeText(isSuccessful) {
    const messageBox = document.getElementById("MessageBox");
    if (!messageBox) return;

    if (isSuccessful) {
        messageBox.textContent = "LOGIN SUCCESSFUL";
        messageBox.style.color = "#000000";
    } else {
        messageBox.textContent = "LOGIN UNSUCCESSFUL";
        messageBox.style.color = "#000000";
    }
    messageBox.style.display = "block";
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageBox.style.color === "#000000") { // Only hide error messages
            messageBox.style.display = "none";
        }
    }, 5000);
}

function showCustomMessage(text, isSuccess = false) {
    const messageBox = document.getElementById("MessageBox");
    if (!messageBox) return;

    // Ensure text is always capitalized
    messageBox.textContent = text.toUpperCase();
    messageBox.style.color = "#000000"; // Always black
    messageBox.style.display = "block";
    
    setTimeout(() => {
        if (!isSuccess) {
            messageBox.style.display = "none";
        }
    }, 5000);
}

function clearInputFields() {
    const elements = ["username", "password", "MessageBox"];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === "INPUT") {
                element.value = "";
            } else {
                element.textContent = "";
                element.style.display = "none";
            }
        }
    });
}

// Token Management
function saveTokens(tokens) {
    authState.accessToken = tokens.accessToken;
    authState.refreshToken = tokens.refreshToken;
    
    // Use sessionStorage instead of localStorage for security
    sessionStorage.setItem('accessToken', tokens.accessToken);
    sessionStorage.setItem('refreshToken', tokens.refreshToken);
}

function loadTokens() {
    authState.accessToken = sessionStorage.getItem('accessToken');
    authState.refreshToken = sessionStorage.getItem('refreshToken');
}

function clearTokens() {
    authState.accessToken = null;
    authState.refreshToken = null;
    authState.currentUser = null;
    
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    
    // Clear legacy localStorage items
    localStorage.removeItem("HomeLoginTime");
    localStorage.removeItem("DisguiseLoginTime");
}

// Account lockout management
function isAccountLocked() {
    return Date.now() < authState.lockoutUntil;
}

function lockAccount() {
    authState.lockoutUntil = Date.now() + SECURE_AUTH_CONFIG.LOCKOUT_TIME;
    authState.loginAttempts = 0;
    const minutes = SECURE_AUTH_CONFIG.LOCKOUT_TIME / 60000;
    showCustomMessage(`ACCOUNT HAS BEEN LOCKED FOR ${minutes} MINUTES`);
}

// Session validation
async function validateSession() {
    if (!authState.accessToken) return false;

    try {
        const response = await SecureAuthAPI.getUserProfile();
        if (response.success) {
            authState.currentUser = response.data;
            return true;
        }
    } catch (error) {
        console.error('Session validation failed:', error);
        
        // Try to refresh token
        if (authState.refreshToken) {
            try {
                const refreshResponse = await SecureAuthAPI.refreshToken();
                if (refreshResponse.success) {
                    authState.accessToken = refreshResponse.data.accessToken;
                    sessionStorage.setItem('accessToken', authState.accessToken);
                    return await validateSession(); // Retry validation
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
            }
        }
    }
    
    return false;
}

// Page Navigation (maintaining compatibility with your existing system)
function navigateToPage(role) {
    const pages = {
        login: document.getElementById("LoginPage"),
        home: document.getElementById("HomePage"),
        disguise: document.getElementById("DisguisePage")
    };

    // Hide all pages
    Object.values(pages).forEach(page => {
        if (page) page.style.display = "none";
    });

    // Show appropriate page
    switch (role) {
        case 'home':
            if (pages.home) {
                pages.home.style.display = "block";
                document.body.style.backgroundColor = "black";
                sessionStorage.setItem("HomeLoginTime", new Date().getTime());
                sessionStorage.removeItem("DisguiseLoginTime");
            }
            break;
        case 'disguise':
            if (pages.disguise) {
                pages.disguise.style.display = "block";
                document.body.style.backgroundColor = "black";
                sessionStorage.setItem("DisguiseLoginTime", new Date().getTime());
                sessionStorage.removeItem("HomeLoginTime");
            }
            break;
        default:
            if (pages.login) {
                pages.login.style.display = "block";
                document.body.style.backgroundColor = "white";
            }
    }
}

// Main Authentication Functions
async function performSecureLogin() {
    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value;

    if (!username || !password) {
        showCustomMessage("PLEASE ENSURE ALL FIELDS ARE COMPLETE");
        return;
    }

    if (isAccountLocked()) {
        const remaining = Math.ceil((authState.lockoutUntil - Date.now()) / 60000);
        showCustomMessage(`ACCOUNT LOCKED TRY AGAIN IN ${remaining} MINUTES`);
        return;
    }

    // Show loading state
    const signinBtn = document.getElementById("signinBtn");
    if (signinBtn) {
        signinBtn.disabled = true;
        signinBtn.textContent = "SIGNING IN...";
    }

    try {
        const response = await SecureAuthAPI.login(username, password);
        
        if (response.success) {
            // Successful login
            authState.currentUser = response.data.user;
            authState.loginAttempts = 0;
            authState.lockoutUntil = 0;
            
            saveTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken
            });

            clearInputFields();
            changeText(true);
            
            // Navigate based on role
            navigateToPage(authState.currentUser.role);
        }
    } catch (error) {
        console.error('Login error:', error);
        authState.loginAttempts++;
        
        let errorMessage = (error.message || 'LOGIN UNSUCCESSFUL').toUpperCase();
        
        if (authState.loginAttempts >= SECURE_AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
            lockAccount();
        } else {
            const remaining = SECURE_AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - authState.loginAttempts;
            errorMessage += `. ${remaining} ATTEMPTS REMAINING`;
            showCustomMessage(errorMessage);
        }
        
        changeText(false);
    } finally {
        // Reset button state
        if (signinBtn) {
            signinBtn.disabled = false;
            signinBtn.textContent = "SIGN IN";
        }
    }
}

async function performSecureLogout() {
    try {
        if (authState.accessToken) {
            await SecureAuthAPI.logout();
        }
    } catch (error) {
        console.error('LOGOUT ERROR:', error);
    } finally {
        clearTokens();
        clearInputFields();
        navigateToPage('login');
        showCustomMessage("LOGGED OUT SUCCESSFULLY", true);
    }
}

// Session Check (maintains compatibility with your existing checkLoginStatus function)
async function checkLoginStatus() {
    loadTokens();
    
    if (!authState.accessToken) {
        navigateToPage('login');
        return;
    }

    const isValid = await validateSession();
    if (isValid && authState.currentUser) {
        navigateToPage(authState.currentUser.role);
    } else {
        clearTokens();
        navigateToPage('login');
    }
}

// Backend connection test
async function testBackendConnection() {
    console.log('Testing backend connection to:', SECURE_AUTH_CONFIG.API_BASE_URL);
    const isConnected = await SecureAuthAPI.testConnection();
    
    if (!isConnected) {
        showCustomMessage('WARNING: BACKEND CONNECTION FAILED. PLEASE CHECK SERVER STATUS.');
        return false;
    }
    
    console.log('Backend connection successful');
    return true;
}

// Event Listeners Setup
function setupSecureAuth() {
    // Login button
    const signinBtn = document.getElementById("signinBtn");
    if (signinBtn) {
        signinBtn.addEventListener("click", function(e) {
            e.preventDefault();
            performSecureLogin();
        });
    }

    // Title logout buttons (maintaining your existing functionality)
    const title = document.getElementById("title");
    if (title) {
        title.addEventListener("click", function() {
            performSecureLogout();
        });
    }

    const title2 = document.getElementById("title2");
    if (title2) {
        title2.addEventListener("click", function() {
            performSecureLogout();
        });
    }

    // Enter key support
    const usernameField = document.getElementById("username");
    const passwordField = document.getElementById("password");
    
    if (usernameField) {
        usernameField.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                if (passwordField) {
                    passwordField.focus();
                } else {
                    performSecureLogin();
                }
            }
        });
    }
    
    if (passwordField) {
        passwordField.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                performSecureLogin();
            }
        });
    }

    // Auto token refresh (every 45 minutes)
    setInterval(async () => {
        if (authState.accessToken && authState.refreshToken) {
            try {
                const response = await SecureAuthAPI.refreshToken();
                if (response.success) {
                    authState.accessToken = response.data.accessToken;
                    sessionStorage.setItem('accessToken', authState.accessToken);
                }
            } catch (error) {
                console.error('Auto refresh failed:', error);
                // Token expired, redirect to login
                clearTokens();
                navigateToPage('login');
                showCustomMessage('SESSION EXPIRED PLEASE LOG IN AGAIN');
            }
        }
    }, 45 * 60 * 1000);

    // Network status monitoring
    window.addEventListener('online', () => {
        console.log('Connection restored');
        showCustomMessage('CONNECTION RESTORED');
        testBackendConnection(); // Retest backend when online
    });

    window.addEventListener('offline', () => {
        showCustomMessage('NETWORK CONNECTION LOST');
    });

    // Security: Periodic session validation (every 5 minutes)
    setInterval(async () => {
        if (authState.accessToken) {
            const isValid = await validateSession();
            if (!isValid) {
                clearTokens();
                navigateToPage('login');
                showCustomMessage('SESSION EXPIRED PLEASE LOG IN AGAIN');
            }
        }
    }, 5 * 60 * 1000);
}

// Initialization function
async function initializeSecureAuth() {
    console.log('INITIALIZING SECURE CONNECTION TO RENDER BACKEND');
    
    // Test backend connection first
    await testBackendConnection();
    
    // Load existing tokens
    loadTokens();
    
    // Setup event listeners
    setupSecureAuth();
    
    // Check authentication status
    await checkLoginStatus();
    
    console.log('Secure authentication initialized with Render backend');
}

// Legacy function compatibility - maintaining your existing function names
function refreshPage() {
    location.reload();
}

// Maintain compatibility with your existing AudioLogin.js structure
// These functions can be called by your other scripts if needed

// Export functions for backward compatibility
window.changeText = changeText;
window.clearInputFields = clearInputFields;
window.checkLoginStatus = checkLoginStatus;
window.refreshPage = refreshPage;

// New secure functions available globally
window.performSecureLogin = performSecureLogin;
window.performSecureLogout = performSecureLogout;
window.initializeSecureAuth = initializeSecureAuth;
window.testBackendConnection = testBackendConnection;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all elements are ready
    setTimeout(() => {
        initializeSecureAuth();
    }, 100);
});

// Security enhancements
(function() {
    // Disable right-click context menu (optional security measure)
    document.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable common developer shortcuts (optional security measure)
    document.addEventListener("keydown", function(e) {
        if (e.key === "F12" || 
            (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
            (e.ctrlKey && e.key === "u")) {
            e.preventDefault();
            return false;
        }
    });
    
    // Clear sensitive data on page unload (optional)
    window.addEventListener('beforeunload', () => {
        // Optionally clear tokens on page close for extra security
        // clearTokens();
    });
})();

// Render-specific optimizations
(function() {
    // Handle Render's cold start delays
    const originalRequest = SecureAuthAPI.request;
    SecureAuthAPI.request = async function(endpoint, options = {}) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await originalRequest.call(this, endpoint, options);
            } catch (error) {
                lastError = error;
                
                // If it's a network timeout and we have retries left, wait and retry
                if (error.message.includes('CANNOT CONNECT TO SERVER') && attempt < maxRetries) {
                    console.log(`Backend connection attempt ${attempt} failed, retrying in ${attempt * 2} seconds...`);
                    showCustomMessage(`CONNECTING TO SERVER... ATTEMPT ${attempt}/${maxRetries}`);
                    
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                    continue;
                }
                
                throw error;
            }
        }
        
        throw lastError;
    };
})();

// Debugging helper (remove in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.authState = authState;
    window.SECURE_AUTH_CONFIG = SECURE_AUTH_CONFIG;
    console.log('Secure Auth Debug Mode Enabled');
    
    // Debug helper functions
    window.debugAuth = {
        getAuthState: () => authState,
        clearAuth: () => {
            clearTokens();
            navigateToPage('login');
        },
        testConnection: () => testBackendConnection(),
        getBackendUrl: () => SECURE_AUTH_CONFIG.API_BASE_URL
    };
}