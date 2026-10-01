// ============================================================
// INVENTORY SYSTEM TYPES
// All codes (item_code, asset_code, user_code, location code)
// are generated server-side from Firestore doc IDs.
// Users never enter or see internal codes.
// ============================================================

export type UserRole = 'ADMIN' | 'STUDENT_AMBASSADOR' | 'STUDENT_LEAD' | 'STUDENT';

export type RequestUsage = 'CONSUMABLE' | 'REUSABLE';

export type AssetStatus = 'AVAILABLE' | 'ISSUED' | 'UNDER_REPAIR' | 'DAMAGED' | 'LOST' | 'RETIRED';

export type RequestStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'HANDED_OVER' | 'RETURN_REQUESTED' | 'COMPLETED' | 'PARTIAL' | 'CANCELLED';

export type RequestLineKind = 'CATALOG' | 'ASSET';

export interface RequestLineDraft {
  kind: RequestLineKind;
  catalog_item_id?: string;
  asset_id?: string;
  requested_qty: number;
  usage?: RequestUsage;
}

export type AccountRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AccountRequest {
  id: string;
  email: string;
  name: string;
  status: AccountRequestStatus;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'MOVE' | 'ADJUSTMENT' | 'DAMAGE' | 'DISPOSAL';

// ---------------------------------------------------------------------------
// User
// user_code is auto-generated as USR-<docId prefix>
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  /** Auto-generated from Firestore doc ID — never entered manually. */
  user_code: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type AssetTrackingMode = 'BOX' | 'INDIVIDUAL';

// ---------------------------------------------------------------------------
// CatalogItem
// item_code is auto-generated as ITEM-<docId prefix> after creation
// ---------------------------------------------------------------------------
export interface CatalogItem {
  id: string;
  /** Auto-generated from Firestore doc ID — never entered manually. */
  item_code: string;
  name: string;
  description: string;
  unit: string;
  tracking_mode?: AssetTrackingMode;
  min_stock_alert?: number;
  storage_place?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Location
// code is auto-generated as LOC-<docId prefix> after creation
// ---------------------------------------------------------------------------
// Location
// code is auto-generated as LOC-<docId prefix> after creation
// ---------------------------------------------------------------------------

export interface Location {
  id: string;
  name: string;
  /** Auto-generated from Firestore doc ID — never entered manually. */
  code?: string;
  /**
   * Describes physical placement in the lab, dynamically.
   * e.g. "Main Lab > Almirah 1 > Rack 2"
   */
  storage_path?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// StockLevel
// ---------------------------------------------------------------------------
export interface StockLevel {
  id: string;
  catalog_item_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Asset
// asset_code is auto-generated as ASSET-<docId prefix> after creation
// ---------------------------------------------------------------------------
export interface Asset {
  id: string;
  /** Auto-generated from Firestore doc ID — never entered manually. */
  asset_code: string;
  qr_code?: string;
  /**
   * Human-readable asset name, e.g. "Soldering Station 01".
   * Required — every asset must have a unique, descriptive name.
   */
  name: string;
  catalog_item_id: string;
  serial_number?: string | null;
  status: AssetStatus;
  location_id?: string | null;
  /** Detailed sub-location within the location, e.g. "Row 2, Shelf B". */
  storage_location?: string | null;
  assigned_to_user_id?: string | null;
  tracking_mode?: AssetTrackingMode;
  is_box?: boolean;
  box_capacity?: number;
  available_in_box?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// AssetAssignment
// ---------------------------------------------------------------------------
export interface AssetAssignment {
  id: string;
  asset_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  /** For box assets, how many units taken (default 1 for individual assets). */
  quantity?: number;
  assigned_at: string;
  returned_at?: string | null;
  remarks?: string;
}

// ---------------------------------------------------------------------------
// Request + RequestItem
// ---------------------------------------------------------------------------
export interface RequestItem {
  id: string;
  request_id: string;
  kind?: RequestLineKind;
  catalog_item_id?: string;
  asset_id?: string;
  requested_qty: number;
  usage?: RequestUsage;
  fulfilled_qty?: number;
  handed_over?: boolean;
}

export interface Request {
  id: string;
  request_number: string;
  user_id: string;
  purpose: string;
  status: RequestStatus;
  approved_by_user_id?: string | null;
  handed_over_by_user_id?: string | null;
  handed_over_at?: string | null;
  deadline_at?: string | null;
  remarks?: string;
  created_at: string;
  updated_at: string;
  items?: RequestItem[];
}

// ---------------------------------------------------------------------------
// InventoryTransaction
// ---------------------------------------------------------------------------
export interface InventoryTransaction {
  id: string;
  catalog_item_id?: string | null;
  asset_id?: string | null;
  transaction_type: TransactionType;
  quantity: number;
  from_location_id?: string | null;
  to_location_id?: string | null;
  issued_to_user_id?: string | null;
  request_id?: string | null;
  processed_by_user_id?: string | null;
  remarks?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AuditLog
// ---------------------------------------------------------------------------
export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// View routing
// ---------------------------------------------------------------------------
export type ViewMode = 'dashboard' | 'inventory' | 'assets' | 'requests' | 'locations' | 'activity' | 'users' | 'legal';
