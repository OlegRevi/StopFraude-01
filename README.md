# StopFrauda 🛡️

**StopFrauda** is a native-focused Android anti-fraud and scam-call protection application. It detects incoming calls from unknown numbers (numbers not in the user's contacts), alerts emergency contacts via Twilio SMS in real time, logs the call, and manages subscriptions via Stripe.

---

## 🌟 Core Features & Architecture

- **OS-Level Call Screening**: Intercepts incoming calls via Android Telecom `CallScreeningService`.
- **Instant Phonebook Matching**: Queries Android `ContactsContract.PhoneLookup` in milliseconds.
- **Twilio Emergency SMS Alerts**: Dispatches real-time SMS warnings to up to 5 family/emergency contacts when an unknown number rings.
- **100% Privacy & Zero Audio Recording**: No AI audio transcription or call tapping. Operates strictly on caller number matching.
- **Early Bird & Stripe Subscriptions**:
  - **Early Bird**: 1 Year Free (for signups before November 1st).
  - **Standard Plan**: $10.00 / year via Stripe Checkout.
- **Test Call Simulator**: Built-in simulator to test the exact scam alert experience without needing external incoming calls.

---

## 📂 Repository Structure

```
StopFrauda/
├── backend/                             # Python FastAPI on Google Cloud Run
│   ├── app/
│   │   ├── config.py                    # Environment & configuration settings
│   │   ├── main.py                      # FastAPI app entry point & CORS
│   │   ├── models/schemas.py            # Pydantic schemas (alerts, contacts, stripe)
│   │   ├── services/
│   │   │   ├── firestore_service.py     # Firestore CRUD + in-memory dev fallback
│   │   │   ├── twilio_service.py        # Twilio SMS dispatch + dev simulation
│   │   │   └── stripe_service.py        # Stripe checkout + subscription webhooks
│   │   └── routes/
│   │       ├── alerts.py                # POST /api/v1/alerts/dispatch
│   │       ├── contacts.py              # POST /api/v1/contacts/send-welcome
│   │       └── stripe_routes.py         # POST /api/v1/stripe/create-checkout & webhook
│   ├── tests/test_api.py                # Automated integration tests
│   ├── Dockerfile                       # Production Cloud Run container
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                            # React Native with Expo Router (TypeScript)
│   ├── modules/expo-call-detector/      # Native Kotlin Android Module
│   │   ├── android/src/main/java/ro/stopfrauda/calldetector/
│   │   │   ├── CallDetectorModule.kt           # Expo Module bridge & event emitter
│   │   │   ├── CallScreeningServiceImpl.kt     # Intercepts incoming calls
│   │   │   ├── CallDetectorForegroundService.kt# Persistent protection notification
│   │   │   ├── ContactsHelper.kt               # Fast indexed ContactsContract lookup
│   │   │   └── CallAlertNotificationHelper.kt  # High-priority alert banner
│   │   ├── expo-module.config.json
│   │   └── index.ts
│   │
│   ├── app/                             # 8-Step User Journey
│   │   ├── _layout.tsx                  # Root navigation stack
│   │   ├── index.tsx                    # 1. Welcome & Value Proposition
│   │   ├── permissions.tsx              # 2. Grant Permissions
│   │   ├── contact-picker.tsx           # 3. Choose Emergency Contacts (max 5)
│   │   ├── paywall.tsx                  # 4. Paywall (Early Bird Free vs $10/yr)
│   │   ├── setup-complete.tsx           # 5. Setup Complete, Welcome SMS & Simulator
│   │   └── (tabs)/
│   │       ├── _layout.tsx              # Bottom navigation bar
│   │       ├── dashboard.tsx            # 6 & 7. Daily Protection & Recent Alerts
│   │       ├── history.tsx              # 7. Screened Call History & Filters
│   │       └── settings.tsx             # 8. Preferences, Guardians & Stripe
│   │
│   ├── plugins/withCallDetector.js      # Expo Config Plugin for AndroidManifest
│   ├── services/                        # API client, Storage, Call detector bridge
│   ├── app.json                         # Expo configuration
│   └── eas.json                         # Standalone APK build profile
```

---

## 🚀 Quick Start Guide

### 1. Run Backend Server (Cloud Run / Local)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8080
```
API Documentation will be live at `http://localhost:8080/docs`.

Run tests:
```bash
pytest tests/
```

### 2. Run Frontend App (Expo)
```bash
cd frontend
npm install
npm run android
```

### 3. Generate Standalone Android APK

#### Option A: Using EAS Build (Cloud APK)
```bash
cd frontend
npx eas-cli build -p android --profile preview
```

#### Option B: Local Android Build
```bash
cd frontend
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
The compiled APK will be generated at:
`frontend/android/app/build/outputs/apk/release/app-release.apk`
