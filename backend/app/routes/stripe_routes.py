import logging
from fastapi import APIRouter, Header, Request, HTTPException, status
from typing import Optional

from app.models.schemas import (
    CreateCheckoutRequest,
    CreateCheckoutResponse,
    SubscriptionModel
)
from app.services.stripe_service import stripe_service
from app.services.firestore_service import firestore_service

logger = logging.getLogger("stopfrauda.routes.stripe")
router = APIRouter(tags=["Stripe"])


@router.post(
    "/api/v1/stripe/create-checkout",
    response_model=CreateCheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Create Stripe Checkout Session or activate Early Bird plan"
)
async def create_checkout(payload: CreateCheckoutRequest):
    """
    Creates a checkout session for annual standard plan or automatically activates
    the 1-Year Free Early Bird promotion.
    """
    result = stripe_service.create_checkout_session(
        user_id=payload.userId,
        plan_type=payload.planType
    )
    return CreateCheckoutResponse(**result)


@router.post(
    "/api/v1/stripe/webhook",
    status_code=status.HTTP_200_OK,
    summary="Stripe subscription webhook handler"
)
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")
):
    """Handles Stripe subscription and payment lifecycle events."""
    payload = await request.body()
    try:
        res = stripe_service.handle_webhook_event(payload, stripe_signature or "")
        return res
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Webhook processing error: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook error")


@router.get(
    "/api/v1/users/{userId}/subscription",
    response_model=Optional[SubscriptionModel],
    summary="Get user subscription status"
)
async def get_user_subscription(userId: str):
    """Returns the user's active subscription information from Firestore."""
    sub = firestore_service.get_subscription(userId)
    return sub
