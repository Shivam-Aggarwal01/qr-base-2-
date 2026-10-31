# Resource Sharing Platform

This project keeps the existing QR inventory application and includes a no-login, browser-local hackathon demo. In the demo, QR identifies the resource and demo booking state controls which actions are available; no Firebase account or real resource data is accessed.

## Local development

1. Install Node.js and npm, then install the project dependencies with `npm install`.
2. Keep `VITE_DEMO_MODE=true` in `.env.local` to run the hackathon demo without sign-in or Firebase configuration.
3. Start the Vite development server with `npm run dev`.
4. Open `http://localhost:3000`. To run the original Firebase-backed app instead, set `VITE_DEMO_MODE=false` and configure Firebase first.
5. Run `npm run lint` and `npm run build` to validate the TypeScript project and create the production bundle.

The Firebase web configuration is public client configuration. Never put service-account keys or other private credentials in `VITE_*` variables.

## Firebase setup

The original application uses Firebase Authentication, Cloud Firestore, and Cloud Storage. Its web app values are listed in `.env.example`, and the Firebase CLI target points to `qr-based-2`.

Before deploying the rules:

1. Enable Firebase Authentication and enable the Google sign-in provider. Add the local and deployed app hostnames to Authorized domains.
2. Enable Cloud Firestore in the project.
3. Enable Cloud Storage in the Firebase console. Storage must be initialized before the Storage rules can be deployed; resource image uploads will not work until this is done.
4. Review the project selected in `.firebaserc`, then deploy the rules and indexes:

   ```sh
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

5. Bootstrap the first administrator through the Firebase console: create/sign in the administrator's Authentication account, copy that account's UID, then create `users/{uid}` with `name`, `email`, and `role: "ADMIN"` (and `created_at`/`updated_at` timestamps). Refresh the app after this record exists. Do not expose service-account credentials in the client or commit them to the repository.

For a complete judge walkthrough, use separate Google accounts for an administrator/resource owner and a student. The administrator can assign `RESOURCE_OWNER`, `INSTITUTION_MANAGER`, or `STUDENT` roles in the directory. Student accounts submit an access request; approve them from the manager/admin account before testing bookings. Create a resource as the owner, then use the student account to request a future slot, approve it as the owner, and exercise the QR check-in/check-out and owner return verification. Check-in is permitted from 15 minutes before the booking start through its end time.

The Firestore and Storage rules are part of the authorization boundary. Do not replace them with permissive rules in production.

## Netlify hackathon demo

`netlify.toml` enables the no-login demo mode, sets the build command to `npm run build`, publishes `dist`, and rewrites client-side routes to `index.html`. Connect the repository to Netlify and deploy; no Firebase environment variables or service-account credentials are required for the demo. Visitors can switch between student, resource-owner, institution-manager, and administrator personas and walk through booking approval, QR check-in/out, condition/damage reporting, and return verification.

Demo data is local to each visitor's browser and persists there between refreshes; changes are not shared across browsers or written to Firebase. The original authenticated Firebase application remains available by building with `VITE_DEMO_MODE=false`. Do not use the public demo mode for real people, private data, or production resource management.

## Firebase-backed application

In authenticated mode, resource listings use the existing `assets` collection and QR identifiers. Booking requests use the existing `requests` collection, with `resource_bookings` as a schedule index. Owners or managers can review requests and verify returns; borrowers must be signed in, hold an eligible booking, and satisfy the resource's eligibility and training requirements to check in.

The authenticated QR flow records before-use and after-use condition, and supports a damage flag. A resource reported damaged is marked for review when the owner verifies the return.
