import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type {
  Request,
  RequestItem,
  RequestLineKind,
  RequestStatus,
  User,
} from "../types/inventory";

export function getRequestLineKind(item: RequestItem): RequestLineKind {
  if (item.kind === "ASSET" || item.asset_id) return "ASSET";
  return "CATALOG";
}

function requireSignedInUser(): void {
  if (!auth.currentUser) {
    throw new Error("Firestore access blocked: user is not signed in.");
  }
}

export function getStudentRequestBuckets(requests: Request[], userId: string) {
  const myRequests = requests.filter((r) => r.user_id === userId);

  return {
    pending: myRequests.filter((r) => r.status === "PENDING"),
    approved: myRequests.filter((r) => r.status === "APPROVED"),
    completed: myRequests.filter(
      (r) => r.status === "COMPLETED" || r.status === "HANDED_OVER",
    ),
    total: myRequests,
    visible: myRequests.filter(
      (r) =>
        r.status === "PENDING" ||
        r.status === "APPROVED" ||
        r.status === "HANDED_OVER" ||
        r.status === "COMPLETED",
    ),
  };
}

export async function reviewLabRequest(
  request: Request,
  status: "APPROVED" | "REJECTED",
  staff: User,
  remarks?: string,
): Promise<void> {
  requireSignedInUser();
  if (request.status !== "PENDING") {
    throw new Error("Only pending requests can be approved or rejected.");
  }

  await updateDoc(doc(db, "requests", request.id), {
    status,
    approved_by_user_id: staff.id,
    remarks: remarks || request.remarks || "",
    updated_at: serverTimestamp(),
  });
}

export async function completeLabRequest(
  request: Request,
  _staff: User,
  remarks?: string,
): Promise<void> {
  requireSignedInUser();
  if (request.status !== "HANDED_OVER") {
    throw new Error("Only handed-over requests can be marked completed.");
  }

  await updateDoc(doc(db, "requests", request.id), {
    status: "COMPLETED" satisfies RequestStatus,
    remarks: remarks || request.remarks || "",
    updated_at: serverTimestamp(),
  });
}

export async function handoverLabRequest(
  request: Request,
  staff: User,
  remarks?: string,
): Promise<void> {
  requireSignedInUser();
  if (request.status !== "APPROVED") {
    throw new Error("Only approved requests can be handed over.");
  }

  const lines = request.items ?? [];
  if (lines.length === 0) {
    throw new Error("This request has no items or assets to hand over.");
  }

  const stockSnapshot = await getDocs(collection(db, "stock_levels"));

  for (const line of lines) {
    const kind = getRequestLineKind(line);
    if (kind === "ASSET") {
      await handoverAssetLine(request, line, staff);
    } else {
      await handoverCatalogLine(request, line, staff, stockSnapshot.docs);
    }
  }

  const now = new Date().toISOString();
  await updateDoc(doc(db, "requests", request.id), {
    status: "HANDED_OVER" satisfies RequestStatus,
    handed_over_by_user_id: staff.id,
    handed_over_at: now,
    remarks: remarks || request.remarks || "",
    items: lines.map((line) => ({ ...line, handed_over: true })),
    updated_at: serverTimestamp(),
  });
}

async function handoverAssetLine(
  request: Request,
  line: RequestItem,
  staff: User,
): Promise<void> {
  const assetId = line.asset_id;
  if (!assetId) {
    throw new Error("An asset request is missing its asset selection.");
  }

  const assetRef = doc(db, "assets", assetId);
  const snapshot = await getDoc(assetRef);
  if (!snapshot.exists()) {
    throw new Error("The requested asset was not found.");
  }

  const asset = snapshot.data();
  if (asset.status && asset.status !== "AVAILABLE") {
    throw new Error(
      `${asset.asset_code || "This asset"} is not available to hand over.`,
    );
  }

  await updateDoc(assetRef, {
    status: "ISSUED",
    assigned_to_user_id: request.user_id,
    location_id: null,
    updated_at: serverTimestamp(),
  });

  await addDoc(collection(db, "asset_assignments"), {
    asset_id: assetId,
    assigned_to_user_id: request.user_id,
    assigned_by_user_id: staff.id,
    quantity: 1,
    assigned_at: new Date().toISOString(),
    remarks: `Handed over via ${request.request_number}`,
  });

  await addDoc(collection(db, "inventory_transactions"), {
    asset_id: assetId,
    catalog_item_id: asset.catalog_item_id ?? line.catalog_item_id ?? null,
    transaction_type: "ISSUE",
    quantity: 1,
    from_location_id: asset.location_id ?? null,
    issued_to_user_id: request.user_id,
    request_id: request.id,
    processed_by_user_id: staff.id,
    remarks: `Handed over asset ${asset.asset_code || assetId} via ${request.request_number}`,
    created_at: serverTimestamp(),
  });
}

async function handoverCatalogLine(
  request: Request,
  line: RequestItem,
  staff: User,
  stockDocs: QueryDocumentSnapshot[],
): Promise<void> {
  const catalogItemId = line.catalog_item_id;
  const quantity = Number(line.requested_qty) || 0;
  if (!catalogItemId || quantity <= 0) {
    throw new Error("A catalog item request is missing a valid quantity.");
  }

  let remaining = quantity;
  let fromLocationId: string | null = null;

  for (const stockDoc of stockDocs) {
    if (remaining <= 0) break;
    const data = stockDoc.data();
    const matches = data.catalog_item_id === catalogItemId;
    if (!matches) continue;

    const available = Number(data.quantity) || 0;
    if (available <= 0) continue;

    const take = Math.min(available, remaining);
    await updateDoc(doc(db, "stock_levels", stockDoc.id), {
      quantity: available - take,
      updated_at: serverTimestamp(),
    });
    fromLocationId = String(data.location_id ?? fromLocationId ?? "");
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error("Not enough stock on hand to hand over this item.");
  }

  await addDoc(collection(db, "inventory_transactions"), {
    catalog_item_id: catalogItemId,
    transaction_type: "ISSUE",
    quantity,
    from_location_id: fromLocationId || null,
    issued_to_user_id: request.user_id,
    request_id: request.id,
    processed_by_user_id: staff.id,
    remarks: `Handed over ${quantity} unit(s) via ${request.request_number}`,
    created_at: serverTimestamp(),
  });
}
