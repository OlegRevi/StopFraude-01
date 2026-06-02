# StopFrauda - AI-Powered Scam Call Protection

A full-stack mobile application that protects users from phone scams using AI-powered analysis.

## Project Overview

StopFrauda is designed for Moldova (with support for English and Romanian) to help protect vulnerable users from phone scams. The app:

1. **Detects scam calls** using GPT-4.1 AI analysis
2. **Alerts emergency contacts** when scams are detected
3. **Records and transcribes** suspicious calls
4. **Provides real-time notifications** for immediate awareness

## Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54 with Expo Router
- **State Management**: Zustand
- **UI**: Native React Native components with StyleSheet
- **Navigation**: Tab-based with bottom navigation
- **Languages**: English & Romanian

### Backend (FastAPI/Python)
- **Framework**: FastAPI with async support
- **Database**: MongoDB with Motor async driver
- **AI**: GPT-4.1 via Emergent Integrations
- **Push Notifications**: Firebase Cloud Messaging (optional)
- **SMS Alerts**: Twilio (optional)
- **Speech-to-Text**: Google Cloud (optional)

## Key Features Implemented

### ✅ Core Features
- User registration with phone number
- Emergency contacts management (up to 5 contacts)
- AI-powered scam analysis with GPT-4.1
- Call history with detailed analysis breakdown
- Multi-language support (EN/RO)
- Protection toggle on dashboard

### ✅ Push Notification System
- Notification service with Android channels
- Foreground and background notification handling
- Scam alert notifications with high priority
- Device token registration with backend

### ✅ Background Services
- Call monitoring service
- Pending call queue with auto-sync
- Background fetch for periodic updates
- App state handling (foreground/background)

### ✅ Demo/Testing Features
- Test scam call button
- Test legitimate call button
- Full analysis with AI explanation

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI

### Running the App

1. **Backend**:
```bash
cd backend
pip install -r requirements.txt
python server.py
```

2. **Frontend**:
```bash
cd frontend
yarn install
npx expo start
```

3. **Testing on Device**:
   - Install Expo Go on Android
   - Scan QR code from terminal

## Building for Production

### Android APK/AAB

1. Install EAS CLI: `npm install -g eas-cli`
2. Login to Expo: `eas login`
3. Build: `eas build --platform android --profile production`

See `frontend/README.md` for detailed build instructions.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/users` | POST | Create user |
| `/api/users/{id}` | GET/PUT/DELETE | User CRUD |
| `/api/users/{id}/contacts` | POST/GET | Emergency contacts |
| `/api/users/{id}/device` | POST | Register device for push |
| `/api/calls` | POST | Create call record |
| `/api/calls/user/{id}` | GET | Get user's calls |
| `/api/calls/{id}/analyze` | POST | Analyze call with AI |
| `/api/analyze` | POST | Direct transcript analysis |
| `/api/demo/scam-call` | POST | Create test scam call |
| `/api/demo/legit-call` | POST | Create test safe call |

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://...
DB_NAME=stopfrauda
EMERGENT_LLM_KEY=your_key
TWILIO_ACCOUNT_SID=optional
TWILIO_AUTH_TOKEN=optional
TWILIO_PHONE_NUMBER=optional
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url
```

## Project Status

- ✅ Backend API fully functional
- ✅ Frontend app with full onboarding
- ✅ AI scam detection working
- ✅ Push notification infrastructure
- ✅ Background call monitoring service
- ✅ EAS build configuration
- ⚠️ Google Speech-to-Text requires credentials
- ⚠️ Firebase push requires google-services.json

## Next Steps for Production

1. Add `google-services.json` for Firebase
2. Add Google Cloud credentials for speech-to-text
3. Configure Twilio for SMS alerts
4. Build with `eas build --platform android`
5. Submit to Google Play

## Support

For development support, refer to the detailed README files in each folder.
