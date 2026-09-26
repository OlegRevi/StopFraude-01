import logging
from typing import List
from fastapi import APIRouter, HTTPException, status

from app.models.schemas import (
    WelcomeContactsRequest,
    WelcomeContactsResponse,
    EmergencyContactModel
)
from app.services.firestore_service import firestore_service
from app.services.twilio_service import twilio_service

logger = logging.getLogger("stopfrauda.routes.contacts")
router = APIRouter(tags=["Contacts"])


@router.post(
    "/api/v1/contacts/send-welcome",
    response_model=WelcomeContactsResponse,
    status_code=status.HTTP_200_OK,
    summary="Save emergency contacts and send welcome verification SMS"
)
async def save_contacts_and_send_welcome(payload: WelcomeContactsRequest):
    """
    Saves up to 5 emergency contacts from the user's address book,
    and sends an initial Twilio SMS notifying each contact they have been added.
    """
    user_id = payload.userId
    raw_contacts = payload.contacts

    if len(raw_contacts) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A maximum of 5 emergency contacts is permitted."
        )

    # 1. Fetch user display info
    user_data = firestore_service.get_or_create_user(user_id)
    user_name = user_data.get("displayName") or "A family member"

    # 2. Persist in Firestore
    saved_contacts = firestore_service.save_emergency_contacts(user_id, raw_contacts)

    # 3. Dispatch welcome SMS via Twilio
    lang = payload.lang or "ro"
    sent_count = 0
    for contact in saved_contacts:
        res = twilio_service.send_welcome_sms(
            recipient_name=contact.name,
            recipient_phone=contact.phone,
            user_name=user_name,
            lang=lang
        )
        if res.get("success"):
            sent_count += 1

    return WelcomeContactsResponse(
        success=True,
        message=f"Saved {len(saved_contacts)} contacts and dispatched {sent_count} welcome SMS message(s).",
        sentCount=sent_count,
        contacts=saved_contacts
    )


@router.get(
    "/api/v1/users/{userId}/contacts",
    response_model=List[EmergencyContactModel],
    summary="Get designated emergency contacts for a user"
)
async def get_emergency_contacts(userId: str):
    """Returns the list of up to 5 emergency contacts registered for this user."""
    return firestore_service.get_emergency_contacts(userId)
