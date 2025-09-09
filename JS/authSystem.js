// authSystem.js - Enhanced User Authentication and Permission System
'use strict';

class UserAuthSystem {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.permissions = {
      general_public: {
        canViewMap: true,
        canCreateReports: false,
        canViewReports: false,
        canAccessAdmin: false,
        canManageUsers: false
      },
      student: {
        canViewMap: true,
        canCreateReports: true,
        canViewReports: true,
        canAccessAdmin: false,
        canManageUsers: false
      },
      professor: {
        canViewMap: true,
        canCreateReports: true,
        canViewReports: true,
        canAccessAdmin: true,
        canManageUsers: false
      },
      admin: {
        canViewMap: true,
        canCreateReports: true,
        canViewReports: true,
        canAccessAdmin: true,
        canManageUsers: true
      }
    };

    // Demo users for testing
    this.demoUsers = [
      { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator' },
      { id: 2, username: 'prof.smith', password: 'prof123', role: 'professor', name: 'Prof. Smith' },
      { id: 3, username: 'student1', password: 'student123', role: 'student', name: 'John Student' }
    ];

    this.init();
  }

  init() {
    this.loadUserState();
    this.createLoginModal();
    this.updateUI();
  }

  // Load user state from localStorage
  loadUserState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.isLoggedIn = true;
    }
  }

  // Save user state to localStorage
  saveUserState() {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  // Create login modal
  createLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content auth-modal">
        <button class="modal-close" onclick="userAuth.hideLoginModal()">×</button>
        <h2>🔑 Login to Campus System</h2>
        <form id="loginForm" onsubmit="userAuth.handleLogin(event)">
          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="modal-save">Login</button>
        </form>
        
        <div class="demo-accounts">
          <h4>Demo Accounts:</h4>
          <div class="demo-buttons">
            <button class="demo-btn" onclick="userAuth.quickLogin('admin')">Admin</button>
            <button class="demo-btn" onclick="userAuth.quickLogin('prof.smith')">Professor</button>
            <button class="demo-btn" onclick="userAuth.quickLogin('student1')">Student</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Show login modal
  showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Hide login modal
  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Handle login form submission
  handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');

    const user = this.demoUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
      this.login(user);
      this.hideLoginModal();
    } else {
      alert('Invalid username or password');
    }
  }

  // Quick login for demo accounts
  quickLogin(username) {
    const user = this.demoUsers.find(u => u.username === username);
    if (user) {
      this.login(user);
      this.hideLoginModal();
    }
  }

  // Login as guest
  loginAsGuest() {
    const guestUser = {
      id: 0,
      username: 'guest',
      role: 'general_public',
      name: 'Guest User'
    };
    this.login(guestUser);
  }

  // Login user
  login(user) {
    this.currentUser = user;
    this.isLoggedIn = true;
    this.saveUserState();
    this.updateUI();
    this.updatePermissions();
    
    console.log(`User logged in: ${user.name} (${user.role})`);
  }

  // Logout user
  logout() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.saveUserState();
    this.updateUI();
    this.updatePermissions();
    
    console.log('User logged out');
  }

  // Update UI based on authentication state
  updateUI() {
    const loginButtons = document.getElementById('loginButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRoleDisplay = document.getElementById('userRoleDisplay');

    if (!loginButtons || !userInfo) return;

    if (this.isLoggedIn && this.currentUser) {
      // Hide login buttons, show user info
      loginButtons.classList.add('hidden');
      userInfo.classList.remove('hidden');
      
      if (userName) userName.textContent = this.currentUser.name;
      if (userRoleDisplay) {
        userRoleDisplay.textContent = this.currentUser.role.replace('_', ' ');
      }
    } else {
      // Show login buttons, hide user info
      loginButtons.classList.remove('hidden');
      userInfo.classList.add('hidden');
    }
  }

  // Update permissions and UI visibility
  updatePermissions() {
    const userRole = this.currentUser ? this.currentUser.role : 'general_public';
    
    // Update layout manager
    if (window.layoutManager) {
      layoutManager.updateForRole(userRole);
    }
    
    // Update admin panel visibility
    if (window.adminPanel) {
      adminPanel.updateDashboardButtonVisibility(userRole);
    }
    
    // Update room management permissions
    this.updateRoomManagementUI(userRole);
  }

  // Update room management UI based on permissions
  updateRoomManagementUI(userRole) {
    const reportBtn = document.getElementById('btnReportIssue');
    const reportBtnMobile = document.getElementById('btnReportIssue-mobile');
    
    const canCreateReports = this.permissions[userRole]?.canCreateReports || false;
    
    if (reportBtn) {
      reportBtn.style.display = canCreateReports ? 'block' : 'none';
    }
    if (reportBtnMobile) {
      reportBtnMobile.style.display = canCreateReports ? 'block' : 'none';
    }
  }

  // Check if user has specific permission
  hasPermission(permission) {
    if (!this.currentUser) return false;
    return this.permissions[this.currentUser.role]?.[permission] || false;
  }

  // Get current user role
  getCurrentRole() {
    return this.currentUser ? this.currentUser.role : 'general_public';
  }

  // Get current user info
  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize authentication system
const userAuth = new UserAuthSystem();
