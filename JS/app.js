// app.js
'use strict';

// — Campus & POIs Data —
const locations = {
  Entrance:      [43.225018, 0.052059],
  Library:       [43.224945, 0.051151],
  Cafeteria:     [43.227491, 0.050948],
  GYM:           [43.225022, 0.050141],
  Building_A:    [43.225121, 0.051905],
  Building_C:    [43.224918, 0.050762],
  Building_D:    [43.224511, 0.051267],
  Building_E:    [43.224897, 0.051205],
  Villa:         [43.225722, 0.050753],
  Building_J:    [43.226148, 0.050630],
  Building_K:    [43.226481, 0.050634],
  Building_M:    [43.223988, 0.050028],
  Building_IUFM: [43.224808, 0.049464],
  Observatoire:  [43.223953, 0.049200],
  Département_Génie_Électrique: [43.225952, 0.048409],
  Département_Techniques:       [43.226238, 0.049283],
  Département_Génie_Mécanique:  [43.226579, 0.047749],
  Département_Gestion:          [43.226727, 0.049311],
  Département_Multimédia:       [43.227101, 0.049143],
  Département_Civil:            [43.226198, 0.047592],
  Résidence_A:   [43.227188, 0.051380],
  Résidence_B:   [43.226901, 0.051519],
  Résidence_C:   [43.226672, 0.051519],
  Résidence_D:   [43.227049, 0.050050],
  Résidence_E:   [43.227233, 0.050063],
  Résidence_F:   [43.227397, 0.050192],
  Laboratory_L0: [43.225312, 0.050033],
  Laboratory_L1: [43.225728, 0.050033],
  Laboratory_L2: [43.226025, 0.050033],
  Laboratory_L3: [43.226203, 0.050033],
  Laboratory_L4: [43.226383, 0.050033]
};

// — Globals —
let map2D, map3D, routingControl, navControl, instructions = [];
let dynamicMarker = null, userMarker2D = null, userMarker3D = null, gpsAccuracyCircle = null;
let watchId = null, following = true, smoothLat, smoothLon, firstGPS = true, frameCnt = 0, baseAlt = null;
let db, infoMarkers = [];

// — GPS Related Globals —
let manualCorrection = false;
let currentPosition = null;
let gpsAccuracyCircle3D = null;
let isDragging3D = false;
let dragStartPoint = null;
let dragStartLngLat = null;
let dragStartCoords = null;

// Function declarations for hoisting
let on3DMarkerDrag, on3DMarkerDragEnd;

// — Update GPS position with accuracy circle —
function updateUserPosition(lat, lon, accuracy, fromDrag = false) {
  // Update current position if not from drag (real GPS update)
  if (!fromDrag) {
    currentPosition = { lat, lon, accuracy };
  } else {
    // Update coordinates in the UI when dragging
    if ($('currentCoords')) {
      $('currentCoords').textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`;
    }
    
    // Update the displayed coordinates in the GPS status panel
    if ($('gpsLat') && $('gpsLng')) {
      $('gpsLat').textContent = `Lat: ${lat.toFixed(6)}`;
      $('gpsLng').textContent = `Lng: ${lon.toFixed(6)}`;
    }
    
    // Update URL with new position
    updateURL(lat, lon, $("origin").value);
  }
  
  // Update 2D Marker
  if (!userMarker2D) {
    userMarker2D = L.marker([lat, lon], { 
      draggable: manualCorrection,
      icon: L.divIcon({ className: 'user-location-marker', iconSize: [20, 20] }),
      zIndexOffset: 1000
    }).addTo(map2D);
    
    // Bring to front to ensure visibility
    userMarker2D.setZIndexOffset(1000);
  } else {
    // Only update position if not from drag (real GPS update)
    if (!fromDrag) {
      userMarker2D.setLatLng([lat, lon]);
      userMarker2D.dragging[manualCorrection ? 'enable' : 'disable']();
    }
  }

  // Update 3D Marker
  if (map3D) {
    if (!userMarker3D) {
      // Create 3D marker source and layer if they don't exist
      userMarker3D = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {}
      };
      
      // Add source and layer for 3D marker if they don't exist
      if (!map3D.getSource('user-location')) {
        // Add the source
        map3D.addSource('user-location', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [userMarker3D]
          }
        });
        
        // Add the main marker layer
        map3D.addLayer({
          id: 'user-location-layer',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 10,
            'circle-color': '#4285F4',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
            'circle-opacity': 0.9
          }
        });
        
        // Add pulsing animation for the 3D marker
        map3D.addLayer({
          id: 'user-location-pulse',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': {
              'base': 1.5,
              'stops': [
                [5, 5],
                [15, 20]
              ]
            },
            'circle-color': '#4285F4',
            'circle-opacity': 0.2
          }
        });
        
        console.log('3D marker layers added');
      }
      
      // Setup 3D marker dragging if manual correction is enabled
      if (manualCorrection) {
        // Small delay to ensure layers are fully loaded
        setTimeout(() => {
          if (map3D.getLayer('user-location-layer')) {
            setup3DMarkerDragHandlers();
            console.log('3D marker drag handlers initialized');
          }
        }, 100);
      }
      
      userMarker3D = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {}
      };
    } else {
      // Update existing marker
      userMarker3D.geometry.coordinates = [lon, lat];
    }
    
    // Update the source data
    if (map3D.getSource('user-location')) {
      map3D.getSource('user-location').setData({
        type: 'FeatureCollection',
        features: [userMarker3D]
      });
    }
  }

  // Update accuracy circles
  updateGPSCircles(lat, lon, accuracy);
  
  // Auto-pan if following and not from drag
  if (following && !fromDrag) {
    map2D.panTo([lat, lon], { animate: true });
    if (map3D) {
      map3D.easeTo({
        center: [lon, lat],
        duration: 1000
      });
    }
  }
}

// — Update GPS accuracy circles in both 2D and 3D —
function updateGPSCircles(lat, lon, accuracy) {
  // Skip if no accuracy data or invalid accuracy
  if (accuracy === undefined || accuracy === null || accuracy <= 0) {
    // Hide circles if they exist
    if (gpsAccuracyCircle && map2D) {
      map2D.removeLayer(gpsAccuracyCircle);
      gpsAccuracyCircle = null;
    }
    if (map3D) {
      if (map3D.getLayer('gps-accuracy-fill')) map3D.removeLayer('gps-accuracy-fill');
      if (map3D.getLayer('gps-accuracy-line')) map3D.removeLayer('gps-accuracy-line');
      if (map3D.getSource('gps-accuracy')) map3D.removeSource('gps-accuracy');
    }
    return;
  }
  
  // Update 2D accuracy circle
  if (map2D) {
    const latLng = L.latLng(lat, lon);
    if (gpsAccuracyCircle) {
      gpsAccuracyCircle.setLatLng(latLng).setRadius(accuracy);
    } else {
      gpsAccuracyCircle = L.circle(latLng, {
        radius: accuracy,
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        weight: 1,
        opacity: 0.7,
        interactive: false,
        className: 'gps-accuracy-circle'
      }).addTo(map2D);
      
      // Ensure the circle stays below other layers
      gpsAccuracyCircle.bringToBack();
    }
  }
  
  // Update 3D circle
  if (map3D) {
    // Only update if accuracy changed significantly (more than 1 meter)
    const lastUpdate = window._lastGpsCircleUpdate || { lat: 0, lon: 0, accuracy: 0 };
    const threshold = 0.00001; // ~1 meter in degrees
    
    if (Math.abs(lastUpdate.lat - lat) < threshold && 
        Math.abs(lastUpdate.lon - lon) < threshold && 
        Math.abs(lastUpdate.accuracy - accuracy) < 1) {
      return; // Skip update if position/accuracy hasn't changed significantly
    }
    
    // Cache the last update values
    window._lastGpsCircleUpdate = { lat, lon, accuracy };
    
    // Generate circle coordinates with fewer points for better performance
    const steps = 32;
    const coords = [];
    const R = 6378137; // Earth's radius in meters
    const d2r = Math.PI / 180;
    const r = accuracy / R; // Convert meters to radians
    const centerLat = lat * d2r;
    const centerLng = lon * d2r;
    
    // Generate circle points
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * (Math.PI * 2);
      const latRad = Math.asin(
        Math.sin(centerLat) * Math.cos(r) +
        Math.cos(centerLat) * Math.sin(r) * Math.cos(angle)
      );
      const lngRad = centerLng + Math.atan2(
        Math.sin(angle) * Math.sin(r) * Math.cos(centerLat),
        Math.cos(r) - Math.sin(centerLat) * Math.sin(latRad)
      );
      coords.push([lngRad / d2r, latRad / d2r]);
    }
    coords.push(coords[0]); // Close the circle
    
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    };
    
    // Update or create the source and layers
    if (!map3D.getSource('gps-accuracy')) {
      // Remove any existing layers first
      if (map3D.getLayer('gps-accuracy-fill')) map3D.removeLayer('gps-accuracy-fill');
      if (map3D.getLayer('gps-accuracy-line')) map3D.removeLayer('gps-accuracy-line');
      
      // Add the source
      map3D.addSource('gps-accuracy', {
        type: 'geojson',
        data: geojson
      });
      
      // Add fill layer
      map3D.addLayer({
        id: 'gps-accuracy-fill',
        type: 'fill',
        source: 'gps-accuracy',
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.2
        },
        minzoom: 15 // Only show at higher zoom levels for better performance
      }, 'waterway-label');
      
      // Add line layer
      map3D.addLayer({
        id: 'gps-accuracy-line',
        type: 'line',
        source: 'gps-accuracy',
        paint: {
          'line-color': '#ff0000',
          'line-width': 1,
          'line-opacity': 0.7
        },
        minzoom: 15 // Only show at higher zoom levels for better performance
      }, 'waterway-label');
    } else {
      // Just update the source data
      map3D.getSource('gps-accuracy').setData(geojson);
    }
  }
}

// — Start GPS tracking with dynamic watchPosition —
function startTracking() {
  if (!navigator.geolocation) { showModal("GPS not supported."); return; }

  if (watchId) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      if (!manualCorrection) updateUserPosition(latitude, longitude, accuracy);
    },
    err => showModal("GPS error: " + err.message),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
  );
}

// — Initialize Manual GPS Correction —
function initManualGPSCorrection() {
  const toggleBtn = $('btnManualGPS');
  const toggleBtnMobile = $('btnManualGPS-mobile');
  
  if (!toggleBtn || !toggleBtnMobile) {
    console.log('Manual GPS toggle buttons not found');
    return;
  }
  
  // Clean up any existing event listeners to prevent duplicates
  const oldToggle = toggleBtn.onclick;
  const oldToggleMobile = toggleBtnMobile.onclick;
  
  if (oldToggle) {
    toggleBtn.removeEventListener('click', oldToggle);
  }
  
  if (oldToggleMobile) {
    toggleBtnMobile.removeEventListener('click', oldToggleMobile);
  }
  
  const toggleManualMode = (btn) => {
    try {
      manualCorrection = !manualCorrection;
      const status = manualCorrection ? 'ON' : 'OFF';
      
      // Update button states
      [toggleBtn, toggleBtnMobile].forEach(btn => {
        if (btn) {
          btn.textContent = `Manual GPS: ${status}`;
          btn.classList.toggle('active', manualCorrection);
        }
      });
      
      // Update 2D marker draggable state
      if (userMarker2D) {
        try {
          userMarker2D.dragging[manualCorrection ? 'enable' : 'disable']();
          
          // Enable/disable 2D marker dragging
          if (manualCorrection) {
            enableManualDrag();
          }
        } catch (err) {
          console.error('Error updating 2D marker drag state:', err);
        }
      }
      
      // Update 3D map cursor style and setup drag handlers
      if (map3D) {
        const canvas = map3D.getCanvas();
        if (canvas) {
          canvas.style.cursor = manualCorrection ? 'grab' : '';
        }
        
        // Setup 3D marker drag handlers if not already done
        if (manualCorrection) {
          if (map3D.getLayer('user-location-layer')) {
            setup3DMarkerDragHandlers();
          } else {
            console.log('User location layer not ready, will retry...');
            // Retry after a short delay if layer isn't ready
            setTimeout(() => {
              if (manualCorrection && map3D.getLayer('user-location-layer')) {
                setup3DMarkerDragHandlers();
              }
            }, 500);
          }
        }
      }
      
      // Show status message
      showModal(`Manual GPS correction is now ${status}`);
      
      console.log(`Manual GPS correction ${status}`);
      
    } catch (error) {
      console.error('Error in toggleManualMode:', error);
      showModal('Error toggling manual GPS correction. Check console for details.');
    }
  };
  
  // Add new event listeners
  toggleBtn.addEventListener('click', () => toggleManualMode(toggleBtn));
  toggleBtnMobile.addEventListener('click', () => toggleManualMode(toggleBtnMobile));
  
  // Initialize manual correction state
  [toggleBtn, toggleBtnMobile].forEach(btn => {
    if (btn) {
      btn.textContent = `Manual GPS: ${manualCorrection ? 'ON' : 'OFF'}`;
      btn.classList.toggle('active', manualCorrection);
    }
  });
  
  // If manual correction is already enabled, make sure handlers are set up
  if (manualCorrection) {
    if (map3D && map3D.getLayer('user-location-layer')) {
      setup3DMarkerDragHandlers();
    }
    
    if (userMarker2D) {
      enableManualDrag();
    }
  }
}

// — Setup 3D Marker Drag Handlers —
function setup3DMarkerDragHandlers() {
  if (!map3D || !map3D.getLayer('user-location-layer')) {
    console.log('3D map or user layer not ready, retrying in 500ms...');
    setTimeout(setup3DMarkerDragHandlers, 500);
    return;
  }
  
  const canvas = map3D.getCanvas();
  
  // Remove any existing event listeners to prevent duplicates
  map3D.off('mousedown', 'user-location-layer');
  map3D.off('touchstart', 'user-location-layer');
  map3D.off('mouseenter', 'user-location-layer');
  map3D.off('mouseleave', 'user-location-layer');
  
  const startDrag = (e) => {
    if (!manualCorrection || !userMarker3D || isDragging3D) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isDragging3D = true;
    dragStartPoint = e.point || { x: e.clientX, y: e.clientY };
    
    // Get the current lngLat from the event or from the marker
    if (e.lngLat) {
      dragStartLngLat = e.lngLat;
    } else if (userMarker3D && userMarker3D.geometry && userMarker3D.geometry.coordinates) {
      dragStartLngLat = {
        lng: userMarker3D.geometry.coordinates[0],
        lat: userMarker3D.geometry.coordinates[1]
      };
    } else {
      console.error('Could not determine start position for drag');
      isDragging3D = false;
      return;
    }
    
    dragStartCoords = [...userMarker3D.geometry.coordinates];
    
    // Update cursor style
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
    
    // Disable map interactions during drag
    if (map3D.dragPan) map3D.dragPan.disable();
    if (map3D.dragRotate) map3D.dragRotate.disable();
    if (map3D.touchZoomRotate) {
      map3D.touchZoomRotate.disableRotation();
      map3D.touchZoomRotate.disable();
    }
    
    // Add document-level event listeners for smoother dragging
    document.addEventListener('mousemove', on3DMarkerDrag, { passive: false });
    document.addEventListener('mouseup', on3DMarkerDragEnd, { passive: false });
    document.addEventListener('touchmove', on3DMarkerDrag, { passive: false });
    document.addEventListener('touchend', on3DMarkerDragEnd, { passive: false });
    
    console.log('Started 3D marker drag at:', dragStartLngLat);
  };
  
  // Set up mouse and touch event listeners
  map3D.on('mousedown', 'user-location-layer', startDrag);
  map3D.on('touchstart', 'user-location-layer', startDrag);
  
  // Update cursor style on hover when manual correction is enabled
  map3D.on('mouseenter', 'user-location-layer', () => {
    if (manualCorrection && !isDragging3D && canvas) {
      canvas.style.cursor = 'grab';
    }
  });
  
  map3D.on('mouseleave', 'user-location-layer', () => {
    if (!isDragging3D && canvas) {
      canvas.style.cursor = '';
    }
  });
  
  console.log('3D marker drag handlers initialized');
}

// — Handle 3D Marker Drag —
on3DMarkerDrag = function(e) {
  try {
    if (!isDragging3D || !map3D || !userMarker3D || !dragStartLngLat) {
      console.log('Not dragging or missing required elements');
      return;
    }
    
    // Prevent default behavior for touch events
    if (e.type === 'touchmove' || e.type === 'touchstart') {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Get the current point from the event
    let point;
    if (e.point) {
      // Mouse event or touch event with point property
      point = e.point;
    } else if (e.touches && e.touches[0]) {
      // Touch event without point property
      const rect = map3D.getCanvas().getBoundingClientRect();
      point = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if (e.clientX !== undefined) {
      // Fallback for mouse events without point property
      const rect = map3D.getCanvas().getBoundingClientRect();
      point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    } else {
      console.log('Unhandled event type or missing position data:', e.type, e);
      return;
    }
    
    // Calculate the new position based on mouse/touch movement
    const deltaX = point.x - (dragStartPoint.x || 0);
    const deltaY = point.y - (dragStartPoint.y || 0);
    
    // Convert pixel deltas to geographic coordinates
    const newLng = dragStartLngLat.lng + (deltaX / 1000) * (180 / Math.PI) / Math.cos(dragStartLngLat.lat * Math.PI / 180);
    const newLat = dragStartLngLat.lat - (deltaY / 1000) * (180 / Math.PI);
    
    // Update marker position
    userMarker3D.geometry.coordinates = [newLng, newLat];
    
    // Update the source data
    if (map3D.getSource('user-location')) {
      map3D.getSource('user-location').setData({
        type: 'FeatureCollection',
        features: [userMarker3D]
      });
    } else {
      console.error('user-location source not found');
    }
    
    // Update 2D marker position if it exists
    if (userMarker2D) {
      try {
        userMarker2D.setLatLng([newLat, newLng]);
      } catch (err) {
        console.error('Error updating 2D marker:', err);
      }
    }
    
    // Update displayed coordinates
    if ($('currentCoords')) {
      $('currentCoords').textContent = `Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`;
    }
    
    // Update the GPS accuracy circle
    if (gpsAccuracyCircle) {
      try {
        gpsAccuracyCircle.setLatLng([newLat, newLng]);
      } catch (err) {
        console.error('Error updating accuracy circle:', err);
      }
    }
    
    // Update internal position state
    currentPosition = { 
      lat: newLat, 
      lon: newLng, 
      accuracy: currentPosition?.accuracy || 10 
    };
    
    // Update the URL with the new position
    try {
      updateURL(newLat, newLng, $("origin")?.value || '');
    } catch (err) {
      console.error('Error updating URL:', err);
    }
    
  } catch (error) {
    console.error('Error in on3DMarkerDrag:', error);
  }
}

// — Handle 3D Marker Drag End —
on3DMarkerDragEnd = function(e) {
  if (!isDragging3D) {
    console.log('Drag end called but not currently dragging');
    return;
  }
  
  // Prevent default for touch events
  if (e && (e.type === 'touchend' || e.type === 'touchcancel')) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  try {
    console.log('Ending 3D marker drag');
    
    // Reset dragging state
    isDragging3D = false;
    
    // Update cursor style
    if (map3D && map3D.getCanvas()) {
      map3D.getCanvas().style.cursor = manualCorrection ? 'grab' : '';
    }
    
    // Re-enable map interactions
    if (map3D) {
      if (map3D.dragPan) map3D.dragPan.enable();
      if (map3D.dragRotate) map3D.dragRotate.enable();
      if (map3D.touchZoomRotate) {
        map3D.touchZoomRotate.enableRotation();
        map3D.touchZoomRotate.enable();
      }
    }
    
    // Update the final position if we have a marker
    if (userMarker3D && userMarker3D.geometry && userMarker3D.geometry.coordinates) {
      const [lng, lat] = userMarker3D.geometry.coordinates;
      
      // Update the internal GPS position
      currentPosition = { 
        lat, 
        lon: lng, 
        accuracy: currentPosition?.accuracy || 10 
      };
      
      // Update the 2D marker position if it exists
      if (userMarker2D) {
        try {
          userMarker2D.setLatLng([lat, lng]);
        } catch (err) {
          console.error('Error updating 2D marker position:', err);
        }
      }
      
      // Update the accuracy circle if it exists
      if (gpsAccuracyCircle) {
        try {
          gpsAccuracyCircle.setLatLng([lat, lng]);
        } catch (err) {
          console.error('Error updating accuracy circle:', err);
        }
      }
      
      // Update displayed coordinates
      if ($('currentCoords')) {
        $('currentCoords').textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
      }
      
      // Update the URL with the final position
      try {
        updateURL(lat, lng, $("origin")?.value || '');
      } catch (err) {
        console.error('Error updating URL:', err);
      }
      
      console.log('Drag ended at:', { lat, lng });
    }
    
  } catch (error) {
    console.error('Error in on3DMarkerDragEnd:', error);
  } finally {
    // Always clean up event listeners, even if there was an error
    try {
      document.removeEventListener('mousemove', on3DMarkerDrag);
      document.removeEventListener('mouseup', on3DMarkerDragEnd);
      document.removeEventListener('mouseleave', on3DMarkerDragEnd);
      document.removeEventListener('touchmove', on3DMarkerDrag);
      document.removeEventListener('touchend', on3DMarkerDragEnd);
      document.removeEventListener('touchcancel', on3DMarkerDragEnd);
    } catch (e) {
      console.error('Error removing event listeners:', e);
    }
    
    // Reset drag state
    dragStartPoint = null;
    dragStartLngLat = null;
    dragStartCoords = null;
  }
};

// — Enable drag for manual correction —
const enableManualDrag = function() {
  if (!userMarker2D) return;
  
  // Remove any existing event listeners to prevent duplicates
  userMarker2D.off('dragstart');
  userMarker2D.off('drag');
  userMarker2D.off('dragend');
  
  userMarker2D.on('dragstart', () => {
    // Disable map interaction while dragging
    map2D.dragging.disable();
    map2D.scrollWheelZoom.disable();
    
    // Update cursor style
    map2D.getContainer().style.cursor = 'grabbing';
  });
  
  userMarker2D.on('drag', e => {
    const pos = e.target.getLatLng();
    
    // Update coordinates display in real-time while dragging
    if ($('currentCoords')) {
      $('currentCoords').textContent = `Lat: ${pos.lat.toFixed(6)}, Lng: ${pos.lng.toFixed(6)}`;
    }
    
    // Update accuracy circle position in real-time
    if (gpsAccuracyCircle) {
      gpsAccuracyCircle.setLatLng(pos);
    }
    
    // Update 3D marker position if it exists
    if (userMarker3D) {
      userMarker3D.geometry.coordinates = [pos.lng, pos.lat];
      map3D.getSource('user-location').setData({
        type: 'FeatureCollection',
        features: [userMarker3D]
      });
    }
    
    // Update internal position
    smoothLat = pos.lat;
    smoothLon = pos.lng;
    
    // Update current position for other functions
    currentPosition = {
      lat: pos.lat,
      lng: pos.lng,
      accuracy: currentPosition.accuracy
    };
  });
  
  userMarker2D.on('dragend', e => {
    const pos = e.target.getLatLng();
    
    // Update 3D marker position if it exists
    if (userMarker3D) {
      userMarker3D.geometry.coordinates = [pos.lng, pos.lat];
      map3D.getSource('user-location').setData({
        type: 'FeatureCollection',
        features: [userMarker3D]
      });
    }
    
    // Update URL with new position
    updateURL(pos.lat, pos.lng, $("origin").value);
    
    // Re-enable map interaction and reset cursor
    map2D.dragging.enable();
    map2D.scrollWheelZoom.enable();
    map2D.getContainer().style.cursor = '';
    
    // Update accuracy circle position
    if (gpsAccuracyCircle) {
      gpsAccuracyCircle.setLatLng(pos);
    }
    
    // Update internal position
    smoothLat = pos.lat;
    smoothLon = pos.lng;
    
    // Update current position for other functions
    currentPosition = {
      lat: pos.lat,
      lng: pos.lng,
      accuracy: currentPosition.accuracy
    };
    
    // Update 3D view if needed
    if (map3D) {
      map3D.setCenter([pos.lng, pos.lat]);
    }
  });
}

// DOM utility functions
const $ = id => document.getElementById(id);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

// — Tests para asegurar elementos DOM —
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runTests() {
  assert($("origin"), "Missing #origin");
  assert($("destination"), "Missing #destination");
  assert($("infoTitle") && $("infoDescription"), "Missing info inputs");
}

// — PasosControl personalizado (leaflet-steps) —
const StepsControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const div = L.DomUtil.create('div', 'leaflet-steps');
    div.innerHTML = `
      <h3 role="button" aria-expanded="true">
        Steps (${instructions.length}) <span class="toggle-icon">▲</span>
      </h3>
      <ol>
        ${instructions.map((inst, i) => `<li id="step-${i}">${inst.text}</li>`).join('')}
      </ol>`;
    L.DomEvent.disableClickPropagation(div);
    const header = div.querySelector('h3');
    header.addEventListener('click', () => {
      const isCollapsed = div.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', (!isCollapsed).toString());
      adjustDirectionsPosition();
    });
    return div;
  }
});

// — Arranque de la app —
function initApp() {
  runTests();
  initMaps();
  initControls();
  setupMobileMenu();
  syncSelectOptions('origin', 'mobile-origin');
  syncSelectOptions('destination', 'mobile-destination');
}

// — Crear mapas 2D y 3D —
function initMaps() {
  const campusBounds = [[43.2235, 0.0459], [43.2280, 0.0536]];

  // 2D
  map2D = L.map("map2D", {
    center: [43.22476, 0.05044],
    zoom: 18, minZoom: 17, maxZoom: 19, maxBounds: campusBounds
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map2D);
  L.control.scale({ imperial: false }).addTo(map2D);
  new L.Control.MiniMap(
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    { toggleDisplay: true }
  ).addTo(map2D);
  L.control.measure({
    position: 'topright',
    primaryLengthUnit: 'meters',
    secondaryLengthUnit: 'kilometers',
    primaryAreaUnit: 'sqmeters',
    secondaryAreaUnit: 'hectares'
  }).addTo(map2D);
  map2D.on('dragstart zoomstart', () => following = false);

  // Cluster POIs
  const cluster = L.markerClusterGroup();
  Object.entries(locations).forEach(([key, coords]) => {
    const m = L.marker(coords).bindPopup(key.replace(/_/g, ' '));
    m.on('click', () => handlePOIClick(key));
    cluster.addLayer(m);
  });
  map2D.addLayer(cluster);

  // 3D
  map3D = new maplibregl.Map({
    container: "map3D",
    style: "https://api.maptiler.com/maps/streets-v2/style.json?key=OskyrOiFGGaB6NMWJlcC",
    center: [0.05044, 43.22476], zoom: 17, pitch: 60, bearing: -20, antialias: true
  });
  map3D.addControl(new maplibregl.NavigationControl());
  map3D.on('dragstart zoomstart', () => following = false);
  map3D.on('load', () => {
    map3D.addSource('pois', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: Object.entries(locations).map(([k, c]) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c[1], c[0]] },
          properties: { name: k }
        }))
      }
    });
    map3D.addLayer({
      id: 'pois-layer', type: 'circle', source: 'pois',
      paint: {
        'circle-radius': 6,
        'circle-color': '#0055A4',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
      }
    });
    map3D.on('click', 'pois-layer', e => {
      const name = e.features[0].properties.name;
      handlePOIClick(name);
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${name.replace(/_/g, ' ')}</strong>`)
        .addTo(map3D);
    });
  });

  switchTo2D();

  // Clic en mapa 2D para marcador dinámico
  map2D.on('click', e => {
    const { lat, lng } = e.latlng;
    placeOrMoveMarker([lat, lng]);
    updateURL(lat, lng, $("origin").value);
  });

  // Leer URL params
  checkURLParams();
}

// — Al hacer click en un POI —
function handlePOIClick(key) {
  if (!$("origin").value) $("origin").value = key;
  else $("destination").value = key;
}

// — Initialize desktop controls —
function initControls() {
  fillSelect("origin");
  fillSelect("destination");

  $("searchBox").addEventListener("input", debounce(() => {
    const txt = $("searchBox").value.toLowerCase();
    ["origin", "destination"].forEach(id => {
      Array.from($(id).options).forEach(o => {
        o.style.display = o.text.toLowerCase().includes(txt) ? 'block' : 'none';
      });
    });
  }, 100));

  $("btnGo").onclick       = drawRoute;
  $("btn2D").onclick       = switchTo2D;
  $("btn3D").onclick       = switchTo3D;
  $("btnStartGPS").onclick = startTracking;
  $("btnManualGPS-mobile").onclick = () => $("btnManualGPS").click();
  $("btnFollow").onclick   = () => {
    following = true;
    if (userMarker2D) map2D.panTo(userMarker2D.getLatLng(), { animate: true });
    if (userMarker3D) map3D.setCenter(userMarker3D.getLngLat().toArray());
  };

  // Temporarily disabled: Navigate to Marker functionality
  /*
  $("btnNavMarker").onclick = () => {
    if (!dynamicMarker) { showModal("Please place a dynamic marker first."); return; }
    const dest = dynamicMarker.getLatLng(), originKey = $("origin").value;
    if (originKey === 'gps') {
      if (!navigator.geolocation) { showModal("GPS not supported."); return; }
      navigator.geolocation.getCurrentPosition(
        pos => runRoute([[pos.coords.latitude, pos.coords.longitude]], [dest.lat, dest.lng], 'gps'),
        err => showModal("GPS error: " + err.message)
      );
    } else if (originKey) {
      runRoute(locations[originKey], [dest.lat, dest.lng], originKey);
    } else {
      showModal("Please select an origin point.");
    }
  };
  */

  $("btnShare").onclick = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showModal("Link copied to clipboard"));
  };

  // Modals & IndexedDB
  $("alert-close").onclick       = () => $("alertModal").classList.remove("active");
  $("btnAddInfo").onclick        = () => {
    $("infoFormOverlay").classList.add("active");
    $("infoForm").classList.add("active");
  };
  $("btnCancelInfo").onclick     = () => {
    $("infoFormOverlay").classList.remove("active");
    $("infoForm").classList.remove("active");
  };
  $("hiddenFileInput").onchange  = () => {
    const f = $("hiddenFileInput").files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = e => $("preview").src = e.target.result;
      reader.readAsDataURL(f);
    }
  };
  $("btnSaveInfo").onclick       = saveInfo;
  $("btnViewInfos").onclick      = () => {
    $("infoModalOverlay").classList.add("active");
    $("infoListPanel").classList.add("active");
    refreshInfoList();
  };
  $("btnCloseInfoPanel").onclick = () => {
    $("infoModalOverlay").classList.remove("active");
    $("infoListPanel").classList.remove("active");
  };
  $("infoModalOverlay").onclick  = e => {
    if (e.target === $("infoModalOverlay")) {
      $("infoModalOverlay").classList.remove("active");
      $("infoListPanel").classList.remove("active");
    }
  };

  // IndexedDB setup
  const req = indexedDB.open("CampusAppDB", 1);
  req.onerror    = e => console.error("DB error", e);
  req.onsuccess  = e => { db = e.target.result; loadAllMarkers(); };
  req.onupgradeneeded = e => {
    const store = e.target.result.createObjectStore("infos", { keyPath: "id", autoIncrement: true });
    store.createIndex("by_date", "timestamp");
  };

  window.addEventListener('resize', adjustDirectionsPosition);
}

// — Populate origin/destination <select> —
function fillSelect(id) {
  const sel = $(id);
  sel.innerHTML = `<option value="">-- select --</option><option value="gps">My Location</option>`;
  const groups = {
    General: ["Entrance", "Library", "Cafeteria", "GYM", "Villa"],
    Buildings: Object.keys(locations).filter(k => /^Building/.test(k) || k === "Observatoire"),
    Departments: Object.keys(locations).filter(k => k.startsWith("Département")),
    Residences: Object.keys(locations).filter(k => k.startsWith("Résidence")),
    Labs: Object.keys(locations).filter(k => k.startsWith("Laboratory"))
  };
  for (const label in groups) {
    const og = document.createElement("optgroup");
    og.label = label;
    groups[label].forEach(key => {
      const o = document.createElement("option");
      o.value = key;
      o.textContent = key.replace(/_/g, " ");
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
}

// — Draw 2D + 3D route —
function drawRoute() {
  const o = $("origin").value, d = $("destination").value;
  if (!o) return showModal("Please select an origin.");
  if (!d) return showModal("Please select a destination.");

  const origin = o === "gps"
    ? (userMarker2D?.getLatLng() || (showModal("Start GPS first."), null))
    : L.latLng(...locations[o]);
  if (!origin) return;
  const dest = L.latLng(...locations[d]);

  if (!routingControl) {
    routingControl = L.Routing.control({
      router: L.Routing.osrmv1({ serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1" }),
      waypoints: [origin, dest],
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null,
      lineOptions: { styles: [{ weight: 5, color: "#0055A4" }] }
    })
    .on('routesfound', e => {
      instructions = e.routes[0].instructions.slice();
      if (window._stepsCtrl) map2D.removeControl(window._stepsCtrl);
      window._stepsCtrl = new StepsControl();
      map2D.addControl(window._stepsCtrl);
      adjustDirectionsPosition();
      draw3DRoute(e.routes[0].coordinates);
    })
    .on('routingerror', () => showModal("Routing error."))
    .addTo(map2D);
  } else {
    routingControl.setWaypoints([origin, dest]);
  }
}

// — Draw 3D route —
function draw3DRoute(routeCoords) {
  if (map3D.getLayer('routeLine')) map3D.removeLayer('routeLine');
  if (map3D.getSource('route')) map3D.removeSource('route');
  const coords = routeCoords.map(ll => [ll.lng, ll.lat]);
  const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
  map3D.addSource('route', { type: 'geojson', data: geojson });
  map3D.addLayer({
    id: 'routeLine', type: 'line', source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0055A4', 'line-width': 4 }
  });
}

// Clear all existing routes from both 2D and 3D maps
function clearAllRoutes() {
  // Clear 2D route
  if (routingControl) {
    map2D.removeControl(routingControl);
    routingControl = null;
  }
  
  // Clear 3D route
  if (map3D) {
    if (map3D.getLayer('routeLine')) {
      map3D.removeLayer('routeLine');
    }
    if (map3D.getSource('route')) {
      map3D.removeSource('route');
    }
  }
}

// — Navigate to dynamic marker —
function runRoute(origins, destArr, originKey) {
  // Clear any existing routes from both maps
  clearAllRoutes();

  // Clear any existing navigation controls
  if (navControl) {
    map2D.removeControl(navControl);
    navControl = null;
  }
  const wp = [
    L.latLng(origins[0][0], origins[0][1]),
    L.latLng(destArr[0], destArr[1])
  ];
  navControl = L.Routing.control({
    router: L.Routing.osrmv1({ serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1" }),
    waypoints: wp,
    fitSelectedRoutes: true,
    show: false,
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#0055A4', weight: 5 }] }
  })
  .on('routesfound', e => {
    instructions = e.routes[0].instructions.slice();
    if (window._stepsCtrl) map2D.removeControl(window._stepsCtrl);
    window._stepsCtrl = new StepsControl();
    map2D.addControl(window._stepsCtrl);
    adjustDirectionsPosition();
    draw3DRoute(e.routes[0].coordinates);
  })
  .on('routingerror', () => showModal("Error calculating route."))
  .addTo(map2D);

  updateURL(destArr[0], destArr[1], originKey);
}

// — Adjust step panel position —
function adjustDirectionsPosition() {
  const dir = document.querySelector('.leaflet-steps');
  if (!dir) return;
  const ctrlRect = $("controls").getBoundingClientRect();
  const mapRect  = $("map2D").getBoundingClientRect();
  dir.style.top   = (ctrlRect.bottom - mapRect.top + 10) + 'px';
  dir.style.right = '10px';
}

// — GPS handling —
function handlePosition(p) {
  const { latitude: lat, longitude: lon, accuracy, altitude: alt, altitudeAccuracy: acc } = p.coords;
  if (accuracy > 100) return;
  if (firstGPS) {
    smoothLat = lat; smoothLon = lon; firstGPS = false;
    if (acc < 5) baseAlt = alt;
  } else {
    const α = 0.4;
    smoothLat = smoothLat * (1 - α) + lat * α;
    smoothLon = smoothLon * (1 - α) + lon * α;
  }
  if (++frameCnt % 3 !== 0) return;
  const pos2D = [smoothLat, smoothLon], pos3D = [smoothLon, smoothLat];

  if (getComputedStyle($("map2D")).display !== "none") {
    if (!userMarker2D) userMarker2D = L.marker(pos2D).addTo(map2D);
    else userMarker2D.setLatLng(pos2D);
    if (following) map2D.panTo(pos2D, { animate: true });
    highlightStep();
  }
  if (getComputedStyle($("map3D")).display !== "none") {
    if (!userMarker3D) userMarker3D = new maplibregl.Marker().setLngLat(pos3D).addTo(map3D);
    else userMarker3D.setLngLat(pos3D);
    if (following) map3D.setCenter(pos3D);
  }

  let floor = "Unknown";
  if (baseAlt != null && acc < 5) {
    const d = alt - baseAlt;
    floor = d < 2 ? "Ground" : d < 4 ? "First" : "Upper";
  }
  $("info").innerHTML = `
    <p>
      <strong>Lat:</strong> ${smoothLat.toFixed(6)}<br>
      <strong>Lon:</strong> ${smoothLon.toFixed(6)}<br>
      <strong>Alt:</strong> ${alt != null ? alt.toFixed(1) + " m" : "—"}<br>
      <strong>Acc:</strong> ±${accuracy.toFixed(1)} m<br>
      <strong>Floor:</strong> ${floor}
    </p>`;
}

function startTracking() {
  firstGPS = true; frameCnt = 0;
  if (watchId) navigator.geolocation.clearWatch(watchId);
  navigator.geolocation.getCurrentPosition(handlePosition, () => {}, {
    enableHighAccuracy: true, timeout: 5000, maximumAge: 0
  });
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    err => showModal(`GPS error: ${err.message}`),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

// — Highlight current step —
function highlightStep() {
  if (!userMarker2D || !instructions.length) return;
  const pt = turf.point([userMarker2D.getLatLng().lng, userMarker2D.getLatLng().lat]);
  let best = 0, bd = Infinity;
  instructions.forEach((inst, i) => {
    if (!inst.latLng) return;
    const d = turf.distance(pt, turf.point([inst.latLng.lng, inst.latLng.lat]), { units: "meters" });
    if (d < bd) { bd = d; best = i; }
  });
  instructions.forEach((_, i) => {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle("current", i === best);
  });
}

// — Toggle 2D/3D —
function switchTo2D() {
  $("map3D").style.display = "none";
  $("map2D").style.display = "block";
  map2D.invalidateSize();
}
function switchTo3D() {
  $("map2D").style.display = "none";
  $("map3D").style.display = "block";
  map3D.resize();
}

// — IndexedDB: load info markers —
function loadAllMarkers() {
  const tx = db.transaction("infos", "readonly");
  tx.objectStore("infos").getAll().onsuccess = e => {
    infoMarkers.forEach(m => m.remove());
    infoMarkers = [];
    e.target.result.forEach(addMarkerToMap);
  };
}
function addMarkerToMap(info) {
  const lng = parseFloat(info.lng), lat = parseFloat(info.lat);
  if (isNaN(lng) || isNaN(lat)) return;
  const el = document.createElement("div");
  el.className = "info-marker";
  new maplibregl.Marker(el)
    .setLngLat([lng, lat])
    .setPopup(new maplibregl.Popup({ offset: 25 })
      .setHTML(`
        <h3>${info.title}</h3>
        <div class="info-meta">
          ${new Date(info.timestamp).toLocaleString()} · Type: ${info.type}<br>
          Lat:${lat.toFixed(6)}, Lon:${lng.toFixed(6)}
        </div>
        <p>${info.description}</p>
        ${info.image ? `<img src="${info.image}" class="info-image" alt="${info.title}">` : ''}
      `))
    .addTo(map3D);
  infoMarkers.push(el);
}

// — Save info to IndexedDB —
function saveInfo() {
  const title = $("infoTitle").value.trim();
  const description = $("infoDescription").value.trim();
  if (!title || !description) {
    return showModal("Please enter both title and description.");
  }
  const type = $("infoMarkerType").value;
  const image = $("preview").src || null;
  const center = map3D.getCenter();
  const lng = center.lng, lat = center.lat, timestamp = Date.now();
  const tx = db.transaction("infos", "readwrite");
  tx.objectStore("infos").add({ title, description, type, image, lng, lat, timestamp })
    .onsuccess = () => {
      $("infoFormOverlay").classList.remove("active");
      $("infoForm").classList.remove("active");
      $("infoTitle").value = "";
      $("infoDescription").value = "";
      $("preview").src = "";
      loadAllMarkers();
    };
}

// — Refresh info list in panel —
function refreshInfoList() {
  const tx = db.transaction("infos", "readonly");
  tx.objectStore("infos").getAll().onsuccess = e => {
    const list = $("infoList");
    // Filtrar solo registros con coordenadas válidas
    const validInfos = e.target.result.filter(info =>
      !isNaN(parseFloat(info.lat)) && !isNaN(parseFloat(info.lng))
    );
    list.innerHTML = validInfos.map(info => {
      const lat = parseFloat(info.lat);
      const lng = parseFloat(info.lng);
      return `
        <div class="info-item">
          <h3>${info.title}</h3>
          <div class="info-meta">
            ${new Date(info.timestamp).toLocaleString()} · Type: ${info.type}<br>
            Lat:${lat.toFixed(6)}, Lon:${lng.toFixed(6)}
          </div>
          <p>${info.description}</p>
          ${info.image ? `<img src="${info.image}" class="info-image" alt="${info.title}">` : ''}
          <button class="btn-delete" data-id="${info.id}">Delete</button>
        </div>
      `;
    }).join('');
    list.querySelectorAll(".btn-delete").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.id);
        db.transaction("infos", "readwrite").objectStore("infos").delete(id)
          .onsuccess = refreshInfoList;
      };
    });
  };
}

// — Utilities —
function debounce(fn, delay = 100) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
function showModal(msg) {
  $("alert-message").textContent = msg;
  $("alertModal").classList.add("active");
}

// — Dynamic marker & URL —
function placeOrMoveMarker([lat, lon]) {
  if (!dynamicMarker) {
    dynamicMarker = L.marker([lat, lon], { draggable: true }).addTo(map2D)
      .bindPopup('Point your destination here. Drag to move.')
      .openPopup();
    dynamicMarker.on('moveend', e => {
      const p = e.target.getLatLng();
      updateURL(p.lat, p.lng, $("origin").value);
    });
  } else {
    dynamicMarker.setLatLng([lat, lon]).openPopup();
  }
}

function updateURL(lat, lon, originKey) {
  const u = new URL(window.location);
  u.searchParams.set('lat', lat.toFixed(6));
  u.searchParams.set('lon', lon.toFixed(6));
  if (originKey) u.searchParams.set('origin', originKey);
  window.history.replaceState({}, '', u);
}
function checkURLParams() {
  const p = new URLSearchParams(window.location.search);
  const lat = parseFloat(p.get('lat')), lon = parseFloat(p.get('lon')), ok = p.get('origin');
  if (!isNaN(lat) && !isNaN(lon)) {
    placeOrMoveMarker([lat, lon]);
    map2D.setView([lat, lon], map2D.getZoom());
    if (ok) {
      $("origin").value = ok;
      if (ok === 'gps') {
        navigator.geolocation.getCurrentPosition(pos => {
          runRoute([[pos.coords.latitude, pos.coords.longitude]], [lat, lon], 'gps');
        });
      } else runRoute([locations[ok]], [lat, lon], ok);
    }
  }
}

// — Mobile menu —
function setupMobileMenu() {
  const toggle   = document.querySelector('.menu-toggle');
  const menu     = document.querySelector('.menu-list');
  const overlay  = document.querySelector('.menu-overlay');
  const closeBtn = document.querySelector('.menu-close');

  if (toggle && menu && overlay && closeBtn) {
    toggle.addEventListener('click', () => {
      menu.classList.add('active');
      overlay.classList.add('active');
      menu.focus();
    });
    closeBtn.addEventListener('click', () => {
      menu.classList.remove('active');
      overlay.classList.remove('active');
      toggle.focus();
    });
    overlay.addEventListener('click', () => {
      menu.classList.remove('active');
      overlay.classList.remove('active');
    });
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        toggle.focus();
      }
    });
  }

  const mapping = {
    'btn2D-mobile':       'btn2D',
    'btn3D-mobile':       'btn3D',
    'btnStartGPS-mobile': 'btnStartGPS',
    'btnFollow-mobile':   'btnFollow',
    'btnGo-mobile':       'btnGo',
    'btnNavMarker-mobile':'btnNavMarker',
    'btnAddInfo-mobile':  'btnAddInfo',
    'btnViewInfos-mobile':'btnViewInfos',
    'btnShare-mobile':    'btnShare'
  };
  Object.entries(mapping).forEach(([mid, did]) => {
    const mob = document.getElementById(mid);
    const desk = document.getElementById(did);
    if (mob && desk) mob.onclick = () => desk.click();
  });
}

// — Sync mobile/desktop selects —
function syncSelectOptions(srcId, destId) {
  const src  = document.getElementById(srcId);
  const dest = document.getElementById(destId);
  if (!src || !dest) return;
  dest.innerHTML     = src.innerHTML;
  dest.selectedIndex = src.selectedIndex;
  dest.onchange = () => {
    src.selectedIndex = dest.selectedIndex;
    src.dispatchEvent(new Event('change'));
  };
  src.onchange = () => {
    dest.selectedIndex = src.selectedIndex;
  };
}

// — Start when DOM is ready —
// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  initManualGPSCorrection();
});
