import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Request, RequestItem, RequestLineKind, RequestStatus, User } from '../types/inventory';

export function getRequestLineKind(item: RequestItem): RequestLineKind {
  if (item.kind === 'ASSET' || item.asset_id) return 'ASSET';
  return 'CATALOG';
}

function requireSignedInUser(): void {
  if (!auth.currentUser) {
    throw new Error('Firestore access blocked: user is not signed in.');
  }
}

export function getStudentRequestBuckets(requests: Request[], userId: string) {
  const myRequests = requests.filter((r) => r.user_id === userId);

  return {
    pending: myRequests.filter((r) => r.status === 'PENDING'),
    approved: myRequests.filter((r) => r.status === 'APPROVED'),
    completed: myRequests.filter((r) => r.status === 'COMPLETED' || r.status === 'HANDED_OVER'),
    total: myRequests,
    visible: myRequests.filter(
      (r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'HANDED_OVER' || r.status === 'COMPLETED'
    ),
  };
}

export async function requestLabReturn(request: Request): Promise<void> {
  requireSignedInUser();
  if (auth.currentUser?.uid !== request.user_id) {
    throw new Error('You can only request a return for your own request.');
  }
  if (request.status !== 'HANDED_OVER' && request.status !== 'APPROVED') {
    throw new Error('Only handed-over requests can be returned.');
  }

  await updateDoc(doc(db, 'requests', request.id), {
    status: 'RETURN_REQUESTED' satisfies RequestStatus,
    updated_at: serverTimestamp(),
  });
}

export async function reviewLabRequest(
  request: Request,
  status: 'APPROVED' | 'REJECTED',
  staff: User,
  remarks?: string
): Promise<void> {
  requireSignedInUser();
  if (request.status !== 'PENDING') {
    throw new Error('Only pending requests can be approved or rejected.');
  }

  await updateDoc(doc(db, 'requests', request.id), {
    status,
    approved_by_user_id: staff.id,
    remarks: remarks || request.remarks || '',
    updated_at: serverTimestamp(),
  });
}

export async function approveAndHandoverLabRequest(request: Request, staff: User, remarks?: string): Promise<void> {
  requireSignedInUser();
  if (request.status !== 'PENDING') {
    throw new Error('Only pending requests can be approved.');
  }

  const stockSnapshot = await getDocs(collection(db, 'stock_levels'));
  const requestRef = doc(db, 'requests', request.id);

  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error('The requested inventory request was not found.');
    }

    const currentRequest = requestSnapshot.data();
    if (currentRequest.status !== 'PENDING') {
      throw new Error('Only pending requests can be approved.');
    }

    const lines = (currentRequest.items as RequestItem[] | undefined) ?? request.items ?? [];
    if (lines.length === 0) {
      throw new Error('This request has no items or assets to approve.');
    }

    const assetIds = Array.from(
      new Set(
        lines
          .filter((line) => getRequestLineKind(line) === 'ASSET')
          .map((line) => line.asset_id)
          .filter((assetId): assetId is string => Boolean(assetId))
      )
    );
    const catalogItemIds = new Set(
      lines
        .filter((line) => getRequestLineKind(line) === 'CATALOG')
        .map((line) => line.catalog_item_id)
        .filter((catalogItemId): catalogItemId is string => Boolean(catalogItemId))
    );
    const relevantStockDocs = stockSnapshot.docs.filter((stockDoc) =>
      catalogItemIds.has(String(stockDoc.data().catalog_item_id ?? ''))
    );
    const assetRefs = assetIds.map((assetId) => doc(db, 'assets', assetId));
    const stockRefs = relevantStockDocs.map((stockDoc) => doc(db, 'stock_levels', stockDoc.id));
    const [assetSnapshots, stockSnapshots] = await Promise.all([
      Promise.all(assetRefs.map((assetRef) => transaction.get(assetRef))),
      Promise.all(stockRefs.map((stockRef) => transaction.get(stockRef))),
    ]);

    const assetById = new Map(assetIds.map((assetId, index) => [assetId, assetSnapshots[index]]));
    const stockById = new Map(
      stockSnapshots.map((stockDoc, index) => [stockDoc.id, { ref: stockRefs[index], snapshot: stockDoc }])
    );
    const plannedStock = new Map(
      stockSnapshots.map((stockDoc) => [stockDoc.id, Number(stockDoc.data()?.quantity) || 0])
    );
    const assetIdsToHandOver = new Set<string>();
    const ledgerEntries: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
    const assignments: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

    for (const line of lines) {
      if (getRequestLineKind(line) === 'ASSET') {
        const assetId = line.asset_id;
        if (!assetId) {
          throw new Error('An asset request is missing its asset selection.');
        }
        if (assetIdsToHandOver.has(assetId)) {
          throw new Error('The same asset cannot be handed over more than once in a request.');
        }

        const assetSnapshot = assetById.get(assetId);
        if (!assetSnapshot?.exists()) {
          throw new Error('The requested asset was not found.');
        }

        const asset = assetSnapshot.data();
        if (asset.status && asset.status !== 'AVAILABLE') {
          throw new Error(`${asset.name || asset.asset_code || 'This asset'} is not available to hand over.`);
        }

        assetIdsToHandOver.add(assetId);
        const now = new Date().toISOString();
        assignments.push({
          ref: doc(collection(db, 'asset_assignments')),
          data: {
            asset_id: assetId,
            assigned_to_user_id: currentRequest.user_id,
            assigned_by_user_id: staff.id,
            quantity: 1,
            assigned_at: now,
            remarks: `Handed over via ${currentRequest.request_number}`,
          },
        });
        ledgerEntries.push({
          ref: doc(collection(db, 'inventory_transactions')),
          data: {
            asset_id: assetId,
            transaction_type: 'ISSUE',
            quantity: 1,
            from_location_id: asset.location_id ?? null,
            issued_to_user_id: currentRequest.user_id,
            request_id: request.id,
            processed_by_user_id: staff.id,
            remarks: `Handed over asset ${asset.name || asset.asset_code || assetId} via ${currentRequest.request_number}`,
            created_at: serverTimestamp(),
          },
        });
        continue;
      }

      const catalogItemId = line.catalog_item_id;
      const quantity = Number(line.requested_qty) || 0;
      if (!catalogItemId || quantity <= 0) {
        throw new Error('A catalog item request is missing a valid quantity.');
      }

      let remaining = quantity;
      let fromLocationId: string | null = null;
      for (const stockDoc of relevantStockDocs) {
        if (remaining <= 0) break;
        const stock = stockById.get(stockDoc.id);
        const stockData = stock?.snapshot.data();
        const available = plannedStock.get(stockDoc.id) ?? 0;
        if (!stock || !stockData || stockData.catalog_item_id !== catalogItemId || available <= 0) continue;

        const take = Math.min(available, remaining);
        plannedStock.set(stockDoc.id, available - take);
        fromLocationId = String(stockData.location_id ?? fromLocationId ?? '');
        remaining -= take;
      }

      if (remaining > 0) {
        throw new Error('Not enough stock on hand to hand over this item.');
      }

      ledgerEntries.push({
        ref: doc(collection(db, 'inventory_transactions')),
        data: {
          catalog_item_id: catalogItemId,
          transaction_type: 'ISSUE',
          quantity,
          from_location_id: fromLocationId || null,
          issued_to_user_id: currentRequest.user_id,
          request_id: request.id,
          processed_by_user_id: staff.id,
          remarks: `Handed over ${quantity} unit(s) as ${line.usage === 'REUSABLE' ? 'reusable' : 'consumable'} via ${currentRequest.request_number}`,
          created_at: serverTimestamp(),
        },
      });
    }

    for (const [stockId, quantity] of plannedStock) {
      if (quantity === Number(stockById.get(stockId)?.snapshot.data()?.quantity ?? 0)) continue;
      transaction.update(stockById.get(stockId)!.ref, {
        quantity,
        updated_at: serverTimestamp(),
      });
    }

    for (const assetId of assetIdsToHandOver) {
      transaction.update(doc(db, 'assets', assetId), {
        status: 'ISSUED',
        assigned_to_user_id: currentRequest.user_id,
        location_id: null,
        updated_at: serverTimestamp(),
      });
    }

    for (const assignment of assignments) {
      transaction.set(assignment.ref, assignment.data);
    }
    for (const entry of ledgerEntries) {
      transaction.set(entry.ref, entry.data);
    }

    transaction.update(requestRef, {
      status: 'HANDED_OVER' satisfies RequestStatus,
      approved_by_user_id: staff.id,
      handed_over_by_user_id: staff.id,
      handed_over_at: new Date().toISOString(),
      remarks: remarks || currentRequest.remarks || '',
      items: lines.map((line) => ({ ...line, handed_over: true })),
      updated_at: serverTimestamp(),
    });
  });
}

export async function completeLabRequest(
  request: Request,
  staff: User,
  remarks?: string,
  returnLocationId?: string
): Promise<void> {
  requireSignedInUser();
  if (request.status !== 'HANDED_OVER' && request.status !== 'APPROVED' && request.status !== 'RETURN_REQUESTED') {
    throw new Error('Only handed-over requests can be marked completed.');
  }

  const reusableLines = (request.items ?? []).filter(
    (line) => getRequestLineKind(line) === 'CATALOG' && line.usage === 'REUSABLE'
  );

  const assetLines = (request.items ?? []).filter((line) => getRequestLineKind(line) === 'ASSET' && line.asset_id);

  if (assetLines.length > 0 && !returnLocationId) {
    throw new Error('Choose the storage location where the returned asset was received.');
  }

  if (assetLines.length > 0) {
    const assignmentSnapshot = await getDocs(collection(db, 'asset_assignments'));
    for (const line of assetLines) {
      const assetRef = doc(db, 'assets', line.asset_id as string);
      const assetSnapshot = await getDoc(assetRef);
      if (!assetSnapshot.exists()) continue;

      const asset = assetSnapshot.data();
      await updateDoc(assetRef, {
        status: 'AVAILABLE',
        assigned_to_user_id: null,
        location_id: returnLocationId,
        updated_at: serverTimestamp(),
      });

      const activeAssignment = assignmentSnapshot.docs.find((entry: QueryDocumentSnapshot) => {
        const data = entry.data();
        return data.asset_id === line.asset_id && data.assigned_to_user_id === request.user_id && !data.returned_at;
      });
      if (activeAssignment) {
        await updateDoc(activeAssignment.ref, {
          returned_at: new Date().toISOString(),
          remarks: remarks || `Returned via ${request.request_number}`,
        });
      }

      await addDoc(collection(db, 'inventory_transactions'), {
        asset_id: line.asset_id,
        transaction_type: 'RETURN',
        quantity: 1,
        to_location_id: returnLocationId,
        issued_to_user_id: request.user_id,
        request_id: request.id,
        processed_by_user_id: staff.id,
        remarks: `Returned asset ${asset.name || asset.asset_code || line.asset_id} via ${request.request_number}`,
        created_at: serverTimestamp(),
      });
    }
  }

  if (reusableLines.length > 0) {
    const [transactionSnapshot, stockSnapshot] = await Promise.all([
      getDocs(collection(db, 'inventory_transactions')),
      getDocs(collection(db, 'stock_levels')),
    ]);

    for (const line of reusableLines) {
      const transaction = transactionSnapshot.docs
        .map((entry: QueryDocumentSnapshot) => ({ id: entry.id, ...entry.data() }))
        .find(
          (entry: any) =>
            entry.request_id === request.id &&
            entry.catalog_item_id === line.catalog_item_id &&
            entry.transaction_type === 'ISSUE'
        ) as { from_location_id?: string | null; quantity?: number } | undefined;
      const locationId = transaction?.from_location_id;
      const quantity = Number(line.requested_qty) || 0;
      if (!line.catalog_item_id || !locationId || quantity <= 0) continue;

      const stockDoc = stockSnapshot.docs.find((entry: QueryDocumentSnapshot) => {
        const data = entry.data();
        return data.catalog_item_id === line.catalog_item_id && data.location_id === locationId;
      });

      if (stockDoc) {
        const currentQuantity = Number(stockDoc.data().quantity) || 0;
        await updateDoc(doc(db, 'stock_levels', stockDoc.id), {
          quantity: currentQuantity + quantity,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'stock_levels'), {
          catalog_item_id: line.catalog_item_id,
          location_id: locationId,
          quantity,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      await addDoc(collection(db, 'inventory_transactions'), {
        catalog_item_id: line.catalog_item_id,
        transaction_type: 'RETURN',
        quantity,
        to_location_id: locationId,
        issued_to_user_id: request.user_id,
        request_id: request.id,
        processed_by_user_id: staff.id,
        remarks: `Returned ${quantity} reusable unit(s) via ${request.request_number}`,
        created_at: serverTimestamp(),
      });
    }
  }

  await updateDoc(doc(db, 'requests', request.id), {
    status: 'COMPLETED' satisfies RequestStatus,
    remarks: remarks || request.remarks || '',
    updated_at: serverTimestamp(),
  });
}
