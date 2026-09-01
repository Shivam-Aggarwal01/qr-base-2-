import {
  User,
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  AssetAssignment,
  Request,
  InventoryTransaction,
  AuditLog,
  AssetStatus,
  TransactionType,
  RequestStatus,
} from "../types/inventory";

const STORAGE_KEYS = {
  USERS: "lablogic_users_v1",
  LOCATIONS: "lablogic_locations_v1",
  CATALOG: "lablogic_catalog_v1",
  STOCK: "lablogic_stock_v1",
  ASSETS: "lablogic_assets_v1",
  ASSIGNMENTS: "lablogic_assignments_v1",
  REQUESTS: "lablogic_requests_v1",
  TRANSACTIONS: "lablogic_transactions_v1",
  AUDIT: "lablogic_audit_v1",
  ACTIVE_USER: "lablogic_active_user_v1",
};

export class InventoryStorage {
  private static load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Failed to load ${key} from storage:`, e);
      return fallback;
    }
  }

  private static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save ${key} to storage:`, e);
    }
  }

  // --- Getters ---
  static getUsers(): User[] {
    return this.load(STORAGE_KEYS.USERS, [] as User[]);
  }

  static getActiveUser(): User {
    const users = this.getUsers();
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (savedId) {
      const found = users.find((u) => u.id === savedId);
      if (found) return found;
    }

    return (
      users[0] || {
        id: "guest-user",
        user_code: "GUEST",
        name: "Guest User",
        email: "guest@local.dev",
        role: "STUDENT",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  static setActiveUser(userId: string): User {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, userId);
    const users = this.getUsers();
    const found = users.find((u) => u.id === userId);
    return found || this.getActiveUser();
  }

  static getLocations(): Location[] {
    return this.load(STORAGE_KEYS.LOCATIONS, [] as Location[]);
  }

  static getCatalog(): CatalogItem[] {
    return this.load(STORAGE_KEYS.CATALOG, [] as CatalogItem[]);
  }

  static getStockLevels(): StockLevel[] {
    return this.load(STORAGE_KEYS.STOCK, [] as StockLevel[]);
  }

  static getAssets(): Asset[] {
    return this.load(STORAGE_KEYS.ASSETS, [] as Asset[]);
  }

  static getAssignments(): AssetAssignment[] {
    return this.load(STORAGE_KEYS.ASSIGNMENTS, [] as AssetAssignment[]);
  }

  static getRequests(): Request[] {
    return this.load(STORAGE_KEYS.REQUESTS, [] as Request[]);
  }

  static getTransactions(): InventoryTransaction[] {
    return this.load(STORAGE_KEYS.TRANSACTIONS, [] as InventoryTransaction[]);
  }

  static getAuditLogs(): AuditLog[] {
    return this.load(STORAGE_KEYS.AUDIT, [] as AuditLog[]);
  }

  // Reset demo state
  static resetAllData(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([]));
  }

  // Audit logger
  private static logAudit(
    action: string,
    entityType: string,
    entityId: string,
    userId?: string,
  ) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId || this.getActiveUser().id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      created_at: new Date().toISOString(),
    };
    this.save(STORAGE_KEYS.AUDIT, [newLog, ...logs]);
  }

  // --- Core Domain Operations ---

  // Add / Edit Catalog Item
  static saveCatalogItem(
    item: Partial<CatalogItem> & {
      name: string;
      item_code: string;
      type: CatalogItem["type"];
    },
  ): CatalogItem {
    const items = this.getCatalog();
    const now = new Date().toISOString();
    let savedItem: CatalogItem | undefined;

    if (item.id) {
      items.forEach((c, idx) => {
        if (c.id === item.id) {
          items[idx] = { ...c, ...item, updated_at: now };
          savedItem = items[idx];
        }
      });
    } else {
      savedItem = {
        id: `cat-${Date.now()}`,
        item_code: item.item_code,
        name: item.name,
        type: item.type,
        description: item.description || "",
        unit: item.unit || "pcs",
        min_stock_alert: item.min_stock_alert || 10,
        created_at: now,
        updated_at: now,
      };
      items.unshift(savedItem);
    }

    if (!savedItem) {
      throw new Error(`Catalog item not found for update: ${item.id}`);
    }

    this.save(STORAGE_KEYS.CATALOG, items);
    this.logAudit(
      item.id ? "UPDATE_CATALOG_ITEM" : "CREATE_CATALOG_ITEM",
      "CATALOG_ITEM",
      savedItem.id,
    );
    return savedItem;
  }

  // Stock Adjustment / Receive / Restock
  static adjustStock(
    catalogItemId: string,
    locationId: string,
    quantityDelta: number,
    transactionType: TransactionType,
    remarks?: string,
  ): void {
    const stocks = this.getStockLevels();
    const activeUser = this.getActiveUser();
    const now = new Date().toISOString();

    let stockItem = stocks.find(
      (s) =>
        s.catalog_item_id === catalogItemId && s.location_id === locationId,
    );
    if (!stockItem) {
      stockItem = {
        id: `stk-${Date.now()}`,
        catalog_item_id: catalogItemId,
        location_id: locationId,
        quantity: Math.max(0, quantityDelta),
        updated_at: now,
      };
      stocks.push(stockItem);
    } else {
      stockItem.quantity = Math.max(0, stockItem.quantity + quantityDelta);
      stockItem.updated_at = now;
    }

    this.save(STORAGE_KEYS.STOCK, stocks);

    // Record Transaction
    const txs = this.getTransactions();
    const newTx: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      catalog_item_id: catalogItemId,
      transaction_type: transactionType,
      quantity: Math.abs(quantityDelta),
      to_location_id: quantityDelta > 0 ? locationId : undefined,
      from_location_id: quantityDelta < 0 ? locationId : undefined,
      processed_by_user_id: activeUser.id,
      remarks:
        remarks ||
        `Stock adjusted by ${quantityDelta > 0 ? "+" : ""}${quantityDelta}`,
      created_at: now,
    };
    this.save(STORAGE_KEYS.TRANSACTIONS, [newTx, ...txs]);
    this.logAudit("ADJUST_STOCK", "STOCK_LEVEL", stockItem.id);

    // Optionally sync to Firestore (non-blocking)
    try {
      import("../services/firebaseCollections").then(async (module) => {
        await module.updateDocument("stock_levels", stockItem!.id, {
          quantity: stockItem!.quantity,
          updated_at: now,
        });
        console.log(
          `✅ Stock updated in Firestore: ${catalogItemId} -> ${stockItem!.quantity}`,
        );
      });
    } catch (error) {
      console.log(
        "ℹ️ Stock update to Firestore skipped (local storage updated)",
      );
    }
  }

  // Issue Reusable Asset (or take units from a Box asset)
  static issueAsset(
    assetId: string,
    toUserId: string,
    remarks?: string,
    requestId?: string,
    quantityToTake: number = 1,
  ): Asset {
    const assets = this.getAssets();
    const activeUser = this.getActiveUser();
    const now = new Date().toISOString();

    const asset = assets.find((a) => a.id === assetId);
    if (!asset) throw new Error("Asset not found");

    const previousLocationId = asset.location_id;
    const isBox =
      asset.is_box ||
      asset.tracking_mode === "BOX" ||
      (asset.box_capacity && asset.box_capacity > 1);

    if (isBox) {
      const currentAvail = asset.available_in_box ?? asset.box_capacity ?? 10;
      const takeQty = Math.min(quantityToTake, currentAvail);
      const newAvail = Math.max(0, currentAvail - takeQty);
      asset.available_in_box = newAvail;
      if (newAvail === 0) {
        asset.status = "ISSUED";
      } else {
        asset.status = "AVAILABLE";
      }
    } else {
      asset.status = "ISSUED";
      asset.assigned_to_user_id = toUserId;
      asset.location_id = null;
    }
    asset.updated_at = now;

    this.save(STORAGE_KEYS.ASSETS, assets);

    // Create Assignment
    const assignments = this.getAssignments();
    const newAssignment: AssetAssignment = {
      id: `asg-${Date.now()}`,
      asset_id: assetId,
      assigned_to_user_id: toUserId,
      assigned_by_user_id: activeUser.id,
      quantity: isBox ? quantityToTake : 1,
      assigned_at: now,
      remarks:
        remarks ||
        (isBox
          ? `Took ${quantityToTake} units from ${asset.asset_code}`
          : "Issued to student"),
    };
    this.save(STORAGE_KEYS.ASSIGNMENTS, [newAssignment, ...assignments]);

    // Record Transaction
    const txs = this.getTransactions();
    const newTx: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      asset_id: assetId,
      catalog_item_id: asset.catalog_item_id,
      transaction_type: "ISSUE",
      quantity: isBox ? quantityToTake : 1,
      from_location_id: previousLocationId || undefined,
      issued_to_user_id: toUserId,
      request_id: requestId,
      processed_by_user_id: activeUser.id,
      remarks:
        remarks ||
        `Issued ${isBox ? `${quantityToTake} units from box` : "asset"} ${asset.asset_code}`,
      created_at: now,
    };
    this.save(STORAGE_KEYS.TRANSACTIONS, [newTx, ...txs]);
    this.logAudit("ISSUE_ASSET", "ASSET", assetId);

    return asset;
  }

  // Return Reusable Asset (or return units to a Box asset)
  static returnAsset(
    assetId: string,
    toLocationId: string,
    remarks?: string,
    quantityToReturn: number = 1,
  ): Asset {
    const assets = this.getAssets();
    const activeUser = this.getActiveUser();
    const now = new Date().toISOString();

    const asset = assets.find((a) => a.id === assetId);
    if (!asset) throw new Error("Asset not found");

    const previousUser = asset.assigned_to_user_id;
    const isBox =
      asset.is_box ||
      asset.tracking_mode === "BOX" ||
      (asset.box_capacity && asset.box_capacity > 1);

    if (isBox) {
      const cap = asset.box_capacity ?? 15;
      const currentAvail = asset.available_in_box ?? 0;
      asset.available_in_box = Math.min(cap, currentAvail + quantityToReturn);
      asset.status = "AVAILABLE";
      if (toLocationId) asset.location_id = toLocationId;
    } else {
      asset.status = "AVAILABLE";
      asset.assigned_to_user_id = null;
      asset.location_id = toLocationId;
    }
    asset.updated_at = now;

    this.save(STORAGE_KEYS.ASSETS, assets);

    // Close/update active assignment
    const assignments = this.getAssignments();
    const activeAssignment = assignments.find(
      (a) => a.asset_id === assetId && !a.returned_at,
    );
    if (activeAssignment) {
      activeAssignment.returned_at = now;
      if (remarks)
        activeAssignment.remarks =
          (activeAssignment.remarks || "") + ` | Returned: ${remarks}`;
      this.save(STORAGE_KEYS.ASSIGNMENTS, assignments);
    }

    // Record Transaction
    const txs = this.getTransactions();
    const newTx: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      asset_id: assetId,
      catalog_item_id: asset.catalog_item_id,
      transaction_type: "RETURN",
      quantity: isBox ? quantityToReturn : 1,
      to_location_id: toLocationId,
      issued_to_user_id: previousUser || undefined,
      processed_by_user_id: activeUser.id,
      remarks:
        remarks ||
        `Returned ${isBox ? `${quantityToReturn} units to box` : "asset"} ${asset.asset_code}`,
      created_at: now,
    };
    this.save(STORAGE_KEYS.TRANSACTIONS, [newTx, ...txs]);
    this.logAudit("RETURN_ASSET", "ASSET", assetId);

    return asset;
  }

  // Update Asset Status (Damaged, Repair, Disposed, Lost, Move)
  static updateAssetStatus(
    assetId: string,
    newStatus: AssetStatus,
    newLocationId?: string | null,
    remarks?: string,
  ): Asset {
    const assets = this.getAssets();
    const activeUser = this.getActiveUser();
    const now = new Date().toISOString();

    const asset = assets.find((a) => a.id === assetId);
    if (!asset) throw new Error("Asset not found");

    const prevLocation = asset.location_id;
    asset.status = newStatus;
    if (newLocationId !== undefined) {
      asset.location_id = newLocationId;
    }
    if (newStatus === "DISPOSED" || newStatus === "LOST") {
      asset.assigned_to_user_id = null;
      asset.location_id = null;
    }
    asset.updated_at = now;
    if (remarks) asset.notes = remarks;

    this.save(STORAGE_KEYS.ASSETS, assets);

    let txType: TransactionType = "ADJUSTMENT";
    if (newStatus === "DAMAGED") txType = "DAMAGE";
    else if (newStatus === "DISPOSED") txType = "DISPOSAL";
    else if (newStatus === "AVAILABLE" && prevLocation !== newLocationId)
      txType = "MOVE";

    const txs = this.getTransactions();
    const newTx: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      asset_id: assetId,
      catalog_item_id: asset.catalog_item_id,
      transaction_type: txType,
      quantity: 1,
      from_location_id: prevLocation || undefined,
      to_location_id: asset.location_id || undefined,
      processed_by_user_id: activeUser.id,
      remarks: remarks || `Asset status changed to ${newStatus}`,
      created_at: now,
    };
    this.save(STORAGE_KEYS.TRANSACTIONS, [newTx, ...txs]);
    this.logAudit(`UPDATE_ASSET_STATUS_${newStatus}`, "ASSET", assetId);

    return asset;
  }

  // Create New Request
  static createRequest(
    userId: string,
    purpose: string,
    items: { catalog_item_id: string; requested_qty: number }[],
    remarks?: string,
  ): Request {
    const requests = this.getRequests();
    const now = new Date().toISOString();
    const reqNum = `REQ-${now.substring(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const newReq: Request = {
      id: `req-${Date.now()}`,
      request_number: reqNum,
      user_id: userId,
      purpose,
      status: "PENDING",
      remarks: remarks || "",
      created_at: now,
      updated_at: now,
      items: items.map((i, idx) => ({
        id: `reqi-${Date.now()}-${idx}`,
        request_id: `req-${Date.now()}`,
        catalog_item_id: i.catalog_item_id,
        requested_qty: i.requested_qty,
      })),
    };

    this.save(STORAGE_KEYS.REQUESTS, [newReq, ...requests]);
    this.logAudit("CREATE_REQUEST", "REQUEST", newReq.id, userId);
    return newReq;
  }

  // Fulfill Request
  static fulfillRequest(
    requestId: string,
    status: RequestStatus,
    remarks?: string,
  ): Request {
    const requests = this.getRequests();
    const activeUser = this.getActiveUser();
    const now = new Date().toISOString();

    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error("Request not found");

    req.status = status;
    req.approved_by_user_id = activeUser.id;
    if (remarks) req.remarks = remarks;
    req.updated_at = now;

    if (status === "COMPLETED" || status === "PARTIAL") {
      const catalogItems = this.getCatalog();
      const defaultStore = this.getLocations()[0]?.id || "default-storage";

      req.items?.forEach((item) => {
        const catalogItem = catalogItems.find(
          (catalog) => catalog.id === item.catalog_item_id,
        );
        const storagePlace = catalogItem?.storage_place || defaultStore;

        if (item.catalog_item_id && item.requested_qty > 0 && !item.asset_id) {
          this.adjustStock(
            item.catalog_item_id,
            storagePlace,
            -item.requested_qty,
            "ISSUE",
            `Issued via request ${req.request_number}`,
          );
        }
      });
    }

    if (status === "CANCELLED") {
      req.remarks = remarks || "Request rejected and no stock was deducted.";
    }

    this.save(STORAGE_KEYS.REQUESTS, requests);
    this.logAudit(`FULFILL_REQUEST_${status}`, "REQUEST", requestId);
    return req;
  }

  // Add Location
  static addLocation(name: string, code?: string): Location {
    const locations = this.getLocations();
    const now = new Date().toISOString();
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name,
      code:
        code ||
        `LOC-${name
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 6)
          .toUpperCase()}`,
      created_at: now,
      updated_at: now,
    };
    this.save(STORAGE_KEYS.LOCATIONS, [...locations, newLoc]);
    this.logAudit("CREATE_LOCATION", "LOCATION", newLoc.id);
    return newLoc;
  }

  // Add Asset
  static addAsset(
    catalogItemId: string,
    assetCode: string,
    locationId: string,
    serialNumber?: string,
    notes?: string,
  ): Asset {
    const assets = this.getAssets();
    const now = new Date().toISOString();
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      asset_code: assetCode,
      catalog_item_id: catalogItemId,
      serial_number: serialNumber,
      status: "AVAILABLE",
      location_id: locationId,
      notes: notes || "",
      created_at: now,
      updated_at: now,
    };
    this.save(STORAGE_KEYS.ASSETS, [newAsset, ...assets]);
    this.logAudit("CREATE_ASSET", "ASSET", newAsset.id);
    return newAsset;
  }

  // QR Code lookup service (matches code string to user, asset, catalog item, location, or request)
  static parseQRCode(qrData: string): {
    type: "asset" | "catalog" | "location" | "request" | "user" | "unknown";
    entity: any;
    rawCode: string;
  } {
    const cleanData = qrData.trim();
    const assets = this.getAssets();
    const catalog = this.getCatalog();
    const locations = this.getLocations();
    const requests = this.getRequests();
    const users = this.getUsers();

    // 1. Check Asset Code or Serial Number
    const foundAsset = assets.find(
      (a) =>
        a.asset_code.toLowerCase() === cleanData.toLowerCase() ||
        a.serial_number?.toLowerCase() === cleanData.toLowerCase(),
    );
    if (foundAsset)
      return { type: "asset", entity: foundAsset, rawCode: cleanData };

    // 2. Check Catalog Item Code
    const foundCatalog = catalog.find(
      (c) => c.item_code.toLowerCase() === cleanData.toLowerCase(),
    );
    if (foundCatalog)
      return { type: "catalog", entity: foundCatalog, rawCode: cleanData };

    // 3. Check Location Code or Name
    const foundLoc = locations.find(
      (l) =>
        l.code?.toLowerCase() === cleanData.toLowerCase() ||
        l.name.toLowerCase() === cleanData.toLowerCase(),
    );
    if (foundLoc)
      return { type: "location", entity: foundLoc, rawCode: cleanData };

    // 4. Check Request Number
    const foundReq = requests.find(
      (r) => r.request_number.toLowerCase() === cleanData.toLowerCase(),
    );
    if (foundReq)
      return { type: "request", entity: foundReq, rawCode: cleanData };

    // 5. Check User Code
    const foundUser = users.find(
      (u) => u.user_code.toLowerCase() === cleanData.toLowerCase(),
    );
    if (foundUser)
      return { type: "user", entity: foundUser, rawCode: cleanData };

    // Search loose match
    const fuzzyAsset = assets.find((a) =>
      cleanData.toLowerCase().includes(a.asset_code.toLowerCase()),
    );
    if (fuzzyAsset)
      return { type: "asset", entity: fuzzyAsset, rawCode: cleanData };

    const fuzzyCatalog = catalog.find((c) =>
      cleanData.toLowerCase().includes(c.item_code.toLowerCase()),
    );
    if (fuzzyCatalog)
      return { type: "catalog", entity: fuzzyCatalog, rawCode: cleanData };

    return { type: "unknown", entity: null, rawCode: cleanData };
  }
}

export type QRParseEntities = {
  assets?: Asset[];
  catalog?: CatalogItem[];
  locations?: Location[];
  requests?: Request[];
  users?: User[];
};

// Overload-like helper: keeps existing call sites working, but allows
// QR parsing to use the in-memory Firestore state.
export function parseQRCodeFromEntities(
  qrData: string,
  entities: QRParseEntities,
) {
  const cleanData = qrData.trim();
  const assets = entities.assets ?? InventoryStorage.getAssets();
  const catalog = entities.catalog ?? InventoryStorage.getCatalog();
  const locations = entities.locations ?? InventoryStorage.getLocations();
  const requests = entities.requests ?? InventoryStorage.getRequests();
  const users = entities.users ?? InventoryStorage.getUsers();

  // 1. Check Asset Code or Serial Number
  const foundAsset = assets.find(
    (a) =>
      a.asset_code.toLowerCase() === cleanData.toLowerCase() ||
      a.serial_number?.toLowerCase() === cleanData.toLowerCase(),
  );
  if (foundAsset)
    return { type: "asset" as const, entity: foundAsset, rawCode: cleanData };

  // 2. Check Catalog Item Code
  const foundCatalog = catalog.find(
    (c) => c.item_code.toLowerCase() === cleanData.toLowerCase(),
  );
  if (foundCatalog)
    return {
      type: "catalog" as const,
      entity: foundCatalog,
      rawCode: cleanData,
    };

  // 3. Check Location Code or Name
  const foundLoc = locations.find(
    (l) =>
      l.code?.toLowerCase() === cleanData.toLowerCase() ||
      l.name.toLowerCase() === cleanData.toLowerCase(),
  );
  if (foundLoc)
    return { type: "location" as const, entity: foundLoc, rawCode: cleanData };

  // 4. Check Request Number
  const foundReq = requests.find(
    (r) => r.request_number.toLowerCase() === cleanData.toLowerCase(),
  );
  if (foundReq)
    return { type: "request" as const, entity: foundReq, rawCode: cleanData };

  // 5. Check User Code
  const foundUser = users.find(
    (u) => u.user_code.toLowerCase() === cleanData.toLowerCase(),
  );
  if (foundUser)
    return { type: "user" as const, entity: foundUser, rawCode: cleanData };

  // Search loose match
  const fuzzyAsset = assets.find((a) =>
    cleanData.toLowerCase().includes(a.asset_code.toLowerCase()),
  );
  if (fuzzyAsset)
    return { type: "asset" as const, entity: fuzzyAsset, rawCode: cleanData };

  const fuzzyCatalog = catalog.find((c) =>
    cleanData.toLowerCase().includes(c.item_code.toLowerCase()),
  );
  if (fuzzyCatalog)
    return {
      type: "catalog" as const,
      entity: fuzzyCatalog,
      rawCode: cleanData,
    };

  return { type: "unknown" as const, entity: null, rawCode: cleanData };
}
