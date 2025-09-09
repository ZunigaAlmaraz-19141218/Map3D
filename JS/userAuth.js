// userAuth.js - User Authentication and Role Management System
'use strict';

class UserAuthSystem {
  constructor() {
    this.currentUser = null;
    this.users = new Map();
    this.roles = {
      GENERAL_PUBLIC: 'general_public',
      STUDENT: 'student',
      PROFESSOR: 'professor',
      ADMIN: 'admin'
    };
    
    this.permissions = {
      VIEW_MAP: 'view_map',
      VIEW_EVENTS: 'view_events',
      CREATE_REPORTS: 'create_reports',
      VIEW_ALL_REPORTS: 'view_all_reports',
      MANAGE_USERS: 'manage_users',
      ACCESS_ADMIN_PANEL: 'access_admin_panel'
    };

    this.rolePermissions = {
      [this.roles.GENERAL_PUBLIC]: [
        this.permissions.VIEW_MAP,
        this.permissions.VIEW_EVENTS
      ],
      [this.roles.STUDENT]: [
        this.permissions.VIEW_MAP,
        this.permissions.VIEW_EVENTS,
        this.permissions.CREATE_REPORTS
      ],
      [this.roles.PROFESSOR]: [
        this.permissions.VIEW_MAP,
        this.permissions.VIEW_EVENTS,
        this.permissions.CREATE_REPORTS,
        this.permissions.VIEW_ALL_REPORTS
      ],
      [this.roles.ADMIN]: [
        this.permissions.VIEW_MAP,
        this.permissions.VIEW_EVENTS,
        this.permissions.CREATE_REPORTS,
        this.permissions.VIEW_ALL_REPORTS,
        this.permissions.MANAGE_USERS,
        this.permissions.ACCESS_ADMIN_PANEL
      ]
    };

    this.init();
  }

  async init() {
    await this.loadUsersFromStorage();
    await this.loadCurrentUserFromStorage();
    this.createDefaultUsers();
    this.updateUI();
  }

  // Create default users for demo purposes
  createDefaultUsers() {
    if (this.users.size === 0) {
      const defaultUsers = [
        {
          id: 'admin001',
          username: 'admin',
          password: 'admin123', // In production, this should be hashed
          email: 'admin@campus.edu',
          role: this.roles.ADMIN,
          name: 'System Administrator'
        },
        {
          id: 'prof001',
          username: 'professor',
          password: 'prof123',
          email: 'professor@campus.edu',
          role: this.roles.PROFESSOR,
          name: 'Dr. Smith'
        },
        {
          id: 'stud001',
          username: 'student',
          password: 'stud123',
          email: 'student@campus.edu',
          role: this.roles.STUDENT,
          name: 'John Doe'
        }
      ];

      defaultUsers.forEach(user => {
        this.users.set(user.id, {
          ...user,
          createdAt: new Date().toISOString(),
          lastLogin: null
        });
      });

      this.saveUsersToStorage();
    }
  }

  // Authentication methods
  async login(username, password) {
    const user = Array.from(this.users.values()).find(u => 
      u.username === username && u.password === password
    );

    if (user) {
      user.lastLogin = new Date().toISOString();
      this.currentUser = user;
      await this.saveCurrentUserToStorage();
      await this.saveUsersToStorage();
      this.updateUI();
      this.showNotification(`Welcome back, ${user.name}!`, 'success');
      return true;
    } else {
      this.showNotification('Invalid username or password', 'error');
      return false;
    }
  }

  async logout() {
    if (this.currentUser) {
      this.showNotification(`Goodbye, ${this.currentUser.name}!`, 'info');
      this.currentUser = null;
      await this.saveCurrentUserToStorage();
      this.updateUI();
    }
  }

  // Permission checking
  hasPermission(permission) {
    if (!this.currentUser) {
      // General public permissions
      return this.rolePermissions[this.roles.GENERAL_PUBLIC].includes(permission);
    }
    
    const userPermissions = this.rolePermissions[this.currentUser.role] || [];
    return userPermissions.includes(permission);
  }

  canCreateReports() {
    return this.hasPermission(this.permissions.CREATE_REPORTS);
  }

  canViewAllReports() {
    return this.hasPermission(this.permissions.VIEW_ALL_REPORTS);
  }

  canAccessAdminPanel() {
    return this.hasPermission(this.permissions.ACCESS_ADMIN_PANEL);
  }

  canManageUsers() {
    return this.hasPermission(this.permissions.MANAGE_USERS);
  }

  // User management (Admin only)
  createUser(userData) {
    if (!this.canManageUsers()) {
      this.showNotification('Permission denied: Cannot manage users', 'error');
      return false;
    }

    const userId = 'user_' + Date.now();
    const newUser = {
      id: userId,
      username: userData.username,
      password: userData.password, // Should be hashed in production
      email: userData.email,
      role: userData.role,
      name: userData.name,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    this.users.set(userId, newUser);
    this.saveUsersToStorage();
    this.showNotification(`User ${userData.name} created successfully`, 'success');
    return true;
  }

  updateUser(userId, updates) {
    if (!this.canManageUsers()) {
      this.showNotification('Permission denied: Cannot manage users', 'error');
      return false;
    }

    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates);
      this.saveUsersToStorage();
      this.showNotification(`User ${user.name} updated successfully`, 'success');
      return true;
    }
    return false;
  }

  deleteUser(userId) {
    if (!this.canManageUsers()) {
      this.showNotification('Permission denied: Cannot manage users', 'error');
      return false;
    }

    const user = this.users.get(userId);
    if (user && user.id !== this.currentUser?.id) {
      this.users.delete(userId);
      this.saveUsersToStorage();
      this.showNotification(`User ${user.name} deleted successfully`, 'success');
      return true;
    }
    return false;
  }

  getAllUsers() {
    if (!this.canManageUsers()) {
      return [];
    }
    return Array.from(this.users.values());
  }

  // Storage methods
  async saveUsersToStorage() {
    try {
      const usersData = JSON.stringify(Array.from(this.users.entries()));
      localStorage.setItem('campus_users', usersData);
    } catch (error) {
      console.error('Error saving users to storage:', error);
    }
  }

  async loadUsersFromStorage() {
    try {
      const usersData = localStorage.getItem('campus_users');
      if (usersData) {
        const usersArray = JSON.parse(usersData);
        this.users = new Map(usersArray);
      }
    } catch (error) {
      console.error('Error loading users from storage:', error);
    }
  }

  async saveCurrentUserToStorage() {
    try {
      localStorage.setItem('campus_current_user', JSON.stringify(this.currentUser));
    } catch (error) {
      console.error('Error saving current user to storage:', error);
    }
  }

  async loadCurrentUserFromStorage() {
    try {
      const userData = localStorage.getItem('campus_current_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error loading current user from storage:', error);
    }
  }

  // UI Management
  updateUI() {
    this.updateAuthUI();
    this.updateFeatureVisibility();
    this.updateUserInfo();
  }

  updateAuthUI() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    
    if (this.currentUser) {
      if (loginSection) loginSection.style.display = 'none';
      if (userSection) userSection.style.display = 'block';
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (userSection) userSection.style.display = 'none';
    }
  }

  updateFeatureVisibility() {
    // Report creation button
    const reportBtn = document.getElementById('btnReportIssue');
    if (reportBtn) {
      reportBtn.style.display = this.canCreateReports() ? 'block' : 'none';
    }

    // Admin panel button
    const adminBtn = document.getElementById('btnAdminPanel');
    if (adminBtn) {
      adminBtn.style.display = this.canAccessAdminPanel() ? 'block' : 'none';
    }

    // View all reports functionality
    if (window.roomManager) {
      window.roomManager.setViewAllReportsPermission(this.canViewAllReports());
    }
  }

  updateUserInfo() {
    const userNameElement = document.getElementById('currentUserName');
    const userRoleElement = document.getElementById('currentUserRole');
    
    if (this.currentUser) {
      if (userNameElement) userNameElement.textContent = this.currentUser.name;
      if (userRoleElement) {
        userRoleElement.textContent = this.formatRoleName(this.currentUser.role);
      }
    }
  }

  formatRoleName(role) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Login modal management
  showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'block';
    } else {
      this.createLoginModal();
    }
  }

  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  createLoginModal() {
    const modalHTML = `
      <div id="loginModal" class="auth-modal">
        <div class="auth-modal-content">
          <div class="auth-modal-header">
            <h2>Campus Login</h2>
            <span class="auth-close" onclick="userAuth.hideLoginModal()">&times;</span>
          </div>
          <div class="auth-modal-body">
            <form id="oldLoginForm">
              <div class="auth-form-group">
                <label for="oldLoginUsername">Username:</label>
                <input type="text" id="oldLoginUsername" required>
              </div>
              <div class="auth-form-group">
                <label for="oldLoginPassword">Password:</label>
                <input type="password" id="oldLoginPassword" required>
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Login</button>
            </form>
            <button type="button" class="auth-btn auth-btn-secondary" onclick="userAuth.hideLoginModal()">Cancel</button>
            <div class="auth-demo-accounts">
              <h4>Demo Accounts:</h4>
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Professor:</strong> professor / prof123</p>
              <p><strong>Student:</strong> student / stud123</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener for form submission
    document.getElementById('oldLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('oldLoginUsername').value;
      const password = document.getElementById('oldLoginPassword').value;
      
      const success = await this.login(username, password);
      if (success) {
        this.hideLoginModal();
      }
    });

    // Show the modal
    document.getElementById('loginModal').style.display = 'block';
  }

  // Utility methods
  showNotification(message, type = 'info') {
    if (window.roomManager && typeof window.roomManager.showNotification === 'function') {
      window.roomManager.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentUserRole() {
    return this.currentUser ? this.currentUser.role : this.roles.GENERAL_PUBLIC;
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }
}

// Initialize global auth system
window.userAuth = new UserAuthSystem();
