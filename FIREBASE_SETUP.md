# Firebase setup for the Electronics Lab Inventory System

## Role model

Use Firebase Authentication with email/password. Store the app role inside the `users` document.

Role values:
- ADMIN
- STUDENT_AMBASSADOR
- STUDENT_LEAD
- STUDENT

## Firestore collections

Create these collections in Firestore:

### 1) users
Document ID: Firebase Auth UID

Required fields:
- id: string
- user_code: string
- name: string
- email: string
- role: 'ADMIN' | 'STUDENT_AMBASSADOR' | 'STUDENT_LEAD' | 'STUDENT'
- created_at: timestamp
- updated_at: timestamp

### 2) catalog_items
Document ID: auto id or custom item id

Required fields:
- id: string
- item_code: string
- name: string
- type: 'CONSUMABLE' | 'REUSABLE' | 'TOOL'
- description: string
- unit: string
- tracking_mode: 'BOX' | 'INDIVIDUAL' | null
- min_stock_alert: number
- created_at: timestamp
- updated_at: timestamp

### 3) locations
Document ID: auto id or custom location id

Required fields:
- id: string
- name: string
- code: string
- created_at: timestamp
- updated_at: timestamp

### 4) stock_levels
Document ID: auto id

Required fields:
- catalog_item_id: string
- location_id: string
- quantity: number
- updated_at: timestamp

Unique rule: one stock record per item + location.

### 5) assets
Document ID: asset id

Required fields:
- id: string
- asset_code: string
- catalog_item_id: string
- serial_number: string | null
- status: 'AVAILABLE' | 'ISSUED' | 'UNDER_REPAIR' | 'DAMAGED' | 'LOST' | 'DISPOSED'
- location_id: string | null
- assigned_to_user_id: string | null
- notes: string | null
- created_at: timestamp
- updated_at: timestamp

### 6) asset_assignments
Document ID: auto id

Required fields:
- asset_id: string
- assigned_to_user_id: string
- assigned_by_user_id: string
- assigned_at: timestamp
- returned_at: timestamp | null
- remarks: string | null

### 7) requests
Document ID: request id

Required fields:
- id: string
- request_number: string
- user_id: string
- purpose: string
- status: 'PENDING' | 'COMPLETED' | 'PARTIAL' | 'CANCELLED'
- approved_by_user_id: string | null
- remarks: string | null
- created_at: timestamp
- updated_at: timestamp

### 8) request_items (subcollection under requests/{requestId})
Document ID: auto id

Required fields:
- catalog_item_id: string
- requested_qty: number
- fulfilled_qty: number
- created_at: timestamp

### 9) inventory_transactions
Document ID: auto id

Required fields:
- catalog_item_id: string | null
- asset_id: string | null
- transaction_type: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'MOVE' | 'ADJUSTMENT' | 'DAMAGE' | 'DISPOSAL'
- quantity: number
- from_location_id: string | null
- to_location_id: string | null
- issued_to_user_id: string | null
- request_id: string | null
- processed_by_user_id: string | null
- remarks: string | null
- created_at: timestamp

### 10) audit_logs
Document ID: auto id

Required fields:
- user_id: string | null
- action: string
- entity_type: string
- entity_id: string
- created_at: timestamp

## Core Firebase rules to enforce

- Only ADMIN can manage users, catalog items, and locations.
- STUDENT_AMBASSADOR / STUDENT_LEAD / ADMIN can approve requests and issue materials.
- STUDENTS can create requests and view assigned items.
- Asset must never be in two places at once.
- Stock quantity cannot go below 0.
- Inventory transactions must be append-only.

## Recommended setup order

1. Create Firebase project
2. Enable Email/Password authentication
3. Create Firestore database
4. Create collections above
5. Add Firestore rules
6. Connect app to Firebase SDK
7. Add Cloud Functions for inventory logic

## Example Firestore rules summary

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function roleOf() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && roleOf() == 'ADMIN';
    }

    match /catalog_items/{itemId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (roleOf() == 'ADMIN' || roleOf() == 'STUDENT_AMBASSADOR');
    }

    match /requests/{requestId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (roleOf() == 'ADMIN' || roleOf() == 'STUDENT_AMBASSADOR' || roleOf() == 'STUDENT_LEAD');
    }

    match /assets/{assetId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (roleOf() == 'ADMIN' || roleOf() == 'STUDENT_AMBASSADOR' || roleOf() == 'STUDENT_LEAD');
    }
  }
}
```

This is a starting point for the actual production rules.
