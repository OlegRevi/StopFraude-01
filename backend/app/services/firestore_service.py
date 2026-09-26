import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.config import settings
from app.models.schemas import EmergencyContactInput, EmergencyContactModel, CallLogModel, SubscriptionModel, PlanType, SubscriptionStatus

logger = logging.getLogger("stopfrauda.firestore")

# Global clients
_db = None
_firebase_initialized = False


def init_firestore():
    """Initializes Firebase Admin SDK and Firestore client if available."""
    global _db, _firebase_initialized
    if _firebase_initialized:
        return _db

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.GOOGLE_CLOUD_PROJECT
                })
                logger.info("Firebase initialized with Service Account.")
            elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")):
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.GOOGLE_CLOUD_PROJECT
                })
                logger.info("Firebase initialized with Application Default Credentials.")
            else:
                # Default project initialization (Cloud Run environment)
                try:
                    firebase_admin.initialize_app(options={'projectId': settings.GOOGLE_CLOUD_PROJECT})
                    logger.info("Firebase initialized with default Cloud Run project.")
                except Exception as e:
                    logger.warning(f"Could not initialize Firebase Admin automatically: {e}. Falling back to in-memory store.")
                    _db = None
                    _firebase_initialized = True
                    return None

        _db = firestore.client()
        _firebase_initialized = True
        logger.info("Firestore client successfully connected.")
        return _db
    except Exception as exc:
        logger.warning(f"Firestore initialization failed: {exc}. Operating in in-memory dev mode.")
        _db = None
        _firebase_initialized = True
        return None


class FirestoreService:
    """Manages Firestore database operations with in-memory fallback for local development."""

    def __init__(self):
        self.db = init_firestore()
        # In-memory storage structures for development/testing without live GCP credentials
        self._mock_users: Dict[str, Dict[str, Any]] = {}
        self._mock_contacts: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._mock_call_logs: Dict[str, List[Dict[str, Any]]] = {}
        self._mock_subscriptions: Dict[str, Dict[str, Any]] = {}

    def get_or_create_user(self, user_id: str, phone_number: Optional[str] = None, display_name: Optional[str] = None) -> Dict[str, Any]:
        if self.db:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            user_data = {
                "userId": user_id,
                "phoneNumber": phone_number or "",
                "displayName": display_name or "StopFrauda User",
                "activeProtection": True,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            doc_ref.set(user_data)
            return user_data

        # In-memory fallback
        if user_id not in self._mock_users:
            self._mock_users[user_id] = {
                "userId": user_id,
                "phoneNumber": phone_number or "",
                "displayName": display_name or "StopFrauda User",
                "activeProtection": True,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
        return self._mock_users[user_id]

    def save_emergency_contacts(self, user_id: str, contacts: List[EmergencyContactInput]) -> List[EmergencyContactModel]:
        saved: List[EmergencyContactModel] = []
        now = datetime.now(timezone.utc)

        if self.db:
            batch = self.db.batch()
            contacts_coll = self.db.collection("users").document(user_id).collection("emergency_contacts")
            
            # Remove existing contacts to enforce up to 5 clean selection
            existing = contacts_coll.stream()
            for doc in existing:
                batch.delete(doc.reference)

            for c in contacts:
                contact_id = str(uuid.uuid4())
                c_data = {
                    "id": contact_id,
                    "contactName": c.name,
                    "phoneNumber": c.phone,
                    "email": c.email or "",
                    "isVerified": True,
                    "createdAt": now.isoformat()
                }
                c_ref = contacts_coll.document(contact_id)
                batch.set(c_ref, c_data)
                saved.append(EmergencyContactModel(
                    id=contact_id,
                    name=c.name,
                    phone=c.phone,
                    email=c.email,
                    isVerified=True,
                    createdAt=now
                ))
            batch.commit()
            return saved

        # In-memory fallback
        self._mock_contacts[user_id] = {}
        for c in contacts:
            contact_id = str(uuid.uuid4())
            contact_obj = EmergencyContactModel(
                id=contact_id,
                name=c.name,
                phone=c.phone,
                email=c.email,
                isVerified=True,
                createdAt=now
            )
            self._mock_contacts[user_id][contact_id] = contact_obj.model_dump()
            saved.append(contact_obj)
        return saved

    def get_emergency_contacts(self, user_id: str) -> List[EmergencyContactModel]:
        contacts: List[EmergencyContactModel] = []
        if self.db:
            docs = self.db.collection("users").document(user_id).collection("emergency_contacts").stream()
            for doc in docs:
                data = doc.to_dict()
                contacts.append(EmergencyContactModel(
                    id=data.get("id", doc.id),
                    name=data.get("contactName", ""),
                    phone=data.get("phoneNumber", ""),
                    email=data.get("email"),
                    isVerified=data.get("isVerified", False)
                ))
            return contacts

        # In-memory fallback
        user_contacts = self._mock_contacts.get(user_id, {})
        for cid, data in user_contacts.items():
            contacts.append(EmergencyContactModel(**data))
        return contacts

    def log_call(self, user_id: str, incoming_number: str, is_unknown: bool, alert_dispatched: bool, timestamp: str) -> str:
        call_id = str(uuid.uuid4())
        data = {
            "id": call_id,
            "incomingNumber": incoming_number,
            "isUnknown": is_unknown,
            "alertDispatched": alert_dispatched,
            "timestamp": timestamp
        }

        if self.db:
            call_ref = self.db.collection("users").document(user_id).collection("call_logs").document(call_id)
            call_ref.set(data)
            return call_id

        # In-memory fallback
        if user_id not in self._mock_call_logs:
            self._mock_call_logs[user_id] = []
        self._mock_call_logs[user_id].insert(0, data)
        return call_id

    def get_call_logs(self, user_id: str, limit: int = 50) -> List[CallLogModel]:
        logs: List[CallLogModel] = []
        if self.db:
            docs = (
                self.db.collection("users")
                .document(user_id)
                .collection("call_logs")
                .order_by("timestamp", direction="DESCENDING")
                .limit(limit)
                .stream()
            )
            for doc in docs:
                data = doc.to_dict()
                logs.append(CallLogModel(
                    id=doc.id,
                    incomingNumber=data.get("incomingNumber", ""),
                    isUnknown=data.get("isUnknown", True),
                    alertDispatched=data.get("alertDispatched", False),
                    timestamp=data.get("timestamp", "")
                ))
            return logs

        # In-memory fallback
        raw_logs = self._mock_call_logs.get(user_id, [])[:limit]
        return [CallLogModel(**l) for l in raw_logs]

    def save_subscription(
        self,
        user_id: str,
        plan_type: PlanType,
        status: SubscriptionStatus,
        stripe_customer_id: Optional[str] = None,
        stripe_sub_id: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> SubscriptionModel:
        sub = SubscriptionModel(
            userId=user_id,
            stripeCustomerId=stripe_customer_id,
            stripeSubscriptionId=stripe_sub_id,
            planType=plan_type,
            status=status,
            expiresAt=expires_at
        )

        data = {
            "userId": user_id,
            "stripeCustomerId": stripe_customer_id or "",
            "stripeSubscriptionId": stripe_sub_id or "",
            "planType": plan_type.value,
            "status": status.value,
            "expiresAt": expires_at.isoformat() if expires_at else None,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

        if self.db:
            self.db.collection("subscriptions").document(user_id).set(data, merge=True)
            return sub

        self._mock_subscriptions[user_id] = data
        return sub

    def get_subscription(self, user_id: str) -> Optional[SubscriptionModel]:
        if self.db:
            doc = self.db.collection("subscriptions").document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                expires_at = None
                if data.get("expiresAt"):
                    expires_at = datetime.fromisoformat(data["expiresAt"])
                return SubscriptionModel(
                    userId=user_id,
                    stripeCustomerId=data.get("stripeCustomerId"),
                    stripeSubscriptionId=data.get("stripeSubscriptionId"),
                    planType=PlanType(data.get("planType", PlanType.EARLY_BIRD.value)),
                    status=SubscriptionStatus(data.get("status", SubscriptionStatus.ACTIVE.value)),
                    expiresAt=expires_at
                )
            return None

        # In-memory fallback
        data = self._mock_subscriptions.get(user_id)
        if data:
            expires_at = None
            if data.get("expiresAt"):
                expires_at = datetime.fromisoformat(data["expiresAt"])
            return SubscriptionModel(
                userId=user_id,
                stripeCustomerId=data.get("stripeCustomerId"),
                stripeSubscriptionId=data.get("stripeSubscriptionId"),
                planType=PlanType(data.get("planType", PlanType.EARLY_BIRD.value)),
                status=SubscriptionStatus(data.get("status", SubscriptionStatus.ACTIVE.value)),
                expiresAt=expires_at
            )
        return None


# Global singleton instance
firestore_service = FirestoreService()
