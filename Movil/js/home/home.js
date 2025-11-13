// Home Page JavaScript

let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initializeHome();
    setupEventListeners();
    loadUserData();
    loadNextBus();
    loadStats();
});

// Check if user is authenticated
function checkAuthentication() {
    currentUser = JSON.parse(localStorage.getItem('nextstop_current_user'));

    if (!currentUser) {
        // No hay sesión activa, redirigir al login
        window.location.href = './index.html';
        return;
    }

    console.log('Usuario autenticado:', currentUser);
}

// Initialize home page
function initializeHome() {
    console.log('NextStop Home - Initialized');

    // Add entrance animations to cards
    const cards = document.querySelectorAll('.quick-card, .stat-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${0.1 * index}s`;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Profile avatar click
    const profileAvatar = document.getElementById('profileAvatar');
    const profileModal = document.getElementById('profileModal');
    const profileModalOverlay = document.getElementById('profileModalOverlay');
    const profileModalClose = document.getElementById('profileModalClose');

    profileAvatar.addEventListener('click', () => {
        openProfileModal();
    });

    profileModalOverlay.addEventListener('click', () => {
        closeProfileModal();
    });

    profileModalClose.addEventListener('click', () => {
        closeProfileModal();
    });

    // Quick access cards
    const quickCards = document.querySelectorAll('.quick-card');
    quickCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAccess(action);
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', handleLogout);

    // Go to settings button
    const goToSettingsBtn = document.getElementById('goToSettingsBtn');
    goToSettingsBtn.addEventListener('click', () => {
        window.location.href = './ajustes.html';
    });

    // Next bus card click
    const nextBusCard = document.getElementById('nextBusCard');
    nextBusCard.addEventListener('click', () => {
        window.location.href = './buses.html';
    });

    // Stat cards click
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            handleStatCardClick(index);
        });
    });
}

// Load user data from current session
function loadUserData() {
    if (!currentUser) return;

    // Update UI with user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;

    // Load profile image if exists
    if (currentUser.profileImage) {
        const img = document.getElementById('profileImage');
        const imgLarge = document.getElementById('profileImageLarge');
        const icon = document.getElementById('profileIcon');
        const iconLarge = document.getElementById('profileIconLarge');

        if (img && icon) {
            img.src = currentUser.profileImage;
            img.style.display = 'block';
            icon.style.display = 'none';
        }

        if (imgLarge && iconLarge) {
            imgLarge.src = currentUser.profileImage;
            imgLarge.style.display = 'block';
            iconLarge.style.display = 'none';
        }
    }

    // Update profile stats
    document.getElementById('profileTrips').textContent = currentUser.trips || 0;
    document.getElementById('profileFavorites').textContent = currentUser.favorites || 0;
}

// Load next bus information
function loadNextBus() {
    // This would normally come from an API
    // For now, we'll use mock data
    const nextBuses = [
        {
            origin: 'Castillo',
            destination: 'Managua',
            time: '5:00 am',
            station: 'Cotran Sur',
            departureMinutes: 90,
            status: 'on-time'
        },
        {
            origin: 'Mendoza',
            destination: 'Managua',
            time: '8:00 am',
            station: 'Cotran Sur',
            departureMinutes: 270,
            status: 'on-time'
        },
        {
            origin: 'Blandon',
            destination: 'Matagalpa',
            time: '10:30 am',
            station: 'Cotran Norte',
            departureMinutes: 420,
            status: 'on-time'
        }
    ];

    // Get current time and find the next bus
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // For demo purposes, we'll just use the first bus
    const nextBus = nextBuses[0];

    // Update UI
    document.getElementById('busOrigin').textContent = nextBus.origin;
    document.getElementById('busDestination').textContent = nextBus.destination;
    document.getElementById('busTime').textContent = nextBus.time;
    document.getElementById('busStation').textContent = nextBus.station;

    // Calculate time until departure
    updateBusDepartureTime(nextBus.departureMinutes);
}

// Update bus departure time
function updateBusDepartureTime(minutesUntil) {
    const busStatus = document.getElementById('busStatus');
    const statusSpan = busStatus.querySelector('span');

    if (minutesUntil < 60) {
        statusSpan.textContent = `Sale en ${minutesUntil} minutos`;
    } else {
        const hours = Math.floor(minutesUntil / 60);
        const minutes = minutesUntil % 60;
        statusSpan.textContent = `Sale en ${hours}h ${minutes}m`;
    }
}

// Load statistics
function loadStats() {
    // This would normally come from an API
    // For now, we'll use mock data
    const stats = {
        activeBuses: 12,
        availableRoutes: 8,
        nextDepartures: 5
    };

    // Update UI with animation
    animateStatValue('statBuses', 0, stats.activeBuses, 1000);
    animateStatValue('statRoutes', 0, stats.availableRoutes, 1000);
    animateStatValue('statDepartures', 0, stats.nextDepartures, 1000);
}

// Animate stat value counting up
function animateStatValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Handle quick access card clicks
function handleQuickAccess(action) {
    console.log('Quick access:', action);

    // Add click animation
    const card = document.querySelector(`[data-action="${action}"]`);
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);

    // Navigate based on action
    switch(action) {
        case 'buses':
            setTimeout(() => {
                window.location.href = './buses.html';
            }, 200);
            break;
        case 'viajar':
            setTimeout(() => {
                window.location.href = './viajar.html';
            }, 200);
            break;
        case 'mapa':
            setTimeout(() => {
                window.location.href = './mapa.html';
            }, 200);
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Handle stat card clicks
function handleStatCardClick(index) {
    console.log('Stat card clicked:', index);

    // Navigate based on index
    switch(index) {
        case 0: // Active buses
            window.location.href = './buses.html';
            break;
        case 1: // Available routes
            window.location.href = './mapa.html';
            break;
        case 2: // Next departures
            window.location.href = './buses.html';
            break;
    }
}

// Profile modal functions
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle logout
function handleLogout() {
    // Show confirmation
    const confirmed = confirm('¿Estás seguro que deseas cerrar sesión?');

    if (confirmed) {
        // Clear user session
        localStorage.removeItem('nextstop_current_user');

        // Redirect to login
        window.location.href = './index.html';
    }
}

// Refresh next bus info every minute
setInterval(() => {
    loadNextBus();
}, 60000);

// Update time display every second for more dynamic feel
setInterval(() => {
    const now = new Date();
    // You could update a clock display here if needed
}, 1000);

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle visibility change (when user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when user returns to the tab
        loadNextBus();
        loadStats();
    }
});

// Simulate real-time bus status updates
function simulateRealTimeUpdates() {
    // Add a subtle animation to the status indicator
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        setInterval(() => {
            statusIndicator.style.animation = 'none';
            setTimeout(() => {
                statusIndicator.style.animation = 'blink 2s ease-in-out infinite';
            }, 10);
        }, 5000);
    }
}

// Initialize real-time updates
simulateRealTimeUpdates();

// Add touch feedback for mobile
if ('ontouchstart' in window) {
    const touchElements = document.querySelectorAll('.quick-card, .stat-card, .next-bus-card, .profile-avatar');

    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
        });

        element.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });

        element.addEventListener('touchcancel', function() {
            this.style.opacity = '1';
        });
    });
}

// Export functions for use in other modules if needed
window.homeModule = {
    loadUserData,
    loadNextBus,
    loadStats,
    openProfileModal,
    closeProfileModal
};
