// adminPanel.js - Admin/Manager Panel for Report Management
'use strict';

class AdminPanel {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.currentFilters = {};
    this.sortBy = 'timestamp';
    this.sortOrder = 'desc';
  }

  // Initialize admin panel
  init() {
    this.createAdminPanel();
    this.setupEventListeners();
  }

  // Create admin panel HTML
  createAdminPanel() {
    const panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.className = 'admin-panel';
    panel.innerHTML = `
      <div class="admin-header">
        <h2>📊 Campus Management Dashboard</h2>
        <button class="btn-toggle-admin" onclick="adminPanel.togglePanel()">
          <span class="toggle-icon">▼</span>
        </button>
      </div>
      
      <div class="admin-content">
        <div class="admin-tabs">
          <button class="admin-tab-btn active" data-tab="dashboard">Dashboard</button>
          <button class="admin-tab-btn" data-tab="reports">Reports</button>
          <button class="admin-tab-btn" data-tab="analytics">Analytics</button>
          <button class="admin-tab-btn" data-tab="users">Users</button>
          <button class="admin-tab-btn" data-tab="export">Export</button>
        </div>

        <div class="admin-tab-content">
          <!-- Dashboard Tab -->
          <div id="dashboard-admin-tab" class="admin-tab-pane active">
            <div class="dashboard-overview">
              <h3>System Overview</h3>
              <div class="overview-stats">
                <div class="stat-card">
                  <h4>Total Reports</h4>
                  <span class="stat-number" id="totalReports">0</span>
                </div>
                <div class="stat-card">
                  <h4>Active Users</h4>
                  <span class="stat-number" id="totalUsers">0</span>
                </div>
                <div class="stat-card">
                  <h4>Rooms Monitored</h4>
                  <span class="stat-number" id="totalRooms">0</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reports Tab -->
          <div id="reports-admin-tab" class="admin-tab-pane">
            <div class="admin-filters">
              <div class="filter-group">
                <label>Status:</label>
                <select id="filterStatus">
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label>Room:</label>
                <select id="filterRoom">
                  <option value="">All Rooms</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label>Object Type:</label>
                <select id="filterObjectType">
                  <option value="">All Types</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label>Sort by:</label>
                <select id="sortBy">
                  <option value="timestamp">Date</option>
                  <option value="status">Status</option>
                  <option value="roomId">Room</option>
                </select>
              </div>
              
              <button class="btn-apply-filters" onclick="adminPanel.applyFilters()">Apply Filters</button>
              <button class="btn-clear-filters" onclick="adminPanel.clearFilters()">Clear</button>
            </div>
            
            <div class="reports-summary">
              <div class="summary-card">
                <h4>Total Reports</h4>
                <span class="summary-number" id="totalReports">0</span>
              </div>
              <div class="summary-card">
                <h4>Open</h4>
                <span class="summary-number open" id="openReports">0</span>
              </div>
              <div class="summary-card">
                <h4>In Progress</h4>
                <span class="summary-number in-progress" id="inProgressReports">0</span>
              </div>
              <div class="summary-card">
                <h4>Resolved</h4>
                <span class="summary-number resolved" id="resolvedReports">0</span>
              </div>
            </div>
            
            <div class="reports-table-container">
              <table class="reports-table" id="reportsTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Room</th>
                    <th>Object</th>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="reportsTableBody">
                  <!-- Reports will be populated here -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Rooms Tab -->
          <div id="rooms-admin-tab" class="admin-tab-pane">
            <div class="rooms-overview">
              <h3>Room Status Overview</h3>
              <div class="rooms-grid" id="roomsGrid">
                <!-- Room cards will be populated here -->
              </div>
            </div>
          </div>

          <!-- Users Tab -->
          <div id="users-admin-tab" class="admin-tab-pane">
            <div class="users-management">
              <div class="users-header">
                <h3>👥 User Management</h3>
                <button class="btn-add-user" onclick="adminPanel.showCreateUserModal()">+ Add User</button>
              </div>
              <div class="users-table-container">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="usersTableBody">
                    <!-- Users will be populated here -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Analytics Tab -->
          <div id="analytics-admin-tab" class="admin-tab-pane">
            <div class="analytics-content">
              <h3>📈 Campus Analytics Dashboard</h3>
              <div class="analytics-charts">
                <div class="chart-container">
                  <h4>Reports by Status</h4>
                  <canvas id="statusChart"></canvas>
                </div>
                <div class="chart-container">
                  <h4>Reports by Room</h4>
                  <canvas id="roomChart"></canvas>
                </div>
                <div class="chart-container">
                  <h4>Reports Over Time</h4>
                  <canvas id="timeChart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Export Tab -->
          <div id="export-admin-tab" class="admin-tab-pane">
            <div class="export-section">
              <h3>Data Export</h3>
              <div class="export-options">
                <button class="btn-export" onclick="adminPanel.exportReports('csv')">
                  📄 Export Reports as CSV
                </button>
                <button class="btn-export" onclick="adminPanel.exportReports('json')">
                  📋 Export Reports as JSON
                </button>
                <button class="btn-export" onclick="adminPanel.exportRoomData()">
                  🏢 Export Room Data
                </button>
                <button class="btn-export" onclick="adminPanel.exportAnalytics()">
                  📊 Export Analytics
                </button>
              </div>
              
              <div class="privacy-notice">
                <h4>🔒 Privacy & Data Protection</h4>
                <p>All data is stored locally on your device. No personal information is transmitted to external servers. 
                   Exported data should be handled according to your organization's privacy policies.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(panel);
    
    // Position the panel
    this.positionPanel();
  }

  // Position admin panel
  positionPanel() {
    const panel = document.getElementById('adminPanel');
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '400px';
    panel.style.maxHeight = '80vh';
    panel.style.zIndex = '2500';
    panel.style.backgroundColor = '#fff';
    panel.style.border = '2px solid #0055A4';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    panel.style.overflow = 'hidden';
    
    // Add admin mode indicator
    this.showAdminModeIndicator();
  }

  // Show admin mode indicator
  showAdminModeIndicator() {
    // Remove existing indicator if present
    const existing = document.getElementById('adminModeIndicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'adminModeIndicator';
    indicator.className = 'admin-mode-indicator';
    indicator.innerHTML = `
      👨‍💼 Admin Mode
      <button class="btn-exit-admin" onclick="adminPanel.exitAdminMode()">Exit</button>
    `;
    document.body.appendChild(indicator);
  }

  // Exit admin mode
  exitAdminMode() {
    const panel = document.getElementById('adminPanel');
    const indicator = document.getElementById('adminModeIndicator');
    
    if (panel) panel.style.display = 'none';
    if (indicator) indicator.remove();
    
    this.roomManager.showNotification('Exited admin mode - back to normal view', 'info');
  }

  // Setup event listeners
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Filter changes
    ['filterStatus', 'filterRoom', 'filterObjectType', 'sortBy'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => this.applyFilters());
      }
    });

    // Populate filter options
    this.populateFilterOptions();
    
    // Initial load
    this.refreshReports();
    this.refreshRooms();
  }

  // Toggle panel visibility
  togglePanel() {
    const panel = document.getElementById('adminPanel');
    const content = panel.querySelector('.admin-content');
    const icon = panel.querySelector('.toggle-icon');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▼';
    } else {
      content.style.display = 'none';
      icon.textContent = '▶';
    }
  }

  // Update dashboard button visibility based on user permissions
  updateDashboardButtonVisibility(userRole) {
    const actionBar = document.getElementById('actionBar');
    const dashboardBtn = document.getElementById('dashboardBtn');
    
    if (!actionBar || !dashboardBtn) return;
    
    // Show dashboard button only for admin and professor roles
    if (userRole === 'admin' || userRole === 'professor') {
      actionBar.classList.remove('hidden');
      dashboardBtn.classList.remove('hidden');
    } else {
      actionBar.classList.add('hidden');
      dashboardBtn.classList.add('hidden');
    }
  }

  // Switch between tabs
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-admin-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
    }

    // Load tab-specific content
    this.loadTabContent(tabName);
  }

  // Load content for specific tab
  loadTabContent(tabName) {
    switch (tabName) {
      case 'dashboard':
        this.refreshDashboard();
        break;
      case 'reports':
        this.refreshReports();
        break;
      case 'analytics':
        this.refreshAnalytics();
        break;
      case 'users':
        this.refreshUsers();
        break;
      case 'export':
        // Export tab doesn't need refresh - it's static buttons
        break;
    }
  }

  // Refresh dashboard content
  refreshDashboard() {
    const reports = Array.from(this.roomManager.reports.values());
    const users = window.userAuth ? window.userAuth.demoUsers : [];
    const rooms = Object.keys(campusRooms).length;

    document.getElementById('totalReports').textContent = reports.length;
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalRooms').textContent = rooms;
  }

  // Refresh users tab
  refreshUsers() {
    if (!window.userAuth || !window.userAuth.hasPermission('canManageUsers')) {
      document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="6">Access denied</td></tr>';
      return;
    }

    const users = window.userAuth.demoUsers;
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td><span class="role-badge role-${user.role}">${this.formatRole(user.role)}</span></td>
        <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
        <td>
          <button class="btn-edit-user" onclick="adminPanel.editUser('${user.id}')">Edit</button>
          ${user.id !== window.userAuth.getCurrentUser()?.id ? 
            `<button class="btn-delete-user" onclick="adminPanel.deleteUser('${user.id}')">Delete</button>` : 
            '<span class="current-user">Current User</span>'
          }
        </td>
      </tr>
    `).join('');
  }

  // Format role name
  formatRole(role) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Show create user modal
  showCreateUserModal() {
    if (!window.userAuth || !window.userAuth.canManageUsers()) {
      this.roomManager.showNotification('Access denied', 'error');
      return;
    }

    const modal = this.createUserModal();
    modal.style.display = 'block';
  }

  // Create user modal
  createUserModal() {
    let modal = document.getElementById('userModal');
    if (modal) {
      modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h2>Create New User</h2>
          <span class="auth-close" onclick="document.getElementById('userModal').style.display='none'">&times;</span>
        </div>
        <div class="auth-modal-body">
          <form id="createUserForm">
            <div class="auth-form-group">
              <label for="newUserName">Full Name *</label>
              <input type="text" id="newUserName" required>
            </div>
            <div class="auth-form-group">
              <label for="newUserUsername">Username *</label>
              <input type="text" id="newUserUsername" required>
            </div>
            <div class="auth-form-group">
              <label for="newUserEmail">Email *</label>
              <input type="email" id="newUserEmail" required>
            </div>
            <div class="auth-form-group">
              <label for="newUserRole">Role *</label>
              <select id="newUserRole" required>
                <option value="student">Student</option>
                <option value="professor">Professor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="auth-form-group">
              <label for="newUserPassword">Password *</label>
              <input type="password" id="newUserPassword" required>
            </div>
            <div class="auth-form-actions">
              <button type="button" class="auth-btn auth-btn-secondary" onclick="document.getElementById('userModal').style.display='none'">Cancel</button>
              <button type="submit" class="auth-btn auth-btn-primary">Create User</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('createUserForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createUser();
    });

    return modal;
  }

  // Create user
  createUser() {
    const userData = {
      name: document.getElementById('newUserName').value,
      username: document.getElementById('newUserUsername').value,
      email: document.getElementById('newUserEmail').value,
      role: document.getElementById('newUserRole').value,
      password: document.getElementById('newUserPassword').value
    };

    if (window.userAuth.createUser(userData)) {
      document.getElementById('userModal').style.display = 'none';
      this.refreshUsers();
    }
  }

  // Edit user
  editUser(userId) {
    if (!window.userAuth || !window.userAuth.canManageUsers()) {
      this.roomManager.showNotification('Access denied', 'error');
      return;
    }

    const users = window.userAuth.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Create edit modal (similar to create modal but with pre-filled values)
    const modal = this.createEditUserModal(user);
    modal.style.display = 'block';
  }

  // Create edit user modal
  createEditUserModal(user) {
    let modal = document.getElementById('editUserModal');
    if (modal) {
      modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'editUserModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h2>Edit User</h2>
          <span class="auth-close" onclick="document.getElementById('editUserModal').style.display='none'">&times;</span>
        </div>
        <div class="auth-modal-body">
          <form id="editUserForm">
            <input type="hidden" id="editUserId" value="${user.id}">
            <div class="auth-form-group">
              <label for="editUserName">Full Name *</label>
              <input type="text" id="editUserName" value="${user.name}" required>
            </div>
            <div class="auth-form-group">
              <label for="editUserUsername">Username *</label>
              <input type="text" id="editUserUsername" value="${user.username}" required>
            </div>
            <div class="auth-form-group">
              <label for="editUserEmail">Email *</label>
              <input type="email" id="editUserEmail" value="${user.email}" required>
            </div>
            <div class="auth-form-group">
              <label for="editUserRole">Role *</label>
              <select id="editUserRole" required>
                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                <option value="professor" ${user.role === 'professor' ? 'selected' : ''}>Professor</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div class="auth-form-group">
              <label for="editUserPassword">New Password (leave blank to keep current)</label>
              <input type="password" id="editUserPassword">
            </div>
            <div class="auth-form-actions">
              <button type="button" class="auth-btn auth-btn-secondary" onclick="document.getElementById('editUserModal').style.display='none'">Cancel</button>
              <button type="submit" class="auth-btn auth-btn-primary">Update User</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('editUserForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateUser();
    });

    return modal;
  }

  // Update user
  updateUser() {
    const userId = document.getElementById('editUserId').value;
    const updates = {
      name: document.getElementById('editUserName').value,
      username: document.getElementById('editUserUsername').value,
      email: document.getElementById('editUserEmail').value,
      role: document.getElementById('editUserRole').value
    };

    const newPassword = document.getElementById('editUserPassword').value;
    if (newPassword) {
      updates.password = newPassword;
    }

    if (window.userAuth.updateUser(userId, updates)) {
      document.getElementById('editUserModal').style.display = 'none';
      this.refreshUsers();
    }
  }

  // Delete user
  deleteUser(userId) {
    if (!window.userAuth || !window.userAuth.canManageUsers()) {
      this.roomManager.showNotification('Access denied', 'error');
      return;
    }

    const users = window.userAuth.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      if (window.userAuth.deleteUser(userId)) {
        this.refreshUsers();
      }
    }
  }

  // Populate filter dropdown options
  populateFilterOptions() {
    // Populate room filter
    const roomFilter = document.getElementById('filterRoom');
    if (roomFilter) {
      Object.values(campusRooms).forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomFilter.appendChild(option);
      });
    }

    // Populate object type filter
    const typeFilter = document.getElementById('filterObjectType');
    const uniqueTypes = [...new Set(
      Object.values(campusRooms)
        .flatMap(room => Object.values(room.inventory))
        .map(obj => obj.type)
    )];
    
    uniqueTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type.replace(/_/g, ' ');
      typeFilter.appendChild(option);
    });
  }

  // Apply filters to reports
  applyFilters() {
    this.currentFilters = {
      status: document.getElementById('filterStatus').value,
      roomId: document.getElementById('filterRoom').value,
      objectType: document.getElementById('filterObjectType').value
    };
    
    this.sortBy = document.getElementById('sortBy').value;
    this.refreshReports();
  }

  // Clear all filters
  clearFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterRoom').value = '';
    document.getElementById('filterObjectType').value = '';
    document.getElementById('sortBy').value = 'timestamp';
    
    this.currentFilters = {};
    this.sortBy = 'timestamp';
    this.refreshReports();
  }

  // Refresh reports display
  refreshReports() {
    const reports = this.roomManager.filterReports(this.currentFilters);
    
    // Update summary
    this.updateReportsSummary(reports);
    
    // Update table
    this.updateReportsTable(reports);
  }

  // Update reports summary cards
  updateReportsSummary(reports) {
    const total = reports.length;
    const open = reports.filter(r => r.status === 'open').length;
    const inProgress = reports.filter(r => r.status === 'in_progress').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;

    document.getElementById('totalReports').textContent = total;
    document.getElementById('openReports').textContent = open;
    document.getElementById('inProgressReports').textContent = inProgress;
    document.getElementById('resolvedReports').textContent = resolved;
  }

  // Update reports table
  updateReportsTable(reports) {
    const tbody = document.getElementById('reportsTableBody');
    
    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-reports">No reports found</td></tr>';
      return;
    }

    tbody.innerHTML = reports.map(report => {
      const room = RoomUtils.getRoom(report.roomId);
      const status = reportStatuses[report.status];
      const date = new Date(report.timestamp).toLocaleDateString();
      const time = new Date(report.timestamp).toLocaleTimeString();

      return `
        <tr class="report-row" data-report-id="${report.id}">
          <td class="report-date">
            <div>${date}</div>
            <small>${time}</small>
          </td>
          <td class="report-room">${room?.name || 'Unknown'}</td>
          <td class="report-object">${report.objectId.replace(/_/g, ' ')}</td>
          <td class="report-issue">
            <div class="issue-title">${report.title}</div>
            <small class="issue-desc">${report.description.substring(0, 50)}...</small>
          </td>
          <td class="report-status">
            <span class="status-badge" style="background-color: ${status.color}">
              ${status.label}
            </span>
          </td>
          <td class="report-actions">
            <div class="action-buttons">
              ${this.generateQuickActions(report)}
              <button class="btn-view-report" onclick="adminPanel.viewReport(${report.id})" title="View Details">👁️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Generate quick action buttons for reports
  generateQuickActions(report) {
    const currentStatus = reportStatuses[report.status];
    const nextStatuses = currentStatus.next || [];
    
    return nextStatuses.slice(0, 2).map(status => {
      const statusDef = reportStatuses[status];
      const icon = status === 'resolved' ? '✅' : status === 'in_progress' ? '🔄' : '📝';
      
      return `<button class="btn-quick-action" 
                onclick="adminPanel.quickStatusChange(${report.id}, '${status}')" 
                title="Mark as ${statusDef.label}"
                style="color: ${statusDef.color}">
                ${icon}
              </button>`;
    }).join('');
  }

  // Quick status change
  async quickStatusChange(reportId, newStatus) {
    await this.roomManager.changeReportStatus(reportId, newStatus);
    this.refreshReports();
  }

  // View report details
  viewReport(reportId) {
    const report = this.roomManager.reports.get(reportId);
    if (!report) return;

    const room = RoomUtils.getRoom(report.roomId);
    const obj = room?.inventory[report.objectId];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content report-details-modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        
        <div class="report-details">
          <h2>Report Details</h2>
          
          <div class="report-info-grid">
            <div class="info-section">
              <h3>Location & Object</h3>
              <p><strong>Room:</strong> ${room?.name || 'Unknown'}</p>
              <p><strong>Building:</strong> ${room?.building.replace(/_/g, ' ') || 'Unknown'}</p>
              <p><strong>Object:</strong> ${report.objectId.replace(/_/g, ' ')}</p>
              <p><strong>Object Type:</strong> ${obj?.type.replace(/_/g, ' ') || 'Unknown'}</p>
            </div>
            
            <div class="info-section">
              <h3>Issue Details</h3>
              <p><strong>Title:</strong> ${report.title}</p>
              <p><strong>Description:</strong></p>
              <div class="description-box">${report.description}</div>
              <p><strong>Status:</strong> 
                <span class="status-badge" style="background-color: ${reportStatuses[report.status].color}">
                  ${reportStatuses[report.status].label}
                </span>
              </p>
            </div>
            
            <div class="info-section">
              <h3>Timeline</h3>
              <p><strong>Reported:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
              ${report.lastUpdated ? `<p><strong>Last Updated:</strong> ${new Date(report.lastUpdated).toLocaleString()}</p>` : ''}
            </div>
          </div>
          
          ${report.photo ? `
            <div class="report-photo-section">
              <h3>Photo</h3>
              <img src="${report.photo}" class="report-photo-large" alt="Issue photo">
            </div>
          ` : ''}
          
          <div class="report-actions-section">
            <h3>Actions</h3>
            <div class="status-change-buttons">
              ${this.generateDetailedStatusButtons(report)}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Generate detailed status buttons for report modal
  generateDetailedStatusButtons(report) {
    const currentStatus = reportStatuses[report.status];
    const nextStatuses = currentStatus.next || [];
    
    return nextStatuses.map(status => {
      const statusDef = reportStatuses[status];
      return `<button class="btn-status-detailed" 
                onclick="adminPanel.quickStatusChange(${report.id}, '${status}'); this.closest('.modal-overlay').remove();" 
                style="background-color: ${statusDef.color}">
                Mark as ${statusDef.label}
              </button>`;
    }).join('');
  }

  // Refresh rooms overview
  refreshRooms() {
    const roomsGrid = document.getElementById('roomsGrid');
    
    const roomCards = Object.values(campusRooms).map(room => {
      const reports = this.roomManager.getRoomReports(room.id);
      const statusCounts = RoomUtils.getObjectStatusCounts(room.id);
      const totalObjects = Object.keys(room.inventory).length;
      const issueCount = totalObjects - (statusCounts.operational || 0);
      
      return `
        <div class="room-card" onclick="roomManager.showRoomModal('${room.id}')">
          <div class="room-card-header">
            <span class="room-icon">${roomCategories[room.type]?.icon || '🏢'}</span>
            <h4>${room.name}</h4>
          </div>
          <div class="room-card-stats">
            <div class="stat">
              <span class="stat-label">Objects:</span>
              <span class="stat-value">${totalObjects}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Issues:</span>
              <span class="stat-value ${issueCount > 0 ? 'has-issues' : ''}">${issueCount}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Reports:</span>
              <span class="stat-value ${reports.length > 0 ? 'has-reports' : ''}">${reports.length}</span>
            </div>
          </div>
          <div class="room-card-status">
            ${issueCount === 0 ? '✅ All Good' : `⚠️ ${issueCount} Issues`}
          </div>
        </div>
      `;
    }).join('');
    
    roomsGrid.innerHTML = roomCards;
  }

  // Refresh analytics
  refreshAnalytics() {
    const analyticsContainer = document.querySelector('#analytics-admin-tab .analytics-dashboard');
    if (!analyticsContainer) return;

    const reports = this.roomManager.getAllReports();
    const rooms = Object.values(campusRooms);
    
    // Generate comprehensive analytics
    const analytics = this.generateAnalyticsData(reports, rooms);
    
    analyticsContainer.innerHTML = `
      <h3>📊 Campus Analytics Dashboard</h3>
      
      <div class="analytics-overview">
        <div class="analytics-cards">
          <div class="analytics-card">
            <h4>📈 Overall Statistics</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-number">${rooms.length}</span>
                <span class="stat-label">Total Rooms</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${analytics.totalObjects}</span>
                <span class="stat-label">Total Objects</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${reports.length}</span>
                <span class="stat-label">Total Reports</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${analytics.roomsWithIssues}</span>
                <span class="stat-label">Rooms with Issues</span>
              </div>
            </div>
          </div>
          
          <div class="analytics-card">
            <h4>🔧 Report Status Distribution</h4>
            <div class="chart-container">
              ${this.createStatusChart(analytics.statusCounts)}
            </div>
          </div>
          
          <div class="analytics-card">
            <h4>🏢 Issues by Room Type</h4>
            <div class="chart-container">
              ${this.createRoomTypeChart(analytics.issuesByRoomType)}
            </div>
          </div>
        </div>
        
        <div class="analytics-cards">
          <div class="analytics-card">
            <h4>⚠️ Most Problematic Rooms</h4>
            <div class="top-rooms-list">
              ${analytics.topProblematicRooms.map(room => `
                <div class="room-issue-item">
                  <span class="room-name">${room.name}</span>
                  <span class="issue-count">${room.issueCount} issues</span>
                  <div class="issue-bar">
                    <div class="issue-fill" style="width: ${(room.issueCount / analytics.maxIssues) * 100}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="analytics-card">
            <h4>📅 Reports Timeline</h4>
            <div class="timeline-chart">
              ${this.createTimelineChart(analytics.reportsTimeline)}
            </div>
          </div>
          
          <div class="analytics-card">
            <h4>🔍 Object Status Overview</h4>
            <div class="object-status-grid">
              ${Object.entries(analytics.objectStatusCounts).map(([status, count]) => {
                const statusDef = statusDefinitions[status] || { color: '#666', label: status };
                return `
                  <div class="status-item">
                    <div class="status-indicator" style="background-color: ${statusDef.color}"></div>
                    <span class="status-name">${statusDef.label}</span>
                    <span class="status-count">${count}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Generate analytics data
  generateAnalyticsData(reports, rooms) {
    const analytics = {
      totalObjects: 0,
      roomsWithIssues: 0,
      statusCounts: { open: 0, in_progress: 0, resolved: 0 },
      issuesByRoomType: {},
      objectStatusCounts: {},
      topProblematicRooms: [],
      reportsTimeline: {},
      maxIssues: 0
    };

    // Count total objects and object statuses
    rooms.forEach(room => {
      const inventory = Object.values(room.inventory);
      analytics.totalObjects += inventory.length;
      
      let roomIssueCount = 0;
      inventory.forEach(obj => {
        analytics.objectStatusCounts[obj.status] = (analytics.objectStatusCounts[obj.status] || 0) + 1;
        if (obj.status !== 'operational') roomIssueCount++;
      });
      
      if (roomIssueCount > 0) {
        analytics.roomsWithIssues++;
        analytics.topProblematicRooms.push({
          name: room.name,
          issueCount: roomIssueCount,
          type: room.type
        });
      }
      
      // Count issues by room type
      if (roomIssueCount > 0) {
        analytics.issuesByRoomType[room.type] = (analytics.issuesByRoomType[room.type] || 0) + roomIssueCount;
      }
    });

    // Sort problematic rooms
    analytics.topProblematicRooms.sort((a, b) => b.issueCount - a.issueCount);
    analytics.topProblematicRooms = analytics.topProblematicRooms.slice(0, 5);
    analytics.maxIssues = analytics.topProblematicRooms[0]?.issueCount || 1;

    // Count report statuses
    reports.forEach(report => {
      analytics.statusCounts[report.status]++;
      
      // Timeline data (by day)
      const date = new Date(report.timestamp).toDateString();
      analytics.reportsTimeline[date] = (analytics.reportsTimeline[date] || 0) + 1;
    });

    return analytics;
  }

  // Create status chart
  createStatusChart(statusCounts) {
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return '<p class="no-data">No reports yet</p>';

    return `
      <div class="pie-chart">
        ${Object.entries(statusCounts).map(([status, count]) => {
          const percentage = (count / total) * 100;
          const statusDef = reportStatuses[status];
          return `
            <div class="pie-segment">
              <div class="pie-label">
                <span class="pie-color" style="background-color: ${statusDef.color}"></span>
                <span>${statusDef.label}: ${count} (${percentage.toFixed(1)}%)</span>
              </div>
              <div class="pie-bar">
                <div class="pie-fill" style="width: ${percentage}%; background-color: ${statusDef.color}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Create room type chart
  createRoomTypeChart(issuesByRoomType) {
    const maxIssues = Math.max(...Object.values(issuesByRoomType));
    if (maxIssues === 0) return '<p class="no-data">No issues by room type</p>';

    return `
      <div class="bar-chart">
        ${Object.entries(issuesByRoomType).map(([type, count]) => {
          const percentage = (count / maxIssues) * 100;
          const category = roomCategories[type] || { color: '#666', icon: '🏢' };
          return `
            <div class="bar-item">
              <div class="bar-label">
                <span>${category.icon} ${type.replace(/_/g, ' ')}</span>
                <span class="bar-count">${count}</span>
              </div>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${percentage}%; background-color: ${category.color}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Create timeline chart
  createTimelineChart(timeline) {
    const entries = Object.entries(timeline).slice(-7); // Last 7 days
    if (entries.length === 0) return '<p class="no-data">No recent reports</p>';

    const maxCount = Math.max(...entries.map(([, count]) => count));
    
    return `
      <div class="timeline-bars">
        ${entries.map(([date, count]) => {
          const percentage = (count / maxCount) * 100;
          const shortDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `
            <div class="timeline-item">
              <div class="timeline-bar">
                <div class="timeline-fill" style="height: ${percentage}%"></div>
              </div>
              <div class="timeline-label">${shortDate}</div>
              <div class="timeline-count">${count}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Export reports as CSV
  exportReports(format = 'csv') {
    const reports = this.roomManager.getAllReports();
    
    if (format === 'csv') {
      const csvContent = this.generateCSV(reports);
      this.downloadFile(csvContent, 'campus-reports.csv', 'text/csv');
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(reports, null, 2);
      this.downloadFile(jsonContent, 'campus-reports.json', 'application/json');
    }
  }

  // Generate CSV content
  generateCSV(reports) {
    const headers = ['Date', 'Time', 'Room', 'Building', 'Object', 'Object Type', 'Issue Title', 'Description', 'Status'];
    const rows = reports.map(report => {
      const room = RoomUtils.getRoom(report.roomId);
      const obj = room?.inventory[report.objectId];
      const date = new Date(report.timestamp);
      
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        room?.name || 'Unknown',
        room?.building.replace(/_/g, ' ') || 'Unknown',
        report.objectId.replace(/_/g, ' '),
        obj?.type.replace(/_/g, ' ') || 'Unknown',
        report.title,
        report.description.replace(/"/g, '""'), // Escape quotes
        reportStatuses[report.status].label
      ].map(field => `"${field}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  // Export room data
  exportRoomData() {
    const roomData = Object.values(campusRooms).map(room => ({
      id: room.id,
      name: room.name,
      building: room.building,
      type: room.type,
      capacity: room.capacity,
      totalObjects: Object.keys(room.inventory).length,
      objectsByStatus: RoomUtils.getObjectStatusCounts(room.id),
      activeReports: this.roomManager.getRoomReports(room.id).length
    }));
    
    const jsonContent = JSON.stringify(roomData, null, 2);
    this.downloadFile(jsonContent, 'campus-rooms.json', 'application/json');
  }

  // Export analytics data
  exportAnalytics() {
    const analytics = {
      summary: {
        totalRooms: Object.keys(campusRooms).length,
        totalReports: this.roomManager.getAllReports().length,
        reportsByStatus: {
          open: this.roomManager.getAllReports().filter(r => r.status === 'open').length,
          in_progress: this.roomManager.getAllReports().filter(r => r.status === 'in_progress').length,
          resolved: this.roomManager.getAllReports().filter(r => r.status === 'resolved').length
        }
      },
      roomAnalytics: Object.values(campusRooms).map(room => ({
        roomId: room.id,
        name: room.name,
        type: room.type,
        reports: this.roomManager.getRoomReports(room.id).length,
        objectStatus: RoomUtils.getObjectStatusCounts(room.id)
      })),
      exportDate: new Date().toISOString()
    };
    
    const jsonContent = JSON.stringify(analytics, null, 2);
    this.downloadFile(jsonContent, 'campus-analytics.json', 'application/json');
  }

  // Download file helper
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    this.roomManager.showNotification(`${filename} downloaded successfully!`, 'success');
  }
}

// Global instance
let adminPanel = null;

// Initialize admin panel when room manager is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for room manager to be initialized
  const checkRoomManager = () => {
    if (window.roomManager && roomManager.reportDB) {
      adminPanel = new AdminPanel(roomManager);
      adminPanel.init();
      console.log('Admin panel initialized successfully');
    } else {
      setTimeout(checkRoomManager, 200);
    }
  };
  
  // Start checking after a delay to ensure all scripts are loaded
  setTimeout(checkRoomManager, 1000);
});
