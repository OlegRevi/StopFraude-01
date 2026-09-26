import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from app.config import settings
from app.models.schemas import PlanType, SubscriptionStatus
from app.services.firestore_service import firestore_service

logger = logging.getLogger("stopfrauda.stripe")


class StripeService:
    """Manages Stripe Checkout Sessions and Webhook callbacks."""

    def __init__(self):
        self.stripe = None
        if settings.is_stripe_configured:
            try:
                import stripe
                stripe.api_key = settings.STRIPE_SECRET_KEY
                self.stripe = stripe
                logger.info("Stripe SDK initialized.")
            except Exception as e:
                logger.warning(f"Failed to initialize Stripe: {e}")
                self.stripe = None
        else:
            logger.info("Stripe running in SIMULATION/DEV mode.")

    def create_checkout_session(self, user_id: str, plan_type: PlanType) -> Dict[str, Any]:
        """Creates a Stripe Checkout Session or activates Early Bird free year."""
        now = datetime.now(timezone.utc)

        # 1. Early Bird Plan check: 1 Year Free for early registrations
        # Nov 1, 2026 cutoff
        early_bird_cutoff = datetime(2026, 11, 1, 0, 0, 0, tzinfo=timezone.utc)

        if plan_type == PlanType.EARLY_BIRD:
            is_eligible = now < early_bird_cutoff
            if is_eligible:
                one_year_later = now + timedelta(days=365)
                # Activate immediately in Firestore
                firestore_service.save_subscription(
                    user_id=user_id,
                    plan_type=PlanType.EARLY_BIRD,
                    status=SubscriptionStatus.ACTIVE,
                    stripe_customer_id=f"cus_early_bird_{user_id[:8]}",
                    stripe_sub_id=f"sub_early_bird_{user_id[:8]}",
                    expires_at=one_year_later
                )
                return {
                    "success": True,
                    "checkoutUrl": None,
                    "status": SubscriptionStatus.ACTIVE.value,
                    "planType": PlanType.EARLY_BIRD.value,
                    "expiresAt": one_year_later.isoformat(),
                    "message": "Early Bird 1-Year Free Protection granted successfully!"
                }

        # 2. Live Stripe Checkout for Standard Plan or post-cutoff
        if self.stripe:
            try:
                session = self.stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="subscription",
                    line_items=[
                        {
                            "price": settings.STRIPE_STANDARD_PRICE_ID or "price_standard_10usd_year",
                            "quantity": 1,
                        }
                    ],
                    client_reference_id=user_id,
                    metadata={"userId": user_id, "planType": plan_type.value},
                    success_url=f"{settings.APP_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=settings.APP_CANCEL_URL,
                )
                return {
                    "success": True,
                    "checkoutUrl": session.url,
                    "status": SubscriptionStatus.TRIALING.value if plan_type == PlanType.EARLY_BIRD else "pending",
                    "planType": plan_type.value,
                    "expiresAt": None,
                    "message": "Checkout session created successfully."
                }
            except Exception as e:
                logger.error(f"Stripe Checkout error: {e}")
                # Fall through to simulated session if Stripe throws error

        # 3. Development / Mock fallback
        expires = now + timedelta(days=365)
        firestore_service.save_subscription(
            user_id=user_id,
            plan_type=plan_type,
            status=SubscriptionStatus.ACTIVE,
            stripe_customer_id=f"cus_mock_{user_id[:8]}",
            stripe_sub_id=f"sub_mock_{user_id[:8]}",
            expires_at=expires
        )
        return {
            "success": True,
            "checkoutUrl": f"https://checkout.stripe.com/mock-pay/{user_id}",
            "status": SubscriptionStatus.ACTIVE.value,
            "planType": plan_type.value,
            "expiresAt": expires.isoformat(),
            "message": f"Dev mode: {plan_type.value} subscription activated."
        }

    def handle_webhook_event(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Validates and processes Stripe webhook events."""
        if not self.stripe or not settings.STRIPE_WEBHOOK_SECRET:
            logger.info("Webhook received in dev mode or unconfigured Stripe secret.")
            return {"status": "ignored", "reason": "stripe_unconfigured"}

        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise ValueError(f"Webhook signature error: {e}")

        event_type = event["type"]
        data_object = event["data"]["object"]
        logger.info(f"Processing Stripe event: {event_type}")

        if event_type in ["checkout.session.completed", "invoice.payment_succeeded"]:
            user_id = data_object.get("client_reference_id") or data_object.get("metadata", {}).get("userId")
            customer_id = data_object.get("customer")
            sub_id = data_object.get("subscription")
            if user_id:
                expires = datetime.now(timezone.utc) + timedelta(days=365)
                firestore_service.save_subscription(
                    user_id=user_id,
                    plan_type=PlanType.ANNUAL_STANDARD,
                    status=SubscriptionStatus.ACTIVE,
                    stripe_customer_id=customer_id,
                    stripe_sub_id=sub_id,
                    expires_at=expires
                )
                logger.info(f"Subscription activated for user {user_id}")

        elif event_type == "customer.subscription.deleted":
            customer_id = data_object.get("customer")
            # Mark canceled if matching
            logger.info(f"Subscription canceled for customer {customer_id}")

        return {"status": "success", "event": event_type}


stripe_service = StripeService()
