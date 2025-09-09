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
        }
        
        // Create room_visits store for analytics
        if (!db.objectStoreNames.contains('room_visits')) {
          const visitsStore = db.createObjectStore('room_visits', { keyPath: 'id', autoIncrement: true });
          visitsStore.createIndex('roomId', 'roomId', { unique: false });
          visitsStore.createIndex('timestamp', 'timestamp', { unique: false });
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
      this.updateRoomVisuals();
    };
  }

  // Initialize room visualization on 2D map
  initializeRooms2D(map2D) {
    this.map2D = map2D;
    
    // Create room layer group
    this.roomLayerGroup2D = L.layerGroup().addTo(map2D);
    
    // Add rooms to map
    Object.values(campusRooms).forEach(room => {
      this.addRoom2D(room);
    });
  }

  // Add individual room to 2D map
  addRoom2D(room) {
    const color = RoomUtils.getRoomColor(room.id);
    const hasReports = this.getRoomReports(room.id).length > 0;
    
    // Create room polygon
    const polygon = L.polygon(room.polygon, {
      color: color,
      fillColor: color,
      fillOpacity: hasReports ? 0.7 : 0.3,
      weight: hasReports ? 3 : 2,
      className: `room-polygon room-${room.id}`
    });
    
    // Create room marker at center
    const marker = L.marker(room.coordinates, {
      icon: L.divIcon({
        className: 'room-marker',
        html: `<div class="room-icon" style="background-color: ${color}">
                 ${roomCategories[room.type]?.icon || '🏢'}
               </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    });
    
    // Bind popup with room info
    const popupContent = this.createRoomPopup(room);
    polygon.bindPopup(popupContent);
    marker.bindPopup(popupContent);
    
    // Add click handlers
    const clickHandler = () => this.showRoomModal(room.id);
    polygon.on('click', clickHandler);
    marker.on('click', clickHandler);
    
    // Add to layer group
    this.roomLayerGroup2D.addLayer(polygon);
    this.roomLayerGroup2D.addLayer(marker);
    
    // Store references
    this.roomLayers2D.set(room.id, { polygon, marker });
  }

  // Initialize room visualization on 3D map
  initializeRooms3D(map3D) {
    this.map3D = map3D;
    
    map3D.on('load', () => {
      this.addRoomsSource3D();
      this.addRoomsLayers3D();
      this.setupRoomClick3D();
    });
  }

  // Add rooms GeoJSON source to 3D map
  addRoomsSource3D() {
    const roomsGeoJSON = {
      type: 'FeatureCollection',
      features: Object.values(campusRooms).map(room => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [room.polygon.map(coord => [coord[1], coord[0]])]
        },
        properties: {
          id: room.id,
          name: room.name,
          type: room.type,
          building: room.building,
          hasReports: this.getRoomReports(room.id).length > 0,
          color: RoomUtils.getRoomColor(room.id)
        }
      }))
    };
    
    this.map3D.addSource('rooms', {
      type: 'geojson',
      data: roomsGeoJSON
    });

    // Add room centers for markers
    const roomCenters = {
      type: 'FeatureCollection',
      features: Object.values(campusRooms).map(room => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [room.coordinates[1], room.coordinates[0]]
        },
        properties: {
          id: room.id,
          name: room.name,
          type: room.type,
          icon: roomCategories[room.type]?.icon || '🏢'
        }
      }))
    };

    this.map3D.addSource('room-centers', {
      type: 'geojson',
      data: roomCenters
    });
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

  // Create room modal if it doesn't exist
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
            <button class="btn-new-report" onclick="roomManager.showReportModal('${room.id}')">
              + New Report
            </button>
            <div class="reports-list">
              ${reports.map(report => this.generateReportItem(report)).join('')}
            </div>
          </div>
        </div>

        <div id="analytics-tab" class="tab-pane">
          <div class="analytics-section">
            ${this.generateRoomAnalytics(room.id)}
          </div>
        </div>
      </div>
    `;
  }

  // Generate inventory item HTML
  generateInventoryItem(roomId, objectId, obj) {
    const objType = objectTypes[obj.type] || { category: 'Other', icon: '📦', priority: 'low' };
    const status = statusDefinitions[obj.status] || statusDefinitions.operational;
    const reports = this.getObjectReports(roomId, objectId);
    
    return `
      <div class="inventory-item" data-object="${objectId}">
        <div class="item-header">
          <span class="item-icon">${objType.icon}</span>
          <span class="item-name">${objectId.replace(/_/g, ' ')}</span>
          <span class="item-status" style="color: ${status.color}">${status.label}</span>
        </div>
        <div class="item-details">
          <p><strong>Type:</strong> ${obj.type.replace(/_/g, ' ')}</p>
          <p><strong>Brand:</strong> ${obj.brand}</p>
          <p><strong>Model:</strong> ${obj.model}</p>
          ${reports.length > 0 ? `<p><strong>Reports:</strong> ${reports.length}</p>` : ''}
        </div>
        <div class="item-actions">
          <button class="btn-report-issue" onclick="roomManager.showReportModal('${roomId}', '${objectId}')">
            Report Issue
          </button>
        </div>
      </div>
    `;
  }

  // Generate report item HTML
  generateReportItem(report) {
    const status = reportStatuses[report.status] || reportStatuses.open;
    const date = new Date(report.timestamp).toLocaleDateString();
    const time = new Date(report.timestamp).toLocaleTimeString();
    
    return `
      <div class="report-item" data-report="${report.id}">
        <div class="report-header">
          <span class="report-object">${report.objectId.replace(/_/g, ' ')}</span>
          <span class="report-status" style="color: ${status.color}">${status.label}</span>
        </div>
        <div class="report-content">
          <p><strong>Issue:</strong> ${report.title}</p>
          <p class="report-description">${report.description}</p>
          <p class="report-meta">Reported: ${date} ${time}</p>
          ${report.photo ? `<img src="${report.photo}" class="report-photo" alt="Issue photo">` : ''}
        </div>
        <div class="report-actions">
          ${this.generateStatusButtons(report)}
          <button class="btn-delete-report" onclick="roomManager.deleteReport(${report.id})">Delete</button>
        </div>
      </div>
    `;
  }

  // Generate status change buttons
  generateStatusButtons(report) {
    const currentStatus = reportStatuses[report.status];
    const nextStatuses = currentStatus.next || [];
    
    return nextStatuses.map(status => {
      const statusDef = reportStatuses[status];
      return `<button class="btn-status-change" onclick="roomManager.changeReportStatus(${report.id}, '${status}')" style="background-color: ${statusDef.color}">
        Mark as ${statusDef.label}
      </button>`;
    }).join('');
  }

  // Generate room analytics
  generateRoomAnalytics(roomId) {
    const room = RoomUtils.getRoom(roomId);
    const reports = this.getRoomReports(roomId);
    const statusCounts = RoomUtils.getObjectStatusCounts(roomId);
    
    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <h4>Object Status</h4>
          <div class="status-chart">
            ${Object.entries(statusCounts).map(([status, count]) => {
              const statusDef = statusDefinitions[status] || statusDefinitions.operational;
              return `<div class="status-bar">
                <span class="status-label">${statusDef.label}</span>
                <div class="status-progress">
                  <div class="status-fill" style="width: ${(count / Object.keys(room.inventory).length) * 100}%; background-color: ${statusDef.color}"></div>
                </div>
                <span class="status-count">${count}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        
        <div class="analytics-card">
          <h4>Report Summary</h4>
          <p>Total Reports: ${reports.length}</p>
          <p>Open: ${reports.filter(r => r.status === 'open').length}</p>
          <p>In Progress: ${reports.filter(r => r.status === 'in_progress').length}</p>
          <p>Resolved: ${reports.filter(r => r.status === 'resolved').length}</p>
        </div>
      </div>
    `;
  }

  // Setup room modal event listeners
  setupRoomModalEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab pane
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  }

  // Show report modal
  showReportModal(roomId, objectId = null) {
    const modal = document.getElementById('reportModal') || this.createReportModal();
    const room = RoomUtils.getRoom(roomId);
    
    // Populate room and object selectors
    this.populateReportModal(roomId, objectId);
    modal.classList.add('active');
  }

  // Create report modal
  createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content report-modal">
        <button class="modal-close" onclick="document.getElementById('reportModal').classList.remove('active')">×</button>
        
        <h2>Report Issue</h2>
        
        <form id="reportForm">
          <div class="form-group">
            <label for="reportRoom">Room:</label>
            <select id="reportRoom" required>
              <option value="">Select Room</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="reportObject">Object:</label>
            <select id="reportObject" required>
              <option value="">Select Object</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="reportTitle">Issue Title:</label>
            <input type="text" id="reportTitle" required placeholder="Brief description of the issue">
          </div>
          
          <div class="form-group">
            <label for="reportDescription">Description:</label>
            <textarea id="reportDescription" required placeholder="Detailed description of the issue"></textarea>
          </div>
          
          <div class="form-group">
            <label for="reportPhoto">Photo (optional):</label>
            <input type="file" id="reportPhoto" accept="image/*" capture="environment">
            <img id="reportPhotoPreview" class="photo-preview" style="display: none;">
          </div>
          
          <div class="form-actions">
            <button type="button" onclick="document.getElementById('reportModal').classList.remove('active')">Cancel</button>
            <button type="submit">Submit Report</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Setup form submission
    document.getElementById('reportForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitReport();
    });
    
    // Setup photo preview
    document.getElementById('reportPhoto').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = document.getElementById('reportPhotoPreview');
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Setup room change handler
    document.getElementById('reportRoom').addEventListener('change', (e) => {
      this.updateObjectSelector(e.target.value);
    });
    
    return modal;
  }

  // Populate report modal with data
  populateReportModal(roomId, objectId) {
    const roomSelect = document.getElementById('reportRoom');
    const objectSelect = document.getElementById('reportObject');
    
    // Populate rooms
    roomSelect.innerHTML = '<option value="">Select Room</option>';
    Object.values(campusRooms).forEach(room => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = room.name;
      if (room.id === roomId) option.selected = true;
      roomSelect.appendChild(option);
    });
    
    // Populate objects for selected room
    if (roomId) {
      this.updateObjectSelector(roomId, objectId);
    }
  }

  // Update object selector based on selected room
  updateObjectSelector(roomId, selectedObjectId = null) {
    const objectSelect = document.getElementById('reportObject');
    objectSelect.innerHTML = '<option value="">Select Object</option>';
    
    if (roomId) {
      const room = RoomUtils.getRoom(roomId);
      Object.entries(room.inventory).forEach(([objId, obj]) => {
        const option = document.createElement('option');
        option.value = objId;
        option.textContent = `${objId.replace(/_/g, ' ')} (${obj.type.replace(/_/g, ' ')})`;
        if (objId === selectedObjectId) option.selected = true;
        objectSelect.appendChild(option);
      });
    }
  }

  // Submit new report
  async submitReport() {
    const form = document.getElementById('reportForm');
    const formData = new FormData(form);
    
    const report = {
      roomId: document.getElementById('reportRoom').value,
      objectId: document.getElementById('reportObject').value,
      title: document.getElementById('reportTitle').value,
      description: document.getElementById('reportDescription').value,
      status: 'open',
      timestamp: Date.now(),
      photo: document.getElementById('reportPhotoPreview').src || null
    };
    
    // Save to IndexedDB
    const transaction = this.reportDB.transaction(['reports'], 'readwrite');
    const store = transaction.objectStore('reports');
    const request = store.add(report);
    
    request.onsuccess = () => {
      report.id = request.result;
      this.reports.set(report.id, report);
      
      // Close modal and refresh views
      document.getElementById('reportModal').classList.remove('active');
      this.updateRoomVisuals();
      
      // Show success message
      this.showNotification('Report submitted successfully!', 'success');
      
      // Refresh room modal if open
      if (this.selectedRoom) {
        this.showRoomModal(this.selectedRoom);
      }
    };
    
    request.onerror = () => {
      this.showNotification('Error submitting report. Please try again.', 'error');
    };
  }

  // Change report status
  async changeReportStatus(reportId, newStatus) {
    const report = this.reports.get(reportId);
    if (!report) return;
    
    report.status = newStatus;
    report.lastUpdated = Date.now();
    
    const transaction = this.reportDB.transaction(['reports'], 'readwrite');
    const store = transaction.objectStore('reports');
    const request = store.put(report);
    
    request.onsuccess = () => {
      this.updateRoomVisuals();
      this.showNotification(`Report marked as ${reportStatuses[newStatus].label}`, 'success');
      
      // Refresh room modal
      if (this.selectedRoom) {
        this.showRoomModal(this.selectedRoom);
      }
    };
  }

  // Delete report
  async deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    const transaction = this.reportDB.transaction(['reports'], 'readwrite');
    const store = transaction.objectStore('reports');
    const request = store.delete(reportId);
    
    request.onsuccess = () => {
      this.reports.delete(reportId);
      this.updateRoomVisuals();
      this.showNotification('Report deleted successfully', 'success');
      
      // Refresh room modal
      if (this.selectedRoom) {
        this.showRoomModal(this.selectedRoom);
      }
    };
  }

  // Get reports for a specific room
  getRoomReports(roomId) {
    return Array.from(this.reports.values()).filter(report => report.roomId === roomId);
  }

  // Get reports for a specific object
  getObjectReports(roomId, objectId) {
    return Array.from(this.reports.values()).filter(report => 
      report.roomId === roomId && report.objectId === objectId
    );
  }

  // Update room visuals based on current reports
  updateRoomVisuals() {
    // Update 2D map
    this.roomLayers2D.forEach((layers, roomId) => {
      const color = RoomUtils.getRoomColor(roomId);
      const hasReports = this.getRoomReports(roomId).length > 0;
      
      layers.polygon.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: hasReports ? 0.7 : 0.3,
        weight: hasReports ? 3 : 2
      });
    });
    
    // Update 3D map
    if (this.map3D && this.map3D.getSource('rooms')) {
      const roomsGeoJSON = {
        type: 'FeatureCollection',
        features: Object.values(campusRooms).map(room => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [room.polygon.map(coord => [coord[1], coord[0]])]
          },
          properties: {
            id: room.id,
            name: room.name,
            type: room.type,
            building: room.building,
            hasReports: this.getRoomReports(room.id).length > 0,
            color: RoomUtils.getRoomColor(room.id)
          }
        }))
      };
      
      this.map3D.getSource('rooms').setData(roomsGeoJSON);
    }
  }

  // Track room visit for analytics
  trackRoomVisit(roomId) {
    if (!this.reportDB) return;
    
    const visit = {
      roomId: roomId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    
    const transaction = this.reportDB.transaction(['room_visits'], 'readwrite');
    const store = transaction.objectStore('room_visits');
    store.add(visit);
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Get all reports (for admin panel)
  getAllReports() {
    return Array.from(this.reports.values());
  }

  // Filter reports
  filterReports(filters = {}) {
    let reports = this.getAllReports();
    
    if (filters.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    
    if (filters.roomId) {
      reports = reports.filter(r => r.roomId === filters.roomId);
    }
    
    if (filters.objectType) {
      reports = reports.filter(r => {
        const room = RoomUtils.getRoom(r.roomId);
        const obj = room?.inventory[r.objectId];
        return obj?.type === filters.objectType;
      });
    }
    
    return reports.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Global instance
let roomManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  roomManager = new RoomManager();
  window.roomManager = roomManager; // Make it globally accessible
  console.log('Room manager initialized');
});
