# StopFrauda Privacy Policy

**Effective Date:** March 3, 2026

## 1. Introduction

StopFrauda ("we", "our", "the App") is an AI-powered scam call detection application designed to protect users in Moldova from fraudulent phone calls. This Privacy Policy explains what data we collect, why we collect it, and how we handle it.

## 2. Data We Collect

To provide our scam-detection service, the App may collect or access the following:

- **Microphone / Audio Recording (RECORD_AUDIO):** During phone calls, the App may record audio in short segments (up to 30 seconds) for real-time scam analysis. Audio is transmitted securely to our server, analyzed by AI, and is **not stored permanently**. Recordings are discarded after analysis is complete.

- **Contacts (READ_CONTACTS):** With your permission, the App reads your contact list so you can select trusted emergency contacts who will be alerted if a scam is detected. We do not upload or store your full contact list on our servers.

- **Phone State (READ_PHONE_STATE):** The App monitors phone call states (ringing, active, ended) to detect incoming calls and trigger real-time scam analysis.

- **Call Log (READ_CALL_LOG):** The App accesses call log data to identify caller information and provide call history within the app.

- **Foreground Service (FOREGROUND_SERVICE_PHONE_CALL):** The App runs a foreground service during active phone calls to perform real-time audio recording and AI-powered scam analysis in the background.

- **Boot Completed (RECEIVE_BOOT_COMPLETED):** The App auto-starts its protection service when the device is turned on, ensuring continuous scam call protection.

- **Phone Number:** Your phone number is used to create your account and identify you within the service.

- **Emergency Contact Details:** The names, phone numbers, and email addresses of contacts you explicitly select are stored so we can send them scam alerts on your behalf.

- **Device Token (FCM):** A Firebase Cloud Messaging token is stored to send you push notifications about detected scams.

- **Call Metadata:** Caller number, call duration, and timestamps are stored to provide your call history and scam statistics.

## 3. How We Use Your Data

- **Scam Detection:** Audio recordings are analyzed in real-time using AI to determine if a phone call is a scam.
- **Alerting:** When a scam is detected, we notify you via push notification and alert your selected emergency contacts via email and/or SMS.
- **Statistics:** Call metadata is used to show you your personal protection dashboard (total calls analyzed, scams detected, etc.).

## 4. Data Sharing

We do **not** sell, trade, or rent your personal data to third parties. Data may be shared only in these limited cases:

- **AI Analysis:** Audio transcripts are sent to our AI provider (OpenAI) for scam analysis. No personally identifiable information is included in these requests.
- **Alert Delivery:** Emergency contact details (email, phone) are used with email (Gmail SMTP) and SMS (Twilio) services solely to deliver scam alerts.
- **Push Notifications:** Firebase Cloud Messaging is used to deliver push notifications to your device.

## 5. Data Storage & Security

- Your data is stored on secure servers with encrypted connections (HTTPS/TLS).
- Audio recordings are processed in real-time and are **not permanently stored**.
- Account data (phone number, emergency contacts, call history) is stored in a secure database for as long as you use the service.

## 6. Your Rights

You have the right to:

- Revoke microphone, contacts, or phone state permissions at any time through your device settings.
- Request deletion of your account and all associated data by contacting us.
- Modify your emergency contacts at any time within the App.

## 7. Children's Privacy

StopFrauda is not intended for use by children under 13. We do not knowingly collect personal data from children.

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated effective date.

## 9. Contact Us

If you have any questions about this Privacy Policy or your data, please contact us at:

**Email:** revulet.oleg@gmail.com

---

*Last updated: March 3, 2026*
