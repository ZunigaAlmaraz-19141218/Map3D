// roomData.js - Campus Room Data Structure
'use strict';

// Room data with coordinates, inventory, and metadata
const campusRooms = {
  // Building A Rooms
  "room_L2_113": {
    id: "room_L2_113",
    name: "Bureau des Stagiaires L2-113",
    building: "Building_L2",
    floor: 2,
    type: "Bureau des Stagiaires",
    coordinates: [
      43.226025, 0.050245
    ], // Center point
    polygon: [ // Room boundary polygon
      [
        43.226004, 0.050200
      ],
      [
        43.226004, 0.050267
      ],
      [
        43.226019, 0.050275
      ],
      [
        43.226029, 0.050208
      ]
    ],
    capacity: 10,
    // Inventory with object IDs and their details
    // Preguntar como se va a gestionar el inventario
    inventory: {
      "PC_L2_113_N01": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N02": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N03": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N04": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N05": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N06": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N07": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PC_L2_113_N08": { type: "computer", brand: "Dell", model: "OptiPlex 3080", status: "operational" },
      "PROJ_L2_113": { type: "projector", brand: "Epson", model: "EB-X41", status: "operational" }, //In the case of projector
      "CHAIR_L2_113_N01": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N02": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N03": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N04": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N05": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N06": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N07": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "CHAIR_L2_113_N08": { type: "chair", brand: "Generic", model: "Office Chair", status: "operational" },
      "DESK_L2_113_N01": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N02": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N03": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N04": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N05": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N06": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N07": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "DESK_L2_113_N08": { type: "desk", brand: "IKEA", model: "Bekant", status: "operational" },
      "WHITEBOARD_L2_113": { type: "whiteboard", brand: "Quartet", model: "Standard", status: "operational" }
    }
  },
  
  "room_A102": {
    id: "room_A102",
    name: "Classroom A102",
    building: "Building_A",
    floor: 1,
    type: "classroom",
    coordinates: [43.225100, 0.051905],
    polygon: [
      [43.225089, 0.051895],
      [43.225111, 0.051895],
      [43.225111, 0.051915],
      [43.225089, 0.051915]
    ],
    capacity: 40,
    inventory: {
      "PROJ_A102": { type: "projector", brand: "BenQ", model: "MW632ST", status: "operational" },
      "CHAIR_A102_01": { type: "chair", brand: "Generic", model: "Student Chair", status: "operational" },
      "CHAIR_A102_02": { type: "chair", brand: "Generic", model: "Student Chair", status: "operational" },
      "DESK_A102_01": { type: "desk", brand: "Generic", model: "Student Desk", status: "operational" },
      "WHITEBOARD_A102": { type: "whiteboard", brand: "Quartet", model: "Standard", status: "needs_cleaning" }
    }
  },

  // Building B Rooms
  "room_B201": {
    id: "room_B201",
    name: "Engineering Lab B201",
    building: "Building_B",
    floor: 2,
    type: "laboratory",
    coordinates: [43.225188, 0.051330],
    polygon: [
      [43.225177, 0.051320],
      [43.225199, 0.051320],
      [43.225199, 0.051340],
      [43.225177, 0.051340]
    ],
    capacity: 20,
    inventory: {
      "OSCILLOSCOPE_B201_01": { type: "oscilloscope", brand: "Tektronix", model: "TBS1052B", status: "operational" },
      "OSCILLOSCOPE_B201_02": { type: "oscilloscope", brand: "Tektronix", model: "TBS1052B", status: "calibration_needed" },
      "MULTIMETER_B201_01": { type: "multimeter", brand: "Fluke", model: "117", status: "operational" },
      "POWER_SUPPLY_B201": { type: "power_supply", brand: "Keysight", model: "E3631A", status: "operational" },
      "WORKBENCH_B201_01": { type: "workbench", brand: "Generic", model: "Lab Bench", status: "operational" },
      "STOOL_B201_01": { type: "stool", brand: "Generic", model: "Lab Stool", status: "operational" }
    }
  },

  // Library Rooms
  "room_LIB_MAIN": {
    id: "room_LIB_MAIN",
    name: "Main Reading Hall",
    building: "Library",
    floor: 1,
    type: "library",
    coordinates: [43.224945, 0.051151],
    polygon: [
      [43.224925, 0.051131],
      [43.224965, 0.051131],
      [43.224965, 0.051171],
      [43.224925, 0.051171]
    ],
    capacity: 100,
    inventory: {
      "TABLE_LIB_01": { type: "table", brand: "Generic", model: "Reading Table", status: "operational" },
      "TABLE_LIB_02": { type: "table", brand: "Generic", model: "Reading Table", status: "wobbly" },
      "CHAIR_LIB_01": { type: "chair", brand: "Generic", model: "Library Chair", status: "operational" },
      "CHAIR_LIB_02": { type: "chair", brand: "Generic", model: "Library Chair", status: "torn_upholstery" },
      "COMPUTER_LIB_01": { type: "computer", brand: "HP", model: "EliteDesk 800", status: "operational" },
      "PRINTER_LIB": { type: "printer", brand: "Canon", model: "imageRUNNER", status: "paper_jam" }
    }
  },

  "room_LIB_STUDY": {
    id: "room_LIB_STUDY",
    name: "Group Study Room 1",
    building: "Library",
    floor: 1,
    type: "study_room",
    coordinates: [43.224935, 0.051141],
    polygon: [
      [43.224930, 0.051136],
      [43.224940, 0.051136],
      [43.224940, 0.051146],
      [43.224930, 0.051146]
    ],
    capacity: 8,
    inventory: {
      "TABLE_STUDY_01": { type: "table", brand: "IKEA", model: "Conference Table", status: "operational" },
      "CHAIR_STUDY_01": { type: "chair", brand: "IKEA", model: "Office Chair", status: "operational" },
      "CHAIR_STUDY_02": { type: "chair", brand: "IKEA", model: "Office Chair", status: "squeaky" },
      "WHITEBOARD_STUDY": { type: "whiteboard", brand: "Quartet", model: "Mobile", status: "marker_stains" }
    }
  },

  // Cafeteria
  "room_CAFE_MAIN": {
    id: "room_CAFE_MAIN",
    name: "Main Cafeteria",
    building: "Cafeteria",
    floor: 1,
    type: "cafeteria",
    coordinates: [43.227491, 0.050948],
    polygon: [
      [43.227471, 0.050928],
      [43.227511, 0.050928],
      [43.227511, 0.050968],
      [43.227471, 0.050968]
    ],
    capacity: 200,
    inventory: {
      "TABLE_CAFE_01": { type: "table", brand: "Generic", model: "Dining Table", status: "operational" },
      "TABLE_CAFE_02": { type: "table", brand: "Generic", model: "Dining Table", status: "sticky_surface" },
      "CHAIR_CAFE_01": { type: "chair", brand: "Generic", model: "Dining Chair", status: "operational" },
      "CHAIR_CAFE_02": { type: "chair", brand: "Generic", model: "Dining Chair", status: "broken_leg" },
      "MICROWAVE_CAFE": { type: "microwave", brand: "Samsung", model: "MS23K3513AS", status: "not_heating" },
      "VENDING_CAFE_01": { type: "vending_machine", brand: "Coca-Cola", model: "Freestyle", status: "operational" }
    }
  }
};

// Room categories for filtering and organization
const roomCategories = {
  computer_lab: { color: "#0066CC", icon: "💻" },
  classroom: { color: "#009900", icon: "🎓" },
  laboratory: { color: "#CC6600", icon: "🔬" },
  library: { color: "#9900CC", icon: "📚" },
  study_room: { color: "#CC0066", icon: "📖" },
  cafeteria: { color: "#FF6600", icon: "🍽️" },
  office: { color: "#666666", icon: "🏢" }
};

// Object types for inventory management
const objectTypes = {
  computer: { category: "Electronics", icon: "💻", priority: "high" },
  projector: { category: "Electronics", icon: "📽️", priority: "high" },
  printer: { category: "Electronics", icon: "🖨️", priority: "medium" },
  oscilloscope: { category: "Lab Equipment", icon: "📊", priority: "high" },
  multimeter: { category: "Lab Equipment", icon: "⚡", priority: "medium" },
  power_supply: { category: "Lab Equipment", icon: "🔌", priority: "medium" },
  chair: { category: "Furniture", icon: "🪑", priority: "low" },
  desk: { category: "Furniture", icon: "🗃️", priority: "low" },
  table: { category: "Furniture", icon: "🪑", priority: "low" },
  stool: { category: "Furniture", icon: "🪑", priority: "low" },
  workbench: { category: "Furniture", icon: "🔧", priority: "medium" },
  whiteboard: { category: "Teaching", icon: "📝", priority: "low" },
  microwave: { category: "Appliances", icon: "📦", priority: "low" },
  vending_machine: { category: "Appliances", icon: "🥤", priority: "low" }
};

// Status definitions for objects and reports
const statusDefinitions = {
  operational: { color: "#28a745", label: "Operational", priority: 0 },
  maintenance_needed: { color: "#ffc107", label: "Maintenance Needed", priority: 1 },
  calibration_needed: { color: "#fd7e14", label: "Calibration Needed", priority: 2 },
  damaged: { color: "#dc3545", label: "Damaged", priority: 3 },
  broken_leg: { color: "#dc3545", label: "Broken", priority: 3 },
  not_heating: { color: "#dc3545", label: "Not Working", priority: 3 },
  paper_jam: { color: "#ffc107", label: "Paper Jam", priority: 1 },
  wobbly: { color: "#ffc107", label: "Wobbly", priority: 1 },
  squeaky: { color: "#17a2b8", label: "Squeaky", priority: 0 },
  torn_upholstery: { color: "#6c757d", label: "Worn", priority: 1 },
  sticky_surface: { color: "#ffc107", label: "Needs Cleaning", priority: 1 },
  marker_stains: { color: "#17a2b8", label: "Stained", priority: 0 },
  needs_cleaning: { color: "#17a2b8", label: "Needs Cleaning", priority: 0 }
};

// Report status workflow
const reportStatuses = {
  open: { color: "#dc3545", label: "Open", next: ["in_progress"] },
  in_progress: { color: "#ffc107", label: "In Progress", next: ["resolved", "open"] },
  resolved: { color: "#28a745", label: "Resolved", next: ["open"] }
};

// Utility functions
const RoomUtils = {
  // Get room by ID
  getRoom(roomId) {
    return campusRooms[roomId];
  },

  // Get all rooms
  getAllRooms() {
    return Object.values(campusRooms);
  },

  // Get rooms by building
  getRoomsByBuilding(building) {
    return Object.values(campusRooms).filter(room => room.building === building);
  },

  // Get rooms by type
  getRoomsByType(type) {
    return Object.values(campusRooms).filter(room => room.type === type);
  },

  // Get room inventory
  getRoomInventory(roomId) {
    const room = campusRooms[roomId];
    return room ? room.inventory : {};
  },

  // Get object from room inventory
  getObject(roomId, objectId) {
    const inventory = this.getRoomInventory(roomId);
    return inventory[objectId];
  },

  // Get rooms with issues (non-operational objects)
  getRoomsWithIssues() {
    return Object.values(campusRooms).filter(room => {
      return Object.values(room.inventory).some(obj => obj.status !== 'operational');
    });
  },

  // Count objects by status
  getObjectStatusCounts(roomId) {
    const inventory = this.getRoomInventory(roomId);
    const counts = {};
    
    Object.values(inventory).forEach(obj => {
      counts[obj.status] = (counts[obj.status] || 0) + 1;
    });
    
    return counts;
  },

  // Get room color based on issues
  getRoomColor(roomId) {
    const room = campusRooms[roomId];
    if (!room) return roomCategories.office.color;

    const hasIssues = Object.values(room.inventory).some(obj => obj.status !== 'operational');
    const hasHighPriorityIssues = Object.values(room.inventory).some(obj => 
      obj.status !== 'operational' && 
      statusDefinitions[obj.status]?.priority >= 2
    );

    if (hasHighPriorityIssues) return "#dc3545"; // Red for high priority issues
    if (hasIssues) return "#ffc107"; // Yellow for any issues
    return roomCategories[room.type]?.color || roomCategories.office.color;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    campusRooms,
    roomCategories,
    objectTypes,
    statusDefinitions,
    reportStatuses,
    RoomUtils
  };
}
