# StopFrauda Cloud Run Backend

Backend service for **StopFrauda** built with Python FastAPI, Google Cloud Firestore, Firebase Admin, Twilio REST API, and Stripe.

---

## Features

- **Real-Time Fraud Alert Dispatch (`POST /api/v1/alerts/dispatch`)**:
  - Triggers instant Twilio SMS notifications to designated emergency contacts when an unknown number calls.
  - Logs the screened call in Google Cloud Firestore.
- **Emergency Contact Onboarding (`POST /api/v1/contacts/send-welcome`)**:
  - Stores up to 5 family/emergency contacts per user.
  - Sends a warm welcome SMS via Twilio to confirm their role as an Emergency Guardian.
- **Stripe Subscription Management (`POST /api/v1/stripe/create-checkout`)**:
  - Automatically activates **1-Year Free Early Bird Plan** for registrations before November 1st.
  - Generates Stripe Checkout sessions for the **$10.00/yr Standard Plan**.
  - Handles Stripe Webhook events (`invoice.payment_succeeded`, `customer.subscription.created`).
- **Cloud Run Native**: Stateless, Dockerized container listening on `$PORT`.

---

## Local Development Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Twilio, Stripe, and Firebase credentials
   ```

3. **Run Dev Server**:
   ```bash
   uvicorn app.main:app --reload --port 8080
   ```
   Interactive Swagger documentation will be available at: `http://localhost:8080/docs`

4. **Run Automated Tests**:
   ```bash
   pytest tests/
   ```

---

## Google Cloud Run Deployment

Deploy with Google Cloud CLI:
```bash
gcloud run deploy stopfrauda-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=stopfrauda-mvp
```
