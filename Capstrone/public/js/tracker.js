/**
 * Real-Time Session & Cart Activity Tracker
 */
const sessionID = 'SESS-' + Math.random().toString(36).substring(2, 9).toUpperCase();

function trackEvent(eventType, eventData = {}) {
    const user = JSON.parse(localStorage.getItem('shoplytics_user') || '{}');
    
    fetch('/api/admin/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionID,
            customerKey: user.customerKey || null,
            eventType,
            eventData
        })
    }).catch(err => console.error('Tracker error:', err));
}

// Track page view
window.addEventListener('DOMContentLoaded', () => {
    trackEvent('page_view', { page: window.location.pathname });
});
