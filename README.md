# Campus Digital Twin & Social Digital Twin

A comprehensive web-based application for managing campus facilities with both 2D and 3D visualization, room inventory tracking, and offline-first issue reporting system.

## 🌟 Features

### 📍 Dual Map System
- **2D Map**: Interactive Leaflet-based map with room polygons and markers
- **3D Map**: MapLibre GL JS 3D visualization with room polygons and labels
- **Seamless switching** between 2D and 3D views
- **GPS integration** for real-time location tracking

### 🏢 Room Management
- **Room visualization** with interactive polygons and markers
- **Detailed room information** including capacity, type, and building
- **Inventory tracking** for each room with object status monitoring
- **Room categorization** by type (computer lab, classroom, library, etc.)

### 📝 Issue Reporting System
- **Object-specific reporting** with dropdown selection
- **Photo attachment** support for visual documentation
- **Offline-first approach** using IndexedDB for local storage
- **Status workflow**: Open → In Progress → Resolved
- **Privacy-first design** with no external data transmission

### ⚙️ Admin Panel
- **Comprehensive dashboard** for report management
- **Advanced filtering** by status, room, and object type
- **Real-time analytics** and status summaries
- **Data export** capabilities (CSV, JSON)
- **Room overview** with issue highlighting

### 🔒 Privacy & Security
- **Local-first architecture** - all data stored on device
- **No external servers** required for core functionality
- **GDPR compliant** by design
- **Offline functionality** for complete independence

## 🚀 Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Local web server (for development)
- No external dependencies required

### Installation

1. **Clone or download** the project files
2. **Serve the files** using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Open your browser** and navigate to `http://localhost:8000`
4. **Click** "Go to Campus Map Page" to access the main application

### File Structure
```
Map3D/
├── CSS/
│   ├── styles.css          # Main application styles
│   └── roomStyles.css      # Room management specific styles
├── HTML/
│   └── Prueba9.html        # Main application page
├── JS/
│   ├── app.js              # Core application logic
│   ├── roomData.js         # Room and inventory data structure
│   ├── roomManager.js      # Room management and visualization
│   └── adminPanel.js       # Admin dashboard functionality
├── IMG/                    # Icons and images
└── index.html              # Landing page
```

## 📖 Usage Guide

### Basic Navigation

1. **Switch Views**: Use the 2D/3D buttons to toggle between map views
2. **GPS Tracking**: Click the GPS button to enable location tracking
3. **Room Interaction**: Click on any room polygon or marker to view details

### Room Management

#### Viewing Room Details
1. **Click on a room** (polygon or marker) on either map
2. **Room modal opens** showing:
   - Room information (name, building, type, capacity)
   - Inventory tab with all objects and their status
   - Reports tab with active issues
   - Analytics tab with status summaries

#### Reporting Issues
1. **Click "Report Issue"** button or select from room inventory
2. **Fill out the form**:
   - Select room and object
   - Provide issue title and description
   - Optionally attach a photo
3. **Submit** - report is stored locally and immediately available

#### Managing Reports (Admin)
1. **Click the Admin Panel** button (⚙️)
2. **Use the dashboard** to:
   - View all reports with filtering options
   - Change report status (Open → In Progress → Resolved)
   - Export data for external analysis
   - Monitor room status overview

### Data Export

The system supports multiple export formats:
- **CSV**: Spreadsheet-compatible report data
- **JSON**: Machine-readable data for integration
- **Room Data**: Complete room and inventory information
- **Analytics**: Summary statistics and metrics

## 🏗️ Architecture

### Data Structure

#### Room Data (`roomData.js`)
```javascript
const campusRooms = {
  "room_A101": {
    id: "room_A101",
    name: "Computer Lab A101",
    building: "Building_A",
    floor: 1,
    type: "computer_lab",
    coordinates: [43.225121, 0.051905],
    polygon: [...], // Room boundary coordinates
    capacity: 30,
    inventory: {
      "PC_A101_01": {
        type: "computer",
        brand: "Dell",
        model: "OptiPlex 3080",
        status: "operational"
      }
      // ... more objects
    }
  }
  // ... more rooms
};
```

#### Report Structure
```javascript
{
  id: 123,
  roomId: "room_A101",
  objectId: "PC_A101_01",
  title: "Computer not starting",
  description: "PC shows blue screen on startup",
  status: "open", // open, in_progress, resolved
  timestamp: 1640995200000,
  photo: "data:image/jpeg;base64,..." // Optional
}
```

### Storage System

The application uses **IndexedDB** for offline storage:
- **Reports Database**: Stores all issue reports
- **Room Visits**: Analytics data for room access
- **Automatic sync**: Ready for future server integration

### Privacy Implementation

- **No cookies** or tracking mechanisms
- **Local storage only** - no data leaves the device
- **User consent** not required (no personal data collection)
- **Export control** - users decide what data to share

## 🎨 Customization

### Adding New Rooms

1. **Edit `roomData.js`**:
   ```javascript
   "room_NEW_ID": {
     id: "room_NEW_ID",
     name: "New Room Name",
     building: "Building_X",
     // ... other properties
     inventory: {
       // Add objects here
     }
   }
   ```

2. **Room automatically appears** on both maps after page refresh

### Adding Object Types

1. **Update `objectTypes` in `roomData.js`**:
   ```javascript
   new_object_type: {
     category: "Category Name",
     icon: "🔧",
     priority: "medium"
   }
   ```

2. **Add to room inventory** using the new type

### Styling Customization

- **Room colors**: Modify `roomCategories` in `roomData.js`
- **CSS styling**: Edit `roomStyles.css` for visual customization
- **Icons**: Update emoji icons in data structures

## 🔧 Technical Details

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 13+)
- **Mobile browsers**: Responsive design included

### Performance
- **Efficient rendering**: Only visible rooms loaded
- **Lazy loading**: Large datasets handled gracefully
- **Memory management**: Automatic cleanup of unused resources

### Offline Capabilities
- **Full functionality** without internet connection
- **Data persistence** across browser sessions
- **Sync preparation** for future online integration

## 🚀 Future Enhancements

### Planned Features
- **Server synchronization** for multi-user environments
- **Real-time notifications** for report updates
- **Advanced analytics** with charts and graphs
- **Mobile app** version using Cordova/PhoneGap
- **QR code integration** for quick room access
- **Maintenance scheduling** system

### Integration Possibilities
- **LDAP authentication** for enterprise environments
- **REST API** for external system integration
- **Webhook support** for automated workflows
- **IoT sensor integration** for real-time monitoring

## 📞 Support & Contributing

### Getting Help
- Check the browser console for error messages
- Ensure JavaScript is enabled
- Verify local server is running correctly

### Contributing
1. Fork the repository
2. Create feature branch
3. Test thoroughly on multiple browsers
4. Submit pull request with detailed description

### Reporting Issues
- Include browser version and error messages
- Provide steps to reproduce the issue
- Attach screenshots if relevant

## 📄 License

This project is designed for educational and internal use. Modify and distribute according to your organization's policies.

---

