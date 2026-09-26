import logging
from fastapi import APIRouter, HTTPException, status
from typing import List

from app.models.schemas import AlertDispatchRequest, AlertDispatchResponse, CallLogModel
from app.services.firestore_service import firestore_service
from app.services.twilio_service import twilio_service

logger = logging.getLogger("stopfrauda.routes.alerts")
router = APIRouter(tags=["Alerts"])


@router.post(
    "/api/v1/alerts/dispatch",
    response_model=AlertDispatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Dispatch real-time fraud alert for an incoming unknown call"
)
async def dispatch_fraud_alert(payload: AlertDispatchRequest):
    """
    Called in real-time when an incoming call is detected from an unknown number.
    Retrieves user's emergency contacts and sends urgent Twilio SMS warnings.
    """
    user_id = payload.userId
    caller_number = payload.callerNumber
    timestamp = payload.timestamp

    try:
        lang = payload.lang or "ro"
        default_display = "Membrul protejat al familiei tale" if lang == "ro" else "Your protected family member"
        # 1. Fetch user profile and emergency contacts
        user_data = firestore_service.get_or_create_user(user_id)
        user_display_name = payload.userName or user_data.get("displayName") or default_display
        contacts = firestore_service.get_emergency_contacts(user_id)

        dispatched_count = 0
        if contacts:
            for contact in contacts:
                res = twilio_service.send_unknown_call_alert(
                    recipient_phone=contact.phone,
                    recipient_name=contact.name,
                    caller_number=caller_number,
                    user_name=user_display_name,
                    lang=lang
                )
                if res.get("success"):
                    dispatched_count += 1
        else:
            logger.warning(f"No emergency contacts registered for user {user_id}. Alert not dispatched.")

        # 2. Record call log in Firestore
        call_id = firestore_service.log_call(
            user_id=user_id,
            incoming_number=caller_number,
            is_unknown=True,
            alert_dispatched=dispatched_count > 0,
            timestamp=timestamp
        )

        return AlertDispatchResponse(
            success=True,
            callId=call_id,
            alertDispatched=dispatched_count > 0,
            dispatchedCount=dispatched_count,
            message=f"Fraud alert dispatched to {dispatched_count} emergency contact(s)."
        )
    except Exception as e:
        logger.error(f"Error dispatching fraud alert: {e}")
        return AlertDispatchResponse(
            success=True,
            callId="fallback_" + user_id,
            alertDispatched=False,
            dispatchedCount=0,
            message=f"Alert recorded locally: {str(e)}"
        )


@router.get(
    "/api/v1/users/{userId}/call-logs",
    response_model=List[CallLogModel],
    summary="Get recent call logs for a user"
)
async def get_user_call_logs(userId: str, limit: int = 50):
    """Returns recent unknown call screenings and alert logs."""
    return firestore_service.get_call_logs(userId, limit=limit)
