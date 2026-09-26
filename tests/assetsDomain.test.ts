import test from "node:test";
import assert from "node:assert/strict";

import { InventoryStorage } from "../src/services/storage";
import { handoverLabRequest } from "../src/services/requestWorkflow";

function setupStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });
}

test.beforeEach(() => {
  setupStorage();
  InventoryStorage.resetAllData();

  const activeUser = {
    id: "user-1",
    user_code: "USR-001",
    name: "Lab Admin",
    email: "admin@lab.local",
    role: "ADMIN" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const secondUser = {
    id: "user-2",
    user_code: "USR-002",
    name: "Student A",
    email: "student@lab.local",
    role: "STUDENT" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem("lablogic_users_v1", JSON.stringify([activeUser, secondUser]));
  localStorage.setItem("lablogic_active_user_v1", activeUser.id);

  InventoryStorage.addLocation("Workshop Bench");
  InventoryStorage.addLocation("Tool Cabinet");
});

test("asset lifecycle follows AICTE rules for issue, return, and status validation", () => {
  const workshop = InventoryStorage.getLocations()[0];
  const cabinet = InventoryStorage.getLocations()[1];
  const asset = InventoryStorage.addAsset("cat-1", "ASSET-001", workshop.id, "SN-001");

  assert.equal(asset.qr_code, "ASSET-001");
  assert.equal(asset.status, "AVAILABLE");
  assert.equal(asset.location_id, workshop.id);
  assert.equal(asset.assigned_to_user_id, null);

  InventoryStorage.issueAsset(asset.id, "user-2", "Circuit lab session");

  const issued = InventoryStorage.getAssets().find((entry) => entry.id === asset.id)!;
  assert.equal(issued.status, "ISSUED");
  assert.equal(issued.assigned_to_user_id, "user-2");
  assert.equal(issued.location_id, null);

  assert.throws(
    () => InventoryStorage.issueAsset(asset.id, "user-1", "Duplicate issue"),
    /already assigned|not available|currently assigned/i,
  );

  InventoryStorage.returnAsset(asset.id, cabinet.id, "Returned after use");

  const returned = InventoryStorage.getAssets().find((entry) => entry.id === asset.id)!;
  assert.equal(returned.status, "AVAILABLE");
  assert.equal(returned.assigned_to_user_id, null);
  assert.equal(returned.location_id, cabinet.id);

  InventoryStorage.updateAssetStatus(asset.id, "UNDER_REPAIR" as any, cabinet.id, "Faulty relay");
  assert.throws(
    () => InventoryStorage.issueAsset(asset.id, "user-1", "Attempted issue while under repair"),
    /cannot be issued|not available/i,
  );

  InventoryStorage.updateAssetStatus(asset.id, "RETIRED" as any, cabinet.id, "End-of-life");
  assert.equal(InventoryStorage.getAssets().find((entry) => entry.id === asset.id)?.status, "RETIRED");
  assert.throws(
    () => InventoryStorage.issueAsset(asset.id, "user-1", "Retired asset"),
    /cannot be issued|retired|lost|damaged|under repair/i,
  );
});

test("asset QR remains stable across status, location, and assignment changes", () => {
  const workshop = InventoryStorage.getLocations()[0];
  const cabinet = InventoryStorage.getLocations()[1];
  const asset = InventoryStorage.addAsset("cat-2", "ASSET-002", workshop.id, "SN-002");

  const originalQr = asset.qr_code;
  InventoryStorage.issueAsset(asset.id, "user-2", "Lab training");
  InventoryStorage.returnAsset(asset.id, cabinet.id, "Checked back in");
  InventoryStorage.updateAssetStatus(asset.id, "DAMAGED" as any, cabinet.id, "Broken screen");

  const latestAsset = InventoryStorage.getAssets().find((entry) => entry.id === asset.id)!;
  assert.equal(latestAsset.qr_code, originalQr);
  assert.equal(latestAsset.asset_code, originalQr);
});

test("asset handover creates a ledger entry and authorization is required for asset handover", async () => {
  const workshop = InventoryStorage.getLocations()[0];
  const asset = InventoryStorage.addAsset("cat-3", "ASSET-003", workshop.id, "SN-003");

  InventoryStorage.issueAsset(asset.id, "user-2", "Project use");

  const transactions = InventoryStorage.getTransactions();
  assert.equal(transactions[0]?.transaction_type, "ISSUE");
  assert.equal(transactions[0]?.asset_id, asset.id);
  assert.equal(transactions[0]?.issued_to_user_id, "user-2");

  const request = {
    id: "req-1",
    request_number: "REQ-001",
    user_id: "user-2",
    purpose: "Capstone lab access",
    status: "APPROVED" as const,
    approved_by_user_id: "user-1",
    handed_over_by_user_id: null,
    handed_over_at: null,
    remarks: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [{ id: "line-1", request_id: "req-1", asset_id: asset.id, requested_qty: 1, handed_over: false }],
  };

  await assert.rejects(
    () => handoverLabRequest(request, { id: "user-1", user_code: "USR-001", name: "Lab Admin", email: "admin@lab.local", role: "ADMIN", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, "handover"),
    /signed in|Firestore access blocked/i,
  );
});
