
// Configuration
let NEWS_API_KEY = '';
const BACKEND_API_URL = window.location.origin;

// State management
let currentPage = 1;
let isLoading = false;
let allArticles = [];

// PWA variables
let deferredPrompt;

// Support variables
let supportDragOffset = { x: 0, y: 0 };
let isDragging = false;

// DOM Elements
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const newsGrid = document.getElementById('news-grid');
const loadMoreBtn = document.getElementById('load-more');
const installBtn = document.getElementById('install-btn');
const supportBtn = document.getElementById('support-btn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    registerServiceWorker();
    setupPWAInstall();
    setupSupportDragging();
    setupFileUpload();
    
    // Initialize language
    languageManager.updatePageLanguage();
    document.getElementById('language-select').value = languageManager.currentLanguage;
});

function initializeApp() {
    loadNews();
    setupEventListeners();
}

function setupEventListeners() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Mobile menu toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Update active navigation link on scroll
    window.addEventListener('scroll', updateActiveNavLink);
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('settings-modal')) {
            closeSettings();
        }
        if (e.target.classList.contains('support-modal')) {
            closeSupport();
        }
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

function scrollToNews() {
    document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
}

// Settings Functions
function openSettings() {
    document.getElementById('settings-modal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function changeLanguage(lang) {
    languageManager.setLanguage(lang);
    
    // Update news date formatting
    document.querySelectorAll('.news-date').forEach(dateElement => {
        const dateText = dateElement.querySelector('span:last-child');
        if (dateText && dateText.dataset.originalDate) {
            const date = new Date(dateText.dataset.originalDate);
            const formattedDate = formatDateForLanguage(date, lang);
            dateText.textContent = formattedDate;
        }
    });
}

function formatDateForLanguage(date, lang) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    const locales = {
        'en': 'en-US',
        'ar': 'ar-SA',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'pt': 'pt-PT'
    };
    
    return date.toLocaleDateString(locales[lang] || 'en-US', options);
}

// Support Functions
function openSupport() {
    document.getElementById('support-modal').style.display = 'block';
}

function closeSupport() {
    document.getElementById('support-modal').style.display = 'none';
    document.getElementById('support-form').reset();
    document.getElementById('file-preview').style.display = 'none';
}

function setupSupportDragging() {
    let startX, startY, initialX, initialY;
    
    supportBtn.addEventListener('mousedown', startDrag);
    supportBtn.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
        if (e.type === 'mousedown') {
            startX = e.clientX;
            startY = e.clientY;
        } else {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        
        const rect = supportBtn.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        isDragging = false;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function drag(e) {
        e.preventDefault();
        
        let currentX, currentY;
        if (e.type === 'mousemove') {
            currentX = e.clientX;
            currentY = e.clientY;
        } else {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        }
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            isDragging = true;
            supportBtn.classList.add('dragging');
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // Keep button within viewport
            const maxX = window.innerWidth - supportBtn.offsetWidth;
            const maxY = window.innerHeight - supportBtn.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            supportBtn.style.left = constrainedX + 'px';
            supportBtn.style.top = constrainedY + 'px';
            supportBtn.style.bottom = 'auto';
            supportBtn.style.right = 'auto';
        }
    }
    
    function stopDrag() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
        
        supportBtn.classList.remove('dragging');
        
        if (!isDragging) {
            openSupport();
        }
        
        isDragging = false;
    }
}

function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const fileUpload = document.querySelector('.file-upload');
    const filePreview = document.getElementById('file-preview');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    fileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUpload.classList.add('dragover');
    });
    
    fileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUpload.classList.remove('dragover');
    });
    
    fileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUpload.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });
    
    function handleFileSelect() {
        const file = fileInput.files[0];
        if (file) {
            filePreview.style.display = 'block';
            filePreview.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button type="button" onclick="removeFile()" style="margin-left: 10px; background: none; border: none; color: #dc2626; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
    }
}

function removeFile() {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').style.display = 'none';
}

async function submitSupport(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('support-name').value);
        formData.append('email', document.getElementById('support-email').value);
        formData.append('message', document.getElementById('support-message').value);
        
        const fileInput = document.getElementById('file-input');
        if (fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
        
        const response = await fetch('/api/support', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showMessage('success', languageManager.getText('messageSent'));
            closeSupport();
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending support message:', error);
        showMessage('error', languageManager.getText('messageFailed'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showMessage(type, text) {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
}

async function loadNews() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    hideError();

    try {
        // بدل BACKEND_API_URL باللينك المباشر
        const response = await fetch('https://1d37e756-569d-4666-b8be-1a70d2df4492-00-3a73yfj9n7lmr.picard.replit.dev/api/news?pageSize=10');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.articles || data.articles.length === 0) {
            throw new Error('No articles found');
        }

        // فلترة الأخبار
        const validArticles = data.articles.filter(article => 
            article.title && 
            article.title !== '[Removed]' && 
            article.description && 
            article.description !== '[Removed]' &&
            article.url
        );

        if (currentPage === 1) {
            allArticles = validArticles;
            newsGrid.innerHTML = '';
        } else {
            allArticles = [...allArticles, ...validArticles];
        }

        displayNews(validArticles);

        // ما في pagination في اللينك دا، فممكن نخلي زرار "Load More" مخفي
        hideLoadMoreButton();

    } catch (error) {
        console.error('Error loading news:', error);
        showError();
    } finally {
        hideLoading();
        isLoading = false;
    }
}


function displayNews(articles) {
    articles.forEach(article => {
        const newsCard = createNewsCard(article);
        newsGrid.appendChild(newsCard);
    });
}

function createNewsCard(article) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    // Format the published date
    const publishedDate = new Date(article.publishedAt);
    const formattedDate = formatDateForLanguage(publishedDate, languageManager.currentLanguage);
    
    // Truncate description if too long
    const description = article.description && article.description.length > 150 
        ? article.description.substring(0, 150) + '...' 
        : article.description || languageManager.getText('noDescription');
    
    // Get source name
    const sourceName = article.source?.name || languageManager.getText('unknownSource');
    
    card.innerHTML = `
        ${article.urlToImage ? 
            `<img src="${article.urlToImage}" alt="${article.title}" class="news-image" onerror="this.style.display='none'">` : 
            '<div class="news-image" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);"><i class="fas fa-newspaper" style="font-size: 3rem; color: #64748b;"></i></div>'
        }
        <div class="news-content">
            <div class="news-source">${sourceName}</div>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-description">${description}</p>
            <div class="news-meta">
                <span class="news-date">
                    <i class="fas fa-calendar-alt"></i>
                    <span data-original-date="${article.publishedAt}">${formattedDate}</span>
                </span>
                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-more">
                    <span data-translate="readMore">${languageManager.getText('readMore')}</span>
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        </div>
    `;
    
    // Add click event to open article
    card.addEventListener('click', function(e) {
        // Don't trigger if clicking on the "Read More" link
        if (!e.target.closest('.read-more')) {
            window.open(article.url, '_blank', 'noopener,noreferrer');
        }
    });
    
    return card;
}

function loadMoreNews() {
    currentPage++;
    loadNews();
}

function showLoading() {
    loadingElement.style.display = 'block';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

function showError() {
    errorElement.style.display = 'block';
}

function hideError() {
    errorElement.style.display = 'none';
}

function showLoadMoreButton() {
    loadMoreBtn.style.display = 'inline-flex';
}

function hideLoadMoreButton() {
    loadMoreBtn.style.display = 'none';
}

// Retry function for error state
function retryLoadNews() {
    currentPage = 1;
    allArticles = [];
    newsGrid.innerHTML = '';
    loadNews();
}

// PWA Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully:', registration);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// PWA Install Setup
function setupPWAInstall() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show the install button
        installBtn.style.display = 'block';
    });

    // Handle install button click
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // Clear the deferredPrompt variable
            deferredPrompt = null;
            // Hide the install button
            installBtn.style.display = 'none';
        }
    });

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', (evt) => {
        console.log('PWA was installed');
        installBtn.style.display = 'none';
    });
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const icon = toggleBtn.querySelector('i');
    
    mobileMenu.classList.toggle('active');
    
    // Change icon
    if (mobileMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const icon = toggleBtn.querySelector('i');
    
    mobileMenu.classList.remove('active');
    icon.className = 'fas fa-bars';
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mobileMenu = document.getElementById('mobile-menu');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    
    if (!mobileMenu.contains(event.target) && !toggleBtn.contains(event.target)) {
        closeMobileMenu();
    }
});

// Close mobile menu on window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

// Expose functions globally
window.loadNews = loadNews;
window.retryLoadNews = retryLoadNews;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.changeLanguage = changeLanguage;
window.openSupport = openSupport;
window.closeSupport = closeSupport;
window.submitSupport = submitSupport;
window.removeFile = removeFile;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// Handle network errors gracefully
window.addEventListener('online', function() {
    if (allArticles.length === 0) {
        loadNews();
    }
});

window.addEventListener('offline', function() {
    console.log('App is offline');
});
