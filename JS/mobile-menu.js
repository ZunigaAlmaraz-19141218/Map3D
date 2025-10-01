/**
 * Mobile Menu Functionality
 * Handles the mobile menu interactions, animations, and accessibility
 */

const MobileMenu = (() => {
  // Private variables
  let isOpen = false;
  
  // DOM Elements
  const elements = {
    menuList: null,
    menuOverlay: null,
    menuToggle: null,
    menuClose: null,
    body: document.body
  };
  
  /**
   * Toggle menu visibility
   * @param {boolean} [show] - Force show/hide, or toggle if not provided
   */
  const toggle = (show = null) => {
    // Determine new state
    const shouldShow = show !== null ? show : !isOpen;
    
    // Update state
    isOpen = shouldShow;
    
    // Toggle classes
    if (elements.menuList) elements.menuList.classList.toggle('visible', shouldShow);
    if (elements.menuOverlay) elements.menuOverlay.classList.toggle('visible', shouldShow);
    if (elements.body) elements.body.classList.toggle('menu-open', shouldShow);
    
    // Update aria attributes
    if (elements.menuToggle) {
      elements.menuToggle.setAttribute('aria-expanded', shouldShow);
      elements.menuToggle.setAttribute('aria-label', shouldShow ? 'Cerrar menú' : 'Abrir menú');
    }
    
    // Update menu list accessibility
    if (elements.menuList) {
      elements.menuList.setAttribute('aria-hidden', !shouldShow);
    }
    
    // Prevent body scroll when menu is open
    if (elements.body) {
      elements.body.style.overflow = shouldShow ? 'hidden' : '';
    }
    
    // Toggle focus trap when menu is open
    if (shouldShow) {
      trapFocus();
    } else {
      releaseFocus();
      // Return focus to menu toggle when closing
      if (elements.menuToggle) {
        elements.menuToggle.focus();
      }
    }
  };
  
  /**
   * Handle toggle button click
   */
  const handleToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };
  
  /**
   * Handle close button click
   */
  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(false);
  };
  
  /**
   * Handle overlay click
   */
  const handleOverlayClick = (e) => {
    if (isOpen) {
      e.preventDefault();
      toggle(false);
    }
  };
  
  /**
   * Handle escape key press
   */
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape' && isOpen) {
      toggle(false);
    }
  };
  
  /**
   * Handle window resize
   */
  const handleResize = () => {
    // Close menu on larger screens if needed
    if (window.innerWidth > 768 && isOpen) {
      toggle(false);
    }
  };
  
  /**
   * Trap focus inside the menu when it's open
   */
  const trapFocus = () => {
    if (!elements.menuList) return;
    
    const focusableElements = elements.menuList.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    
    elements.menuList.addEventListener('keydown', handleTabKey);
    
    // Store the handler for later removal
    elements.menuList._handleTabKey = handleTabKey;
    
    // Focus first focusable element
    firstFocusable.focus();
  };
  
  /**
   * Release focus trap when menu is closed
   */
  const releaseFocus = () => {
    if (elements.menuList && elements.menuList._handleTabKey) {
      elements.menuList.removeEventListener('keydown', elements.menuList._handleTabKey);
      delete elements.menuList._handleTabKey;
    }
  };
  
  /**
   * Handle clicks on menu items
   */
  const handleMenuItemClick = (e) => {
    // Close menu when clicking on a menu button or link
    if (e.target.closest('.menu-btn, a[href]')) {
      toggle(false);
    }
  };
  
  /**
   * Setup all event listeners
   */
  const setupEventListeners = () => {
    // Toggle button
    if (elements.menuToggle) {
      elements.menuToggle.removeEventListener('click', handleToggleClick);
      elements.menuToggle.addEventListener('click', handleToggleClick);
    }
    
    // Close button
    if (elements.menuClose) {
      elements.menuClose.removeEventListener('click', handleCloseClick);
      elements.menuClose.addEventListener('click', handleCloseClick);
    }
    
    // Overlay click
    if (elements.menuOverlay) {
      elements.menuOverlay.removeEventListener('click', handleOverlayClick);
      elements.menuOverlay.addEventListener('click', handleOverlayClick);
    }
    
    // Close on escape key
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Close on resize (for responsive behavior)
    window.removeEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    
    // Close menu when clicking on a menu item (optional)
    if (elements.menuList) {
      elements.menuList.removeEventListener('click', handleMenuItemClick);
      elements.menuList.addEventListener('click', handleMenuItemClick);
    }
  };
  
  /**
   * Initialize the mobile menu
   */
  const init = () => {
    console.log('Inicializando menú móvil...');
    
    // Cache DOM elements
    elements.menuList = document.querySelector('.menu-list');
    elements.menuOverlay = document.querySelector('.menu-overlay');
    elements.menuToggle = document.querySelector('.menu-toggle');
    elements.menuClose = document.querySelector('.menu-close');
    
    // Initialize menu state
    if (elements.menuList) {
      elements.menuList.style.display = 'block';
      elements.menuList.classList.remove('visible');
      elements.menuList.setAttribute('aria-hidden', 'true');
    }
    
    // Initialize toggle button
    if (elements.menuToggle) {
      elements.menuToggle.setAttribute('aria-expanded', 'false');
      elements.menuToggle.setAttribute('aria-controls', 'mobile-menu-list');
      elements.menuToggle.setAttribute('aria-haspopup', 'true');
      elements.menuToggle.setAttribute('aria-label', 'Abrir menú');
    }
    
    // Initialize close button
    if (elements.menuClose) {
      elements.menuClose.setAttribute('aria-label', 'Cerrar menú');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Menú móvil inicializado correctamente');
  };
  
  // Public API
  return {
    init,
    toggle,
    isOpen: () => isOpen
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', MobileMenu.init);
} else {
  // In case the document is already loaded
  setTimeout(MobileMenu.init, 0);
}

// Make API available globally
window.MobileMenu = MobileMenu;
