import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger("stopfrauda.twilio")


class TwilioService:
    """Handles SMS dispatch through Twilio REST API with dev mode fallback."""

    def __init__(self):
        self.client = None
        if settings.is_twilio_configured:
            try:
                from twilio.rest import Client
                self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                logger.info("Twilio client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Twilio client: {e}")
                self.client = None
        else:
            logger.info("Twilio running in SIMULATION/DEV mode (credentials not configured).")

    def send_welcome_sms(self, recipient_name: str, recipient_phone: str, user_name: str = "A family member", lang: str = "ro") -> Dict[str, Any]:
        """Sends an introductory SMS when an emergency contact is registered."""
        if lang == "en":
            body = (
                f"🛡️ StopFrauda Notice: Hello {recipient_name}, {user_name} has designated you as "
                f"an Emergency Guardian. You will receive instant SMS alerts if an unknown number calls them, "
                f"protecting them against fraud and scams."
            )
        else:
            default_user = "Un membru al familiei" if user_name in ("A family member", "StopFrauda Protected User") else user_name
            body = (
                f"🛡️ Notificare StopFrauda: Bună {recipient_name}, {default_user} te-a desemnat "
                f"Gardian de Urgență. Vei primi alerte SMS instantanee dacă un număr necunoscut îi apelează, "
                f"protejându-i împotriva tentativelor de fraudă și escrocherii."
            )
        return self._send_sms(recipient_phone, body)

    def send_unknown_call_alert(self, recipient_phone: str, recipient_name: str, caller_number: str, user_name: str = "Your protected family member", lang: str = "ro") -> Dict[str, Any]:
        """Sends an urgent scam alert SMS to an emergency contact during an active unknown call."""
        if lang == "en":
            body = (
                f"⚠️ StopFrauda FRAUD ALERT: {user_name} is currently receiving an incoming call from an "
                f"UNKNOWN number: {caller_number}. This caller is not in their address book. "
                f"Please check in with them to ensure their safety."
            )
        else:
            default_user = "Membrul protejat al familiei tale" if user_name in ("Your protected family member", "StopFrauda Protected User", "A family member") else user_name
            body = (
                f"⚠️ ALERTĂ FRAUDĂ StopFrauda: {default_user} primește în acest moment un apel de la un număr "
                f"NECUNOSCUT: {caller_number}. Acest număr nu se află în agenda telefonică. "
                f"Te rugăm să iei legătura cu ei pentru a le verifica siguranța."
            )
        return self._send_sms(recipient_phone, body)

    def _send_sms(self, to_phone: str, body: str) -> Dict[str, Any]:
        """Internal helper to send SMS or log in development."""
        if self.client and settings.TWILIO_PHONE_NUMBER:
            try:
                message = self.client.messages.create(
                    to=to_phone,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    body=body
                )
                logger.info(f"Twilio SMS sent to {to_phone}: SID {message.sid}")
                return {
                    "success": True,
                    "sid": message.sid,
                    "simulated": False,
                    "recipient": to_phone
                }
            except Exception as exc:
                logger.error(f"Error sending Twilio SMS to {to_phone}: {exc}")
                return {
                    "success": False,
                    "error": str(exc),
                    "simulated": False,
                    "recipient": to_phone
                }

        # Simulated / Development mode
        logger.info(f"[SIMULATED TWILIO SMS] To: {to_phone} | Body: {body}")
        return {
            "success": True,
            "sid": f"SM_mock_{to_phone[-4:] if len(to_phone) >= 4 else '0000'}",
            "simulated": True,
            "recipient": to_phone
        }


twilio_service = TwilioService()
