# StopFrauda - Product Requirements Document

## Original Problem Statement
Build an Android application "StopFrauda" for scam call detection and alerting in Moldova. The app uses AI to analyze phone calls in real-time and alerts emergency contacts via email, SMS, and push notifications when scams are detected.

## Architecture
- **Frontend**: Expo (React Native) with Expo Router, Zustand state management
- **Backend**: FastAPI + MongoDB (motor) + GPT-4.1 via Emergent integrations
- **Alerts**: Email (SMTP/Gmail), SMS (Twilio), Push (Firebase FCM)
- **Native Module**: `expo-call-detector` — Kotlin-based Android module for call interception
- **Build**: EAS Build for Android App Bundles (.aab) to Google Play

## What's Been Implemented
- User registration and onboarding flow
- AI-powered scam analysis (GPT-4.1)
- Real-time analysis: 30-second chunked recording and analysis
- Email alerts to emergency contacts (Gmail SMTP)
- SMS alerts (Twilio configured)
- Push notifications (Firebase FCM configured)
- Dashboard with stats and test buttons
- Permissions screen defaults to "granted"
- Demo scam/safe call testing
- Privacy policy page (hosted at /api/privacy-policy)
- **Native call detection** (CallScreeningService + PhoneStateListener)
- **Auto-start on boot** (BootReceiver)
- **Automatic recording** on call answer with chunked upload
- **Offline-first onboarding** ("Go to Dashboard" works without server)
- API retry logic (3 attempts with 1.5s delay)
- EAS project configured (@olegrwvi/stopfrauda)

## Bug Fixes Applied
- **FIXED**: "Failed to complete setup" error — backend URL embedded in app.json + eas.json
- **FIXED**: "Go to Dashboard" now works offline (local user + background sync)
- **FIXED**: Bottom padding on Protection Activated screen
- **FIXED**: Dashboard test buttons sharing loading state
- **FIXED**: Safe call incorrectly incrementing scam counter
- **FIXED**: Contacts permission request for real contacts
- **FIXED** (Apr 29, 2026): MongoDB `$inc` crash on chunk duration update — replaced with fetch + `$set`
- **FIXED** (Apr 29, 2026): Hardcoded ADMIN_PASSWORD/ADMIN_SECRET_KEY fallbacks removed from server.py
- **FIXED** (Apr 29, 2026): Google Play signing key mismatch — rebuilt AAB v10 with correct local keystore

## New Features (Apr 29, 2026)
- **User Profile in Onboarding**: Added dedicated `/onboarding/profile` screen between Permissions and Contacts
  - Mandatory: Name, Phone Number (Moldova +373 format validation)
  - Optional: Email
  - No SMS OTP verification (per product decision)
  - Data persists into Settings (replaces hardcoded "Protected User")
- **Backend `User` model** extended with `name` and `email` fields (nullable, backwards compatible)
- **SMS alerts to emergency contacts** now include user's full name + phone:
  `"{name} ({phone}) received suspicious call"` instead of just phone
- **Email alerts** show "Protected User: {Name} ({Phone})" in the header row

## Current Build
- versionCode: 10 (production AAB uploaded to Play Console with correct signing key)
- .aab: https://expo.dev/artifacts/eas/idgP8QhbELAcBKFhubSz21.aab
- Signing SHA1: 26:C1:F7:98:80:4C:18:0D:45:CD:BF:FD:E4:08:2C:2B:DD:DC:95:99 (matches Play Store)
- Keystore backup: /app/stopfrauda-keystore-BACKUP.zip (and base64-inlined in chat for user to save locally)

## Native Module: expo-call-detector
Located at: `modules/expo-call-detector/`
- `CallDetectorModule.kt` — Expo Modules bridge (events: onCallStateChanged, onIncomingCall)
- `CallScreeningServiceImpl.kt` — Android CallScreeningService
- `BootReceiver.kt` — BOOT_COMPLETED receiver
- `CallProtectionService.ts` — JS service orchestrating detection + recording

## Pending Verification
- Test native call detection on real device
- Verify auto-start on boot works
- Verify "Go to Dashboard" offline-first works

## Upcoming Tasks
- P2: Show overlay/popup warning during active suspicious calls
- P2: Call blocking for known scam numbers

## Backlog
- P3: Whitelist/blacklist management
- P3: Detailed in-app call analytics dashboard

## Key Files
- `/app/frontend/modules/expo-call-detector/` — Native Android module
- `/app/frontend/src/services/callProtectionService.ts` — JS orchestration service
- `/app/frontend/app/onboarding/complete.tsx` — Onboarding completion (offline-first)
- `/app/frontend/src/services/api.ts` — API service with retry logic
- `/app/frontend/app.json` — Expo config
- `/app/frontend/eas.json` — EAS build config
- `/app/backend/server.py` — All backend API endpoints + privacy policy

## 3rd Party Integrations
- OpenAI GPT-4.1 (Emergent LLM Key)
- Firebase Cloud Messaging
- Twilio SMS
- Gmail SMTP
