export type UserRole = 'ADMIN' | 'STUDENT_AMBASSADOR' | 'STUDENT';

export type ItemType = 'CONSUMABLE' | 'REUSABLE' | 'TOOL';

export type AssetStatus = 'AVAILABLE' | 'ISSUED' | 'UNDER_REPAIR' | 'DAMAGED' | 'LOST' | 'DISPOSED';

export type RequestStatus = 'PENDING' | 'COMPLETED' | 'PARTIAL' | 'CANCELLED';

export type TransactionType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'MOVE' | 'ADJUSTMENT' | 'DAMAGE' | 'DISPOSAL';

export interface User {
  id: string;
  user_code: string; // Roll Number or Employee ID
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type AssetTrackingMode = 'BOX' | 'INDIVIDUAL';

export interface CatalogItem {
  id: string;
  item_code: string;
  name: string;
  type: ItemType;
  description: string;
  unit: string;
  tracking_mode?: AssetTrackingMode;
  min_stock_alert?: number;
  storage_place?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface StockLevel {
  id: string;
  catalog_item_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  catalog_item_id: string;
  serial_number?: string;
  status: AssetStatus;
  location_id?: string | null;
  assigned_to_user_id?: string | null;
  tracking_mode?: AssetTrackingMode; // 'BOX' or 'INDIVIDUAL'
  is_box?: boolean;
  box_capacity?: number; // Total capacity of the box (e.g. 15)
  available_in_box?: number; // Currently inside box available for checkout (e.g. 12)
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  quantity?: number; // For box assets, how many units taken (default 1 for individual)
  assigned_at: string;
  returned_at?: string | null;
  remarks?: string;
}

export interface RequestItem {
  id: string;
  request_id: string;
  catalog_item_id: string;
  requested_qty: number;
  fulfilled_qty?: number;
}

export interface Request {
  id: string;
  request_number: string;
  user_id: string;
  purpose: string;
  status: RequestStatus;
  approved_by_user_id?: string | null;
  remarks?: string;
  created_at: string;
  updated_at: string;
  items?: RequestItem[];
}

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

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export type ViewMode = 'dashboard' | 'inventory' | 'assets' | 'requests' | 'locations' | 'activity' | 'qr-sheet' | 'users';
