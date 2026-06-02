# StopFrauda - Android App

AI-powered scam call detection and protection app for Android.

## Features

### Core Features
- **AI Scam Detection**: Analyzes phone calls using GPT-4.1 to detect scam patterns
- **Emergency Contacts**: Alert family members when scam calls are detected
- **Push Notifications**: Real-time alerts for suspicious calls
- **Call History**: Track all analyzed calls with detailed breakdowns
- **Multi-language**: English and Romanian support

### Android-Specific Features (Requires EAS Build)
- **Automatic Call Recording**: Records calls from unknown numbers
- **Call Detection Service**: Detects incoming/outgoing calls
- **Background Monitoring**: Runs protection service in background
- **Auto-start on Boot**: Protection starts when phone boots
- **Foreground Service**: Shows recording indicator during calls

## Development Setup

### Prerequisites
- Node.js 18+
- Yarn
- Expo CLI (`npm install -g eas-cli`)
- Android Studio (for local builds)

### Installation

```bash
cd frontend
yarn install
```

### Running Locally (Expo Go - Limited Features)

```bash
# Start development server
npx expo start

# For tunnel mode (allows testing on physical device)
npx expo start --tunnel
```

**Note**: Expo Go does NOT support:
- Call detection
- Call recording
- Background services
- Auto-start on boot

For full features, you need an EAS Build.

### Testing on Android Device (Expo Go)

1. Install **Expo Go** from Google Play Store
2. Scan the QR code displayed in terminal
3. App will load on your device
4. Use "Test Scam Call" button for demo

## Building for Production (Full Features)

### Prerequisites for Build

1. Create an Expo account: https://expo.dev/signup
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Configure project: `eas build:configure`

### Build Commands

```bash
# Build development APK (for testing with full native features)
eas build --platform android --profile development

# Build preview APK (for internal testing)
eas build --platform android --profile preview

# Build production AAB (for Google Play)
eas build --platform android --profile production
```

### Google Play Submission

1. Generate Google Play Service Account key
2. Save as `google-play-key.json` in frontend folder
3. Run: `eas submit --platform android`

## Configuration

### Environment Variables

Create `.env` file in frontend folder:

```env
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### Firebase Setup (for Push Notifications)

1. Create Firebase project: https://console.firebase.google.com
2. Add Android app with package name: `com.stopfrauda.app`
3. Download `google-services.json`
4. Place in `frontend/` folder

### Backend Configuration

The backend requires:
- MongoDB database
- EMERGENT_LLM_KEY for AI analysis
- (Optional) Google Cloud credentials for speech-to-text
- (Optional) Twilio for SMS alerts

## Project Structure

```
frontend/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── onboarding/        # Onboarding flow
│   └── call-details.tsx   # Call details modal
├── src/
│   ├── components/        # Reusable components
│   ├── services/          # API and notification services
│   ├── store/             # Zustand state management
│   └── i18n/              # Translations
├── assets/                # Images and fonts
├── app.json               # Expo configuration
└── eas.json               # EAS Build configuration
```

## API Endpoints

The app communicates with a FastAPI backend:

- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user
- `POST /api/calls` - Create call record
- `POST /api/analyze` - Analyze transcript
- `POST /api/demo/scam-call` - Test scam detection
- `GET /api/health` - Backend health check

## Permissions Required

### Android Permissions
- `READ_CONTACTS` - Select emergency contacts
- `READ_PHONE_STATE` - Detect incoming calls
- `READ_CALL_LOG` - Access call history
- `RECORD_AUDIO` - Record calls for analysis
- `POST_NOTIFICATIONS` - Push notifications
- `RECEIVE_BOOT_COMPLETED` - Auto-start service
- `FOREGROUND_SERVICE` - Background monitoring

## Testing

### Manual Testing
1. Complete onboarding flow
2. Add emergency contacts
3. Use "Test Scam Call" button on dashboard
4. Verify notification appears
5. Check call history for analysis

### Demo Mode
The app includes demo endpoints to test without real calls:
- Test Scam Call - Creates fake scam call
- Test Safe Call - Creates fake legitimate call

## Troubleshooting

### Common Issues

1. **Metro bundler cache**: Run `npx expo start -c` to clear cache
2. **Android build fails**: Ensure Java 17 is installed
3. **Push notifications not working**: Check Firebase configuration
4. **API connection issues**: Verify EXPO_PUBLIC_BACKEND_URL

## License

Proprietary - All rights reserved

## Support

For issues or feature requests, please contact the development team.
