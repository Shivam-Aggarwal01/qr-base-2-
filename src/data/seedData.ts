import {
  User,
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  AssetAssignment,
  Request,
  InventoryTransaction,
  AuditLog
} from '../types/inventory';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-101',
    user_code: 'EMP-1001',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@lab.edu',
    role: 'ADMIN',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z'
  },
  {
    id: 'usr-102',
    user_code: 'STU-2102',
    name: 'Sarah Jenks',
    email: 's.jenks@student.edu',
    role: 'STUDENT_AMBASSADOR',
    created_at: '2026-01-12T09:30:00Z',
    updated_at: '2026-01-12T09:30:00Z'
  },
  {
    id: 'usr-103',
    user_code: 'STU-1890',
    name: 'Leo Volkov',
    email: 'l.volkov@student.edu',
    role: 'STUDENT_LEAD',
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-15T11:00:00Z'
  },
  {
    id: 'usr-104',
    user_code: 'STU-3041',
    name: 'Marcus Chen',
    email: 'm.chen@student.edu',
    role: 'STUDENT',
    created_at: '2026-02-01T14:20:00Z',
    updated_at: '2026-02-01T14:20:00Z'
  },
  {
    id: 'usr-105',
    user_code: 'STU-3088',
    name: 'Emma Watson',
    email: 'e.watson@student.edu',
    role: 'STUDENT',
    created_at: '2026-02-05T10:15:00Z',
    updated_at: '2026-02-05T10:15:00Z'
  },
  {
    id: 'usr-106',
    user_code: 'STU-4102',
    name: 'Devon Vance',
    email: 'd.vance@student.edu',
    role: 'STUDENT',
    created_at: '2026-02-10T16:45:00Z',
    updated_at: '2026-02-10T16:45:00Z'
  }
];

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-1',
    name: 'Cabinet A, Bin 12',
    code: 'LOC-CAB-A12',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-2',
    name: 'Cabinet A, Bin 04',
    code: 'LOC-CAB-A04',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-3',
    name: 'Drawer 02',
    code: 'LOC-DRW-02',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-4',
    name: 'Component Wall - Sec B',
    code: 'LOC-CW-B',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-5',
    name: 'Tool Rack 01',
    code: 'LOC-TR-01',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-6',
    name: 'Repair Bench',
    code: 'LOC-REP-BENCH',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'loc-7',
    name: 'Storage Room B',
    code: 'LOC-STOR-B',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  }
];

export const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: 'cat-1',
    item_code: 'CON-9912-X',
    name: '10k Resistors (100pk)',
    type: 'CONSUMABLE',
    description: '1/4W 1% Metal Film Resistors 10k Ohm pack of 100',
    unit: 'packs',
    min_stock_alert: 15,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-2',
    item_code: 'CON-4410-C',
    name: '10uF Electrolytic Capacitors',
    type: 'CONSUMABLE',
    description: '50V Radial Aluminum Electrolytic Capacitors',
    unit: 'pcs',
    min_stock_alert: 25,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-3',
    item_code: 'CON-5501-L',
    name: '5mm Red LEDs (50pk)',
    type: 'CONSUMABLE',
    description: 'Diffused 5mm Red Light Emitting Diodes pack',
    unit: 'packs',
    min_stock_alert: 10,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-4',
    item_code: 'CON-1102-W',
    name: '22 AWG Jumper Wires Set',
    type: 'CONSUMABLE',
    description: 'Breadboard Male-to-Male 65pcs Wire Kit',
    unit: 'kits',
    min_stock_alert: 10,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-5',
    item_code: 'ARD-UNO-01',
    name: 'Arduino Uno R3 (Box Batch)',
    type: 'REUSABLE',
    tracking_mode: 'BOX',
    description: 'ATmega328P Development Boards (Storage Box Batch)',
    unit: 'boxes',
    min_stock_alert: 5,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-6',
    item_code: 'ESP-32-01',
    name: 'ESP32 DevKit V1 (Box Batch)',
    type: 'REUSABLE',
    tracking_mode: 'BOX',
    description: 'Wi-Fi + Bluetooth Dual Core Board Storage Box (15-unit Capacity)',
    unit: 'boxes',
    min_stock_alert: 5,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-7',
    item_code: 'STM-64-01',
    name: 'STM32 Nucleo-64 (Box Batch)',
    type: 'REUSABLE',
    tracking_mode: 'BOX',
    description: 'STM32F401RE Development Boards Storage Box (10-unit Capacity)',
    unit: 'boxes',
    min_stock_alert: 3,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-8',
    item_code: 'TOOL-OSC-01',
    name: 'Digital Storage Oscilloscope',
    type: 'TOOL',
    tracking_mode: 'INDIVIDUAL',
    description: 'Dual Channel 100MHz 1GSa/s Desktop Oscilloscope (Standalone Unit)',
    unit: 'pcs',
    min_stock_alert: 1,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-9',
    item_code: 'TOOL-SLD-01',
    name: 'Soldering Station Pro 60W',
    type: 'TOOL',
    tracking_mode: 'INDIVIDUAL',
    description: 'ESD-Safe Temperature Controlled Soldering Station (Standalone Unit)',
    unit: 'pcs',
    min_stock_alert: 2,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'cat-10',
    item_code: 'TOOL-DMM-01',
    name: 'Auto-Ranging Multimeter',
    type: 'TOOL',
    tracking_mode: 'INDIVIDUAL',
    description: 'Digital Multimeter TRUE-RMS 6000 Counts (Standalone Unit)',
    unit: 'pcs',
    min_stock_alert: 2,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z'
  }
];

export const INITIAL_STOCK: StockLevel[] = [
  { id: 'stk-1', catalog_item_id: 'cat-1', location_id: 'loc-4', quantity: 45, updated_at: '2026-08-11T07:30:00Z' },
  { id: 'stk-2', catalog_item_id: 'cat-1', location_id: 'loc-3', quantity: 10, updated_at: '2026-08-11T07:30:00Z' },
  { id: 'stk-3', catalog_item_id: 'cat-2', location_id: 'loc-4', quantity: 8, updated_at: '2026-08-11T07:30:00Z' }, // Low stock!
  { id: 'stk-4', catalog_item_id: 'cat-3', location_id: 'loc-4', quantity: 3, updated_at: '2026-08-11T07:30:00Z' }, // Low stock!
  { id: 'stk-5', catalog_item_id: 'cat-4', location_id: 'loc-1', quantity: 22, updated_at: '2026-08-11T07:30:00Z' }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'ast-box-1',
    asset_code: 'BOX-ESP32-A1',
    catalog_item_id: 'cat-6',
    serial_number: 'BOX-ESP32-BATCH-01',
    status: 'AVAILABLE',
    tracking_mode: 'BOX',
    is_box: true,
    box_capacity: 15,
    available_in_box: 11,
    location_id: 'loc-2',
    assigned_to_user_id: null,
    notes: 'Box of 15 ESP32 DevKits. 11 inside box, 4 units out on student projects.',
    created_at: '2026-01-20T11:00:00Z',
    updated_at: '2026-08-11T08:31:00Z'
  },
  {
    id: 'ast-box-2',
    asset_code: 'BOX-ARD-B1',
    catalog_item_id: 'cat-5',
    serial_number: 'BOX-ARD-BATCH-02',
    status: 'AVAILABLE',
    tracking_mode: 'BOX',
    is_box: true,
    box_capacity: 12,
    available_in_box: 9,
    location_id: 'loc-1',
    assigned_to_user_id: null,
    notes: 'Box of 12 Arduino Uno R3 boards. 9 inside box, 3 borrowed.',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-08-10T14:20:00Z'
  },
  {
    id: 'ast-box-3',
    asset_code: 'BOX-STM-C1',
    catalog_item_id: 'cat-7',
    serial_number: 'BOX-STM-BATCH-03',
    status: 'AVAILABLE',
    tracking_mode: 'BOX',
    is_box: true,
    box_capacity: 10,
    available_in_box: 8,
    location_id: 'loc-3',
    assigned_to_user_id: null,
    notes: 'Box of 10 STM32 Nucleo-64 boards. 8 available in bin.',
    created_at: '2026-01-25T13:00:00Z',
    updated_at: '2026-08-11T03:46:00Z'
  },
  {
    id: 'ast-fixed-1',
    asset_code: 'TOOL-OSC-01A',
    catalog_item_id: 'cat-8',
    serial_number: 'SN-OSC-1004A',
    status: 'UNDER_REPAIR',
    tracking_mode: 'INDIVIDUAL',
    is_box: false,
    location_id: 'loc-6',
    assigned_to_user_id: null,
    notes: 'Channel 2 BNC input loose connection, being re-soldered at Repair Bench.',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-11T05:46:00Z'
  },
  {
    id: 'ast-fixed-2',
    asset_code: 'TOOL-OSC-01B',
    catalog_item_id: 'cat-8',
    serial_number: 'SN-OSC-1004B',
    status: 'AVAILABLE',
    tracking_mode: 'INDIVIDUAL',
    is_box: false,
    location_id: 'loc-5',
    assigned_to_user_id: null,
    notes: 'Desktop Oscilloscope, calibrated July 2026.',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-07-20T09:00:00Z'
  },
  {
    id: 'ast-fixed-3',
    asset_code: 'TOOL-SLD-01S',
    catalog_item_id: 'cat-9',
    serial_number: 'SN-SLD-60W-10',
    status: 'AVAILABLE',
    tracking_mode: 'INDIVIDUAL',
    is_box: false,
    location_id: 'loc-5',
    assigned_to_user_id: null,
    notes: 'ESD-Safe Soldering Station, chisel tip installed.',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z'
  },
  {
    id: 'ast-fixed-4',
    asset_code: 'TOOL-DMM-01A',
    catalog_item_id: 'cat-10',
    serial_number: 'SN-DMM-6000-A',
    status: 'ISSUED',
    tracking_mode: 'INDIVIDUAL',
    is_box: false,
    location_id: null,
    assigned_to_user_id: 'usr-104',
    notes: 'Issued to Marcus Chen for bench multimeter check.',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z'
  }
];

export const INITIAL_ASSIGNMENTS: AssetAssignment[] = [
  {
    id: 'asg-1',
    asset_id: 'ast-2',
    assigned_to_user_id: 'usr-104',
    assigned_by_user_id: 'usr-101',
    assigned_at: '2026-08-10T14:20:00Z',
    remarks: 'Issued for Capstone IoT prototype'
  },
  {
    id: 'asg-2',
    asset_id: 'ast-3',
    assigned_to_user_id: 'usr-102',
    assigned_by_user_id: 'usr-101',
    assigned_at: '2026-08-11T08:31:00Z',
    remarks: 'Issued for student workshop'
  },
  {
    id: 'asg-3',
    asset_id: 'ast-5',
    assigned_to_user_id: 'usr-105',
    assigned_by_user_id: 'usr-102',
    assigned_at: '2026-08-05T09:00:00Z',
    returned_at: '2026-08-11T03:46:00Z',
    remarks: 'Returned in working order'
  }
];

export const INITIAL_REQUESTS: Request[] = [
  {
    id: 'req-1',
    request_number: 'REQ-2026-0811',
    user_id: 'usr-104', // Marcus Chen
    purpose: 'Smart Agriculture Environmental Sensor Mesh Node Project',
    status: 'PENDING',
    approved_by_user_id: null,
    remarks: 'Needs components for field testing before Friday',
    created_at: '2026-08-11T08:15:00Z',
    updated_at: '2026-08-11T08:15:00Z',
    items: [
      { id: 'reqi-1', request_id: 'req-1', catalog_item_id: 'cat-6', requested_qty: 1 },
      { id: 'reqi-2', request_id: 'req-1', catalog_item_id: 'cat-1', requested_qty: 2 },
      { id: 'reqi-3', request_id: 'req-1', catalog_item_id: 'cat-4', requested_qty: 1 }
    ]
  },
  {
    id: 'req-2',
    request_number: 'REQ-2026-0810',
    user_id: 'usr-105', // Emma Watson
    purpose: 'Embedded Systems Lab Assignment 4',
    status: 'COMPLETED',
    approved_by_user_id: 'usr-101',
    remarks: 'Fully issued and verified',
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T11:30:00Z',
    items: [
      { id: 'reqi-4', request_id: 'req-2', catalog_item_id: 'cat-7', requested_qty: 1, fulfilled_qty: 1 }
    ]
  },
  {
    id: 'req-3',
    request_number: 'REQ-2026-0809',
    user_id: 'usr-106', // Devon Vance
    purpose: 'Digital Signal Processing Filter Testing',
    status: 'PENDING',
    approved_by_user_id: null,
    remarks: 'Requires bench oscilloscope access',
    created_at: '2026-08-11T07:00:00Z',
    updated_at: '2026-08-11T07:00:00Z',
    items: [
      { id: 'reqi-5', request_id: 'req-3', catalog_item_id: 'cat-8', requested_qty: 1 },
      { id: 'reqi-6', request_id: 'req-3', catalog_item_id: 'cat-2', requested_qty: 5 }
    ]
  }
];

export const INITIAL_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'trx-1',
    asset_id: 'ast-1',
    catalog_item_id: 'cat-5',
    transaction_type: 'RETURN',
    quantity: 1,
    to_location_id: 'loc-1',
    issued_to_user_id: 'usr-104',
    processed_by_user_id: 'usr-102',
    remarks: 'Returned Arduino Uno R3 in Cabinet A, Bin 12',
    created_at: '2026-08-11T08:44:00Z'
  },
  {
    id: 'trx-2',
    asset_id: 'ast-3',
    catalog_item_id: 'cat-6',
    transaction_type: 'ISSUE',
    quantity: 1,
    from_location_id: 'loc-2',
    issued_to_user_id: 'usr-102',
    processed_by_user_id: 'usr-101',
    remarks: 'Issued ESP32 DevKit V1 for Ambassador demo',
    created_at: '2026-08-11T08:31:00Z'
  },
  {
    id: 'trx-3',
    catalog_item_id: 'cat-1',
    transaction_type: 'ADJUSTMENT',
    quantity: 5,
    to_location_id: 'loc-4',
    processed_by_user_id: 'usr-101',
    remarks: 'Routine stock count audit adjustment',
    created_at: '2026-08-11T07:46:00Z'
  },
  {
    id: 'trx-4',
    asset_id: 'ast-6',
    catalog_item_id: 'cat-8',
    transaction_type: 'DAMAGE',
    quantity: 1,
    from_location_id: 'loc-5',
    to_location_id: 'loc-6',
    issued_to_user_id: 'usr-103',
    processed_by_user_id: 'usr-101',
    remarks: 'BNC Channel 2 fault reported, moved to Repair Bench',
    created_at: '2026-08-11T05:46:00Z'
  },
  {
    id: 'trx-5',
    asset_id: 'ast-5',
    catalog_item_id: 'cat-7',
    transaction_type: 'RETURN',
    quantity: 1,
    to_location_id: 'loc-3',
    issued_to_user_id: 'usr-105',
    processed_by_user_id: 'usr-102',
    remarks: 'Returned STM32 Nucleo-64 to Drawer 02',
    created_at: '2026-08-11T03:46:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    user_id: 'usr-102',
    action: 'RETURN_ASSET',
    entity_type: 'ASSET',
    entity_id: 'ast-1',
    created_at: '2026-08-11T08:44:00Z'
  },
  {
    id: 'aud-2',
    user_id: 'usr-101',
    action: 'ISSUE_ASSET',
    entity_type: 'ASSET',
    entity_id: 'ast-3',
    created_at: '2026-08-11T08:31:00Z'
  },
  {
    id: 'aud-3',
    user_id: 'usr-104',
    action: 'CREATE_REQUEST',
    entity_type: 'REQUEST',
    entity_id: 'req-1',
    created_at: '2026-08-11T08:15:00Z'
  }
];
