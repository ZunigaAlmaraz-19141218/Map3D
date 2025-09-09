// layoutManager.js - Responsive Layout Management for Role-Based Panels
'use strict';

class LayoutManager {
  constructor() {
    this.currentRole = 'general_public';
    this.activePanel = 'events';
    this.panelsContainer = null;
    this.panelTabs = null;
    this.toggleBtn = null;
    this.isInitialized = false;
    this.panelsVisible = false;
    
    // Role-based panel configurations
    this.roleConfigs = {
      general_public: {
        panels: ['events'],
        defaultPanel: 'events',
        className: 'role-general-public'
      },
      student: {
        panels: ['events', 'reports'],
        defaultPanel: 'events',
        className: 'role-student'
      },
      professor: {
        panels: ['events', 'reports', 'analytics'],
        defaultPanel: 'reports',
        className: 'role-professor'
      },
      admin: {
        panels: ['events', 'reports', 'analytics'],
        defaultPanel: 'reports',
        className: 'role-admin'
      }
    };

    // Panel definitions
    this.panelDefinitions = {
      events: {
        title: '📅 Campus Events',
        icon: '📅',
        description: 'Upcoming campus events and announcements'
      },
      reports: {
        title: '📝 Reports',
        icon: '📝',
        description: 'Campus issue reports and maintenance'
      },
      analytics: {
        title: '📊 Analytics',
        icon: '📊',
        description: 'Campus statistics and insights'
      }
    };

    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.panelsContainer = document.getElementById('rolePanelsContainer');
    this.panelTabs = document.getElementById('panelTabs');
    this.toggleBtn = document.getElementById('panelToggleBtn');
    
    if (!this.panelsContainer || !this.panelTabs || !this.toggleBtn) {
      console.warn('Layout Manager: Required DOM elements not found');
      return;
    }

    this.setupEventListeners();
    this.setupResizeObserver();
    this.isInitialized = true;
    
    console.log('Layout Manager initialized');
  }

  // Update layout based on user role
  updateForRole(role) {
    if (!this.isInitialized) {
      setTimeout(() => this.updateForRole(role), 100);
      return;
    }

    this.currentRole = role || 'general_public';
    const config = this.roleConfigs[this.currentRole];
    
    if (!config) {
      console.warn(`Layout Manager: Unknown role ${this.currentRole}`);
      return;
    }

    // Update body class for role-specific styling
    document.body.className = document.body.className
      .replace(/role-\w+/g, '') + ' ' + config.className;

    // Generate tabs for the role
    this.generateTabs(config.panels);
    
    // Show/hide panels based on role
    this.updatePanelVisibility(config.panels);
    
    // Set default active panel
    this.setActivePanel(config.defaultPanel);
    
    // Show toggle button
    this.showToggleButton();
    
    // Update panel content
    this.updatePanelContent();
    
    console.log(`Layout updated for role: ${this.currentRole}`);
  }

  // Generate navigation tabs based on available panels
  generateTabs(availablePanels) {
    if (!this.panelTabs) return;

    this.panelTabs.innerHTML = availablePanels.map(panelId => {
      const panel = this.panelDefinitions[panelId];
      return `
        <div class="panel-tab" data-panel="${panelId}" onclick="layoutManager.setActivePanel('${panelId}')">
          <span class="panel-icon">${panel.icon}</span>
          <span class="panel-title">${panel.title}</span>
        </div>
      `;
    }).join('');
  }

  // Update panel visibility based on role
  updatePanelVisibility(availablePanels) {
    const allPanels = ['events', 'reports', 'analytics'];
    
    allPanels.forEach(panelId => {
      const panelElement = document.getElementById(`${panelId}Panel`);
      if (panelElement) {
        if (availablePanels.includes(panelId)) {
          panelElement.style.display = 'block';
        } else {
          panelElement.style.display = 'none';
        }
      }
    });
  }

  // Set active panel and update UI
  setActivePanel(panelId) {
    if (!this.panelDefinitions[panelId]) {
      console.warn(`Layout Manager: Unknown panel ${panelId}`);
      return;
    }

    this.activePanel = panelId;

    // Update tab states
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.panel === panelId);
    });

    // Update panel states
    document.querySelectorAll('.panel-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${panelId}Panel`);
    });

    // Update panel content based on current panel
    this.updateCurrentPanelContent(panelId);
  }

  // Toggle panels visibility
  togglePanels() {
    if (!this.isInitialized) return;
    
    this.panelsVisible = !this.panelsVisible;
    
    if (this.panelsVisible) {
      this.showPanelsContainer();
    } else {
      this.hidePanelsContainer();
    }
    
    // Update toggle button state
    this.updateToggleButton();
  }

  // Show panels container with animation
  showPanelsContainer() {
    if (!this.panelsContainer) return;
    
    this.panelsContainer.classList.remove('hidden');
    this.panelsVisible = true;
    
    // Add class to map container for desktop layout adjustment
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer && window.innerWidth >= 1024) {
      mapContainer.classList.add('panels-visible');
    }
    
    // Update panel content
    this.updatePanelContent();
  }

  // Hide panels container
  hidePanelsContainer() {
    if (!this.panelsContainer) return;
    
    this.panelsContainer.classList.add('hidden');
    this.panelsVisible = false;
    
    // Remove class from map container
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
      mapContainer.classList.remove('panels-visible');
    }
  }

  // Show toggle button
  showToggleButton() {
    if (!this.toggleBtn) return;
    
    this.toggleBtn.classList.remove('hidden');
    this.updateToggleButton();
  }

  // Hide toggle button
  hideToggleButton() {
    if (!this.toggleBtn) return;
    
    this.toggleBtn.classList.add('hidden');
  }

  // Update toggle button appearance
  updateToggleButton() {
    if (!this.toggleBtn) return;
    
    this.toggleBtn.classList.toggle('active', this.panelsVisible);
    this.toggleBtn.textContent = this.panelsVisible ? '✕' : '📊';
    this.toggleBtn.title = this.panelsVisible ? 'Hide Panels' : 'Show Panels';
  }

  // Update panel content based on current data
  updatePanelContent() {
    this.updateEventsPanel();
    this.updateReportsPanel();
    this.updateAnalyticsPanel();
  }

  // Update current panel content specifically
  updateCurrentPanelContent(panelId) {
    switch (panelId) {
      case 'events':
        this.updateEventsPanel();
        break;
      case 'reports':
        this.updateReportsPanel();
        break;
      case 'analytics':
        this.updateAnalyticsPanel();
        break;
    }
  }

  // Update events panel content
  updateEventsPanel() {
    // Events are static in HTML for now, but could be dynamic
    console.log('Events panel updated');
  }

  // Update reports panel content
  updateReportsPanel() {
    if (!window.roomManager) return;

    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;

    const reports = window.roomManager.getAllReports();
    
    if (reports.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px;">
            <p>No reports available. Create your first report using the "Report Issue" button.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = reports.map(report => {
      const room = window.roomManager.getRoom ? window.roomManager.getRoom(report.roomId) : null;
      const date = new Date(report.timestamp).toLocaleDateString();
      const statusColors = {
        open: '#dc3545',
        in_progress: '#ffc107',
        resolved: '#28a745'
      };
      
      return `
        <tr onclick="layoutManager.showReportDetails('${report.id}')">
          <td>${date}</td>
          <td>${room?.name || 'Unknown Room'}</td>
          <td>
            <div class="issue-title">${report.title}</div>
            <small class="issue-desc">${report.description.substring(0, 50)}...</small>
          </td>
          <td>
            <span class="status-badge" style="background-color: ${statusColors[report.status] || '#666'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">
              ${report.status.replace('_', ' ').toUpperCase()}
            </span>
          </td>
          <td>
            <button class="btn-view-report" onclick="event.stopPropagation(); layoutManager.showReportDetails('${report.id}')" style="padding: 4px 8px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Update room filter options
    this.updateRoomFilter();
  }

  // Update analytics panel content
  updateAnalyticsPanel() {
    if (!window.roomManager) return;

    const reports = window.roomManager.getAllReports();
    const totalReports = reports.length;
    const openReports = reports.filter(r => r.status === 'open').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;

    // Update statistics
    const totalElement = document.getElementById('totalReportsCount');
    const openElement = document.getElementById('openReportsCount');
    const resolvedElement = document.getElementById('resolvedReportsCount');

    if (totalElement) totalElement.textContent = totalReports;
    if (openElement) openElement.textContent = openReports;
    if (resolvedElement) resolvedElement.textContent = resolvedReports;
  }

  // Update room filter dropdown
  updateRoomFilter() {
    const roomFilter = document.getElementById('reportRoomFilter');
    if (!roomFilter || !window.campusRooms) return;

    const currentValue = roomFilter.value;
    roomFilter.innerHTML = '<option value="">All Rooms</option>';
    
    Object.values(window.campusRooms).forEach(room => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = room.name;
      roomFilter.appendChild(option);
    });

    roomFilter.value = currentValue;
  }

  // Show report details modal
  showReportDetails(reportId) {
    if (!window.roomManager || !window.roomManager.reports) return;
    
    const report = window.roomManager.reports.get(parseInt(reportId));
    if (!report) return;

    // Use existing room manager modal functionality
    if (window.roomManager.showReportDetails) {
      window.roomManager.showReportDetails(report);
    }
  }

  // Update dashboard button visibility based on user permissions
  updateDashboardButtonVisibility(userRole) {
    const toggleBtn = document.getElementById('panelToggleBtn');
    
    if (!toggleBtn) return;
    
    // Show dashboard toggle button only for admin and professor roles
    if (userRole === 'admin' || userRole === 'professor') {
      toggleBtn.classList.remove('hidden');
      // Change button to dashboard icon for authorized users
      toggleBtn.textContent = '⚙️';
      toggleBtn.title = 'Toggle Dashboard';
      toggleBtn.onclick = () => {
        if (window.adminPanel) {
          adminPanel.show();
        }
      };
    } else {
      // For general public and students, show panels toggle
      toggleBtn.classList.remove('hidden');
      toggleBtn.textContent = '📊';
      toggleBtn.title = 'Toggle Panels';
      toggleBtn.onclick = () => this.togglePanels();
    }
  }

  // Adjust layout spacing to prevent overlaps
  adjustLayoutSpacing() {
    const controls = document.getElementById('controls');
    const mapContainer = document.querySelector('.map-container');
    
    if (!controls || !mapContainer) return;

    const controlsHeight = controls.offsetHeight;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - controlsHeight - 40; // 40px for margins

    // Adjust map height if needed
    const maps = document.querySelectorAll('#map2D, #map3D');
    maps.forEach(map => {
      const maxHeight = Math.min(600, availableHeight * 0.6);
      map.style.height = `${maxHeight}px`;
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Filter change handlers
    const statusFilter = document.getElementById('reportStatusFilter');
    const roomFilter = document.getElementById('reportRoomFilter');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyReportsFilter());
    }

    if (roomFilter) {
      roomFilter.addEventListener('change', () => this.applyReportsFilter());
    }

    // Window resize handler
    window.addEventListener('resize', () => {
      this.adjustLayoutSpacing();
    });
  }

  // Setup resize observer for responsive adjustments
  setupResizeObserver() {
    if (!window.ResizeObserver) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this.panelsContainer) {
          this.adjustLayoutSpacing();
        }
      }
    });

    if (this.panelsContainer) {
      observer.observe(this.panelsContainer);
    }
  }

  // Apply filters to reports table
  applyReportsFilter() {
    const statusFilter = document.getElementById('reportStatusFilter');
    const roomFilter = document.getElementById('reportRoomFilter');
    
    if (!statusFilter || !roomFilter || !window.roomManager) return;

    const statusValue = statusFilter.value;
    const roomValue = roomFilter.value;
    
    let reports = window.roomManager.getAllReports();

    // Apply filters
    if (statusValue) {
      reports = reports.filter(report => report.status === statusValue);
    }

    if (roomValue) {
      reports = reports.filter(report => report.roomId === roomValue);
    }

    // Update table with filtered results
    this.updateReportsTable(reports);
  }

  // Update reports table with specific data
  updateReportsTable(reports) {
    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;

    if (reports.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px;">
            <p>No reports match the current filters.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = reports.map(report => {
      const room = window.roomManager.getRoom ? window.roomManager.getRoom(report.roomId) : null;
      const date = new Date(report.timestamp).toLocaleDateString();
      const statusColors = {
        open: '#dc3545',
        in_progress: '#ffc107',
        resolved: '#28a745'
      };
      
      return `
        <tr onclick="layoutManager.showReportDetails('${report.id}')">
          <td>${date}</td>
          <td>${room?.name || 'Unknown Room'}</td>
          <td>
            <div class="issue-title">${report.title}</div>
            <small class="issue-desc">${report.description.substring(0, 50)}...</small>
          </td>
          <td>
            <span class="status-badge" style="background-color: ${statusColors[report.status] || '#666'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">
              ${report.status.replace('_', ' ').toUpperCase()}
            </span>
          </td>
          <td>
            <button class="btn-view-report" onclick="event.stopPropagation(); layoutManager.showReportDetails('${report.id}')" style="padding: 4px 8px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Get current role
  getCurrentRole() {
    return this.currentRole;
  }

  // Get active panel
  getActivePanel() {
    return this.activePanel;
  }

  // Refresh all panel content
  refreshAllPanels() {
    this.updatePanelContent();
  }

  // Handle authentication state changes
  onAuthStateChange(user) {
    if (user) {
      this.updateForRole(user.role);
    } else {
      this.updateForRole('general_public');
    }
  }
}

// Global instance
let layoutManager = null;

// Initialize layout manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  layoutManager = new LayoutManager();
  
  // Listen for authentication changes
  if (window.userAuth) {
    const originalUpdateUI = window.userAuth.updateUI;
    window.userAuth.updateUI = function() {
      originalUpdateUI.call(this);
      const currentUser = this.getCurrentUser();
      if (layoutManager) {
        layoutManager.onAuthStateChange(currentUser);
      }
    };
  }
  
  console.log('Layout Manager ready');
});

// Export for global access
window.layoutManager = layoutManager;
