
// =========================
// Campus & POIs Data
// =========================
const locations = {
  Entrance: [43.225018, 0.052059],
  Library: [43.224945, 0.051151],
  Cafeteria: [43.227491, 0.050948],
  GYM: [43.225022, 0.050141],
  Building_A: [43.225121, 0.051905],
  Building_C: [43.224918, 0.050762],
  Building_D: [43.224511, 0.051267],
  Building_E: [43.224897, 0.051205],
  Villa: [43.225722, 0.050753],
  Building_J: [43.226148, 0.050630],
  Building_K: [43.226481, 0.050634],
  Building_M: [43.223988, 0.050028],
  Building_IUFM: [43.224808, 0.049464],
  Observatoire: [43.223953, 0.049200],
  Département_Génie_Électrique: [43.225952, 0.048409],
  Département_Techniques: [43.226238, 0.049283],
  Département_Génie_Mécanique: [43.226579, 0.047749],
  Département_Gestion: [43.226727, 0.049311],
  Département_Multimédia: [43.227101, 0.049143],
  Département_Civil: [43.226198, 0.047592],
  Résidence_A: [43.227188, 0.051380],
  Résidence_B: [43.226901, 0.051519],
  Résidence_C: [43.226672, 0.051519],
  Résidence_D: [43.227049, 0.050050],
  Résidence_E: [43.227233, 0.050063],
  Résidence_F: [43.227397, 0.050192],
  Laboratory_L0: [43.225312, 0.050033],
  Laboratory_L1: [43.225728, 0.050033],
  Laboratory_L2: [43.226025, 0.050033],
  Laboratory_L3: [43.226203, 0.050033],
  Laboratory_L4: [43.226383, 0.050033]
};

// =========================
// Global Variables
// =========================
// Global variables for geolocation tracking
let currentPosition = null;
let manualCorrection = false;
let userMarker2D = null;
let gpsAccuracyCircle = null;
let userMarker3D = null;
let map2D = null;
let map3D = null;
let map3DInitialized = false;
let routingControl = null;
let currentRoute = null; // Store the current route layer
let infoMarkers = [];
let db = null;
let isInitialized = false;

// Geolocation retry variables
let geolocationRetryCount = 0;
const MAX_GEOLOCATION_RETRIES = 5;
let geolocationRetryTimer = null;
let lastKnownPosition = null;
let gpsWatchId = null; // Store last known good position

// DOM Helper with null check and caching
const $ = (selector) => {
  if (typeof selector === 'string') {
    return document.querySelector(selector);
  }
  return selector; // If it's already an element, return it
};

const $$ = (selector) => {
  if (typeof selector === 'string') {
    return document.querySelectorAll(selector);
  }
  return [selector]; // If it's already an element, return it in an array
};

// Cache for frequently accessed elements
const elementCache = new Map();

const getCachedElement = (id) => {
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id);
};

// =========================
// IndexedDB: Initialize
// =========================
async function initDB() {
  if (!window.indexedDB) {
    console.warn('IndexedDB not supported');
    return null;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open('CampusMapDB', 3);
    
    request.onerror = (e) => {
      console.error('Database error:', e.target.error);
      resolve(null);
    };
    
    request.onsuccess = (e) => { 
      db = e.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('infos')) {
        const store = db.createObjectStore('infos', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function initMaps() {
  console.log('Initializing maps...');
  
  if (isInitialized) {
    console.log('Maps are already initialized');
    return;
  }

  try {
    // Inicializar mapa 2D
    const map2DContainer = document.getElementById('map2D');
    if (map2DContainer) {
      console.log('Creating intance of 2D map');
      map2D = L.map('map2D', {
        center: [43.22476, 0.05044],
        zoom: 17,
        zoomControl: false
      });

      console.log('Adding layer of 2D map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map2D);

      // Añadir controles de zoom
      L.control.zoom({ position: 'topright' }).addTo(map2D);
      console.log('2D Map correcly added');
    }

    // Inicializar mapa 3D
    const map3DContainer = document.getElementById('map3D');
    if (map3DContainer) {
      console.log('Doing instans of 3D map');
      map3D = new maplibregl.Map({
        container: 'map3D',
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=OskyrOiFGGaB6NMWJlcC',
        center: [0.05044, 43.22476],
        zoom: 17,
        pitch: 60,
        bearing: -20,
        antialias: true,
        interactive: true
      });

      map3D.on('load', () => {
        console.log('Map 3D reloaded');
        map3DInitialized = true;
        
        // Añadir controles de navegación
        map3D.addControl(new maplibregl.NavigationControl(), 'top-right');
        console.log('Control of 3D navigation added');
      });
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error of initialization:', error);
  }
}

// =========================
// Start GPS Tracking
// =========================
function startGPSTracking(showSuccess = true) {
  // Clear any existing watch and retry timer
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
  
  if (geolocationRetryTimer) {
    clearTimeout(geolocationRetryTimer);
    geolocationRetryTimer = null;
  }

  console.log('Starting GPS tracking...');
  
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    const errorMsg = 'Geolocation is not supported by your browser';
    console.error(errorMsg);
    showNotification(errorMsg, 'error');
    return false;
  }

  // Show loading state
  const gpsButton = document.getElementById('btnStartGPS');
  const gpsButtonMobile = document.getElementById('btnStartGPS-mobile');
  
  const setGPSButtonState = (state) => {
    [gpsButton, gpsButtonMobile].forEach(btn => {
      if (!btn) return;
      btn.disabled = state === 'loading';
      btn.innerHTML = state === 'loading' ? 
        '<span class="spinner"></span> Locating...' : 
        '<span class="gps-icon">📍</span> My Location';
    });
  };

  setGPSButtonState('loading');
  showNotification('Getting your location...', 'info', 2000);

  const geolocationOptions = {
    enableHighAccuracy: true,  // Use GPS if available
    maximumAge: 0,            // Don't use cached position, always get a fresh one
    timeout: 10000,           // 10 second timeout (reduced for faster fallback)
    maximumAge: 0             // Force fresh position
  };

  // Function to handle successful position updates
  const handlePositionSuccess = (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    console.log('GPS position updated:', { latitude, longitude, accuracy });
    
    // Update position
    updateUserPosition(latitude, longitude, accuracy);
    
    // Update UI for GPS mode
    updateGPSModeUI(false); // false for automatic mode
    
    // Reset retry counter on successful updates
    if (geolocationRetryCount > 0) {
      console.log('GPS connection restored after', geolocationRetryCount, 'retries');
      showNotification('GPS connection restored', 'success', 3000);
      geolocationRetryCount = 0;
    }
    
    // Save as last known position
    lastKnownPosition = { lat: latitude, lng: longitude, accuracy };
    
    // Update GPS button state when position is acquired
    setGPSButtonState('success');
  };

  // Function to handle position errors
  const handlePositionError = (error) => {
    console.error('GPS tracking error:', error);
    
    // Increment retry counter
    geolocationRetryCount++;
    
    // Show appropriate error message
    let errorMessage = 'Error getting location: ';
    let shouldRetry = true;
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location services in your browser settings.';
        shouldRetry = false;
        setGPSButtonState('error');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable. ';
        if (geolocationRetryCount <= MAX_GEOLOCATION_RETRIES) {
          errorMessage += `Retrying (${geolocationRetryCount}/${MAX_GEOLOCATION_RETRIES})...`;
        } else {
          errorMessage += 'Max retries reached.';
          shouldRetry = false;
        }
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. ';
        if (geolocationRetryCount < MAX_GEOLOCATION_RETRIES) {
          errorMessage += `Retrying (${geolocationRetryCount + 1}/${MAX_GEOLOCATION_RETRIES})...`;
          // Reduce accuracy for faster response on retry
          geolocationOptions.enableHighAccuracy = geolocationRetryCount < 2;
        } else {
          errorMessage += 'Using approximate location.';
          shouldRetry = false;
          // Fall back to IP-based location or default position
          if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                updateUserPosition(pos.coords.latitude, pos.coords.longitude, 10000);
              },
              () => {
                // If even IP-based location fails, use default position
                updateUserPosition(43.225018, 0.052059, 5000, false);
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
          }
        }
        break;
      default:
        errorMessage = 'Unknown error occurred. ';
        if (geolocationRetryCount >= MAX_GEOLOCATION_RETRIES) {
          shouldRetry = false;
        }
    }
    
    // Show notification with retry count if applicable
    if (shouldRetry && geolocationRetryCount <= MAX_GEOLOCATION_RETRIES) {
      showNotification(errorMessage, 'warning');
      // Auto-retry with exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
      const retryDelay = Math.min(1000 * Math.pow(2, geolocationRetryCount - 1), 30000);
      console.log(`Retrying GPS in ${retryDelay}ms (attempt ${geolocationRetryCount}/${MAX_GEOLOCATION_RETRIES})`);
      geolocationRetryTimer = setTimeout(() => startGPSTracking(false), retryDelay);
    } else if (!shouldRetry) {
      showNotification(errorMessage, 'error');
      setGPSButtonState('error');
    }
    
    // If we have a last known position, use it
    if (lastKnownPosition) {
      console.log('Using last known position due to error');
      updateUserPosition(
        lastKnownPosition.lat,
        lastKnownPosition.lng,
        (lastKnownPosition.accuracy || 50) * 1.5 // Increase uncertainty with fallback
      );
    } else if (geolocationRetryCount >= MAX_GEOLOCATION_RETRIES) {
      // If we've exhausted retries and have no last known position, use default
      console.log('Using default position after max retries');
      updateUserPosition(43.225018, 0.052059, 100, false);
    }
  };

  // Function to start continuous position watching
  const startWatching = () => {
    console.log('Starting continuous position tracking...');
    
    // Start watching position
    gpsWatchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      geolocationOptions
    );
  };

  console.log('Getting initial position...');
  
  // Try to get initial position with high accuracy
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log('Initial GPS position obtained:', { latitude, longitude, accuracy });
      
      // Update current position
      if (updateUserPosition(latitude, longitude, accuracy)) {
        showNotification('GPS activated', 'success', 3000);
      }
      
      // Save as last known position
      lastKnownPosition = { lat: latitude, lng: longitude, accuracy };
      
      // Start continuous tracking
      startWatching();
    },
    (error) => {
      console.error('Error getting initial position:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Error getting location: ';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location services in your browser settings.';
          setGPSButtonState('error');
          showNotification(errorMessage, 'error');
          return;
          
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Using last known position if available.';
          break;
          
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Using last known position if available.';
          break;
          
        default:
          errorMessage = 'Unknown error occurred while getting location.';
      }
      
      showNotification(errorMessage, 'warning');
      setGPSButtonState('error');
      
      // Try to use last known position if available
      if (lastKnownPosition) {
        console.log('Using last known position');
        updateUserPosition(
          lastKnownPosition.lat,
          lastKnownPosition.lng,
          lastKnownPosition.accuracy * 1.5, // Increase uncertainty
          false
        );
      } else {
        // Use default position as fallback
        console.log('Using default position');
        updateUserPosition(43.225018, 0.052059, 100, false);
      }
      
      // Start watching anyway, it might recover
      startWatching();
    },
    geolocationOptions
  );
  
  return true;
}

// Helper function to handle geolocation errors
function handleGeolocationError(error) {
  let errorMessage = 'Error of geolocation: ';
  let errorType = 'error';
  let showToUser = true;
  let shouldRetry = false;
  let retryDelay = 3000; // 3 seconds initial delay
  
  // Clear any existing retry timer
  if (geolocationRetryTimer) {
    clearTimeout(geolocationRetryTimer);
    geolocationRetryTimer = null;
  }
  
  // Handle different error types
  switch(error.code) {
    case error.PERMISSION_DENIED:
      errorMessage = 'Permission denied. Please enable location services in your browser settings.';
      errorType = 'warning';
      console.log('User denied the permission');
      showToUser = true; // Always show permission errors
      shouldRetry = false; // Don't retry if permission is denied
      break;
      
    case error.POSITION_UNAVAILABLE:
      errorMessage = 'The location information is unavailable. Trying to connect...';
      errorType = 'info';
      showToUser = geolocationRetryCount === 0; // Only show the first error
      shouldRetry = true;
      break;
      
    case error.TIMEOUT:
      errorMessage = 'The location retrieval is taking longer than expected. Retrying...';
      errorType = 'info';
      showToUser = geolocationRetryCount % 3 === 0; // Show every 3rd timeout error
      shouldRetry = true;
      break;
      
    default:
      errorMessage = `Error of destination: ${error.message || 'Error unknown'}. Trying to recover...`;
      errorType = 'warning';
      shouldRetry = true;
  }

  console.error('Error of geolocation:', error.code, error.message);

  // Show notification to user if needed
  if (showToUser) {
    showNotification(errorMessage, errorType, 5000);
  }
  
  // Only update position if we have a valid last known position
  if (currentPosition && 
      !isNaN(currentPosition.lat) && isFinite(currentPosition.lat) &&
      !isNaN(currentPosition.lng) && isFinite(currentPosition.lng) &&
      currentPosition.lat >= -90 && currentPosition.lat <= 90 &&
      currentPosition.lng >= -180 && currentPosition.lng <= 180) {
    
    lastKnownPosition = {
      lat: currentPosition.lat,
      lng: currentPosition.lng,
      accuracy: Math.min(1000, (currentPosition.accuracy || 100) * 1.5), // Cap at 1000m
      timestamp: Date.now()
    };
    
    console.log('Using last known position due to GPS error');
    
    // Update the position with increased uncertainty
    updateUserPosition(
      lastKnownPosition.lat, 
      lastKnownPosition.lng, 
      lastKnownPosition.accuracy,
      false
    );
    
    // If we're not in manual mode, show a notification
    if (!manualCorrection) {
      showNotification(
        `Using last known position (accuracy: ${Math.round(lastKnownPosition.accuracy)}m)`, 
        'info', 
        3000
      );
    }
  } else if (!lastKnownPosition || 
             isNaN(lastKnownPosition.lat) || 
             isNaN(lastKnownPosition.lng) ||
             lastKnownPosition.lat < -90 || 
             lastKnownPosition.lat > 90 ||
             lastKnownPosition.lng < -180 || 
             lastKnownPosition.lng > 180) {
    
    // If we don't have a valid last known position, use the default location
    console.log('No valid known position available, using default location');
    updateUserPosition(43.225018, 0.052059, 100, false); // Default location
  }
  
  // Retry logic with exponential backoff
  if (shouldRetry && geolocationRetryCount < MAX_GEOLOCATION_RETRIES) {
    geolocationRetryCount++;
    
    // Calculate next retry delay with exponential backoff (max 30 seconds)
    retryDelay = Math.min(30000, 3000 * Math.pow(2, geolocationRetryCount));
    
    console.log(`Trying to obtain location (${geolocationRetryCount}/${MAX_GEOLOCATION_RETRIES}) in ${retryDelay}ms...`);
    
    // Show user that we're retrying
    if (geolocationRetryCount % 2 === 1) { // Only show every other retry to avoid notification spam
      showNotification(`Trying to connect to GPS... (${geolocationRetryCount}/${MAX_GEOLOCATION_RETRIES})`, 'info', 3000);
    }
    
    geolocationRetryTimer = setTimeout(() => {
      console.log(`Tried #${geolocationRetryCount} after ${retryDelay}ms`);
      startGPSTracking();
    }, retryDelay);
    
  } else if (geolocationRetryCount >= MAX_GEOLOCATION_RETRIES) {
    // Show final message after exhausting all retries
    showNotification('Its not possible to obtain GPS location. Using default location.', 'warning', 5000);
    
    // Reset retry counter for future attempts
    geolocationRetryCount = 0;
  }
  
  return false;
}

function centerMapOnPosition(lat, lng) {
  if (!map2D) return;
  
  map2D.setView([lat, lng], map2D.getZoom(), {
    animate: true,
    duration: 0.5
  });
  
  // If we have a 3D view, update it as well
  if (map3D) {
    map3D.flyTo({
      center: [lng, lat],
      essential: true
    });
  }
}

function updateUserPosition(lat, lng, accuracy = 10, fromDrag = false) {
  // Convert to numbers and validate
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  // Enhanced validation
  if (isNaN(latNum) || isNaN(lngNum) || 
      !isFinite(latNum) || !isFinite(lngNum) ||
      latNum < -90 || latNum > 90 || 
      lngNum < -180 || lngNum > 180) {
    console.warn('Invalid coordinates received:', { lat, lng });
    return false;
  }

  // Validate accuracy (should be a positive number)
  const validAccuracy = Math.max(1, Math.min(1000, Math.abs(Number(accuracy) || 10)));
  
  console.log(`Updating position to: ${latNum}, ${lngNum} (accuracy: ${validAccuracy}m)`);
  
  // Update current position
  const newPosition = { 
    lat: latNum, 
    lng: lngNum, 
    accuracy: validAccuracy,
    timestamp: Date.now()
  };
  
  // Only update if position has changed significantly (about 1.1 meters at equator)
  const positionChanged = !currentPosition || 
    Math.abs(currentPosition.lat - latNum) > 0.00001 || 
    Math.abs(currentPosition.lng - lngNum) > 0.00001;
  
  if (!positionChanged) {
    return true; // No need to update if position hasn't changed
  }
  
  currentPosition = newPosition;
  
  // Update UI elements
  try {
    updateCoordinatesDisplay(latNum, lngNum);
    
    // Update map markers with error handling
    if (map2D) {
      try {
        update2DMarker(latNum, lngNum, validAccuracy, fromDrag);
      } catch (e) {
        console.error('Error updating 2D marker:', e);
      }
    }
    
    if (map3D) {
      try {
        update3DMarker(latNum, lngNum, validAccuracy);
      } catch (e) {
        console.error('Error updating 3D marker:', e);
      }
    }
    
    // Auto-center the map if we're not in manual mode and this isn't from a drag event
    if (!manualCorrection && !fromDrag) {
      try {
        centerMapOnPosition(latNum, lngNum);
      } catch (e) {
        console.error('Error centering map:', e);
      }
    }
    
    // Update last known good position
    lastKnownPosition = { ...newPosition };
    
    return true;
  } catch (error) {
    console.error('Error in updateUserPosition:', error);
    // Only show notification for a small percentage of errors to avoid spamming the user
    if (Math.random() < 0.1) {
      showNotification('Error updating position. Some features may not work correctly.', 'warning');
    }
    return false;
  }
}

// =========================
// Update 2D Marker
// =========================
function update2DMarker(lat, lng, accuracy, fromDrag = false) {
  // Debug log for mobile touch support
  console.log('update2DMarker called', { 
    lat, 
    lng, 
    accuracy, 
    fromDrag, 
    manualCorrection,
    hasMap2D: !!map2D,
    hasLeaflet: !!L,
    hasUserMarker: !!userMarker2D
  });
  
  try {
    if (!map2D || !L) {
      console.warn('Map2D or Leaflet not initialized');
      return;
    }

    // Validate coordinates before proceeding
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates in update2DMarker:', { lat, lng });
      return;
    }

    const position = [lat, lng];
    
    // Create marker if it doesn't exist
    if (!userMarker2D) {
      try {
        // Create marker with enhanced touch support
        userMarker2D = L.marker(position, {
          draggable: manualCorrection,
          bubblingMouseEvents: true,
          tap: true,
          keyboard: false,
          title: manualCorrection ? 'Drag to set position' : 'Your location',
          icon: L.divIcon({
            className: 'user-location-marker' + (manualCorrection ? ' manual-mode' : ''),
            html: '<div class="pulse"></div>',
            iconSize: [32, 32], // Slightly larger for better touch targets
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          })
        }).addTo(map2D);
        
        // Enable touch interaction
        if (L.Browser.touch) {
          userMarker2D.options.touchable = true;
          if (userMarker2D._icon) {
            userMarker2D._icon.style.touchAction = 'none';
            userMarker2D._icon.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
            userMarker2D._icon.style['-webkit-user-select'] = 'none';
            userMarker2D._icon.style['-webkit-user-drag'] = 'none';
          }
        }

        // Enhanced drag start handler
        const onDragStart = function(e) {
          console.log('Drag start event:', e.type);
          
          // Prevent default for touch events
          if (e.type === 'touchstart' && e.originalEvent) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
          }
          
          // Disable map dragging while moving the marker
          if (map2D && map2D.dragging) {
            map2D.dragging.disable();
          }
          
          // Add visual feedback
          const icon = this.getElement();
          if (icon) {
            icon.classList.add('dragging');
            icon.style.zIndex = '1001'; // Ensure it's above other elements
          }
          
          return false;
        };

        // Enhanced drag movement handler
        const onDragMove = function(e) {
          try {
            // Prevent default for touch events
            if (e.originalEvent && e.originalEvent.type === 'touchmove') {
              e.originalEvent.preventDefault();
              e.originalEvent.stopPropagation();
            }
            
            const pos = this.getLatLng();
            console.log('Dragging to:', pos);
            
            if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
              // Update position immediately for smoother dragging
              updateUserPosition(pos.lat, pos.lng, accuracy, true);
            }
          } catch (dragError) {
            console.error('Error in drag handler:', dragError);
          }
          return false;
        };

        // Enhanced drag end handler
        const onDragEnd = function(e) {
          console.log('Drag end event:', e.type);
          
          try {
            // Prevent default for touch events
            if (e.type === 'touchend' && e.originalEvent) {
              e.originalEvent.preventDefault();
              e.originalEvent.stopPropagation();
            }
            
            // Re-enable map dragging
            if (map2D && map2D.dragging) {
              map2D.dragging.enable();
            }
            
            // Remove visual feedback
            const icon = this.getElement();
            if (icon) {
              icon.classList.remove('dragging');
              icon.style.zIndex = '1000';
            }
            
            // Final position update
            const pos = this.getLatLng();
            if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
              updateUserPosition(pos.lat, pos.lng, accuracy, true);
              
              // Show notification on mobile when position is set
              if (L.Browser.mobile) {
                showNotification(
                  `Position set to: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`,
                  'success',
                  2000
                );
              }
            }
          } catch (error) {
            console.error('Error in drag end handler:', error);
          }
          return false;
        };

        // Set up event listeners
        userMarker2D.on('dragstart touchstart', onDragStart);
        userMarker2D.on('drag touchmove', onDragMove);
        userMarker2D.on('dragend touchend', onDragEnd);
        
        // Add touch-specific event listeners for better mobile support
        if (L.Browser.touch) {
          // Add touch-specific handlers that prevent default behavior
          const preventDefault = function(e) {
            if (e.cancelable) {
              e.preventDefault();
              e.stopPropagation();
            }
          };
          
          // Add touch listeners to the marker icon
          userMarker2D.on('add', function() {
            const icon = this.getElement();
            if (icon) {
              // Prevent default touch behaviors that might interfere with dragging
              icon.addEventListener('touchstart', preventDefault, { passive: false });
              icon.addEventListener('touchmove', preventDefault, { passive: false });
              icon.addEventListener('touchend', preventDefault, { passive: false });
              
              // Ensure the marker is above other elements
              icon.style.zIndex = '1000';
              
              // Make sure the marker is interactive on mobile
              icon.style.pointerEvents = 'auto';
            }
          });
        }
        
        console.log('2D marker created with touch support');
      } catch (markerError) {
        console.error('Error creating 2D marker:', markerError);
      }
    } else {
      // Update existing marker position
      try {
        userMarker2D.setLatLng(position);
        
        // Update draggable state if needed
        if (userMarker2D.dragging) {
          if (manualCorrection) {
            userMarker2D.dragging.enable();
          } else {
            userMarker2D.dragging.disable();
          }
        }
        
        // Update marker appearance based on mode
        const icon = userMarker2D.getElement();
        if (icon) {
          if (manualCorrection) {
            icon.classList.add('manual-mode');
            icon.style.cursor = 'move';
            icon.title = 'Drag to set position';
          } else {
            icon.classList.remove('manual-mode');
            icon.style.cursor = '';
            icon.title = 'Your location';
          }
        }
      } catch (updateError) {
        console.error('Error updating 2D marker:', updateError);
      }
    }
    
    // Update accuracy circle if accuracy is provided and not from drag
    if (typeof accuracy === 'number' && !isNaN(accuracy) && !fromDrag) {
      try {
        updateAccuracyCircle(lat, lng, accuracy);
      } catch (circleError) {
        console.error('Error updating accuracy circle:', circleError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in update2DMarker:', error);
    return false;
  }
}

// Center map if needed and not in manual correction mode
function centerMapOnMarker(lat, lng, fromDrag = false) {
  if (fromDrag || manualCorrection || !map2D) return;
  
  try {
    const currentZoom = map2D.getZoom();
    const flyToOptions = {
      animate: true,
      duration: 1,
      easeLinearity: 0.25
    };
    
    map2D.flyTo([lat, lng], Math.min(currentZoom, 18), flyToOptions);
  } catch (flyToError) {
    console.error('Error centering map:', flyToError);
  }
}

// =========================
// Update 3D Marker
// =========================
function update3DMarker(lat, lng, accuracy) {
  try {
    // Check if map is initialized
    if (!map3D || !map3DInitialized || !map3D.getSource) {
      console.warn('3D map not properly initialized');
      return;
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates in update3DMarker:', { lat, lng });
      return;
    }

    // Update the GeoJSON source for the user location
    try {
      const source = map3D.getSource('user-location');
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {}
        });
      } else {
        console.warn('User location source not found in 3D map');
      }
    } catch (sourceError) {
      console.error('Error updating 3D marker source:', sourceError);
    }

    // Create or update the 3D marker
    if (!userMarker3D) {
      try {
        const el = document.createElement('div');
        el.className = 'user-location-marker-3d' + (manualCorrection ? ' manual-mode' : '');
        el.innerHTML = '<div class="pulse"></div>';
        el.style.width = el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.background = manualCorrection ? '#EA4335' : '#4285F4';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        el.style.cursor = manualCorrection ? 'move' : 'default';
        el.style.pointerEvents = 'auto';
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', 'Your location');
        el.setAttribute('tabindex', '0');

        userMarker3D = new maplibregl.Marker({
          element: el,
          draggable: manualCorrection
        }).setLngLat([lng, lat]).addTo(map3D);

        if (manualCorrection) {
          userMarker3D.on('dragend', () => {
            try {
              const pos = userMarker3D.getLngLat();
              if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
                updateUserPosition(pos.lat, pos.lng, currentPosition?.accuracy || 10, true);
              }
            } catch (dragError) {
              console.error('Error in 3D marker dragend handler:', dragError);
            }
          });
        }
      } catch (markerError) {
        console.error('Error creating 3D marker:', markerError);
      }
    } else {
      try {
        userMarker3D.setLngLat([lng, lat]);
      } catch (setPosError) {
        console.error('Error updating 3D marker position:', setPosError);
      }
    }
  } catch (error) {
    console.error('Error in update3DMarker:', error);
  }
}

// =========================
// Update Accuracy Circle
// =========================
function updateAccuracyCircle(lat, lng, accuracy) {
  try {
    // Validate inputs
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates in updateAccuracyCircle:', { lat, lng });
      return;
    }

    // Ensure accuracy is a valid number between 1 and 1000 meters
    const validAccuracy = Math.max(1, Math.min(1000, Math.abs(Number(accuracy) || 10)));
    const radius = Math.max(validAccuracy, 5);
    
    if (!map2D || !L) {
      console.warn('Map2D or Leaflet not available for accuracy circle');
      return;
    }

    try {
      const circleColor = manualCorrection ? '#EA4335' : '#4285F4';
      const circleStyle = {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.2,
        weight: 1,
        opacity: 0.7,
        interactive: false
      };

      if (!gpsAccuracyCircle) {
        // Create the circle if it doesn't exist
        gpsAccuracyCircle = L.circle([lat, lng], {
          radius: radius,
          ...circleStyle
        }).addTo(map2D);
      } else {
        // Update existing circle
        gpsAccuracyCircle.setLatLng([lat, lng]);
        gpsAccuracyCircle.setRadius(radius);
        gpsAccuracyCircle.setStyle(circleStyle);
      }
    } catch (circleError) {
      console.error('Error updating accuracy circle:', circleError);
      // Try to clean up and recreate if there was an error
      try {
        if (gpsAccuracyCircle && map2D) {
          map2D.removeLayer(gpsAccuracyCircle);
        }
        gpsAccuracyCircle = null;
      } catch (cleanupError) {
        console.error('Error cleaning up accuracy circle:', cleanupError);
      }
      return; // Don't proceed to refresh info points if there was an error
    }
    
    // Refresh info points if the info list modal is open
    try {
      const infoListElement = document.getElementById('infoListModal');
      if (infoListElement && infoListElement.style.display === 'flex') {
        loadInfoPoints();
      }
    } catch (refreshError) {
      console.error('Error refreshing info points:', refreshError);
    }
  } catch (error) {
    console.error('Unexpected error in updateAccuracyCircle:', error);
  }
}

// =========================
// Initialize Modals
// =========================
function initModals() {
  const addInfoModal = document.getElementById('addInfoModal');
  const infoListModal = document.getElementById('infoListModal');
  
  if (!addInfoModal || !infoListModal) {
    console.error('Required modals not found in the DOM');
    return null;
  }

  // Close modals when clicking the close button
  document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
      addInfoModal.style.display = 'none';
      infoListModal.style.display = 'none';
      document.body.style.overflow = '';
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === addInfoModal || event.target === infoListModal) {
      event.target.style.display = 'none';
      document.body.style.overflow = '';
    }
  });
  
  // Handle form submission
  const infoForm = document.getElementById('addInfoForm');
  if (infoForm) {
    infoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveInfoPoint();
      infoForm.reset();
      addInfoModal.style.display = 'none';
      document.body.style.overflow = '';
      
      // Reset preview
      const preview = document.getElementById('imagePreview');
      if (preview) {
        preview.src = '';
        preview.style.display = 'none';
      }
    });
  }
  
  // Handle file input preview
  const fileInput = document.getElementById('infoImage');
  const previewContainer = document.createElement('div');
  
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    });
  }
  
  return { addInfoModal, infoListModal };
}

// Initialize modals when the DOM is loaded
let addInfoModal, infoListModal;

// Share current route
function shareRoute() {
  return new Promise((resolve, reject) => {
    try {
      // Helper function to safely get coordinates from a point
      const getPointCoords = (point) => {
        if (!point) return null;
        
        // Handle L.LatLng objects (Leaflet)
        if (typeof point.lat === 'function' && typeof point.lng === 'function') {
          return {
            lat: point.lat(),
            lng: point.lng()
          };
        }
        
        // Handle plain objects with lat/lng or lat/lon
        if (typeof point === 'object') {
          const lat = point.lat || (point.latitude !== undefined ? point.latitude : null);
          const lng = point.lng || point.lon || (point.longitude !== undefined ? point.longitude : null);
          
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            return { lat: Number(lat), lng: Number(lng) };
          }
        }
        
        return null;
      };
      
      // Try to get route from currentRoute or from form inputs
      let start = null, end = null;
      
      // Try to get from current route if available
      if (window.currentRoute && typeof window.currentRoute.getWaypoints === 'function') {
        try {
          const routePoints = window.currentRoute.getWaypoints();
          if (Array.isArray(routePoints) && routePoints.length >= 2) {
            start = getPointCoords(routePoints[0]);
            end = getPointCoords(routePoints[routePoints.length - 1]);
          }
        } catch (e) {
          console.warn('Error getting waypoints from current route:', e);
        }
      }
      
      // If no route is active or couldn't get points, try to get from form inputs
      if (!start || !end) {
        // Try mobile inputs first, fall back to desktop
        const originSelect = document.getElementById('mobile-origin') || document.getElementById('origin');
        const destSelect = document.getElementById('mobile-destination') || document.getElementById('destination');
        
        if (originSelect && destSelect && originSelect.value && destSelect.value) {
          try {
            const origin = parseLocation(originSelect.value);
            const destination = parseLocation(destSelect.value);
            
            if (origin && origin.coords && Array.isArray(origin.coords) && origin.coords.length >= 2) {
              start = { lat: Number(origin.coords[0]), lng: Number(origin.coords[1]) };
            }
            if (destination && destination.coords && Array.isArray(destination.coords) && destination.coords.length >= 2) {
              end = { lat: Number(destination.coords[0]), lng: Number(destination.coords[1]) };
            }
          } catch (e) {
            console.error('Error parsing location from form inputs:', e);
          }
        }
      }
      
      // Validate coordinates before proceeding
      const isValidCoordinate = (coord) => {
        return coord && 
               typeof coord.lat === 'number' && !isNaN(coord.lat) && 
               typeof coord.lng === 'number' && !isNaN(coord.lng) &&
               Math.abs(coord.lat) <= 90 && 
               Math.abs(coord.lng) <= 180;
      };
      
      if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
        const errorMsg = 'No valid route to share. Please set both origin and destination first.';
        console.error(errorMsg, { start, end });
        showNotification(errorMsg, 'warning');
        return reject(new Error('Invalid or missing coordinates'));
      }
      
      // Create a shareable URL with route parameters
      const url = new URL(window.location.href);
      url.searchParams.set('origin', `${start.lat},${start.lng}`);
      url.searchParams.set('destination', `${end.lat},${end.lng}`);
      
      // Add current position if available and valid
      if (currentPosition && 
          typeof currentPosition.lat === 'number' && !isNaN(currentPosition.lat) &&
          typeof currentPosition.lng === 'number' && !isNaN(currentPosition.lng)) {
        try {
          url.searchParams.set('lat', Number(currentPosition.lat).toFixed(6));
          url.searchParams.set('lng', Number(currentPosition.lng).toFixed(6));
        } catch (e) {
          console.warn('Error setting current position in URL:', e);
        }
      }
      
      // Use Web Share API if available (mobile)
      if (navigator.share) {
        navigator.share({
          title: 'Check out this route',
          text: `From: ${start.lat.toFixed(6)},${start.lng.toFixed(6)}\nTo: ${end.lat.toFixed(6)},${end.lng.toFixed(6)}`,
          url: url.toString()
        })
        .then(() => resolve())
        .catch(err => {
          // If sharing is cancelled or fails, fall back to clipboard
          if (err.name !== 'AbortError') {
            console.log('Sharing failed, falling back to clipboard:', err);
            return copyToClipboard(url.toString());
          }
          return Promise.reject(err);
        });
      } else {
        // Fallback for desktop
        return copyToClipboard(url.toString());
      }
    } catch (error) {
      console.error('Error sharing route:', error);
      showNotification('Failed to share route: ' + (error.message || 'Unknown error'), 'error');
      reject(error);
    }
  });
}

// Copy text to clipboard
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // Avoid scrolling to bottom
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        showNotification('Link copied to clipboard!', 'success');
        resolve();
      } else {
        throw new Error('Copy command was unsuccessful');
      }
    } catch (err) {
      document.body.removeChild(textarea);
      console.error('Failed to copy:', err);
      showNotification('Failed to copy link', 'error');
      reject(err);
    }
  });
}

// =========================
// Initialize App
// =========================
async function initApp() {
  console.log('Initializing application...');
  
  try {
    // Initialize modals
    console.log('Initializing modals...');
    const modals = initModals();
    if (modals) {
      addInfoModal = modals.addInfoModal;
      infoListModal = modals.infoListModal;
    }
    
    // Initialize image preview
    const fileInput = document.getElementById('infoImage');
    if (fileInput) {
      const previewContainer = document.createElement('div');
      previewContainer.style.marginTop = '10px';
      
      const preview = document.createElement('img');
      preview.id = 'imagePreview';
      preview.style.maxWidth = '100%';
      preview.style.maxHeight = '200px';
      preview.style.display = 'none';
      preview.style.borderRadius = '4px';
      
      // Insert preview container after file input
      fileInput.parentNode.insertBefore(previewContainer, fileInput.nextSibling);
      previewContainer.appendChild(preview);
      
      // Handle file input changes
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          // Check if file is an image
          if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            e.target.value = '';
            return;
          }
          
          // Check file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            e.target.value = '';
            return;
          }
          
          // Show preview
          const reader = new FileReader();
          reader.onload = function(event) {
            preview.src = event.target.result;
            preview.style.display = 'block';
          };
          reader.onerror = function() {
            showNotification('Error reading image file', 'error');
            preview.src = '';
            preview.style.display = 'none';
          };
          reader.readAsDataURL(file);
        } else {
          preview.src = '';
          preview.style.display = 'none';
        }
      });
    }
    
    // Initialize IndexedDB
    console.log('Initializing database...');
    await initDB();
    
    // Initialize maps
    console.log('Initializing maps...');
    await initMaps();
    
    // Initialize controls
    console.log('Initializing controls...');
    initControls();
    
    // Skip mobile menu initialization if mobile-menu.js is already loaded
    if (typeof MobileMenu === 'undefined') {
      console.log('Initializing mobile menu from app.js...');
      if (typeof initMobileMenu === 'function') {
        initMobileMenu();
      } else {
        console.error('Mobile menu initialization function not found');
      }
    } else {
      console.log('Mobile menu already initialized by mobile-menu.js');
    }
    
    // Add share route button handler
    const shareBtn = document.getElementById('btnShareRoute-mobile');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        shareRoute().catch(err => {
          console.error('Error in share route handler:', err);
        });
      });
    }
    
    // Initialize coordinates display
    console.log('Initializing coordinates display...');
    initCoordinatesDisplay();
    
    await loadInfoPoints();
    startGPSTracking();
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error initializing application', 'error');
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// =========================
// Initialize Mobile Menu
// =========================
function initMobileMenu() {
  console.log('Initializing mobile menu...');
  
  // Get elements with better error handling
  const getElement = (selector, required = true) => {
    const el = document.querySelector(selector);
    if (!el && required) {
      console.error(`Required element not found: ${selector}`);
    }
    return el;
  };
  
  const menuToggle = getElement('.menu-toggle');
  const menuOverlay = getElement('.menu-overlay');
  const menuClose = getElement('.menu-close');
  const menuList = getElement('.menu-list');
  const menuItems = document.querySelectorAll('.menu-list .menu-btn');
  const viewButtons = document.querySelectorAll('[data-view]');
  const gpsButton = getElement('#btnStartGPS-mobile');
  const manualGpsButton = getElement('#btnManualGPS-mobile');
  const routeButton = getElement('#btnGo-mobile');
  const addInfoButton = getElement('#btnAddInfo-mobile');
  const viewInfoButton = getElement('#btnViewInfos-mobile');
  const originSelect = getElement('#mobile-origin');
  const destinationSelect = getElement('#mobile-destination');

  console.log('Mobile menu elements:', { 
    menuToggle, 
    menuOverlay, 
    menuClose, 
    menuList,
    menuItemsCount: menuItems.length,
    viewButtons: viewButtons.length,
    gpsButton: !!gpsButton,
    manualGpsButton: !!manualGpsButton,
    routeButton: !!routeButton,
    addInfoButton: !!addInfoButton,
    viewInfoButton: !!viewInfoButton,
    originSelect: !!originSelect,
    destinationSelect: !!destinationSelect
  });

  // Check for required elements
  if (!menuToggle || !menuOverlay || !menuClose || !menuList) {
    console.error('Missing required menu elements');
    return false;
  }
  
  // Initialize menu state
  menuList.style.display = 'none';
  menuOverlay.style.display = 'none';
  
  // Add reliable click event to menu toggle button
  const handleMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  };
  
  // Remove any existing event listeners to avoid duplicates
  menuToggle.removeEventListener('click', handleMenuToggle);
  menuClose.removeEventListener('click', handleMenuToggle);
  
  // Add event listeners
  menuToggle.addEventListener('click', handleMenuToggle);
  menuClose.addEventListener('click', handleMenuToggle);
  
  // Close menu when clicking on overlay or pressing Escape
  const handleOverlayClick = (e) => {
    if (e.target === menuOverlay || e.key === 'Escape') {
      toggleMenu(false);
    }
  };
  
  menuOverlay.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleOverlayClick);
  
  // Cleanup event listeners when menu is closed
  const cleanup = () => {
    document.removeEventListener('keydown', handleOverlayClick);
  };
  
  // Add cleanup on page unload
  window.addEventListener('beforeunload', cleanup);

  // Track touch position for swipe gestures
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 50; // Minimum distance for swipe

  // Function to update the manual GPS button text
  function updateManualGpsButtonText() {
    if (manualGpsButton) {
      const icon = manualGpsButton.querySelector('.menu-icon') || document.createElement('span');
      icon.className = 'menu-icon';
      icon.textContent = '✋';
      
      const text = document.createElement('span');
      text.textContent = `Manual GPS: ${manualCorrection ? 'ON' : 'OFF'}`;
      
      manualGpsButton.innerHTML = '';
      manualGpsButton.appendChild(icon);
      manualGpsButton.appendChild(text);
    }
  }
  
  // Toggle menu with animation
  function toggleMenu(show) {
    if (show === undefined) {
      show = !menuList.classList.contains('visible');
    }

    if (show) {
      // Update button states before showing menu
      updateManualGpsButtonText();
      
      // Show overlay first
      menuOverlay.style.display = 'block';
      menuList.style.display = 'block';
      
      // Force reflow to enable transition
      void menuList.offsetWidth;
      
      // Add visible class with transition
      menuList.classList.add('visible');
      menuOverlay.classList.add('visible');
      
      // Lock body scroll
      document.body.classList.add('menu-open');
      
      // Update ARIA
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Close menu');
      
      // Focus first menu item for better keyboard navigation
      setTimeout(() => {
        const firstItem = menuItems[0];
        if (firstItem) firstItem.focus();
      }, 100);
      
    } else {
      // Remove visible class for transition
      menuList.classList.remove('visible');
      menuOverlay.classList.remove('visible');
      
      // Hide elements after transition
      setTimeout(() => {
        menuList.style.display = 'none';
        menuOverlay.style.display = 'none';
        document.body.classList.remove('menu-open');
      }, 300);
      
      // Update ARIA
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
      
      // Return focus to menu toggle
      menuToggle.focus();
    }
    
    console.log('Menu toggled:', show ? 'open' : 'closed');
  }

  // Touch event handlers for swipe gestures
  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function handleTouchMove(e) {
    if (!menuList.classList.contains('active')) return;
    e.preventDefault(); // Prevent scrolling when menu is open
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    
    // If swiped right and menu is open, close it
    if (diff > SWIPE_THRESHOLD && menuList.classList.contains('active')) {
      toggleMenu(false);
    }
  }

  // Add event listeners
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = menuList.classList.contains('active');
      toggleMenu(!isActive);
    });
    
    // Add touch events for mobile
    menuToggle.addEventListener('touchstart', handleTouchStart, { passive: true });
    menuToggle.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  if (menuClose) {
    menuClose.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(false);
    });
  }

  if (menuOverlay) {
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) {
        toggleMenu(false);
      }
    });
    
    // Add touch events for overlay
    menuOverlay.addEventListener('touchstart', handleTouchStart, { passive: true });
    menuOverlay.addEventListener('touchmove', handleTouchMove, { passive: false });
    menuOverlay.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // Handle view buttons
  viewButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const view = button.getAttribute('data-view');
      console.log(`Switching to ${view} view from mobile menu`);
      switchView(view);
      // Don't close menu when switching views
      e.stopPropagation();
    });
  });

  // Handle GPS button
  if (gpsButton) {
    gpsButton.addEventListener('click', (e) => {
      console.log('Start GPS button clicked in mobile menu');
      startGPSTracking();
      // Don't close menu when starting GPS
      e.stopPropagation();
    });
  }

  // Handle Manual GPS button
  if (manualGpsButton) {
    manualGpsButton.addEventListener('click', (e) => {
      console.log('Toggle Manual GPS button clicked in mobile menu');
      toggleManualGPS();
      // Update button text
      if (manualGpsButton) {
        manualGpsButton.innerHTML = `<span class="menu-icon">✋</span><span>Manual GPS: ${manualCorrection ? 'ON' : 'OFF'}</span>`;
      }
      // Don't close menu when toggling manual GPS
      e.stopPropagation();
    });
  }

  // Handle Route button
  if (routeButton && originSelect && destinationSelect) {
    routeButton.addEventListener('click', (e) => {
      console.log('Find Route button clicked in mobile menu');
      // Set origin and destination from select elements
      const origin = originSelect.value;
      const destination = destinationSelect.value;
      
      if (origin && destination) {
        // Find the corresponding select elements in the main UI and set their values
        const mainOriginSelect = document.getElementById('origin');
        const mainDestSelect = document.getElementById('destination');
        
        if (mainOriginSelect && mainDestSelect) {
          mainOriginSelect.value = origin;
          mainDestSelect.value = destination;
          // Pass the values directly to drawRoute
          drawRoute(origin, destination);
        } else {
          // If main selects not found, use mobile values directly
          drawRoute(origin, destination);
        }
      } else {
        showNotification('Please select an origin and destination', 'error');
      }
      
      // Don't close menu when finding route
      e.stopPropagation();
    });
  }

  // Handle Add Info button
  if (addInfoButton) {
    addInfoButton.addEventListener('click', (e) => {
      console.log('Add Info button clicked in mobile menu');
      // Find and click the add info button in the main UI
      const mainAddInfoBtn = document.getElementById('addInfoBtn');
      if (mainAddInfoBtn) {
        mainAddInfoBtn.click();
      }
      // Close menu after clicking
      toggleMenu(false);
    });
  }

  // Initialize location dropdowns with GPS option
  function initLocationDropdowns() {
    const originSelect = document.getElementById('origin');
    const destinationSelect = document.getElementById('destination');
    const mobileOriginSelect = document.getElementById('mobile-origin');
    const mobileDestSelect = document.getElementById('mobile-destination');
    
    if (!originSelect || !destinationSelect || !mobileOriginSelect || !mobileDestSelect) {
      console.warn('One or more select elements not found');
      return;
    }
    
    // Clear existing options and add default
    [originSelect, destinationSelect, mobileOriginSelect, mobileDestSelect].forEach(select => {
      if (select) {
        select.innerHTML = '<option value="">Select location</option>';
      }
    });
    
    // Add GPS option function
    const addGPSOption = (select) => {
      if (!select) return;
      const gpsOption = document.createElement('option');
      gpsOption.value = 'gps';
      gpsOption.textContent = 'My Location (GPS)';
      gpsOption.dataset.isGps = 'true';
      select.appendChild(gpsOption);
    };
    
    // Add all locations to dropdowns
    Object.entries(locations).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key.replace(/_/g, ' ');
      
      [originSelect, destinationSelect, mobileOriginSelect, mobileDestSelect].forEach(select => {
        if (select) select.appendChild(option.cloneNode(true));
      });
    });
    
    // Add GPS options
    [originSelect, destinationSelect, mobileOriginSelect, mobileDestSelect].forEach(select => {
      if (select) addGPSOption(select);
    });
  }

  // Handle View Info button
  if (viewInfoButton) {
    viewInfoButton.addEventListener('click', (e) => {
      console.log('View Info button clicked in mobile menu');
      const mainViewInfoBtn = document.getElementById('viewInfoBtn');
      if (mainViewInfoBtn) {
        mainViewInfoBtn.click();
      }
      toggleMenu(false);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuList.classList.contains('active')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768) {
        // Reset menu state on desktop
        menuList.classList.remove('active');
        menuOverlay.style.display = 'none';
        document.body.classList.remove('menu-open');
      }
    }, 250);
  });

  // Initialize menu state
  toggleMenu(false);
  return true;
}

// =========================
// Switch Between 2D and 3D Views
// =========================
function switchView(view) {
  console.group('Switching View');
  
  // Get DOM elements
  const map2DContainer = document.getElementById('map2D');
  const map3DContainer = document.getElementById('map3D');
  const btn2D = document.getElementById('btn2D');
  const btn3D = document.getElementById('btn3D');
  const btn2DMobile = document.getElementById('btn2D-mobile');
  const btn3DMobile = document.getElementById('btn3D-mobile');
  
  // Validate required elements
  const requiredElements = {
    'map2DContainer': map2DContainer,
    'map3DContainer': map3DContainer,
    'btn2D': btn2D,
    'btn3D': btn3D,
    'btn2DMobile': btn2DMobile,
    'btn3DMobile': btn3DMobile
  };
  
  // Log missing elements
  const missingElements = Object.entries(requiredElements)
    .filter(([_, el]) => !el)
    .map(([name]) => name);
    
  if (missingElements.length > 0) {
    console.error('Missing required elements:', missingElements);
    console.groupEnd();
    return;
  }
  
  console.log(`Switching to ${view} view...`);

  // Helper function to update UI state
  const updateUI = (show3D) => {
    try {
      // Update map visibility with smooth transition
      if (show3D) {
        map2DContainer.style.display = 'none';
        map3DContainer.style.display = 'block';
        map3DContainer.style.opacity = '0';
        setTimeout(() => {
          map3DContainer.style.opacity = '1';
          map3DContainer.style.transition = 'opacity 0.5s ease-in-out';
        }, 10);
      } else {
        map3DContainer.style.display = 'none';
        map2DContainer.style.display = 'block';
      }
      
      // Update button states
      [btn2D, btn2DMobile].forEach(btn => {
        if (btn) btn.classList.toggle('active', !show3D);
      });
      
      [btn3D, btn3DMobile].forEach(btn => {
        if (btn) btn.classList.toggle('active', show3D);
      });
      
      console.log(`UI updated for ${show3D ? '3D' : '2D'} view`);
      
      // Handle map-specific updates
      if (show3D) {
        // Initialize 3D map if not already done
        if (!map3DInitialized) {
          console.log('Initializing 3D map...');
          init3DMap();
          map3DInitialized = true;
        } else if (map3D) {
          // Force resize and update if already initialized
          setTimeout(() => {
            if (map3D) {
              map3D.resize();
              if (currentPosition) {
                console.log('Updating 3D map view to current position');
                map3D.flyTo({
                  center: [currentPosition.lng, currentPosition.lat],
                  zoom: 17,
                  essential: true,
                  duration: 1
                });
              }
            }
          }, 50);
        }
      } else {
        // Update 2D map view
        if (map2D && currentPosition) {
          console.log('Updating 2D map view');
          map2D.setView(
            [currentPosition.lat, currentPosition.lng],
            map2D.getZoom(),
            { animate: true, duration: 0.5 }
          );
        }
      }
    } catch (error) {
      console.error('Error updating UI:', error);
      console.group('Error Details');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.groupEnd();
    }
  };
  
  // Apply the view change
  if (view === '3D') {
    updateUI(true);
  } else {
    updateUI(false);
  }
  
  console.groupEnd();
}

// =========================
// Show Notification
// =========================
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
    
    // Add some basic styles
    const style = document.createElement('style');
    style.textContent = `
      #notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: opacity 0.3s, transform 0.3s;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      #notification.show {
        opacity: 1;
        transform: translateX(0);
      }
      #notification.info { background-color: #2196F3; }
      #notification.success { background-color: #4CAF50; }
      #notification.warning { background-color: #FF9800; }
      #notification.error { background-color: #F44336; }
    `;
    document.head.appendChild(style);
  }
  
  // Set notification content and style
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  // Auto-hide after 5 seconds
  clearTimeout(notification.timer);
  notification.timer = setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// =========================
// Initialize 3D Map
// =========================
function init3DMap() {
  console.log('Initializing 3D map...');
  
  try {
    const map3DContainer = document.getElementById('map3D');
    if (!map3DContainer) {
      throw new Error('3D map container not found');
    }
    
    // Ensure container is visible
    map3DContainer.style.display = 'block';
    
    // Initialize the map with improved settings and performance optimizations
    map3D = new maplibregl.Map({
      container: 'map3D',
      style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=OskyrOiFGGaB6NMWJlcC',
      center: [0.052059, 43.225018], // Default center (EPS coordinates)
      zoom: 16,
      pitch: 45,
      bearing: 0,
      antialias: true,
      attributionControl: true,
      hash: false,
      maxZoom: 22,
      minZoom: 12,
      maxPitch: 85,
      maxBounds: [
        [-0.1, 43.1], // Southwest coordinates
        [0.2, 43.3]   // Northeast coordinates
      ],
      interactive: true,
      trackResize: true,
      renderWorldCopies: true,
      // Performance optimizations
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
      // Improve interaction settings
      dragPan: true,
      touchPitch: true,
      touchZoomRotate: true,
      scrollZoom: true,
      boxZoom: true,
      doubleClickZoom: true,
      keyboard: true,
      // Disable some animations that might cause freezing
      fadeDuration: 0,
      // Optimizations
      optimizeForTerrain: false,
      localIdeographFontFamily: false,
      refreshExpiredTiles: false
    });
    
    // Enable all map interactions
    if (map3D.touchZoomRotate) {
      map3D.touchZoomRotate.enable({
        around: 'center'
      });
    }
    
    if (map3D.dragRotate) {
      map3D.dragRotate.enable();
    }
    
    // Add a small delay to ensure map is fully loaded
    map3D.once('load', () => {
      // Force a resize to ensure proper rendering
      setTimeout(() => {
        map3D.resize();
        
        // Re-enable all interactions after load
        if (map3D.touchZoomRotate) {
          map3D.touchZoomRotate.enable({
            around: 'center'
          });
        }
        
        if (map3D.dragPan) {
          map3D.dragPan.enable();
        }
        
        if (map3D.scrollZoom) {
          map3D.scrollZoom.enable();
        }
      }, 500);
    });
    
    // Add navigation control with position
    map3D.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');
    
    // Add scale control
    map3D.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');
    
    // Add geolocate control with improved settings
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 10000
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
      showUserLocation: true,
      fitBoundsOptions: {
        maxZoom: 18,
        duration: 2000
      }
    });
    
    map3D.addControl(geolocate);
    
    // Handle map load
    map3D.on('load', () => {
      console.log('3D map loaded successfully');
      map3DInitialized = true;
      
      // Force a resize to ensure proper rendering
      setTimeout(() => {
        if (map3D) {
          map3D.resize();
          console.log('3D map resized after load');
        }
      }, 100);
      
      // Add 3D buildings if available
      if (map3D.getLayer('3d-buildings')) {
        map3D.removeLayer('3d-buildings');
        map3D.removeSource('composite');
      }
      
      // Add 3D buildings layer
      map3D.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      }, 'waterway-label');
      
      console.log('3D buildings layer added');
    });
    
    // Handle map resize
    window.addEventListener('resize', () => {
      if (map3D) {
        map3D.resize();
      }
    });
    
    // Handle errors
    map3D.on('error', (error) => {
      console.error('3D Map Error:', error);
      showNotification('Error with 3D map: ' + error.message, 'error');
    });
    
    // Handle map move end
    map3D.on('moveend', () => {
      console.log('Map moved to:', map3D.getCenter(), 'Zoom:', map3D.getZoom());
    });
    
  } catch (error) {
    console.error('Error initializing 3D map:', error);
    showNotification('Error initializing 3D map: ' + error.message, 'error');
    
    // Try to recover by showing 2D view
    try {
      const map2DContainer = document.getElementById('map2D');
      if (map2DContainer) {
        map2DContainer.style.display = 'block';
      }
      const map3DContainer = document.getElementById('map3D');
      if (map3DContainer) {
        map3DContainer.style.display = 'none';
      }
      showNotification('Switched to 2D view due to 3D map error', 'warning');
    } catch (e) {
      console.error('Error during recovery:', e);
    }
  }
}

// =========================
// Initialize Controls
// =========================
function initControls() {
  console.log('Initializing controls...');
  
  // Helper function to safely get element and log if not found
  const getElement = (id, required = false) => {
    const el = document.getElementById(id);
    if (!el && required) {
      console.error(`Required element with ID '${id}' not found`);
    } else if (!el) {
      console.warn(`Element with ID '${id}' not found`);
    }
    return el;
  };
  
  // View controls
  const btn2D = getElement('btn2D', true);
  const btn3D = getElement('btn3D', true);
  const btn2DMobile = getElement('btn2D-mobile', true);
  const btn3DMobile = getElement('btn3D-mobile', true);
  const btnStartGPS = getElement('btnStartGPS', true);
  const btnStartGPSMobile = getElement('btnStartGPS-mobile', true);
  const btnManualGPS = getElement('btnManualGPS', true);
  const btnManualGPSMobile = getElement('btnManualGPS-mobile', true);
  const btnGo = getElement('btnGo', true);
  const btnGoMobile = getElement('btnGo-mobile', true);
  const btnAddInfo = getElement('btnAddInfo', true);
  const btnAddInfoMobile = getElement('btnAddInfo-mobile', true);
  const btnViewInfos = getElement('btnViewInfos', true);
  const btnViewInfosMobile = getElement('btnViewInfos-mobile', true);
  const originSelect = getElement('origin', true);
  const destSelect = getElement('destination', true);
  const originMobile = getElement('mobile-origin', true);
  const destMobile = getElement('mobile-destination', true);
  
  // Debug log for button elements
  const elements = {
    '2D Button (Desktop)': btn2D,
    '3D Button (Desktop)': btn3D,
    '2D Button (Mobile)': btn2DMobile,
    '3D Button (Mobile)': btn3DMobile,
    'Start GPS (Desktop)': btnStartGPS,
    'Start GPS (Mobile)': btnStartGPSMobile,
    'Manual GPS (Desktop)': btnManualGPS,
    'Manual GPS (Mobile)': btnManualGPSMobile,
    'Go (Desktop)': btnGo,
    'Go (Mobile)': btnGoMobile,
    'Add Info (Desktop)': btnAddInfo,
    'Add Info (Mobile)': btnAddInfoMobile,
    'View Info (Desktop)': btnViewInfos,
    'View Info (Mobile)': btnViewInfosMobile,
    'Origin Select (Desktop)': originSelect,
    'Destination Select (Desktop)': destSelect,
    'Origin Select (Mobile)': originMobile,
    'Destination Select (Mobile)': destMobile
  };
  
  console.group('Control Elements Status');
  Object.entries(elements).forEach(([name, element]) => {
    console.log(`%c${name}: ${element ? '✓ Found' : '✗ Missing'}`, 
      `color: ${element ? 'green' : 'red'}; font-weight: bold`);
  });
  console.groupEnd();

  // Set initial view
  const setActive = (elements, active = true) => {
    elements.forEach(el => {
      if (el) {
        el.classList.toggle('active', active);
        console.log(`Set ${el.id} active: ${active}`);
      }
    });
  };

  // Set initial view to 2D
  setActive([btn2D, btn2DMobile], true);
  setActive([btn3D, btn3DMobile], false);

  // Add event listeners with error handling
  const addClickListener = (elements, handler, label) => {
    elements.forEach((el, index) => {
      if (el) {
        try {
          el.removeEventListener('click', handler); // Remove existing to prevent duplicates
          el.addEventListener('click', (e) => {
            console.log(`[${label}] ${el.id || `Element ${index}`} clicked`);
            handler(e);
          });
          console.log(`Added click listener to ${el.id} for ${label}`);
        } catch (error) {
          console.error(`Error adding click listener to ${el.id}:`, error);
        }
      }
    });
  };

  // Add view switch handlers
  addClickListener([btn2D, btn2DMobile], () => switchView('2D'), '2D View');
  addClickListener([btn3D, btn3DMobile], () => switchView('3D'), '3D View');
  
  // Add GPS and navigation handlers
  addClickListener([btnStartGPS, btnStartGPSMobile], () => {
    console.log('Starting GPS tracking...');
    startGPSTracking();
  }, 'GPS Start');

  addClickListener([btnManualGPS, btnManualGPSMobile], toggleManualGPS, 'Manual GPS');
  
  // Add route and info handlers
  addClickListener([btnGo, btnGoMobile], () => {
    console.log('Route button clicked');
    
    // Get all possible select elements
    const originSelects = [
      document.getElementById('origin'),
      document.getElementById('mobile-origin')
    ].filter(Boolean);
    
    const destSelects = [
      document.getElementById('destination'),
      document.getElementById('mobile-destination')
    ].filter(Boolean);
    
    // Get the first non-empty origin and destination
    let origin = '';
    let destination = '';
    
    for (const select of originSelects) {
      if (select && select.value) {
        origin = select.value;
        break;
      }
    }
    
    for (const select of destSelects) {
      if (select && select.value) {
        destination = select.value;
        break;
      }
    }
    
    console.log('Selected origin:', origin);
    console.log('Selected destination:', destination);
    
    if (!origin || !destination) {
      showNotification('Please select an origin and destination', 'error');
      return;
    }
    
    if (origin === destination) {
      showNotification('The origin and destination cannot be the same', 'error');
      return;
    }
    
    console.log('Drawing route from:', origin, 'to:', destination);
    drawRoute(origin, destination);
  }, 'Draw Route');
  
  // Function to close mobile menu if open
  const closeMobileMenu = () => {
    try {
      if (window.mobileMenu && typeof window.mobileMenu.close === 'function') {
        window.mobileMenu.close();
      } else if (window.mobileMenu && typeof window.mobileMenu.toggle === 'function' && window.mobileMenu.isOpen()) {
        window.mobileMenu.toggle(false);
      }
    } catch (error) {
      console.warn('Error closing mobile menu:', error);
    }
  };

  // Add click handlers for info buttons
  addClickListener([btnAddInfo, btnAddInfoMobile], () => {
    console.log('Show add info form');
    const modal = document.getElementById('addInfoModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      closeMobileMenu();
    } else {
      console.error('Add info modal not found');
    }
  }, 'Add Info');
  
  addClickListener([btnViewInfos, btnViewInfosMobile], () => {
    console.log('Show info list');
    const modal = document.getElementById('infoListModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      closeMobileMenu();
      loadInfoPoints(); // Refresh the info points list
    } else {
      console.error('Info list modal not found');
    }
  }, 'View Info');

  // Populate location selects
  function populateSelect(select, isOrigin = false) {
    if (!select) return;
    
    select.innerHTML = '<option value="">-- select --</option>';
    
    if (isOrigin) {
      const gpsOption = document.createElement('option');
      gpsOption.value = 'gps';
      gpsOption.textContent = 'My GPS Position';
      select.appendChild(gpsOption);
    }
    
    Object.keys(locations).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key.replace(/_/g, ' ');
      select.appendChild(option);
    });
  }

  [originSelect, originMobile].forEach(select => populateSelect(select, true));
  [destSelect, destMobile].forEach(select => populateSelect(select));
}

// =========================
// Toggle Manual GPS Mode
// =========================
function toggleManualGPS() {
  console.log('toggleManualGPS called', { manualCorrection: manualCorrection, currentPosition });
  
  try {
    // Toggle the manual correction flag
    manualCorrection = !manualCorrection;
    
    console.log(`GPS Mode: ${manualCorrection ? 'Manual' : 'Automatic'}`);
    console.log('Current position:', currentPosition);
    
    // Update UI elements
    updateGPSModeUI(manualCorrection);
    
    // Update map behavior based on mode
    updateMapBehavior(manualCorrection);
    
    // If we have a current position, update the markers
    if (currentPosition) {
      console.log('Updating markers with position:', currentPosition);
      
      // Always update markers when toggling modes
      update2DMarker(currentPosition.lat, currentPosition.lng, currentPosition.accuracy, manualCorrection);
      update3DMarker(currentPosition.lat, currentPosition.lng, currentPosition.accuracy);
      
      // If switching to manual mode, make sure the marker is draggable
      if (manualCorrection && userMarker2D) {
        console.log('Enabling dragging for userMarker2D');
        try {
          userMarker2D.dragging.enable();
          console.log('Dragging enabled successfully');
          
          // Force update the marker's draggable state
          if (userMarker2D.dragging) {
            userMarker2D.dragging._enabled = true;
            console.log('Manually set dragging._enabled to true');
          }
          
          // Add a style to ensure the marker is interactive
          if (userMarker2D._icon) {
            userMarker2D._icon.style.cursor = 'move';
            userMarker2D._icon.style.touchAction = 'none';
            console.log('Updated marker styles for touch interaction');
          }
        } catch (dragError) {
          console.error('Error enabling dragging:', dragError);
        }
      }
    } else {
      console.warn('No current position available');
    }
    
    // Show appropriate notification
    const message = manualCorrection 
      ? 'Manual GPS mode: Drag the marker to set your position' 
      : 'Automatic GPS mode: Following your location';
    
    console.log('Showing notification:', message);
    showNotification(message, 'info', 3000);
    
    return true;
  } catch (error) {
    console.error('Error in toggleManualGPS:', error);
    showNotification('Error changing GPS mode: ' + error.message, 'error');
    return false;
  }
}

// Update UI elements for GPS mode
function updateGPSModeUI(isManual) {
  // Update desktop button
  const desktopBtn = document.getElementById('btnManualGPS');
  if (desktopBtn) {
    desktopBtn.textContent = isManual ? 'Manual: ON' : 'Manual: OFF';
    desktopBtn.classList.toggle('active', isManual);
    desktopBtn.setAttribute('aria-pressed', isManual);
    desktopBtn.title = isManual ? 'Switch to automatic GPS mode' : 'Switch to manual position mode';
  }
  
  // Update mobile button
  const mobileBtn = document.getElementById('btnManualGPS-mobile');
  if (mobileBtn) {
    const iconSpan = mobileBtn.querySelector('.menu-icon');
    const textSpan = Array.from(mobileBtn.childNodes).find(node => 
      node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ''
    );
    
    // Update text content
    if (textSpan) {
      textSpan.textContent = isManual ? ' Manual GPS: ON' : ' Manual GPS: OFF';
    } else {
      // If no text node found, create or update a span
      let span = mobileBtn.querySelector('span:not(.menu-icon)');
      if (!span) {
        span = document.createElement('span');
        if (mobileBtn.firstChild) {
          mobileBtn.insertBefore(span, mobileBtn.firstChild.nextSibling);
        } else {
          mobileBtn.appendChild(span);
        }
      }
      span.textContent = isManual ? ' Manual GPS: ON' : ' Manual GPS: OFF';
    }
    
    // Update icon
    if (iconSpan) {
      iconSpan.textContent = isManual ? '✋' : '📍';
    } else {
      // Add icon if it doesn't exist
      const icon = document.createElement('span');
      icon.className = 'menu-icon';
      icon.textContent = isManual ? '✋' : '📍';
      mobileBtn.insertBefore(icon, mobileBtn.firstChild);
    }
    
    // Update active state and attributes
    mobileBtn.classList.toggle('active', isManual);
    mobileBtn.setAttribute('aria-pressed', isManual);
    mobileBtn.title = isManual ? 'Switch to automatic GPS mode' : 'Switch to manual position mode';
  }
}

// Update map behavior based on GPS mode
function updateMapBehavior(isManual) {
  console.log(`Updating map behavior to ${isManual ? 'manual' : 'automatic'} mode`);
  
  try {
    // Update 2D marker
    if (userMarker2D) {
      // Initialize dragging if not already done
      if (isManual && !userMarker2D.dragging) {
        console.log('Initializing dragging for 2D marker');
        
        // Create a new draggable instance if needed
        if (L.Draggable) {
          userMarker2D.dragging = new L.Draggable(userMarker2D._icon, userMarker2D._icon, false);
          userMarker2D.dragging.enable();
          
          // Configure drag options for better touch support
          userMarker2D.dragging._draggable = true;
          userMarker2D.dragging._touchHandled = false;
          
          // Enable touch interaction specifically for mobile
          if (L.Browser.touch) {
            userMarker2D.options.draggable = true;
            if (userMarker2D._icon) {
              const icon = userMarker2D._icon;
              icon.style.touchAction = 'none';
              icon.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
              icon.style['-webkit-user-select'] = 'none';
              icon.style['-webkit-user-drag'] = 'none';
              icon.style['-webkit-touch-callout'] = 'none';
            }
          }
        }
      }
      
      // Enable/disable dragging
      if (userMarker2D.dragging) {
        if (isManual) {
          console.log('Enabling dragging for 2D marker');
          
          // Enable both mouse and touch interaction
          userMarker2D.dragging.enable();
          
          // Add custom update position handler
          userMarker2D.dragging._updatePosition = function() {
            try {
              const pos = this._newPos || this._startPos;
              if (pos && this._element) {
                L.DomUtil.setPosition(this._element, pos);
                if (typeof this._onDrag === 'function') {
                  this._onDrag();
                }
              }
            } catch (e) {
              console.error('Error in _updatePosition:', e);
            }
          };
          
          // Ensure the marker is interactive
          if (userMarker2D._icon) {
            userMarker2D._icon.style.pointerEvents = 'auto';
          }
        } else {
          console.log('Disabling dragging for 2D marker');
          userMarker2D.dragging.disable();
        }
      }
      
      // Update marker appearance
      const icon = userMarker2D.getElement();
      if (icon) {
        if (isManual) {
          icon.classList.add('manual-mode');
          icon.style.cursor = 'move';
          icon.title = 'Drag to set your position';
          
          // Additional mobile-specific styles
          if (L.Browser.touch) {
            icon.style.touchAction = 'none';
            icon.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
          }
        } else {
          icon.classList.remove('manual-mode');
          icon.style.cursor = '';
          icon.title = 'Your location';
          
          // Reset touch styles
          if (L.Browser.touch) {
            icon.style.touchAction = '';
          }
        }
      }
      
      // Add/remove drag end handler
      if (isManual) {
        // Remove any existing handlers to avoid duplicates
        userMarker2D.off('dragend');
        userMarker2D.off('touchend');
        
        // Handle both mouse and touch events
        const onDragEnd = function() {
          // Small timeout to ensure position is updated
          setTimeout(() => {
            const latlng = userMarker2D.getLatLng();
            if (latlng && typeof latlng.lat === 'number' && typeof latlng.lng === 'number') {
              updateUserPosition(latlng.lat, latlng.lng, 10); // 10m accuracy for manual positioning
              
              // Show notification
              showNotification(
                `Position set to: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
                'success',
                3000
              );
            }
          }, 50);
        };
        
        // Add both mouse and touch event handlers
        userMarker2D.on('dragend', onDragEnd);
        userMarker2D.on('touchend', onDragEnd);
        
        // Enable touch interaction
        if (L.Browser.touch) {
          userMarker2D.options.draggable = true;
          userMarker2D.options.touchable = true;
          if (userMarker2D._icon) {
            userMarker2D._icon.style.touchAction = 'none';
            userMarker2D._icon.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
          }
        }
      }
    }
    
    // If switching to automatic mode and we have a position, center the map
    if (!isManual && currentPosition) {
      centerMapOnPosition(currentPosition.lat, currentPosition.lng);
      
      // Restart GPS tracking if not already running
      if (gpsWatchId === null) {
        console.log('Restarting GPS tracking');
        startGPSTracking();
      }
    } else if (isManual) {
      // In manual mode, stop GPS updates
      if (gpsWatchId !== null) {
        console.log('Stopping GPS tracking for manual mode');
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
      }
    }
    
    // Update 3D marker if available
    if (userMarker3D) {
      userMarker3D.setDraggable(isManual);
      const markerElement = userMarker3D.getElement();
      if (markerElement) {
        markerElement.style.background = isManual ? '#EA4335' : '#4285F4';
        markerElement.style.cursor = isManual ? 'move' : 'default';
        
        // Add/remove drag end handler for 3D marker
        if (isManual) {
          // Remove existing handlers to avoid duplicates
          markerElement.removeEventListener('dragend', this.on3DDragEnd);
          markerElement.removeEventListener('touchend', this.on3DDragEnd);
          
          // Create new handler
          this.on3DDragEnd = (e) => {
            // Small timeout to ensure position is updated
            setTimeout(() => {
              const lngLat = userMarker3D.getLngLat();
              if (lngLat && typeof lngLat.lat === 'number' && typeof lngLat.lng === 'number') {
                updateUserPosition(lngLat.lat, lngLat.lng, 10);
                
                // Show notification
                showNotification(
                  `Position set to: ${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
                  'success',
                  3000
                );
              }
            }, 50);
          };
          
          // Add both mouse and touch event handlers
          markerElement.addEventListener('dragend', this.on3DDragEnd);
          markerElement.addEventListener('touchend', this.on3DDragEnd);
          
          // Enable touch interaction
          markerElement.style.touchAction = 'none';
          markerElement.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
        } else {
          markerElement.removeEventListener('dragend', this.on3DDragEnd);
          markerElement.removeEventListener('touchend', this.on3DDragEnd);
        }
      }
    }
    
    // Update accuracy circle
    if (gpsAccuracyCircle && currentPosition) {
      gpsAccuracyCircle.setStyle({
        color: isManual ? '#EA4335' : '#4285F4',
        fillColor: isManual ? 'rgba(234, 67, 53, 0.2)' : 'rgba(66, 133, 244, 0.2)',
        opacity: isManual ? 0.7 : 0.5,
        weight: isManual ? 3 : 2
      });
      
      // Update circle radius based on accuracy
      if (currentPosition.accuracy) {
        gpsAccuracyCircle.setRadius(currentPosition.accuracy);
      }
    }
    
    // Update map interaction
    if (map2D) {
      if (isManual) {
        // In manual mode, allow full map interaction
        map2D.dragging.enable();
        map2D.touchZoom.enable();
        map2D.doubleClickZoom.enable();
        map2D.scrollWheelZoom.enable();
        
        // Show a hint about manual mode
        showNotification(
          'Manual mode: Drag the marker to set your position',
          'info',
          4000
        );
      } else {
        // In automatic mode, disable map interaction to prevent accidental movement
        // but keep basic navigation enabled
        map2D.dragging.enable();
        map2D.touchZoom.enable();
        map2D.doubleClickZoom.enable();
        map2D.scrollWheelZoom.enable();
        
        // Show a hint about automatic mode
        showNotification(
          'Automatic mode: Following your location',
          'info',
          3000
        );
      }
    }
  } catch (error) {
    console.error('Error in updateMapBehavior:', error);
    showNotification('Error updating map behavior', 'error');
  }
}

// =========================
// Draw Route (2D + 3D)
// =========================
function drawRoute(origin, destination) {
  console.log('drawRoute called with:', { origin, destination });
  
  if (!map2D) {
    console.error('Map not initialized');
    showNotification('Error: Map is not initialized', 'error');
    return false;
  }
  
  if (!origin || !destination) {
    console.error('Missing origin or destination:', { origin, destination });
    showNotification('Error: Please select both origin and destination', 'error');
    return false;
  }

  // Cleanup old route
  if (routingControl) {
    try { 
      map2D.removeControl(routingControl); 
      routingControl = null;
    } catch (e) {
      console.warn('Error removing old route control:', e);
    }
  }
  
  if (map3D && map3D.getSource('route')) {
    try {
      if (map3D.getLayer('route')) map3D.removeLayer('route');
      map3D.removeSource('route');
    } catch (e) {
      console.warn('Error removing 3D route:', e);
    }
  }

  // Function to get coordinates from location identifier
  const getCoordinates = (location, isOrigin = true) => {
    return new Promise((resolve, reject) => {
      if (location === 'gps') {
        if (currentPosition) {
          resolve([currentPosition.lat, currentPosition.lng]);
        } else {
          showNotification(
            isOrigin ? 'Getting your current location...' : 'Getting destination location...', 
            'info', 
            2000
          );
          
          // Try to get current position
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              currentPosition = { lat: latitude, lng: longitude };
              resolve([latitude, longitude]);
              
              // If this was for the origin, update the UI
              if (isOrigin) {
                updateUserPosition(latitude, longitude, position.coords.accuracy);
              }
            },
            (error) => {
              console.error('Error getting location for route:', error);
              showNotification(
                `Could not get ${isOrigin ? 'origin' : 'destination'} location. Using default position.`,
                'error'
              );
              // Fall back to default position
              resolve([43.225018, 0.052059]);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        }
      } else if (locations[location]) {
        resolve(locations[location]);
      } else {
        reject(new Error(`Invalid ${isOrigin ? 'origin' : 'destination'} selected`));
      }
    });
  };

  // Get coordinates for both origin and destination
  Promise.all([
    getCoordinates(origin, true),
    getCoordinates(destination, false)
  ]).then(([startCoords, endCoords]) => {
    const startLatLng = startCoords;
    const endLatLng = endCoords;

    // Add Leaflet Routing Machine control in 2D
    const osrmService = L.Routing.osrmv1({
      serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
      profile: 'foot'
    });

    // Clean up any existing route
    if (routingControl) {
      try { 
        map2D.removeControl(routingControl); 
      } catch (e) {
        console.warn('Error removing old route control:', e);
      }
    }

    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startLatLng[0], startLatLng[1]),
        L.latLng(endLatLng[0], endLatLng[1])
      ],
      router: osrmService,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      collapsible: true,
      formatter: new L.Routing.Formatter({ language: 'en', units: 'metric' }),
      lineOptions: {
        styles: [{ 
          color: '#4a6cf7', 
          weight: 5, 
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }]
      },
      createMarker: function(i, waypoint) {
        return L.marker(waypoint.latLng, {
          draggable: false,
          icon: L.divIcon({
            html: i === 0 ? 'A' : 'B',
            className: 'route-marker ' + (i === 0 ? 'route-start' : 'route-end'),
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        });
      }
    }).addTo(map2D);

    // Handle route found event
    routingControl.on('routesfound', function(e) {
      const routes = e.routes;
      const route = routes[0];
      
      if (!route) {
        showNotification('No route found between the selected points', 'warning');
        return;
      }

      // Calculate distance and time
      const distance = (route.summary.totalDistance / 1000).toFixed(1); // in km
      const time = Math.round(route.summary.totalTime / 60); // in minutes
      
      showNotification(
        `Route found: ${distance} km • ${time} min walking`,
        'success',
        5000
      );

      // Update route instructions
      updateRouteInstructions(route);
      
      // Draw route on 3D map if available
      if (map3D && map3DInitialized) {
        draw3DRoute(route.coordinates);
      }
    });

    // Handle route error
    routingControl.on('routingerror', function(error) {
      console.error('Routing error:', error);
      showNotification('Could not calculate route. Please try again.', 'error');
    });
    
  }).catch(error => {
    console.error('Error getting coordinates for route:', error);
    showNotification('Error calculating route. Please check your selections.', 'error');
  });
}

// Function to update route instructions in the info panel
function updateRouteInstructions(route) {
  if (!route || !route.instructions) {
    console.warn('No route instructions available');
    return;
  }

  const infoList = document.getElementById('infoList');
  if (!infoList) {
    console.warn('Info list element not found');
    return;
  }

  // Calculate total distance and time
  const distance = (route.summary.totalDistance / 1000).toFixed(1);
  const time = Math.round(route.summary.totalTime / 60);

  // Create HTML for instructions
  let html = `
    <div class="route-summary">
      <h3>Route Summary</h3>
      <div class="route-stats">
        <span class="stat">
          <i class="fas fa-route"></i>
          ${distance} km
        </span>
        <span class="stat">
          <i class="fas fa-clock"></i>
          ${time} min
        </span>
      </div>
    </div>
    <div class="route-instructions">
      <h4>Turn-by-Turn Directions</h4>
      <ol class="steps-list">
  `;

  // Add each step to the instructions
  route.instructions.forEach((step, index) => {
    html += `
      <li class="step">
        <span class="step-icon">${index + 1}</span>
        <div class="step-content">
          <span class="step-text">${step.text}</span>
          ${step.distance > 0 ? 
            `<span class="step-distance">${(step.distance).toFixed(0)} m</span>` : 
            ''
          }
        </div>
      </li>
    `;
  });

  html += `
      </ol>
    </div>
  `;

  infoList.innerHTML = html;
  infoList.scrollTop = 0; // Scroll to top
}

// Function to draw route on 3D map
async function draw3DRoute(coordinates) {
  try {
    // Validate inputs
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      console.error('Invalid coordinates array');
      return;
    }

    if (typeof mapboxgl === 'undefined' || !map3D) {
      console.error('Mapbox GL JS is not loaded or map not initialized');
      return;
    }

    // Helper function to validate and normalize coordinates
    const normalizeCoordinate = (value, type) => {
      if (value == null) return null;
      
      const num = Number(value);
      if (isNaN(num)) return null;
      
      if (type === 'lng' && (num < -180 || num > 180)) return null;
      if (type === 'lat' && (num < -90 || num > 90)) return null;
      
      return num;
    };

    // Process coordinates with better validation
    const lineCoords = [];
    
    for (const coord of coordinates) {
      try {
        let lng, lat;
        
        if (Array.isArray(coord) && coord.length >= 2) {
          // Handle [lng, lat] format
          lng = normalizeCoordinate(coord[0], 'lng');
          lat = normalizeCoordinate(coord[1], 'lat');
        } else if (coord && typeof coord === 'object') {
          // Handle {lng, lon, lat} format
          lng = normalizeCoordinate(coord.lng !== undefined ? coord.lng : coord.lon, 'lng');
          lat = normalizeCoordinate(coord.lat, 'lat');
        }
        
        if (lng !== null && lat !== null) {
          lineCoords.push([lng, lat]);
        }
      } catch (e) {
        console.warn('Skipping invalid coordinate:', coord, e);
      }
    }

    if (lineCoords.length < 2) {
      console.error('Not enough valid coordinates to draw route. Found:', lineCoords.length);
      return;
    }
    
    // Remove existing route if any
    if (map3D.getSource('route')) {
      if (map3D.getLayer('route')) {
        map3D.removeLayer('route');
      }
      map3D.removeSource('route');
    }

    // Create GeoJSON feature for the route line
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: lineCoords
      }
    };

    // Add the route source and layer
    map3D.addSource('route', {
      type: 'geojson',
      data: geojson
    });

    map3D.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4a6cf7',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Fit map to the route bounds with improved error handling
    if (lineCoords && lineCoords.length >= 2) {
      try {
        // Filter and validate coordinates
        const validCoords = [];
        for (const coord of lineCoords) {
          try {
            let lng, lat;
            
            // Handle different coordinate formats
            if (Array.isArray(coord) && coord.length === 2) {
              [lng, lat] = [Number(coord[0]), Number(coord[1])];
            } else if (coord && typeof coord === 'object') {
              lng = Number(coord.lng !== undefined ? coord.lng : coord.lon);
              lat = Number(coord.lat);
            } else {
              continue;
            }
            
            // Validate coordinate ranges
            if (!isNaN(lng) && !isNaN(lat) && 
                lng >= -180 && lng <= 180 && 
                lat >= -90 && lat <= 90) {
              validCoords.push([lng, lat]);
            }
          } catch (e) {
            console.warn('Skipping invalid coordinate:', coord, e);
          }
        }

        if (validCoords.length < 2) {
          console.warn('Not enough valid coordinates to fit bounds');
          return;
        }

        // Create bounds safely with explicit coordinate format
        try {
          // Convert all coordinates to [lng, lat] format for consistency
          const formattedCoords = validCoords.map(coord => ({
            lng: coord[0],
            lat: coord[1]
          }));
          
          // Create bounds using the first coordinate
          const first = formattedCoords[0];
          const bounds = new maplibregl.LngLatBounds(
            [first.lng, first.lat],
            [first.lng, first.lat]
          );
          
          // Extend bounds with remaining coordinates
          for (let i = 1; i < formattedCoords.length; i++) {
            const coord = formattedCoords[i];
            bounds.extend([coord.lng, coord.lat]);
          }
          
          // Add padding
          const padding = { top: 50, bottom: 50, left: 50, right: 50 };
          
          // Fit bounds with error handling
          try {
            // Calculate center and use a safe zoom level
            const center = bounds.getCenter();
            const safeZoom = Math.min(17, map3D.getZoom() || 15);
            
            // Use flyTo with a safe zoom level
            map3D.flyTo({
              center: [center.lng, center.lat],
              zoom: safeZoom,
              duration: 1000,
              essential: true
            });
          } catch (fitError) {
            console.error('Error fitting bounds, falling back to center:', fitError);
            const center = [
              (bounds.getWest() + bounds.getEast()) / 2,
              (bounds.getSouth() + bounds.getNorth()) / 2
            ];
            map3D.flyTo({
              center: center,
              zoom: 15,
              duration: 1000,
              essential: true
            });
          }
        } catch (boundsError) {
          console.error('Error creating bounds:', boundsError);
          // Fallback to simple center on first valid coordinate
          map3D.flyTo({
            center: [validCoords[0][0], validCoords[0][1]],
            zoom: 15,
            duration: 1000,
            essential: true
          });
        }
      } catch (e) {
        console.error('Error in fit bounds calculation:', e);
      }
    }
  } catch (error) {
    console.error('Error drawing 3D route:', error);
  }
}

// Handle routing errors
function handleRoutingError(error) {
  console.error('Routing error:', error);
  showNotification('Could not calculate route. Please try again.', 'error');
  
  // Reset UI elements if needed
  const routeButton = document.getElementById('find-route-btn');
  if (routeButton) {
    routeButton.disabled = false;
    routeButton.innerHTML = '<i class="fas fa-route"></i> Find Route';
  }
}

// Show route instructions (for mobile)
function showRouteInstructions(instructions) {
  const instructionsPanel = document.getElementById('route-instructions');
  if (!instructionsPanel) return;
  
  let html = '<div class="route-instructions-container">';
  html += '<h3>Instrucciones de ruta</h3>';
  html += '<div class="route-steps">';
  
  instructions.forEach((instruction, index) => {
    const distance = instruction.distance > 1000 
      ? (instruction.distance / 1000).toFixed(1) + ' km' 
      : Math.round(instruction.distance) + ' m';
      
    html += `
      <div class="route-step">
        <div class="step-icon">${getDirectionIcon(instruction.type)}</div>
        <div class="step-details">
          <div class="step-text">${instruction.text}</div>
          <div class="step-distance">${distance}</div>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  // Create or update instructions panel
  instructionsPanel.innerHTML = html;
  instructionsPanel.style.display = 'block';
  
  // Scroll to top of instructions
  instructionsPanel.scrollTop = 0;
}

// Get direction icon based on instruction type
function getDirectionIcon(type) {
  const icons = {
    'Head': '👆',
    'Continue': '➡️',
    'TurnLeft': '⬅️',
    'TurnRight': '➡️',
    'TurnSharpLeft': '↪️',
    'TurnSharpRight': '↩️',
    'TurnSlightLeft': '↩️',
    'TurnSlightRight': '↪️',
    'ReachedYourDestination': '🏁',
    'Roundabout': '🔄',
    'Fork': '🔀',
    'Merge': '🔄',
    'DestinationReached': '🏁',
    'WaypointReached': '📍'
  };
  
  return icons[type] || '📍';
}

// =========================
// Load Info Points
// =========================
async function loadInfoPoints() {
  if (!db) return;

  const infoList = $('#infoList');
  if (!infoList) return;

  try {
    const transaction = db.transaction(['infos'], 'readonly');
    const store = transaction.objectStore('infos');
    const request = store.getAll();

    request.onsuccess = (e) => {
      const infos = e.target.result || [];
      infoList.innerHTML = '';

      if (infos.length === 0) {
        infoList.innerHTML = '<p class="no-info">No information points saved yet</p>';
        return;
      }

      infos.forEach(info => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `
          <h4>${info.title || 'Untitled'}</h4>
          ${info.description ? `<p>${info.description}</p>` : ''}
          ${info.image ? `<img src="${info.image}" alt="Info point image" class="info-image">` : ''}
          <div class="info-meta">
            <small>${new Date(info.timestamp).toLocaleString()}</small>
            <button class="btn-delete" data-id="${info.id}">Delete</button>
          </div>
        `;
        infoList.appendChild(item);
      });

      // Add delete handlers
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteInfoPoint(parseInt(btn.dataset.id));
        });
      });
    };
  } catch (error) {
    console.error('Error loading info points:', error);
    showNotification('Error loading information points', 'error');
  }
}

// =========================
// Save Info Point
// =========================
async function saveInfoPoint() {
  if (!db) {
    showNotification('Database not available', 'error');
    return;
  }

  const title = $('#infoTitle')?.value.trim() || 'Untitled';
  const description = $('#infoDescription')?.value.trim() || '';
  const markerType = $('#infoMarkerType')?.value || 'default';
  const fileInput = document.getElementById('infoImage');
  const preview = document.getElementById('imagePreview');

  try {
    let imageData = null;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }
      imageData = await readFileAsDataURL(file);
    } else if (preview && preview.src) {
      imageData = preview.src;
    }

    const info = {
      title,
      description,
      markerType,
      image: imageData,
      lat: currentPosition?.lat || 0,
      lng: currentPosition?.lng || 0,
      timestamp: new Date().toISOString()
    };

    const transaction = db.transaction(['infos'], 'readwrite');
    const store = transaction.objectStore('infos');
    const request = store.add(info);

    request.onsuccess = () => {
      showNotification('Information point saved', 'success');
      $('#infoTitle').value = '';
      $('#infoDescription').value = '';
      if (preview) {
        preview.src = '';
        preview.style.display = 'none';
      }
      if (fileInput) fileInput.value = '';
      hideModals();
      loadInfoPoints();
    };

    request.onerror = (e) => {
      console.error('Error saving info point:', e.target.error);
      showNotification('Error saving information point', 'error');
    };
  } catch (error) {
    console.error('Error saving info point:', error);
    showNotification('Error saving information point', 'error');
  }
}

// =========================
// Delete Info Point
// =========================
function deleteInfoPoint(id) {
  if (!db || id === undefined) return;

  if (!confirm('Are you sure you want to delete this information point?')) {
    return;
  }

  const transaction = db.transaction(['infos'], 'readwrite');
  const store = transaction.objectStore('infos');
  const request = store.delete(id);

  request.onsuccess = () => {
    showNotification('Information point deleted', 'success');
    loadInfoPoints();
  };

  request.onerror = (e) => {
    console.error('Error deleting info point:', e.target.error);
    showNotification('Error deleting information point', 'error');
  };
}

// =========================
// Helper Functions
// =========================
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateCoordinatesDisplay(lat, lng) {
  // Update desktop coordinates display
  const latEl = document.getElementById('gpsLat');
  const lngEl = document.getElementById('gpsLng');
  const coordsDisplay = document.getElementById('coordinates-display');
  
  if (latEl) latEl.textContent = `Lat: ${lat?.toFixed(6) || '-'}`;
  if (lngEl) lngEl.textContent = `Lng: ${lng?.toFixed(6) || '-'}`;
  
  // Show the coordinates display if it's hidden
  if (coordsDisplay && lat !== undefined && lng !== undefined) {
    coordsDisplay.style.display = 'flex';
  }
  
  // Dispatch event for mobile menu updates
  if (lat !== undefined && lng !== undefined) {
    const event = new CustomEvent('coordinateUpdate', {
      detail: { lat, lng }
    });
    document.dispatchEvent(event);
    
    // Update route dropdowns with current position
    const positionEvent = new CustomEvent('positionUpdated', {
      detail: { position: { lat, lng } }
    });
    document.dispatchEvent(positionEvent);
  }
}

// Initialize coordinates display
function initCoordinatesDisplay() {
  const copyBtn = document.getElementById('copyCoords');
  const centerBtn = document.getElementById('centerOnGPS');
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const lat = currentPosition?.lat?.toFixed(6) || '--';
      const lng = currentPosition?.lng?.toFixed(6) || '--';
      navigator.clipboard.writeText(`${lat}, ${lng}`).then(() => {
        showNotification('Coordinates copied to clipboard!', 'success');
      }).catch(err => {
        console.error('Failed to copy coordinates:', err);
        showNotification('Failed to copy coordinates', 'error');
      });
    });
  }
  
  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      if (currentPosition && currentPosition.lat && currentPosition.lng) {
        centerMapOnPosition(currentPosition.lat, currentPosition.lng);
      } else {
        showNotification('No GPS position available', 'warning');
      }
    });
  }
  
  // Hide the coordinates display initially
  const coordsDisplay = document.getElementById('coordinates-display');
  if (coordsDisplay) {
    coordsDisplay.style.display = 'none';
  }
}

// =========================
// Show Notification
// =========================
function showNotification(message, type = 'info', duration = 5000) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }
  
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    // Start fade out animation
    notification.style.animation = 'none';
    notification.offsetHeight; // Trigger reflow
    notification.style.animation = 'fadeOut 0.3s forwards';
    
    // Remove after animation completes
    setTimeout(() => {
      if (notification.parentNode === container) {
        container.removeChild(notification);
      }
    }, 300);
  });
  
  // Create new notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');
  
  // Set the notification content
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  // Add to container
  container.appendChild(notification);
  
  // Force reflow to trigger the animation
  notification.offsetHeight;
  
  // Auto-hide after duration if duration is greater than 0
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode === container) {
        notification.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode === container) {
            container.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }
  
  // Add close button functionality
  const closeButton = notification.querySelector('.notification-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      notification.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => {
        if (notification.parentNode === container) {
          container.removeChild(notification);
        }
      }, 300);
    });
  }
  
  // Add click outside to close
  notification.addEventListener('click', (e) => {
    if (e.target === notification) {
      notification.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => {
        if (notification.parentNode === container) {
          container.removeChild(notification);
        }
      }, 300);
    }
  });
  
  return notification;
}

function hideModals() {
  const modals = document.querySelectorAll('.modal-overlay, .modal-content');
  modals.forEach(modal => {
    if (modal) modal.style.display = 'none';
  });
  document.body.style.overflow = '';
}
function parseLocation(value) {
  // Implementation...
}

// Expose necessary functions to window for mobile menu
window.switchView = switchView;
window.startGPSTracking = startGPSTracking;
window.toggleManualGPS = toggleManualGPS;
window.drawRoute = drawRoute;
window.shareRoute = shareRoute;
window.showNotification = showNotification;

// Make sure drawRoute is available globally
if (typeof window.drawRoute !== 'function') {
  window.drawRoute = drawRoute;
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
