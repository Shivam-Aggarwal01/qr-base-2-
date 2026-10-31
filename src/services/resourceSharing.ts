import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Asset, Request, RequestStatus, User } from '../types/inventory';

const ACTIVE_BOOKING_STATUSES: RequestStatus[] = [
  'PENDING',
  'APPROVED',
  'CHECKED_IN',
  'RETURNED',
  'OVERDUE',
  'UNDER_REVIEW',
];

function requireCurrentUser(userId: string): void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Sign in with the booking account before continuing.');
  }
}

function timestampToMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return new Date(String(value ?? '')).getTime();
}

function isOverlapping(start: number, end: number, request: Record<string, unknown>): boolean {
  const requestStart = timestampToMillis(request.booking_start_at);
  const requestEnd = timestampToMillis(request.booking_end_at ?? request.deadline_at);
  return Number.isFinite(requestStart) && Number.isFinite(requestEnd) && start < requestEnd && end > requestStart;
}

export async function createResourceBooking(input: {
  asset: Asset;
  user: User;
  purpose: string;
  startsAt: string;
  endsAt: string;
  remarks?: string;
}): Promise<string> {
  requireCurrentUser(input.user.id);

  const start = new Date(input.startsAt).getTime();
  const end = new Date(input.endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= Date.now() || end <= start) {
    throw new Error('Choose a valid future booking time.');
  }
  if (input.asset.status !== 'AVAILABLE') {
    throw new Error('This resource is not currently available.');
  }
  if (input.asset.eligibility_requirements?.trim() && !input.asset.eligible_user_ids?.includes(input.user.id)) {
    throw new Error('Your account is not verified for this resource. Contact its owner.');
  }
  if (input.asset.training_requirements?.trim() && !input.asset.trained_user_ids?.includes(input.user.id)) {
    throw new Error('Required safety training is not recorded for your account.');
  }

  const slotMinutes = Math.max(15, input.asset.booking_slot_minutes ?? 60);
  const durationMinutes = (end - start) / 60_000;
  const maxDuration = slotMinutes * Math.max(1, input.asset.max_consecutive_bookings ?? 4);
  if (durationMinutes % slotMinutes !== 0 || durationMinutes > maxDuration) {
    throw new Error(`Bookings must use ${slotMinutes}-minute slots and cannot exceed ${maxDuration / 60} hours.`);
  }
  const startsAtLocal = new Date(start);
  const endsAtLocal = new Date(end);
  const startMinuteOfDay = startsAtLocal.getHours() * 60 + startsAtLocal.getMinutes();
  const endMinuteOfDay = endsAtLocal.getHours() * 60 + endsAtLocal.getMinutes();
  if (startMinuteOfDay % slotMinutes !== 0 || endMinuteOfDay % slotMinutes !== 0) {
    throw new Error(`Start and end times must align to ${slotMinutes}-minute booking slots.`);
  }

  const requestRef = doc(collection(db, 'requests'));
  const assetRef = doc(db, 'assets', input.asset.id);
  const requestNumber = `BKG-${new Date(start).toISOString().slice(0, 10).replace(/-/g, '')}-${requestRef.id.slice(0, 5).toUpperCase()}`;
  const initialAssetSnapshot = await getDoc(assetRef);
  if (!initialAssetSnapshot.exists()) {
    throw new Error('This resource no longer exists.');
  }
  const initialBookingRevision = Number(initialAssetSnapshot.data().booking_revision ?? 0);
  const [resourceBookings, userRequests] = await Promise.all([
    getDocs(query(collection(db, 'resource_bookings'), where('resource_id', '==', input.asset.id))),
    getDocs(query(collection(db, 'requests'), where('user_id', '==', input.user.id))),
  ]);

  return runTransaction(db, async (transaction) => {
    const assetSnapshot = await transaction.get(assetRef);
    if (!assetSnapshot.exists()) {
      throw new Error('This resource no longer exists.');
    }

    const currentAsset = assetSnapshot.data() as Asset;
    if (currentAsset.status !== 'AVAILABLE') {
      throw new Error('This resource is no longer available.');
    }
    if (Number(currentAsset.booking_revision ?? 0) !== initialBookingRevision) {
      throw new Error('Availability changed while you were requesting this slot. Refresh and try again.');
    }

    const overlapping = resourceBookings.docs.filter((snapshot) => {
      const booking = snapshot.data();
      return ACTIVE_BOOKING_STATUSES.includes(booking.status as RequestStatus) && isOverlapping(start, end, {
        booking_start_at: booking.starts_at,
        booking_end_at: booking.ends_at,
      });
    });
    const hasConfirmedConflict = overlapping.some((snapshot) =>
      ['APPROVED', 'CHECKED_IN', 'RETURNED', 'OVERDUE', 'UNDER_REVIEW'].includes(
        String(snapshot.data().status)
      )
    );
    if (hasConfirmedConflict) {
      throw new Error('That time slot has already been reserved. Choose another time.');
    }
    const duplicateUserBooking = userRequests.docs.some((snapshot) => {
      const request = snapshot.data();
      return (
        request.resource_asset_id === input.asset.id &&
        ACTIVE_BOOKING_STATUSES.includes(request.status as RequestStatus) &&
        isOverlapping(start, end, request)
      );
    });
    if (duplicateUserBooking) {
      throw new Error('You already have a booking request for this time slot.');
    }

    const activeUserBookings = userRequests.docs.filter((snapshot) =>
      ACTIVE_BOOKING_STATUSES.includes(snapshot.data().status as RequestStatus)
    );
    if (activeUserBookings.length >= 3) {
      throw new Error('Fair-use limit reached: you can have up to three active resource bookings.');
    }

    const status: RequestStatus =
      overlapping.length > 0 ? 'WAITLISTED' : currentAsset.approval_required === false ? 'APPROVED' : 'PENDING';
    const request = {
      request_number: requestNumber,
      user_id: input.user.id,
      purpose: input.purpose.trim(),
      status,
      deadline_at: new Date(end).toISOString(),
      booking_start_at: Timestamp.fromDate(new Date(start)),
      booking_end_at: Timestamp.fromDate(new Date(end)),
      resource_asset_id: input.asset.id,
      remarks: input.remarks?.trim() ?? '',
      items: [
        {
          id: `${requestRef.id}-asset`,
          request_id: requestRef.id,
          kind: 'ASSET',
          asset_id: input.asset.id,
          requested_qty: 1,
        },
      ],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    transaction.set(requestRef, request);
    transaction.set(doc(db, 'resource_bookings', requestRef.id), {
      booking_id: requestRef.id,
      resource_id: input.asset.id,
      starts_at: Timestamp.fromDate(new Date(start)),
      ends_at: Timestamp.fromDate(new Date(end)),
      status,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    transaction.update(assetRef, {
      booking_revision: (currentAsset.booking_revision ?? 0) + 1,
      last_booking_id: requestRef.id,
      updated_at: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'resource_events')), {
      action: 'BOOKING_REQUESTED',
      actor_user_id: input.user.id,
      resource_id: input.asset.id,
      booking_id: requestRef.id,
      created_at: serverTimestamp(),
    });
    if (currentAsset.owner_id) {
      transaction.set(doc(collection(db, 'notifications')), {
        user_id: currentAsset.owner_id,
        actor_user_id: input.user.id,
        resource_id: input.asset.id,
        booking_id: requestRef.id,
        type: 'BOOKING_REQUEST',
        title: status === 'WAITLISTED' ? 'Booking added to waitlist' : 'New resource booking',
        message: `${input.user.name} requested ${input.asset.name} for ${new Date(start).toLocaleString()}.`,
        read: false,
        created_at: serverTimestamp(),
      });
    }

    return requestRef.id;
  });
}

export async function recordResourceQrAction(
  request: Request,
  asset: Asset,
  user: User,
  action: 'CHECK_IN' | 'CHECK_OUT',
  condition: string,
  damageReported = false
): Promise<void> {
  requireCurrentUser(user.id);
  if (!condition.trim()) {
    throw new Error('Record the equipment condition before continuing.');
  }

  const requestRef = doc(db, 'requests', request.id);
  const assetRef = doc(db, 'assets', asset.id);
  const resourceBookingRef = doc(db, 'resource_bookings', request.id);
  const eventRef = doc(collection(db, 'resource_events'));
  const startAt = new Date(request.booking_start_at ?? '').getTime();
  const endAt = new Date(request.booking_end_at ?? request.deadline_at ?? '').getTime();

  await runTransaction(db, async (transaction) => {
    const [requestSnapshot, assetSnapshot, resourceBookingSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(assetRef),
      transaction.get(resourceBookingRef),
    ]);
    if (!requestSnapshot.exists() || !assetSnapshot.exists() || !resourceBookingSnapshot.exists()) {
      throw new Error('The booking or resource could not be found.');
    }

    const currentRequest = requestSnapshot.data();
    const currentAsset = assetSnapshot.data() as Asset;
    if (currentRequest.user_id !== user.id || currentRequest.resource_asset_id !== asset.id) {
      throw new Error('This booking does not authorize your account to use this QR code.');
    }
    if (currentAsset.eligibility_requirements?.trim() && !currentAsset.eligible_user_ids?.includes(user.id)) {
      throw new Error('Your account is not verified for this resource.');
    }
    if (currentAsset.training_requirements?.trim() && !currentAsset.trained_user_ids?.includes(user.id)) {
      throw new Error('Required safety training is not recorded for your account.');
    }

    const now = Date.now();
    if (action === 'CHECK_IN') {
      if (currentRequest.status !== 'APPROVED' || currentAsset.status !== 'AVAILABLE') {
        throw new Error('An approved, unused booking is required to check in.');
      }
      if (Number.isFinite(startAt) && now < startAt - 15 * 60_000) {
        throw new Error('Check-in opens 15 minutes before your booking.');
      }
      if (Number.isFinite(endAt) && now > endAt) {
        throw new Error('This booking has expired. Contact the resource owner.');
      }
      transaction.update(requestRef, {
        status: 'CHECKED_IN',
        checked_in_at: serverTimestamp(),
        initial_condition: condition.trim(),
        updated_at: serverTimestamp(),
      });
      transaction.update(assetRef, {
        status: 'ISSUED',
        assigned_to_user_id: user.id,
        checkout_location_id: currentAsset.location_id ?? null,
        location_id: null,
        last_booking_id: request.id,
        updated_at: serverTimestamp(),
      });
      transaction.update(resourceBookingRef, { status: 'CHECKED_IN', updated_at: serverTimestamp() });
    } else {
      if (currentRequest.status !== 'CHECKED_IN' || currentAsset.assigned_to_user_id !== user.id) {
        throw new Error('Only the checked-in borrower can check out this resource.');
      }
      transaction.update(requestRef, {
        status: 'RETURNED',
        checked_out_at: serverTimestamp(),
        final_condition: condition.trim(),
        damage_reported: damageReported,
        updated_at: serverTimestamp(),
      });
      transaction.update(assetRef, {
        status: 'ISSUED',
        last_booking_id: request.id,
        updated_at: serverTimestamp(),
      });
      transaction.update(resourceBookingRef, { status: 'RETURNED', updated_at: serverTimestamp() });
    }

    transaction.set(eventRef, {
      action,
      actor_user_id: user.id,
      resource_id: asset.id,
      booking_id: request.id,
      condition: condition.trim(),
      created_at: serverTimestamp(),
    });
    if (currentAsset.owner_id) {
      transaction.set(doc(collection(db, 'notifications')), {
        user_id: currentAsset.owner_id,
        actor_user_id: user.id,
        resource_id: asset.id,
        booking_id: request.id,
        type: action,
        title: action === 'CHECK_IN' ? 'Resource checked in' : 'Return ready for review',
        message:
          action === 'CHECK_IN'
            ? `${user.name} checked in to ${asset.name}.`
            : `${user.name} checked out ${asset.name}; verify its condition and return.`,
        read: false,
        created_at: serverTimestamp(),
      });
    }
  });
}

export async function cancelResourceBooking(request: Request, user: User): Promise<void> {
  requireCurrentUser(user.id);
  if (!request.resource_asset_id) throw new Error('This is not a resource booking.');

  const requestRef = doc(db, 'requests', request.id);
  const resourceBookingRef = doc(db, 'resource_bookings', request.id);
  const assetRef = doc(db, 'assets', request.resource_asset_id);
  const eventRef = doc(collection(db, 'resource_events'));
  await runTransaction(db, async (transaction) => {
    const [requestSnapshot, resourceBookingSnapshot, assetSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(resourceBookingRef),
      transaction.get(assetRef),
    ]);
    if (!requestSnapshot.exists() || !resourceBookingSnapshot.exists() || !assetSnapshot.exists()) {
      throw new Error('The booking or resource could not be found.');
    }

    const currentRequest = requestSnapshot.data();
    const currentAsset = assetSnapshot.data() as Asset;
    if (currentRequest.user_id !== user.id) {
      throw new Error('You can only cancel your own booking.');
    }
    if (!['PENDING', 'APPROVED', 'WAITLISTED'].includes(String(currentRequest.status))) {
      throw new Error('This booking can no longer be cancelled.');
    }
    if (currentRequest.status === 'APPROVED' && Date.now() >= timestampToMillis(currentRequest.booking_start_at)) {
      throw new Error('An approved booking can only be cancelled before its start time.');
    }

    transaction.update(requestRef, { status: 'CANCELLED', updated_at: serverTimestamp() });
    transaction.update(resourceBookingRef, { status: 'CANCELLED', updated_at: serverTimestamp() });
    transaction.set(eventRef, {
      action: 'BOOKING_CANCELLED',
      actor_user_id: user.id,
      resource_id: request.resource_asset_id,
      booking_id: request.id,
      created_at: serverTimestamp(),
    });
    if (currentAsset.owner_id) {
      transaction.set(doc(collection(db, 'notifications')), {
        user_id: currentAsset.owner_id,
        actor_user_id: user.id,
        resource_id: request.resource_asset_id,
        booking_id: request.id,
        type: 'BOOKING_CANCELLED',
        title: 'Booking cancelled',
        message: `${user.name} cancelled booking ${currentRequest.request_number}.`,
        read: false,
        created_at: serverTimestamp(),
      });
    }
  });
}
