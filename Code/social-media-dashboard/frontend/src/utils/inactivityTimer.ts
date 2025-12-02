// frontend/src/utils/inactivityTimer.ts
// Auto-logout after 5 minutes of inactivity

import { useRouter } from 'vue-router';

const timeoutInMS = 5 * 60 * 1000; // 5 minutes -> 5 * 60s * 1000ms
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let router: ReturnType<typeof useRouter> | null = null;

/**
 * Handle inactivity: logout user and redirect to auth page
 */
function handleInactive() {
    console.warn('[Inactivity Timer] User inactive for 5 minutes. Logging out...');
    
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // Clear any user data if stored
    localStorage.removeItem('user');
    
    // Redirect to login
    if (router) {
        router.push('/auth').catch(err => {
            console.error('[Inactivity Timer] Navigation error:', err);
        });
    }
    
    // Show optional alert
    alert('Your session has expired due to inactivity. Please log in again.');
}

/**
 * Start the inactivity timeout
 */
function startTimer() {
    // setTimeout returns an ID that can be used to clear/cancel the timer
    timeoutId = setTimeout(handleInactive, timeoutInMS);
    console.log('[Inactivity Timer] Timer started: 5 minutes');
}

/**
 * Reset the inactivity timer (called on user activity)
 */
function resetTimer() {
    if (timeoutId !== null) {
        clearTimeout(timeoutId);
        console.log('[Inactivity Timer] Timer reset (user activity detected)');
    }
    startTimer();
}

/**
 * Setup event listeners for user activity
 */
function setupTimers(vueRouter?: ReturnType<typeof useRouter>) {
    // Store router reference if provided (for logout redirect)
    if (vueRouter) {
        router = vueRouter;
    }
    
    // Check if user is logged in before setting up timers
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('[Inactivity Timer] No token found, skipping timer setup');
        return;
    }
    
    // Add event listeners for user activity
    document.addEventListener('keypress', resetTimer, false);
    document.addEventListener('mousemove', resetTimer, false);
    document.addEventListener('mousedown', resetTimer, false);
    document.addEventListener('touchmove', resetTimer, false);
    
    // Start the initial timer
    startTimer();
}

/**
 * Cleanup: remove event listeners and clear timeout
 */
function clearTimers() {
    if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    
    document.removeEventListener('keypress', resetTimer);
    document.removeEventListener('mousemove', resetTimer);
    document.removeEventListener('mousedown', resetTimer);
    document.removeEventListener('touchmove', resetTimer);
    
    console.log('[Inactivity Timer] Timer cleared');
}

export { setupTimers, clearTimers, resetTimer };
