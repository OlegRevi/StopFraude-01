from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class PlanType(str, Enum):
    EARLY_BIRD = "EARLY_BIRD"
    ANNUAL_STANDARD = "ANNUAL_STANDARD"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"


class EmergencyContactInput(BaseModel):
    name: str = Field(..., min_length=1, description="Contact display name")
    phone: str = Field(..., min_length=3, description="Contact phone number (E.164 or normalized)")
    email: Optional[str] = Field(None, description="Optional contact email")


class EmergencyContactModel(EmergencyContactInput):
    id: Optional[str] = None
    isVerified: bool = False
    createdAt: Optional[datetime] = None


class WelcomeContactsRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    contacts: List[EmergencyContactInput] = Field(..., max_length=5)
    lang: Optional[str] = Field("ro", description="Preferred language for SMS notifications ('ro' or 'en')")


class WelcomeContactsResponse(BaseModel):
    success: bool
    message: str
    sentCount: int
    contacts: List[EmergencyContactModel]


class AlertDispatchRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    callerNumber: str = Field(..., min_length=1)
    timestamp: str = Field(..., description="ISO 8601 timestamp string")
    lang: Optional[str] = Field("ro", description="Preferred language for SMS notifications ('ro' or 'en')")


class AlertDispatchResponse(BaseModel):
    success: bool
    callId: str
    alertDispatched: bool
    dispatchedCount: int
    message: str


class CallLogModel(BaseModel):
    id: Optional[str] = None
    incomingNumber: str
    isUnknown: bool = True
    alertDispatched: bool = True
    timestamp: str


class CreateCheckoutRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    planType: PlanType


class CreateCheckoutResponse(BaseModel):
    success: bool
    checkoutUrl: Optional[str] = None
    status: str
    planType: str
    message: str
    expiresAt: Optional[str] = None


class SubscriptionModel(BaseModel):
    userId: str
    stripeCustomerId: Optional[str] = None
    stripeSubscriptionId: Optional[str] = None
    planType: PlanType
    status: SubscriptionStatus
    expiresAt: Optional[datetime] = None


class UserProfileModel(BaseModel):
    userId: str
    phoneNumber: Optional[str] = None
    displayName: Optional[str] = "StopFrauda Protected User"
    activeProtection: bool = True
    contactsCount: int = 0
