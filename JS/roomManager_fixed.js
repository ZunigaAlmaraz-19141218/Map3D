// roomManager.js - Room Management and Visualization with Authentication
'use strict';

class RoomManager {
  constructor() {
    this.roomLayers2D = new Map();
    this.roomLayers3D = new Map();
    this.selectedRoom = null;
    this.reportDB = null;
    this.reports = new Map();
    this.viewAllReportsPermission = false;
    this.initializeDB();
  }

  // Initialize IndexedDB for reports
  async initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CampusReportsDB', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.reportDB = request.result;
        this.loadReports();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create reports store if it doesn't exist
        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
          reportsStore.createIndex('roomId', 'roomId', { unique: false });
          reportsStore.createIndex('objectId', 'objectId', { unique: false });
          reportsStore.createIndex('status', 'status', { unique: false });
          reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
          reportsStore.createIndex('userId', 'userId', { unique: false });
        }
        
        // Create room_visits store for analytics
        if (!db.objectStoreNames.contains('room_visits')) {
          const visitsStore = db.createObjectStore('room_visits', { keyPath: 'id', autoIncrement: true });
          visitsStore.createIndex('roomId', 'roomId', { unique: false });
          visitsStore.createIndex('timestamp', 'timestamp', { unique: false });
          visitsStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  // Set permission for viewing all reports
  setViewAllReportsPermission(canView) {
    this.viewAllReportsPermission = canView;
  }

  // Check if user can create reports
  canCreateReports() {
    return window.userAuth ? window.userAuth.canCreateReports() : false;
  }

  // Check if user can view all reports
  canViewAllReports() {
    return this.viewAllReportsPermission;
  }

  // Load existing reports from IndexedDB
  async loadReports() {
    if (!this.reportDB) return;
    
    const transaction = this.reportDB.transaction(['reports'], 'readonly');
    const store = transaction.objectStore('reports');
    const request = store.getAll();
    
    request.onsuccess = () => {
      this.reports.clear();
      request.result.forEach(report => {
        this.reports.set(report.id, report);
      });
      this.updateRoomColors();
    };
  }

  // Initialize rooms on 2D map
  initializeRooms2D(map) {
    this.map2D = map;
    this.addRoomsToMap2D();
  }

  // Initialize rooms on 3D map
  initializeRooms3D(map) {
    this.map3D = map;
    
    // Wait for map to be fully loaded
    if (map.isStyleLoaded()) {
      this.addRoomsToMap3D();
    } else {
      map.on('styledata', () => {
        if (map.isStyleLoaded()) {
          this.addRoomsToMap3D();
        }
      });
    }
  }

  // Add rooms to 2D map
  addRoomsToMap2D() {
    Object.entries(campusRooms).forEach(([roomId, room]) => {
      const polygon = L.polygon(room.coordinates, {
        color: this.getRoomColor(roomId),
        fillColor: this.getRoomColor(roomId),
        fillOpacity: 0.3,
        weight: 2
      });

      polygon.bindPopup(this.createRoomPopup(room));
      polygon.on('click', () => this.showRoomModal(roomId));
      
      this.roomLayers2D.set(roomId, polygon);
      polygon.addTo(this.map2D);
    });
  }

  // Add rooms to 3D map
  addRoomsToMap3D() {
    // Add room data source
    this.map3D.addSource('rooms', {
      type: 'geojson',
      data: this.generateRoomGeoJSON()
    });

    // Add room center points for labels
    this.map3D.addSource('room-centers', {
      type: 'geojson',
      data: this.generateRoomCentersGeoJSON()
    });

    this.addRoomsLayers3D();
    this.setupRoomClick3D();
  }

  // Generate GeoJSON for rooms
  generateRoomGeoJSON() {
    const features = Object.entries(campusRooms).map(([roomId, room]) => ({
      type: 'Feature',
      properties: {
        id: roomId,
        name: room.name,
        type: room.type,
        color: this.getRoomColor(roomId),
        hasReports: this.getRoomReports(roomId).length > 0
      },
      geometry: {
        type: 'Polygon',
        coordinates: [room.coordinates.map(coord => [coord[1], coord[0]])]
      }
    }));

    return { type: 'FeatureCollection', features };
  }

  // Generate GeoJSON for room centers
  generateRoomCentersGeoJSON() {
    const features = Object.entries(campusRooms).map(([roomId, room]) => {
      const center = RoomUtils.calculateRoomCenter(room.coordinates);
      return {
        type: 'Feature',
        properties: {
          id: roomId,
          name: room.name,
          icon: roomCategories[room.type]?.icon || '🏢'
        },
        geometry: {
          type: 'Point',
          coordinates: [center[1], center[0]]
        }
      };
    });

    return { type: 'FeatureCollection', features };
  }

  // Add room layers to 3D map
  addRoomsLayers3D() {
    // Room polygons
    this.map3D.addLayer({
      id: 'room-polygons',
      type: 'fill',
      source: 'rooms',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'case',
          ['get', 'hasReports'],
          0.7,
          0.3
        ]
      }
    });

    // Room borders
    this.map3D.addLayer({
      id: 'room-borders',
      type: 'line',
      source: 'rooms',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'case',
          ['get', 'hasReports'],
          3,
          2
        ]
      }
    });

    // Room labels
    this.map3D.addLayer({
      id: 'room-labels',
      type: 'symbol',
      source: 'room-centers',
      layout: {
        'text-field': ['get', 'icon'],
        'text-size': 16,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1
      }
    });
  }

  // Setup click handler for 3D rooms
  setupRoomClick3D() {
    this.map3D.on('click', 'room-polygons', (e) => {
      const roomId = e.features[0].properties.id;
      this.showRoomModal(roomId);
    });

    this.map3D.on('click', 'room-labels', (e) => {
      const roomId = e.features[0].properties.id;
      this.showRoomModal(roomId);
    });

    // Change cursor on hover
    this.map3D.on('mouseenter', 'room-polygons', () => {
      this.map3D.getCanvas().style.cursor = 'pointer';
    });

    this.map3D.on('mouseleave', 'room-polygons', () => {
      this.map3D.getCanvas().style.cursor = '';
    });
  }

  // Create room popup content
  createRoomPopup(room) {
    const statusCounts = RoomUtils.getObjectStatusCounts(room.id);
    const totalObjects = Object.keys(room.inventory).length;
    const reports = this.getRoomReports(room.id);
    
    return `
      <div class="room-popup">
        <h3>${room.name}</h3>
        <p><strong>Building:</strong> ${room.building.replace(/_/g, ' ')}</p>
        <p><strong>Type:</strong> ${room.type.replace(/_/g, ' ')}</p>
        <p><strong>Capacity:</strong> ${room.capacity} people</p>
        <p><strong>Objects:</strong> ${totalObjects}</p>
        ${reports.length > 0 ? `<p><strong>Active Reports:</strong> ${reports.length}</p>` : ''}
        <button onclick="roomManager.showRoomModal('${room.id}')" class="btn-view-room">
          View Details
        </button>
      </div>
    `;
  }

  // Show room details modal
  showRoomModal(roomId) {
    const room = RoomUtils.getRoom(roomId);
    if (!room) return;

    this.selectedRoom = roomId;
    const modal = document.getElementById('roomModal') || this.createRoomModal();
    const content = document.getElementById('roomModalContent');
    
    content.innerHTML = this.generateRoomModalContent(room);
    modal.classList.add('active');
    
    // Setup event listeners
    this.setupRoomModalEvents();
  }

  // Show report modal
  showReportModal(roomId, objectId = null) {
    // Check if user has permission to create reports
    if (!this.canCreateReports()) {
      this.showNotification('Please log in to create reports', 'warning');
      if (window.userAuth) {
        window.userAuth.showLoginModal();
      }
      return;
    }

    const room = RoomUtils.getRoom(roomId);
    if (!room) return;

    const modal = document.getElementById('reportModal') || this.createReportModal();
    const content = document.getElementById('reportModalContent');
    
    content.innerHTML = this.generateReportModalContent(room, objectId);
    modal.classList.add('active');
    
    // Setup event listeners
    this.setupReportModalEvents(roomId, objectId);
  }

  // Create report
  async createReport(reportData) {
    if (!this.canCreateReports()) {
      this.showNotification('Permission denied: Cannot create reports', 'error');
      return false;
    }

    const currentUser = window.userAuth ? window.userAuth.getCurrentUser() : null;
    
    const report = {
      ...reportData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: 'open',
      userId: currentUser ? currentUser.id : 'anonymous',
      userName: currentUser ? currentUser.name : 'Anonymous User'
    };

    // Save to IndexedDB
    const transaction = this.reportDB.transaction(['reports'], 'readwrite');
    const store = transaction.objectStore('reports');
    
    try {
      await new Promise((resolve, reject) => {
        const request = store.add(report);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.reports.set(report.id, report);
      this.updateRoomColors();
      this.showNotification('Report created successfully!', 'success');
      
      // Close modal
      document.getElementById('reportModal').classList.remove('active');
      
      return true;
    } catch (error) {
      console.error('Error saving report:', error);
      this.showNotification('Error creating report', 'error');
      return false;
    }
  }

  // Get room reports (filtered by user permissions)
  getRoomReports(roomId) {
    const allReports = Array.from(this.reports.values()).filter(report => report.roomId === roomId);
    
    if (this.canViewAllReports()) {
      return allReports;
    } else {
      // Users can only see their own reports
      const currentUser = window.userAuth ? window.userAuth.getCurrentUser() : null;
      if (currentUser) {
        return allReports.filter(report => report.userId === currentUser.id);
      } else {
        return [];
      }
    }
  }

  // Get room color based on status
  getRoomColor(roomId) {
    const reports = this.getRoomReports(roomId);
    const openReports = reports.filter(r => r.status === 'open');
    
    if (openReports.length > 0) return '#dc3545'; // Red for issues
    if (reports.length > 0) return '#ffc107'; // Yellow for resolved issues
    return '#28a745'; // Green for no issues
  }

  // Update room colors
  updateRoomColors() {
    // Update 2D map colors
    this.roomLayers2D.forEach((layer, roomId) => {
      const color = this.getRoomColor(roomId);
      layer.setStyle({
        color: color,
        fillColor: color
      });
    });

    // Update 3D map colors
    if (this.map3D && this.map3D.getSource('rooms')) {
      this.map3D.getSource('rooms').setData(this.generateRoomGeoJSON());
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    notification.className = `notification notification-${type} show`;
    notification.textContent = message;

    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  // Create room modal
  createRoomModal() {
    const modal = document.createElement('div');
    modal.id = 'roomModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content room-modal" id="roomModalContent">
        <!-- Content will be generated dynamically -->
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    return modal;
  }

  // Generate room modal content
  generateRoomModalContent(room) {
    const reports = this.getRoomReports(room.id);
    const inventory = Object.entries(room.inventory);
    const canCreateReports = this.canCreateReports();
    
    return `
      <button class="modal-close" onclick="document.getElementById('roomModal').classList.remove('active')">×</button>
      
      <div class="room-header">
        <h2>${room.name}</h2>
        <div class="room-meta">
          <span class="room-building">${room.building.replace(/_/g, ' ')}</span>
          <span class="room-type">${roomCategories[room.type]?.icon || '🏢'} ${room.type.replace(/_/g, ' ')}</span>
          <span class="room-capacity">👥 ${room.capacity}</span>
        </div>
      </div>

      <div class="room-tabs">
        <button class="tab-btn active" data-tab="inventory">Inventory (${inventory.length})</button>
        <button class="tab-btn" data-tab="reports">Reports (${reports.length})</button>
        <button class="tab-btn" data-tab="analytics">Analytics</button>
      </div>

      <div class="tab-content">
        <div id="inventory-tab" class="tab-pane active">
          <div class="inventory-grid">
            ${inventory.map(([objId, obj]) => this.generateInventoryItem(room.id, objId, obj)).join('')}
          </div>
        </div>

        <div id="reports-tab" class="tab-pane">
          <div class="reports-section">
            ${canCreateReports ? `
              <button class="btn-new-report" onclick="roomManager.showReportModal('${room.id}')">
                + New Report
              </button>
            ` : `
              <div class="login-prompt">
                <p>Please log in to create reports</p>
                <button class="btn-login" onclick="userAuth.showLoginModal()">Login</button>
              </div>
            `}
            <div class="reports-list">
              ${reports.map(report => this.generateReportItem(report)).join('')}
            </div>
          </div>
        </div>

        <div id="analytics-tab" class="tab-pane">
          <div class="analytics-section">
            ${this.generateRoomAnalytics(room)}
          </div>
        </div>
      </div>
    `;
  }

  // Generate inventory item
  generateInventoryItem(roomId, objId, obj) {
    const canReport = this.canCreateReports();
    
    return `
      <div class="inventory-item ${obj.status}">
        <div class="item-icon">${obj.icon || '📦'}</div>
        <div class="item-details">
          <h4>${obj.name}</h4>
          <p class="item-status status-${obj.status}">${obj.status}</p>
          ${obj.description ? `<p class="item-description">${obj.description}</p>` : ''}
        </div>
        ${canReport ? `
          <button class="btn-report-item" onclick="roomManager.showReportModal('${roomId}', '${objId}')">
            Report Issue
          </button>
        ` : ''}
      </div>
    `;
  }

  // Generate report item
  generateReportItem(report) {
    const canViewAll = this.canViewAllReports();
    
    return `
      <div class="report-item status-${report.status}">
        <div class="report-header">
          <h4>${report.title}</h4>
          <span class="report-status">${report.status}</span>
        </div>
        <p class="report-description">${report.description}</p>
        <div class="report-meta">
          <span class="report-date">${new Date(report.timestamp).toLocaleDateString()}</span>
          ${canViewAll ? `<span class="report-user">by ${report.userName}</span>` : ''}
          ${report.objectId ? `<span class="report-object">Object: ${report.objectId}</span>` : ''}
        </div>
        ${report.photo ? `<img src="${report.photo}" class="report-photo" alt="Report photo">` : ''}
      </div>
    `;
  }

  // Generate room analytics
  generateRoomAnalytics(room) {
    const reports = this.getRoomReports(room.id);
    const statusCounts = RoomUtils.getObjectStatusCounts(room.id);
    
    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <h4>Object Status</h4>
          <div class="status-breakdown">
            <div class="status-item">
              <span class="status-dot operational"></span>
              Operational: ${statusCounts.operational || 0}
            </div>
            <div class="status-item">
              <span class="status-dot maintenance"></span>
              Maintenance: ${statusCounts.maintenance || 0}
            </div>
            <div class="status-item">
              <span class="status-dot damaged"></span>
              Damaged: ${statusCounts.damaged || 0}
            </div>
          </div>
        </div>
        
        <div class="analytics-card">
          <h4>Reports Overview</h4>
          <div class="reports-stats">
            <p>Total Reports: ${reports.length}</p>
            <p>Open: ${reports.filter(r => r.status === 'open').length}</p>
            <p>In Progress: ${reports.filter(r => r.status === 'in_progress').length}</p>
            <p>Resolved: ${reports.filter(r => r.status === 'resolved').length}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Setup room modal events
  setupRoomModalEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  }

  // Create report modal
  createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content report-modal" id="reportModalContent">
        <!-- Content will be generated dynamically -->
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    return modal;
  }

  // Generate report modal content
  generateReportModalContent(room, objectId) {
    const selectedObject = objectId ? room.inventory[objectId] : null;
    
    return `
      <button class="modal-close" onclick="document.getElementById('reportModal').classList.remove('active')">×</button>
      
      <div class="report-header">
        <h2>Report Issue</h2>
        <p>Room: ${room.name}</p>
        ${selectedObject ? `<p>Object: ${selectedObject.name}</p>` : ''}
      </div>

      <form id="reportForm" class="report-form">
        <div class="form-group">
          <label for="reportTitle">Title *</label>
          <input type="text" id="reportTitle" required>
        </div>

        <div class="form-group">
          <label for="reportDescription">Description *</label>
          <textarea id="reportDescription" rows="4" required></textarea>
        </div>

        ${!selectedObject ? `
          <div class="form-group">
            <label for="reportObject">Related Object (Optional)</label>
            <select id="reportObject">
              <option value="">-- Select Object --</option>
              ${Object.entries(room.inventory).map(([objId, obj]) => 
                `<option value="${objId}">${obj.name}</option>`
              ).join('')}
            </select>
          </div>
        ` : `
          <input type="hidden" id="reportObject" value="${objectId}">
        `}

        <div class="form-group">
          <label for="reportPriority">Priority</label>
          <select id="reportPriority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div class="form-group">
          <label for="reportPhoto">Photo (Optional)</label>
          <input type="file" id="reportPhoto" accept="image/*">
          <div id="photoPreview"></div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="document.getElementById('reportModal').classList.remove('active')">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            Submit Report
          </button>
        </div>
      </form>
    `;
  }

  // Setup report modal events
  setupReportModalEvents(roomId, objectId) {
    const form = document.getElementById('reportForm');
    const photoInput = document.getElementById('reportPhoto');
    const photoPreview = document.getElementById('photoPreview');

    // Photo preview
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
        };
        reader.readAsDataURL(file);
      } else {
        photoPreview.innerHTML = '';
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        roomId: roomId,
        objectId: document.getElementById('reportObject').value || null,
        title: document.getElementById('reportTitle').value,
        description: document.getElementById('reportDescription').value,
        priority: document.getElementById('reportPriority').value,
        photo: photoPreview.querySelector('img')?.src || null
      };

      await this.createReport(formData);
    });
  }
}

// Initialize room manager
window.roomManager = new RoomManager();
