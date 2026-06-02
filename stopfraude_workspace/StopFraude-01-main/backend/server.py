from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Query, BackgroundTasks, Request, Response, Cookie, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import base64
import json
import re
import hashlib
import secrets
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Google Cloud Speech-to-Text
from google.cloud import speech
from google.oauth2 import service_account

# Firebase Admin SDK for Push Notifications
import firebase_admin
from firebase_admin import credentials as firebase_credentials, messaging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google Cloud and Firebase credentials paths
GOOGLE_CREDENTIALS_PATH = ROOT_DIR / 'google_credentials.json'
FIREBASE_CREDENTIALS_PATH = ROOT_DIR / 'google_credentials.json'
speech_client = None
firebase_app = None

# Initialize Google Speech-to-Text if credentials exist
if GOOGLE_CREDENTIALS_PATH.exists():
    try:
        credentials = service_account.Credentials.from_service_account_file(str(GOOGLE_CREDENTIALS_PATH))
        speech_client = speech.SpeechClient(credentials=credentials)
        logging.info("Google Speech-to-Text client initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize Google Speech-to-Text: {e}")

# Initialize Firebase Admin SDK for push notifications
firebase_cred_path = FIREBASE_CREDENTIALS_PATH if FIREBASE_CREDENTIALS_PATH.exists() else GOOGLE_CREDENTIALS_PATH
if firebase_cred_path.exists():
    try:
        cred = firebase_credentials.Certificate(str(firebase_cred_path))
        firebase_app = firebase_admin.initialize_app(cred)
        logging.info(f"Firebase Admin SDK initialized successfully from {firebase_cred_path.name}")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin SDK: {e}")

# Admin authentication settings
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
ADMIN_SECRET_KEY = os.environ['ADMIN_SECRET_KEY']
ADMIN_SESSION_EXPIRY = timedelta(hours=24)  # Session expires after 24 hours

# In-memory session store (in production, use Redis or database)
admin_sessions: Dict[str, datetime] = {}

def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

def verify_password(password: str) -> bool:
    """Verify admin password"""
    return password == ADMIN_PASSWORD

def create_session() -> str:
    """Create a new admin session"""
    token = generate_session_token()
    admin_sessions[token] = datetime.utcnow() + ADMIN_SESSION_EXPIRY
    return token

def verify_session(token: str) -> bool:
    """Verify if a session token is valid"""
    if not token or token not in admin_sessions:
        return False
    if datetime.utcnow() > admin_sessions[token]:
        del admin_sessions[token]
        return False
    return True

def get_admin_session(admin_token: Optional[str] = Cookie(default=None)) -> Optional[str]:
    """Dependency to get and verify admin session from cookie"""
    if admin_token and verify_session(admin_token):
        return admin_token
    return None

# Create the main app
app = FastAPI(title="StopFrauda API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================
# ENUMS
# =====================
class ScamType(str, Enum):
    BANK_IMPERSONATION = "bank_impersonation"
    POLICE_SCAM = "police_scam"
    UTILITY_SCAM = "utility_scam"
    FAMILY_EMERGENCY = "family_emergency"
    LOTTERY = "lottery"
    TECH_SUPPORT = "tech_support"
    UNKNOWN = "unknown"
    LEGITIMATE = "legitimate"

class UserFeedback(str, Enum):
    SCAM = "scam"
    LEGIT = "legit"
    UNKNOWN = "unknown"

class ScamExampleLanguage(str, Enum):
    EN = "en"
    RO = "ro"
    RU = "ru"

# =====================
# MODELS
# =====================
class ScamExample(BaseModel):
    """Knowledge base entry for scam detection"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scam_type: ScamType
    language: ScamExampleLanguage = ScamExampleLanguage.RO
    title: str  # Short description
    transcript: str  # The actual scam text/transcript
    keywords: List[str] = []  # Key phrases to detect
    notes: Optional[str] = None  # Admin notes
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ScamExampleCreate(BaseModel):
    scam_type: ScamType
    language: ScamExampleLanguage = ScamExampleLanguage.RO
    title: str
    transcript: str
    keywords: List[str] = []
    notes: Optional[str] = None

class ScamExampleUpdate(BaseModel):
    scam_type: Optional[ScamType] = None
    language: Optional[ScamExampleLanguage] = None
    title: Optional[str] = None
    transcript: Optional[str] = None
    keywords: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class EmergencyContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None  # Email for scam alert notifications
    photo_base64: Optional[str] = None

class DeviceInfo(BaseModel):
    """Device registration for push notifications"""
    device_id: str
    fcm_token: Optional[str] = None
    platform: str = "android"  # android or ios
    app_version: str = "1.0.0"
    os_version: Optional[str] = None

class UserCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"  # "en" or "ro"
    device_info: Optional[DeviceInfo] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        # Basic phone validation - allow +373 format for Moldova
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        if not re.match(r'^\+?[0-9]{8,15}$', cleaned):
            raise ValueError('Invalid phone number format')
        return cleaned

class UserUpdate(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    is_active: Optional[bool] = None
    onboarding_completed: Optional[bool] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"
    emergency_contacts: List[EmergencyContact] = []
    device_info: Optional[DeviceInfo] = None
    is_active: bool = True
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AudioUploadResponse(BaseModel):
    """Response for audio upload"""
    call_id: str
    status: str
    message: str

class ScamAnalysisResult(BaseModel):
    is_scam: bool
    confidence: int  # 0-100
    scam_type: ScamType
    detected_keywords: List[str]
    explanation: str
    explanation_ro: Optional[str] = None  # Romanian translation

class CallRecordCreate(BaseModel):
    user_id: str
    caller_number: str
    duration_seconds: int
    transcript: Optional[str] = None
    recording_base64: Optional[str] = None

class CallRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    caller_number: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: int
    recording_base64: Optional[str] = None
    transcript: Optional[str] = None
    scam_score: Optional[int] = None
    scam_type: Optional[ScamType] = None
    detected_keywords: List[str] = []
    explanation: Optional[str] = None
    explanation_ro: Optional[str] = None
    alerted: bool = False
    alert_sent_at: Optional[datetime] = None
    user_feedback: Optional[UserFeedback] = None
    analyzed: bool = False

class AlertRequest(BaseModel):
    call_id: str
    user_id: str

class AudioChunkRequest(BaseModel):
    """Request for analyzing an audio chunk during a call"""
    user_id: str
    caller_number: str
    session_id: str
    chunk_number: int
    duration_seconds: int
    audio_base64: str

class ChunkAnalysisResponse(BaseModel):
    """Response for chunk analysis"""
    call_id: str
    session_id: str
    chunk_number: int
    scam_score: int
    scam_type: str
    is_scam: bool
    explanation: str
    transcript: Optional[str] = None

# =====================
# USER ENDPOINTS
# =====================
@api_router.get("/")
async def root():
    return {"message": "StopFrauda API v1.0.0", "status": "running"}

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Create a new user"""
    # Check if user with phone already exists
    existing = await db.users.find_one({"phone": user_data.phone})
    if existing:
        # Update name/email if provided and missing on existing user
        update_fields = {}
        if user_data.name and not existing.get("name"):
            update_fields["name"] = user_data.name
        if user_data.email and not existing.get("email"):
            update_fields["email"] = user_data.email
        if update_fields:
            update_fields["updated_at"] = datetime.utcnow()
            await db.users.update_one({"id": existing["id"]}, {"$set": update_fields})
            existing = await db.users.find_one({"id": existing["id"]})
        return User(**existing)
    
    user = User(
        phone=user_data.phone,
        name=user_data.name,
        email=user_data.email,
        language=user_data.language
    )
    await db.users.insert_one(user.dict())
    logger.info(f"Created new user: {user.id} ({user.name or 'unnamed'})")
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/users/phone/{phone}", response_model=User)
async def get_user_by_phone(phone: str):
    """Get user by phone number"""
    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user details"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.post("/users/{user_id}/contacts", response_model=User)
async def add_emergency_contacts(user_id: str, contacts: List[EmergencyContact]):
    """Add or update emergency contacts for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Limit to 5 contacts
    contacts_to_save = contacts[:5]
    contact_dicts = [c.dict() for c in contacts_to_save]
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"emergency_contacts": contact_dicts, "updated_at": datetime.utcnow()}}
    )
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.get("/users/{user_id}/contacts", response_model=List[EmergencyContact])
async def get_emergency_contacts(user_id: str):
    """Get emergency contacts for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [EmergencyContact(**c) for c in user.get("emergency_contacts", [])]

# =====================
# CALL RECORD ENDPOINTS
# =====================
@api_router.post("/calls", response_model=CallRecord)
async def create_call_record(call_data: CallRecordCreate):
    """Create a new call record"""
    call = CallRecord(
        user_id=call_data.user_id,
        caller_number=call_data.caller_number,
        duration_seconds=call_data.duration_seconds,
        transcript=call_data.transcript,
        recording_base64=call_data.recording_base64
    )
    await db.calls.insert_one(call.dict())
    logger.info(f"Created call record: {call.id}")
    return call

@api_router.get("/calls/user/{user_id}", response_model=List[CallRecord])
async def get_user_calls(user_id: str, limit: int = 50):
    """Get all calls for a user"""
    calls = await db.calls.find({"user_id": user_id}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [CallRecord(**call) for call in calls]

@api_router.get("/calls/{call_id}", response_model=CallRecord)
async def get_call(call_id: str):
    """Get a single call record"""
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return CallRecord(**call)

@api_router.put("/calls/{call_id}/feedback")
async def update_call_feedback(call_id: str, feedback: UserFeedback):
    """Update user feedback for a call"""
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"user_feedback": feedback.value}}
    )
    return {"status": "success", "feedback": feedback.value}

# =====================
# AI ANALYSIS ENDPOINT
# =====================
async def get_knowledge_base_examples() -> str:
    """Fetch active scam examples from knowledge base for AI context"""
    examples = await db.scam_examples.find({"is_active": True}).to_list(100)
    if not examples:
        return ""
    
    kb_text = "\n\n=== REAL SCAM EXAMPLES FROM KNOWLEDGE BASE ===\n"
    for ex in examples:
        kb_text += f"\n--- {ex['scam_type'].upper()} ({ex['language'].upper()}) ---\n"
        kb_text += f"Title: {ex['title']}\n"
        kb_text += f"Transcript: {ex['transcript'][:500]}{'...' if len(ex['transcript']) > 500 else ''}\n"
        if ex.get('keywords'):
            kb_text += f"Keywords: {', '.join(ex['keywords'])}\n"
    
    return kb_text

async def analyze_transcript(transcript: str, language: str = "en") -> ScamAnalysisResult:
    """Analyze transcript using GPT for scam detection with knowledge base context"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        logger.error("EMERGENT_LLM_KEY not found")
        return ScamAnalysisResult(
            is_scam=False,
            confidence=0,
            scam_type=ScamType.UNKNOWN,
            detected_keywords=[],
            explanation="API key not configured"
        )
    
    # Get knowledge base examples
    kb_examples = await get_knowledge_base_examples()
    
    system_message = f"""You are a scam detection AI for Moldova. Analyze phone call transcripts and identify scams.
        
Common scam patterns:
- Bank impersonation (Victoriabank, Mobiasbanca, BCR, maib)
- Police/prosecutor impersonation  
- Utility company threats (disconnect service unless pay)
- Family emergency ("grandson arrested, needs bail money")
- Lottery/prize scams ("you won, pay tax first")
- Package delivery scams
- Tech support scams

Red flags:
- Urgency ("immediately", "right now", "today")
- Fear tactics ("account blocked", "legal action", "arrest")
- Money requests ("transfer", "send money", "payment")
- Personal info requests ("card number", "CVV", "password")
- Unknown caller claiming to be known entity
{kb_examples}

Return ONLY valid JSON with no other text:
{{
  "is_scam": boolean,
  "confidence": 0-100,
  "scam_type": "bank_impersonation|police_scam|utility_scam|family_emergency|lottery|tech_support|legitimate|unknown",
  "detected_keywords": ["keyword1", "keyword2"],
  "explanation": "Brief explanation in English",
  "explanation_ro": "Brief explanation in Romanian"
}}"""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"scam-analysis-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-4.1")
        
        user_message = UserMessage(text=f"Analyze this phone call transcript for scam indicators:\n\n\"{transcript}\"")
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        result = json.loads(response_text)
        
        return ScamAnalysisResult(
            is_scam=result.get("is_scam", False),
            confidence=result.get("confidence", 0),
            scam_type=ScamType(result.get("scam_type", "unknown")),
            detected_keywords=result.get("detected_keywords", []),
            explanation=result.get("explanation", ""),
            explanation_ro=result.get("explanation_ro", "")
        )
    except Exception as e:
        logger.error(f"Error analyzing transcript: {e}")
        return ScamAnalysisResult(
            is_scam=False,
            confidence=0,
            scam_type=ScamType.UNKNOWN,
            detected_keywords=[],
            explanation=f"Analysis error: {str(e)}"
        )

@api_router.post("/analyze", response_model=ScamAnalysisResult)
async def analyze_call(transcript: str = Form(...), language: str = Form("en")):
    """Analyze a transcript for scam detection"""
    result = await analyze_transcript(transcript, language)
    return result

@api_router.post("/analyze/chunk", response_model=ChunkAnalysisResponse)
async def analyze_audio_chunk(chunk_data: AudioChunkRequest, background_tasks: BackgroundTasks):
    """
    Analyze an audio chunk in real-time during a call.
    This enables early scam detection - alerting users DURING the call, not after.
    
    Flow:
    1. Frontend records in 30-second chunks
    2. Each chunk is uploaded immediately
    3. Backend transcribes and analyzes
    4. If scam detected, alert is sent immediately
    """
    try:
        # Create or update call record for this session
        existing_call = await db.calls.find_one({
            "session_id": chunk_data.session_id,
            "user_id": chunk_data.user_id
        })
        
        if existing_call:
            call_id = existing_call["id"]
        else:
            # Create new call record for this session
            call = CallRecord(
                user_id=chunk_data.user_id,
                caller_number=chunk_data.caller_number,
                duration_seconds=chunk_data.duration_seconds,
            )
            call_dict = call.dict()
            call_dict["session_id"] = chunk_data.session_id
            call_dict["chunks"] = []
            call_dict["cumulative_transcript"] = ""
            await db.calls.insert_one(call_dict)
            call_id = call.id
            logger.info(f"Created call record for session: {chunk_data.session_id}")
        
        # Transcribe audio chunk if speech client is available
        transcript = ""
        if speech_client:
            try:
                audio_data = base64.b64decode(chunk_data.audio_base64)
                audio = speech.RecognitionAudio(content=audio_data)
                
                # Get user language
                user = await db.users.find_one({"id": chunk_data.user_id})
                language = user.get("language", "en") if user else "en"
                language_code = "ro-RO" if language == "ro" else "en-US"
                
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.MP3,
                    sample_rate_hertz=44100,
                    language_code=language_code,
                    enable_automatic_punctuation=True,
                )
                
                response = speech_client.recognize(config=config, audio=audio)
                
                for result in response.results:
                    transcript += result.alternatives[0].transcript + " "
                
                transcript = transcript.strip()
                logger.info(f"Transcribed chunk {chunk_data.chunk_number}: {transcript[:100]}...")
            except Exception as e:
                logger.error(f"Transcription error for chunk {chunk_data.chunk_number}: {e}")
                transcript = f"[Audio chunk {chunk_data.chunk_number} - transcription unavailable]"
        else:
            # No speech client - use placeholder
            transcript = f"[Audio chunk {chunk_data.chunk_number} - {chunk_data.duration_seconds}s]"
        
        # Fetch current duration before updating
        current_call = await db.calls.find_one({"id": call_id}, {"duration_seconds": 1, "_id": 0})
        current_duration = current_call.get("duration_seconds", 0) if current_call else 0

        # Update cumulative transcript
        await db.calls.update_one(
            {"id": call_id},
            {
                "$push": {
                    "chunks": {
                        "chunk_number": chunk_data.chunk_number,
                        "duration_seconds": chunk_data.duration_seconds,
                        "transcript": transcript,
                        "timestamp": datetime.utcnow()
                    }
                },
                "$set": {
                    "duration_seconds": current_duration + chunk_data.duration_seconds
                }
            }
        )
        
        # Get cumulative transcript for analysis
        call = await db.calls.find_one({"id": call_id})
        cumulative_transcript = " ".join([c.get("transcript", "") for c in call.get("chunks", [])])
        
        # Analyze cumulative transcript
        user = await db.users.find_one({"id": chunk_data.user_id})
        language = user.get("language", "en") if user else "en"
        
        analysis = await analyze_transcript(cumulative_transcript, language)
        
        # Update call with analysis results
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {
                "cumulative_transcript": cumulative_transcript,
                "scam_score": analysis.confidence,
                "scam_type": analysis.scam_type.value,
                "detected_keywords": analysis.detected_keywords,
                "explanation": analysis.explanation,
                "explanation_ro": analysis.explanation_ro,
                "analyzed": True
            }}
        )
        
        logger.info(f"Chunk {chunk_data.chunk_number} analyzed. Scam score: {analysis.confidence}%")
        
        return ChunkAnalysisResponse(
            call_id=call_id,
            session_id=chunk_data.session_id,
            chunk_number=chunk_data.chunk_number,
            scam_score=analysis.confidence,
            scam_type=analysis.scam_type.value,
            is_scam=analysis.is_scam,
            explanation=analysis.explanation,
            transcript=transcript
        )
        
    except Exception as e:
        logger.error(f"Error analyzing chunk: {e}")
        raise HTTPException(status_code=500, detail=f"Chunk analysis failed: {str(e)}")

@api_router.post("/calls/{call_id}/analyze", response_model=CallRecord)
async def analyze_and_update_call(call_id: str):
    """Analyze a call record and update with results"""
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if not call.get("transcript"):
        raise HTTPException(status_code=400, detail="Call has no transcript to analyze")
    
    # Get user language preference
    user = await db.users.find_one({"id": call["user_id"]})
    language = user.get("language", "en") if user else "en"
    
    result = await analyze_transcript(call["transcript"], language)
    
    update_data = {
        "scam_score": result.confidence,
        "scam_type": result.scam_type.value,
        "detected_keywords": result.detected_keywords,
        "explanation": result.explanation,
        "explanation_ro": result.explanation_ro,
        "analyzed": True
    }
    
    await db.calls.update_one({"id": call_id}, {"$set": update_data})
    
    # If scam detected with high confidence, trigger alert
    if result.is_scam and result.confidence > 70:
        await trigger_alert(call_id, call["user_id"])
    
    updated_call = await db.calls.find_one({"id": call_id})
    return CallRecord(**updated_call)

# =====================
# ALERT ENDPOINT
# =====================
async def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Send a push notification via Firebase Cloud Messaging.
    
    Args:
        fcm_token: Device FCM token
        title: Notification title
        body: Notification body text
        data: Optional data payload for the app
    
    Returns:
        True if sent successfully, False otherwise
    """
    if not firebase_app:
        logger.warning("Firebase not initialized - push notifications disabled")
        return False
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    icon="ic_notification",
                    color="#FF0000",
                    sound="default",
                    channel_id="scam_alerts",
                ),
            ),
        )
        
        response = messaging.send(message)
        logger.info(f"Push notification sent successfully: {response}")
        return True
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False

async def send_push_to_user(user_id: str, title: str, body: str, data: dict = None) -> bool:
    """
    Send push notification to a user by their user_id.
    Looks up the FCM token from the user's device_info.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        logger.warning(f"User {user_id} not found for push notification")
        return False
    
    device_info = user.get("device_info", {})
    fcm_token = device_info.get("fcm_token") if isinstance(device_info, dict) else None
    
    if not fcm_token:
        logger.warning(f"No FCM token for user {user_id}")
        return False
    
    return await send_push_notification(fcm_token, title, body, data)

# Email configuration from environment
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'noreply@stopfrauda.com')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'StopFrauda Alert System')

async def send_scam_alert_emails(
    contacts: List[dict],
    protected_user_phone: str,
    caller_number: str,
    scam_type: str,
    confidence: int,
    transcript: str,
    call_timestamp: datetime,
    duration: int,
    explanation: str,
    keywords: List[str]
) -> bool:
    """
    Send detailed scam alert emails to all emergency contacts with email addresses.
    
    Returns True if at least one email was sent successfully.
    """
    # Check if SMTP is configured
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.info("SMTP not configured - email alerts disabled. Set SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False
    
    # Filter contacts with email addresses
    contacts_with_email = [c for c in contacts if c.get('email')]
    if not contacts_with_email:
        logger.info("No emergency contacts have email addresses configured")
        return False
    
    # Format timestamp
    formatted_time = call_timestamp.strftime("%B %d, %Y at %I:%M %p")
    
    # Format duration
    minutes = duration // 60
    seconds = duration % 60
    formatted_duration = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
    
    # Format keywords
    keywords_str = ", ".join(keywords) if keywords else "None detected"
    
    # Create HTML email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .alert-badge {{ background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin: 20px 0; }}
            .content {{ background: #f8fafc; padding: 25px; border: 1px solid #e5e7eb; }}
            .detail-row {{ display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }}
            .detail-label {{ font-weight: bold; color: #6b7280; width: 140px; }}
            .detail-value {{ color: #1f2937; flex: 1; }}
            .transcript-box {{ background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 15px 0; max-height: 300px; overflow-y: auto; }}
            .transcript-box pre {{ white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }}
            .confidence-high {{ color: #dc2626; font-weight: bold; }}
            .confidence-medium {{ color: #f59e0b; font-weight: bold; }}
            .keywords {{ background: #fef3c7; padding: 3px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 14px; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }}
            .warning-icon {{ font-size: 48px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="warning-icon">⚠️</div>
                <h1>SCAM CALL ALERT</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Potential fraud detected - Immediate attention required</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">
                    <strong>🚨 A suspicious call was detected!</strong><br>
                    Someone you care about may have received a scam call. Please review the details below and contact them if necessary.
                </div>
                
                <h3 style="color: #1f2937; margin-top: 25px;">📞 Call Details</h3>
                
                <div class="detail-row">
                    <span class="detail-label">Protected User:</span>
                    <span class="detail-value">{protected_user_phone}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Caller Number:</span>
                    <span class="detail-value" style="font-weight: bold; color: #dc2626;">{caller_number}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">{formatted_time}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">{formatted_duration}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Scam Type:</span>
                    <span class="detail-value" style="font-weight: bold;">{scam_type}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value {'confidence-high' if confidence >= 80 else 'confidence-medium'}">{confidence}%</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Suspicious Keywords:</span>
                    <span class="detail-value">
                        {''.join([f'<span class="keywords">{kw}</span>' for kw in keywords]) if keywords else 'None detected'}
                    </span>
                </div>
                
                <h3 style="color: #1f2937; margin-top: 25px;">🤖 AI Analysis</h3>
                <p style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    {explanation or 'Analysis details not available.'}
                </p>
                
                <h3 style="color: #1f2937; margin-top: 25px;">📝 Call Transcript</h3>
                <div class="transcript-box">
                    <pre>{transcript[:2000]}{'...[truncated]' if len(transcript) > 2000 else ''}</pre>
                </div>
                
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <strong>⚡ Recommended Actions:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Contact {protected_user_phone} immediately to check on them</li>
                        <li>Remind them not to share personal information or send money</li>
                        <li>If they've already shared information, help them secure their accounts</li>
                        <li>Report the scam number to local authorities if needed</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>This alert was automatically generated by <strong>StopFrauda</strong> - AI-Powered Scam Protection</p>
                <p>You're receiving this because you're listed as an emergency contact.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_content = f"""
⚠️ SCAM CALL ALERT - StopFrauda

A suspicious call was detected for someone you care about!

═══════════════════════════════════════
📞 CALL DETAILS
═══════════════════════════════════════

Protected User: {protected_user_phone}
Caller Number: {caller_number}
Date & Time: {formatted_time}
Duration: {formatted_duration}
Scam Type: {scam_type}
Confidence: {confidence}%
Suspicious Keywords: {keywords_str}

═══════════════════════════════════════
🤖 AI ANALYSIS
═══════════════════════════════════════

{explanation or 'Analysis details not available.'}

═══════════════════════════════════════
📝 CALL TRANSCRIPT
═══════════════════════════════════════

{transcript[:1500]}{'...[truncated]' if len(transcript) > 1500 else ''}

═══════════════════════════════════════
⚡ RECOMMENDED ACTIONS
═══════════════════════════════════════

1. Contact {protected_user_phone} immediately to check on them
2. Remind them not to share personal information or send money
3. If they've already shared information, help them secure their accounts
4. Report the scam number to local authorities if needed

---
This alert was automatically generated by StopFrauda - AI-Powered Scam Protection
You're receiving this because you're listed as an emergency contact.
    """
    
    emails_sent = 0
    
    for contact in contacts_with_email:
        try:
            email = contact['email']
            contact_name = contact.get('name', 'Emergency Contact')
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🚨 SCAM ALERT: Suspicious call detected for {protected_user_phone}"
            msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
            msg['To'] = email
            
            # Attach both plain text and HTML versions
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Send email asynchronously
            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                start_tls=True
            )
            
            logger.info(f"Scam alert email sent to {contact_name} <{email}>")
            emails_sent += 1
            
        except Exception as e:
            logger.error(f"Failed to send email to {contact.get('email')}: {e}")
    
    logger.info(f"Email alerts: {emails_sent}/{len(contacts_with_email)} sent successfully")
    return emails_sent > 0

async def trigger_alert(call_id: str, user_id: str):
    """Trigger SMS alert, email notification, and push notification to emergency contacts and user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        logger.warning(f"User {user_id} not found for alert")
        return
    
    call = await db.calls.find_one({"id": call_id})
    if not call:
        return
    
    scam_type = call.get("scam_type", "unknown").replace("_", " ").title()
    confidence = call.get("scam_score", 0)
    caller_number = call.get("caller_number", "Unknown")
    transcript = call.get("transcript") or call.get("cumulative_transcript", "No transcript available")
    call_timestamp = call.get("timestamp", datetime.utcnow())
    duration = call.get("duration_seconds", 0)
    explanation = call.get("explanation", "")
    keywords = call.get("detected_keywords", [])
    
    # === 1. Send Push Notification to the protected user ===
    push_title = "⚠️ Scam Call Detected!"
    push_body = f"{scam_type} scam ({confidence}% confidence) from {caller_number}"
    push_data = {
        "type": "scam_alert",
        "call_id": call_id,
        "scam_type": call.get("scam_type", "unknown"),
        "confidence": str(confidence),
        "caller_number": caller_number
    }
    
    push_sent = await send_push_to_user(user_id, push_title, push_body, push_data)
    if push_sent:
        logger.info(f"Push notification sent to user {user_id}")
    
    # === 2. Send Email to emergency contacts ===
    email_sent = False
    protected_user_display = f"{user.get('name')} ({user['phone']})" if user.get('name') else user['phone']
    if user.get("emergency_contacts"):
        email_sent = await send_scam_alert_emails(
            contacts=user["emergency_contacts"],
            protected_user_phone=protected_user_display,
            caller_number=caller_number,
            scam_type=scam_type,
            confidence=confidence,
            transcript=transcript,
            call_timestamp=call_timestamp,
            duration=duration,
            explanation=explanation,
            keywords=keywords
        )
    
    # === 3. Send SMS to emergency contacts ===
    if not user.get("emergency_contacts"):
        logger.warning(f"No emergency contacts for user {user_id}")
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {"alerted": True, "alert_sent_at": datetime.utcnow(), "push_sent": push_sent, "email_sent": email_sent}}
        )
        return
    
    # Check if Twilio is configured
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    if not twilio_sid or twilio_sid == 'your_twilio_account_sid':
        logger.info("Twilio not configured - SMS alerts disabled")
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {"alerted": True, "alert_sent_at": datetime.utcnow(), "push_sent": push_sent, "email_sent": email_sent}}
        )
        return
    
    try:
        from twilio.rest import Client
        twilio_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        twilio_client = Client(twilio_sid, twilio_token)
        
        # Send to all emergency contacts
        user_label = f"{user.get('name')} ({user['phone']})" if user.get('name') else user['phone']
        for contact in user["emergency_contacts"]:
            message_body = f"""⚠️ SCAM ALERT

{user_label} received suspicious call

Type: {scam_type}
Confidence: {confidence}%

Review call details in StopFrauda app.

- StopFrauda"""
            
            twilio_client.messages.create(
                body=message_body,
                from_=twilio_phone,
                to=contact["phone"]
            )
            logger.info(f"SMS alert sent to {contact['phone']}")
        
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {"alerted": True, "alert_sent_at": datetime.utcnow(), "push_sent": push_sent, "sms_sent": True, "email_sent": email_sent}}
        )
    except Exception as e:
        logger.error(f"Failed to send SMS alert: {e}")

@api_router.post("/alerts/send")
async def send_alert(request: AlertRequest):
    """Manually trigger an alert for a call"""
    await trigger_alert(request.call_id, request.user_id)
    return {"status": "success", "message": "Alert triggered"}

@api_router.post("/alerts/test-sms")
async def test_sms(phone_number: str = Form(...)):
    """
    Send a test SMS to verify Twilio configuration.
    Use this to test before deploying to production.
    """
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    if not twilio_sid or twilio_sid == 'your_twilio_account_sid':
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    try:
        from twilio.rest import Client
        twilio_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        twilio_client = Client(twilio_sid, twilio_token)
        
        message = twilio_client.messages.create(
            body="🛡️ StopFrauda Test Message\n\nSMS alerts are working correctly!\n\nYou will receive alerts when scam calls are detected.",
            from_=twilio_phone,
            to=phone_number
        )
        
        logger.info(f"Test SMS sent to {phone_number}, SID: {message.sid}")
        
        return {
            "status": "success",
            "message": f"Test SMS sent to {phone_number}",
            "message_sid": message.sid
        }
    except Exception as e:
        logger.error(f"Failed to send test SMS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")

@api_router.post("/alerts/test-push")
async def test_push_notification(
    fcm_token: str = Form(...),
    title: str = Form(default="🛡️ StopFrauda Test"),
    body: str = Form(default="Push notifications are working correctly!")
):
    """
    Send a test push notification to verify FCM configuration.
    Requires a valid FCM token from the Flutter app.
    """
    if not firebase_app:
        raise HTTPException(status_code=503, detail="Firebase not initialized")
    
    data = {
        "type": "test",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    success = await send_push_notification(fcm_token, title, body, data)
    
    if success:
        return {
            "status": "success",
            "message": "Test push notification sent"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to send push notification")

@api_router.post("/alerts/send-push/{user_id}")
async def send_push_to_specific_user(
    user_id: str,
    title: str = Form(...),
    body: str = Form(...),
    data: Optional[str] = Form(default=None)
):
    """
    Send a custom push notification to a specific user.
    Data should be a JSON string.
    """
    if not firebase_app:
        raise HTTPException(status_code=503, detail="Firebase not initialized")
    
    extra_data = json.loads(data) if data else {}
    
    success = await send_push_to_user(user_id, title, body, extra_data)
    
    if success:
        return {"status": "success", "message": f"Push notification sent to user {user_id}"}
    else:
        raise HTTPException(status_code=404, detail="User not found or no FCM token registered")

# =====================
# DEMO ENDPOINTS
# =====================
@api_router.post("/demo/scam-call", response_model=CallRecord)
async def create_demo_scam_call(user_id: str):
    """Create a demo scam call for testing"""
    demo_transcript = """Hello, this is the security department from your bank. 
    We detected suspicious activity on your account. 
    Your account will be blocked immediately unless you verify your identity. 
    Please provide your card number and CVV code right now to avoid losing access to your funds. 
    This is urgent - you must act immediately or we cannot help you."""
    
    call = CallRecord(
        user_id=user_id,
        caller_number="+373 XXX XXX",
        duration_seconds=125,
        transcript=demo_transcript
    )
    await db.calls.insert_one(call.dict())
    
    # Analyze the call
    result = await analyze_transcript(demo_transcript)
    
    update_data = {
        "scam_score": result.confidence,
        "scam_type": result.scam_type.value,
        "detected_keywords": result.detected_keywords,
        "explanation": result.explanation,
        "explanation_ro": result.explanation_ro,
        "analyzed": True
    }
    
    await db.calls.update_one({"id": call.id}, {"$set": update_data})
    
    # Trigger alert if scam
    if result.is_scam and result.confidence > 70:
        await trigger_alert(call.id, user_id)
    
    updated_call = await db.calls.find_one({"id": call.id})
    return CallRecord(**updated_call)

@api_router.post("/demo/legit-call", response_model=CallRecord)
async def create_demo_legit_call(user_id: str):
    """Create a demo legitimate call for testing"""
    demo_transcript = """Hi, this is Dr. Smith's office calling to remind you 
    about your appointment tomorrow at 2 PM. Please call us back if you need 
    to reschedule. Have a great day!"""
    
    call = CallRecord(
        user_id=user_id,
        caller_number="+373 22 123 456",
        duration_seconds=35,
        transcript=demo_transcript
    )
    await db.calls.insert_one(call.dict())
    
    # For demo legit call, set a low scam score directly
    # This ensures it's always counted as legitimate
    update_data = {
        "scam_score": 15,  # Low score = legitimate
        "scam_type": "legitimate",
        "detected_keywords": [],
        "explanation": "This appears to be a legitimate call from a doctor's office. The caller identified themselves properly, provided a specific reason for calling (appointment reminder), and did not request any sensitive information or create urgency.",
        "explanation_ro": "Acesta pare a fi un apel legitim de la cabinetul unui medic. Apelantul s-a identificat corect, a oferit un motiv specific pentru apel (reamintire programare) și nu a solicitat informații sensibile sau nu a creat urgență.",
        "analyzed": True
    }
    
    await db.calls.update_one({"id": call.id}, {"$set": update_data})
    
    updated_call = await db.calls.find_one({"id": call.id})
    return CallRecord(**updated_call)

# =====================
# WEB REVIEW PAGE
# =====================
@api_router.get("/review/{call_id}", response_class=HTMLResponse)
async def review_call_page(call_id: str):
    """Web page for reviewing a call"""
    call = await db.calls.find_one({"id": call_id})
    if not call:
        return HTMLResponse(content="<h1>Call not found</h1>", status_code=404)
    
    user = await db.users.find_one({"id": call["user_id"]})
    user_phone = user.get("phone", "Unknown") if user else "Unknown"
    
    scam_type = call.get("scam_type", "unknown").replace("_", " ").upper()
    keywords_html = "".join([f"<li>{kw}</li>" for kw in call.get("detected_keywords", [])])
    
    # Highlight keywords in transcript
    transcript = call.get("transcript", "No transcript available")
    for kw in call.get("detected_keywords", []):
        transcript = transcript.replace(kw, f'<span class="keyword">{kw}</span>')
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StopFrauda - Call Review</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .card {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            margin-bottom: 16px;
        }}
        h1 {{
            color: #333;
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }}
        .alert {{
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .alert strong {{
            color: #dc2626;
        }}
        .scam-badge {{
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }}
        .legit-badge {{
            background: #22c55e;
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }}
        .info-label {{
            color: #666;
            font-weight: 500;
        }}
        .info-value {{
            color: #333;
            font-weight: 600;
        }}
        .transcript {{
            background: #f8fafc;
            padding: 16px;
            border-radius: 12px;
            line-height: 1.8;
            margin: 16px 0;
            border: 1px solid #e2e8f0;
        }}
        .keyword {{
            background: #fef08a;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
        }}
        .keywords-list {{
            list-style: none;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .keywords-list li {{
            background: #fee2e2;
            color: #dc2626;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
        }}
        .btn {{
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            margin-right: 12px;
            margin-top: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        .btn-danger {{
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }}
        .btn-success {{
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
        }}
        .confidence-bar {{
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }}
        .confidence-fill {{
            height: 100%;
            background: linear-gradient(90deg, #22c55e, #ef4444);
            border-radius: 4px;
            transition: width 0.5s;
        }}
        section {{
            margin-bottom: 24px;
        }}
        section h3 {{
            color: #374151;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
    </style>
</head>
<body>
    <div class="card">
        <h1>🛡️ Scam Call Review</h1>
        
        {f'<div class="alert"><strong>⚠️ Suspicious call detected</strong><br>Protected user received a call that appears to be a scam.</div>' if call.get('scam_score', 0) > 50 else ''}
        
        <div class="info-row">
            <span class="info-label">Protected User</span>
            <span class="info-value">{user_phone}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Caller Number</span>
            <span class="info-value">{call.get('caller_number', 'Unknown')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date & Time</span>
            <span class="info-value">{call.get('timestamp', '').strftime('%Y-%m-%d %H:%M') if call.get('timestamp') else 'Unknown'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">{call.get('duration_seconds', 0) // 60}m {call.get('duration_seconds', 0) % 60}s</span>
        </div>
        <div class="info-row">
            <span class="info-label">Scam Type</span>
            <span class="scam-badge {'legit-badge' if call.get('scam_score', 0) < 50 else ''}">{scam_type}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Confidence</span>
            <span class="info-value">{call.get('scam_score', 0)}%</span>
        </div>
        <div class="confidence-bar">
            <div class="confidence-fill" style="width: {call.get('scam_score', 0)}%"></div>
        </div>
    </div>
    
    <div class="card">
        <section>
            <h3>📝 Transcript</h3>
            <div class="transcript">{transcript}</div>
        </section>
        
        <section>
            <h3>🚩 Detected Red Flags</h3>
            <ul class="keywords-list">
                {keywords_html if keywords_html else '<li style="background: #dcfce7; color: #16a34a;">No red flags detected</li>'}
            </ul>
        </section>
        
        <section>
            <h3>💡 Analysis</h3>
            <p style="color: #4b5563; line-height: 1.6;">{call.get('explanation', 'No analysis available')}</p>
        </section>
        
        <section>
            <h3>Is this a real scam?</h3>
            <button class="btn btn-danger" onclick="markAsScam()">✓ Yes, Real Scam</button>
            <button class="btn btn-success" onclick="markAsLegit()">✗ No, False Alarm</button>
        </section>
    </div>
    
    <script>
        async function markAsScam() {{
            try {{
                const response = await fetch('/api/calls/{call_id}/feedback?feedback=scam', {{
                    method: 'PUT'
                }});
                if (response.ok) {{
                    alert('✓ Marked as real scam. This will help improve our detection.');
                    location.reload();
                }}
            }} catch (e) {{
                alert('Error updating feedback');
            }}
        }}
        
        async function markAsLegit() {{
            try {{
                const response = await fetch('/api/calls/{call_id}/feedback?feedback=legit', {{
                    method: 'PUT'
                }});
                if (response.ok) {{
                    alert('✓ Marked as false alarm. Sorry for the inconvenience!');
                    location.reload();
                }}
            }} catch (e) {{
                alert('Error updating feedback');
            }}
        }}
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

# =====================
# STATS ENDPOINT
# =====================
@api_router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get statistics for a user"""
    total_calls = await db.calls.count_documents({"user_id": user_id})
    scam_calls = await db.calls.count_documents({"user_id": user_id, "scam_score": {"$gt": 70}})
    alerts_sent = await db.calls.count_documents({"user_id": user_id, "alerted": True})
    
    return {
        "total_calls": total_calls,
        "scam_calls": scam_calls,
        "legitimate_calls": total_calls - scam_calls,
        "alerts_sent": alerts_sent
    }

# =====================
# HEALTH CHECK ENDPOINT
# =====================
@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check MongoDB connection
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check LLM key
    llm_key_status = "configured" if os.environ.get('EMERGENT_LLM_KEY') else "not configured"
    
    # Check Twilio
    twilio_status = "configured" if os.environ.get('TWILIO_ACCOUNT_SID') and os.environ.get('TWILIO_ACCOUNT_SID') != 'your_twilio_account_sid' else "not configured (SMS alerts disabled)"
    
    # Check Google Speech-to-Text
    transcription_status = "configured" if speech_client else "not configured"
    
    # Check Firebase for push notifications
    push_status = "configured" if firebase_app else "not configured"
    
    return {
        "status": "running",
        "version": "1.3.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "llm_api": llm_key_status,
            "sms_alerts": twilio_status,
            "transcription": transcription_status,
            "push_notifications": push_status
        }
    }

# =====================
# AUDIO TRANSCRIPTION SERVICE
# =====================
async def transcribe_audio(audio_content: bytes, language_code: str = "ro-RO") -> dict:
    """
    Transcribe audio using Google Cloud Speech-to-Text.
    
    Args:
        audio_content: Raw audio bytes
        language_code: Language code (ro-RO for Romanian, en-US for English, ru-RU for Russian)
    
    Returns:
        dict with 'transcript', 'confidence', 'language_detected'
    """
    if not speech_client:
        logger.error("Google Speech-to-Text client not initialized")
        return {
            "transcript": None,
            "error": "Transcription service not configured",
            "confidence": 0
        }
    
    try:
        # Configure audio - assuming phone call quality (8kHz mono)
        audio = speech.RecognitionAudio(content=audio_content)
        
        # Configure recognition - optimized for phone calls
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,  # Auto-detect
            sample_rate_hertz=16000,  # Standard for phone calls
            language_code=language_code,
            enable_automatic_punctuation=True,
            enable_word_time_offsets=False,
            model="default",  # Use default model for broader compatibility
        )
        
        # Perform transcription
        logger.info(f"Starting transcription with language: {language_code}")
        response = speech_client.recognize(config=config, audio=audio)
        
        # Combine all results
        full_transcript = ""
        total_confidence = 0
        result_count = 0
        
        for result in response.results:
            if result.alternatives:
                best_alternative = result.alternatives[0]
                full_transcript += best_alternative.transcript + " "
                total_confidence += best_alternative.confidence
                result_count += 1
        
        avg_confidence = (total_confidence / result_count * 100) if result_count > 0 else 0
        
        logger.info(f"Transcription complete: {len(full_transcript)} chars, confidence: {avg_confidence:.1f}%")
        
        return {
            "transcript": full_transcript.strip() if full_transcript else None,
            "confidence": round(avg_confidence, 1),
            "language_detected": language_code,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return {
            "transcript": None,
            "error": str(e),
            "confidence": 0
        }

async def transcribe_and_analyze_call(call_id: str, audio_content: bytes, user_language: str = "ro"):
    """
    Background task to transcribe audio and run scam analysis.
    """
    try:
        # Map user language to Google language code
        language_map = {
            "ro": "ro-RO",
            "en": "en-US",
            "ru": "ru-RU"
        }
        language_code = language_map.get(user_language, "ro-RO")
        
        # Step 1: Transcribe
        logger.info(f"Starting transcription for call {call_id}")
        transcription_result = await transcribe_audio(audio_content, language_code)
        
        if transcription_result.get("error"):
            await db.calls.update_one(
                {"id": call_id},
                {"$set": {
                    "transcript": f"[Transcription failed: {transcription_result['error']}]",
                    "transcription_error": transcription_result["error"]
                }}
            )
            return
        
        transcript = transcription_result.get("transcript", "")
        
        if not transcript:
            await db.calls.update_one(
                {"id": call_id},
                {"$set": {"transcript": "[No speech detected in recording]"}}
            )
            return
        
        # Update call with transcript
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {
                "transcript": transcript,
                "transcription_confidence": transcription_result.get("confidence", 0)
            }}
        )
        
        # Step 2: Run AI scam analysis
        logger.info(f"Starting scam analysis for call {call_id}")
        analysis_result = await analyze_transcript(transcript, user_language)
        
        # Update call with analysis
        update_data = {
            "scam_score": analysis_result.confidence,
            "scam_type": analysis_result.scam_type.value,
            "detected_keywords": analysis_result.detected_keywords,
            "explanation": analysis_result.explanation,
            "explanation_ro": analysis_result.explanation_ro,
            "analyzed": True
        }
        
        await db.calls.update_one({"id": call_id}, {"$set": update_data})
        logger.info(f"Analysis complete for call {call_id}: scam_score={analysis_result.confidence}")
        
        # Step 3: Trigger alert if scam detected
        if analysis_result.is_scam and analysis_result.confidence > 70:
            call = await db.calls.find_one({"id": call_id})
            if call:
                await trigger_alert(call_id, call["user_id"])
        
    except Exception as e:
        logger.error(f"Error in transcribe_and_analyze_call: {str(e)}")
        await db.calls.update_one(
            {"id": call_id},
            {"$set": {"transcription_error": str(e)}}
        )

# =====================
# AUDIO UPLOAD ENDPOINT (For Flutter App)
# =====================
@api_router.post("/calls/upload-audio", response_model=AudioUploadResponse)
async def upload_call_audio(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    caller_number: str = Form(...),
    duration_seconds: int = Form(...),
    audio_file: UploadFile = File(...)
):
    """
    Upload audio recording from Flutter app.
    Accepts M4A/MP3/WAV audio files.
    Automatically triggers transcription and AI analysis.
    """
    # Validate user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file type
    allowed_types = ["audio/mp4", "audio/mpeg", "audio/wav", "audio/m4a", "audio/x-m4a", "audio/webm", "audio/ogg"]
    if audio_file.content_type and audio_file.content_type not in allowed_types:
        # Also allow by extension
        if not audio_file.filename.endswith(('.m4a', '.mp3', '.wav', '.mp4', '.webm', '.ogg')):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid audio format. Allowed: M4A, MP3, WAV, WebM, OGG. Got: {audio_file.content_type}"
            )
    
    # Ignore very short calls (< 5 seconds) - likely wrong numbers
    if duration_seconds < 5:
        return AudioUploadResponse(
            call_id="",
            status="ignored",
            message="Call too short (< 5 seconds), likely wrong number"
        )
    
    # Read audio content
    audio_content = await audio_file.read()
    audio_base64 = base64.b64encode(audio_content).decode('utf-8')
    
    # Create call record
    call = CallRecord(
        user_id=user_id,
        caller_number=caller_number,
        duration_seconds=duration_seconds,
        recording_base64=audio_base64,
        analyzed=False
    )
    await db.calls.insert_one(call.dict())
    logger.info(f"Uploaded audio for call: {call.id}, size: {len(audio_content)} bytes")
    
    # Set initial transcript status
    await db.calls.update_one(
        {"id": call.id},
        {"$set": {"transcript": "[Transcription in progress...]"}}
    )
    
    # Schedule transcription and analysis in background
    user_language = user.get("language", "ro")
    background_tasks.add_task(transcribe_and_analyze_call, call.id, audio_content, user_language)
    
    return AudioUploadResponse(
        call_id=call.id,
        status="processing",
        message="Audio uploaded. Transcription and analysis in progress."
    )

# =====================
# DIRECT TRANSCRIPTION ENDPOINT
# =====================
@api_router.post("/transcribe")
async def transcribe_audio_file(
    audio_file: UploadFile = File(...),
    language: str = Form(default="ro")
):
    """
    Directly transcribe an audio file without creating a call record.
    Useful for testing transcription.
    """
    if not speech_client:
        raise HTTPException(status_code=503, detail="Transcription service not available")
    
    audio_content = await audio_file.read()
    
    language_map = {"ro": "ro-RO", "en": "en-US", "ru": "ru-RU"}
    language_code = language_map.get(language, "ro-RO")
    
    result = await transcribe_audio(audio_content, language_code)
    
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {
        "transcript": result.get("transcript"),
        "confidence": result.get("confidence"),
        "language": language_code
    }

# =====================
# MANUAL TRANSCRIPT SUBMISSION (For testing without Whisper)
# =====================
@api_router.post("/calls/{call_id}/submit-transcript")
async def submit_transcript(
    call_id: str,
    transcript: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    """
    Submit transcript for a call (manual or from external transcription service).
    Triggers AI scam analysis automatically.
    """
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Update transcript
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"transcript": transcript}}
    )
    
    # Get user language
    user = await db.users.find_one({"id": call["user_id"]})
    language = user.get("language", "en") if user else "en"
    
    # Analyze transcript
    result = await analyze_transcript(transcript, language)
    
    update_data = {
        "scam_score": result.confidence,
        "scam_type": result.scam_type.value,
        "detected_keywords": result.detected_keywords,
        "explanation": result.explanation,
        "explanation_ro": result.explanation_ro,
        "analyzed": True
    }
    
    await db.calls.update_one({"id": call_id}, {"$set": update_data})
    
    # Trigger alert if scam detected
    if result.is_scam and result.confidence > 70:
        await trigger_alert(call_id, call["user_id"])
    
    updated_call = await db.calls.find_one({"id": call_id})
    return CallRecord(**updated_call)

# =====================
# DEVICE REGISTRATION (For Push Notifications)
# =====================
@api_router.post("/users/{user_id}/device")
async def register_device(user_id: str, device_info: DeviceInfo):
    """Register device for push notifications"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"device_info": device_info.dict(), "updated_at": datetime.utcnow()}}
    )
    
    logger.info(f"Registered device for user {user_id}: {device_info.device_id}")
    return {"status": "success", "message": "Device registered for push notifications"}

# =====================
# DELETE USER ACCOUNT
# =====================
@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """
    Delete user account and all associated data.
    This is irreversible and complies with GDPR requirements.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete all call records for this user
    deleted_calls = await db.calls.delete_many({"user_id": user_id})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"Deleted user {user_id} and {deleted_calls.deleted_count} call records")
    
    return {
        "status": "success",
        "message": "Account deleted successfully",
        "deleted_calls": deleted_calls.deleted_count
    }

# =====================
# DATA CLEANUP (Auto-delete old recordings per PRD - 30 days)
# =====================
@api_router.post("/admin/cleanup-old-recordings")
async def cleanup_old_recordings(days: int = Query(default=30, ge=1, le=365)):
    """
    Delete recordings older than specified days.
    Default: 30 days (as per PRD compliance requirements).
    This endpoint should be called by a scheduled job.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Find old calls with recordings
    old_calls = await db.calls.find({
        "timestamp": {"$lt": cutoff_date},
        "recording_base64": {"$ne": None}
    }).to_list(1000)
    
    # Remove recordings but keep metadata
    for call in old_calls:
        await db.calls.update_one(
            {"id": call["id"]},
            {"$set": {"recording_base64": None}}
        )
    
    logger.info(f"Cleaned up {len(old_calls)} old recordings (older than {days} days)")
    
    return {
        "status": "success",
        "cleaned_recordings": len(old_calls),
        "cutoff_date": cutoff_date.isoformat()
    }

# =====================
# CHECK IF NUMBER IS KNOWN CONTACT
# =====================
@api_router.get("/users/{user_id}/check-number/{phone_number}")
async def check_known_number(user_id: str, phone_number: str):
    """
    Check if a phone number is in user's contacts.
    Flutter app uses this to decide whether to record a call.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean the phone number for comparison
    cleaned_number = re.sub(r'[\s\-\(\)]', '', phone_number)
    
    # Check if number matches any emergency contact
    for contact in user.get("emergency_contacts", []):
        contact_number = re.sub(r'[\s\-\(\)]', '', contact.get("phone", ""))
        if cleaned_number.endswith(contact_number[-8:]) or contact_number.endswith(cleaned_number[-8:]):
            return {
                "is_known": True,
                "contact_name": contact.get("name"),
                "should_record": False
            }
    
    # Unknown caller: notify trusted contacts via SMS (parallel action)
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    if twilio_sid and twilio_sid != 'your_twilio_account_sid' and user.get("emergency_contacts"):
        try:
            from twilio.rest import Client
            twilio_token = os.environ.get('TWILIO_AUTH_TOKEN')
            twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
            twilio_client = Client(twilio_sid, twilio_token)

            user_name = user.get('name') or user['phone']
            user_phone = user['phone']
            message_body = f"⚠️ Unknown caller {phone_number} contacted {user_name} ({user_phone}), could be a Fraude! StopFrauda"

            for contact in user["emergency_contacts"]:
                try:
                    twilio_client.messages.create(
                        body=message_body,
                        from_=twilio_phone,
                        to=contact["phone"]
                    )
                    logger.info(f"Unknown-caller SMS sent to {contact['phone']}")
                except Exception as e:
                    logger.error(f"Failed to send unknown-caller SMS to {contact.get('phone')}: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio for unknown-caller SMS: {e}")

    return {
        "is_known": False,
        "contact_name": None,
        "should_record": True
    }

# =====================
# ADMIN: SCAM KNOWLEDGE BASE
# =====================

# Admin authentication dependency
async def require_admin(admin_token: Optional[str] = Cookie(default=None)):
    """Require valid admin session for protected routes"""
    if not admin_token or not verify_session(admin_token):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return admin_token

# Admin Login Page
@api_router.get("/admin/login", response_class=HTMLResponse)
async def admin_login_page(error: Optional[str] = None):
    """Admin login page"""
    error_html = f'<div class="error">{error}</div>' if error else ''
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StopFrauda Admin - Login</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }}
        .login-container {{
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            text-align: center;
        }}
        .logo {{
            font-size: 48px;
            margin-bottom: 10px;
        }}
        h1 {{
            font-size: 24px;
            margin-bottom: 8px;
        }}
        .subtitle {{
            color: rgba(255,255,255,0.6);
            margin-bottom: 30px;
            font-size: 14px;
        }}
        .form-group {{
            margin-bottom: 20px;
            text-align: left;
        }}
        label {{
            display: block;
            font-size: 12px;
            color: rgba(255,255,255,0.7);
            margin-bottom: 8px;
        }}
        input {{
            width: 100%;
            padding: 14px 16px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            background: rgba(0,0,0,0.3);
            color: #fff;
            font-size: 16px;
            transition: border-color 0.2s;
        }}
        input:focus {{
            outline: none;
            border-color: #4ade80;
        }}
        .btn {{
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            background: #4ade80;
            color: #000;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }}
        .btn:hover {{
            background: #22c55e;
        }}
        .error {{
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }}
        .footer {{
            margin-top: 30px;
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }}
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">🛡️</div>
        <h1>StopFrauda Admin</h1>
        <p class="subtitle">Enter your password to access the admin panel</p>
        
        {error_html}
        
        <form action="/api/admin/login" method="POST">
            <div class="form-group">
                <label for="password">Admin Password</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required autofocus>
            </div>
            <button type="submit" class="btn">🔐 Login</button>
        </form>
        
        <p class="footer">Protected admin area • StopFrauda v1.1</p>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

@api_router.post("/admin/login")
async def admin_login(response: Response, password: str = Form(...)):
    """Process admin login"""
    if verify_password(password):
        token = create_session()
        # Create redirect response
        redirect = RedirectResponse(url="/api/admin", status_code=303)
        redirect.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,
            max_age=86400,  # 24 hours
            samesite="lax"
        )
        logger.info("Admin logged in successfully")
        return redirect
    else:
        logger.warning("Failed admin login attempt")
        return RedirectResponse(url="/api/admin/login?error=Invalid+password", status_code=303)

@api_router.get("/admin/logout")
async def admin_logout(response: Response, admin_token: Optional[str] = Cookie(default=None)):
    """Admin logout"""
    if admin_token and admin_token in admin_sessions:
        del admin_sessions[admin_token]
    
    redirect = RedirectResponse(url="/api/admin/login", status_code=303)
    redirect.delete_cookie("admin_token")
    return redirect

@api_router.get("/admin/scam-examples")
async def list_scam_examples(
    admin_token: str = Depends(require_admin),
    scam_type: Optional[ScamType] = None,
    language: Optional[ScamExampleLanguage] = None,
    active_only: bool = True
):
    """List all scam examples in the knowledge base"""
    query = {}
    if scam_type:
        query["scam_type"] = scam_type.value
    if language:
        query["language"] = language.value
    if active_only:
        query["is_active"] = True
    
    examples = await db.scam_examples.find(query).sort("created_at", -1).to_list(1000)
    return [ScamExample(**ex) for ex in examples]

@api_router.post("/admin/scam-examples", response_model=ScamExample)
async def create_scam_example(example: ScamExampleCreate, admin_token: str = Depends(require_admin)):
    """Add a new scam example to the knowledge base"""
    new_example = ScamExample(**example.dict())
    await db.scam_examples.insert_one(new_example.dict())
    logger.info(f"Added scam example: {new_example.title} ({new_example.scam_type})")
    return new_example

@api_router.get("/admin/scam-examples/{example_id}", response_model=ScamExample)
async def get_scam_example(example_id: str, admin_token: str = Depends(require_admin)):
    """Get a specific scam example"""
    example = await db.scam_examples.find_one({"id": example_id})
    if not example:
        raise HTTPException(status_code=404, detail="Scam example not found")
    return ScamExample(**example)

@api_router.put("/admin/scam-examples/{example_id}", response_model=ScamExample)
async def update_scam_example(example_id: str, update: ScamExampleUpdate, admin_token: str = Depends(require_admin)):
    """Update a scam example"""
    example = await db.scam_examples.find_one({"id": example_id})
    if not example:
        raise HTTPException(status_code=404, detail="Scam example not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.scam_examples.update_one({"id": example_id}, {"$set": update_data})
    
    updated = await db.scam_examples.find_one({"id": example_id})
    return ScamExample(**updated)

@api_router.delete("/admin/scam-examples/{example_id}")
async def delete_scam_example(example_id: str, admin_token: str = Depends(require_admin)):
    """Delete a scam example from the knowledge base"""
    result = await db.scam_examples.delete_one({"id": example_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scam example not found")
    return {"status": "success", "message": "Scam example deleted"}

@api_router.get("/admin/scam-examples/stats/summary")
async def get_knowledge_base_stats(admin_token: str = Depends(require_admin)):
    """Get statistics about the knowledge base"""
    total = await db.scam_examples.count_documents({})
    active = await db.scam_examples.count_documents({"is_active": True})
    
    # Count by type
    by_type = {}
    for scam_type in ScamType:
        count = await db.scam_examples.count_documents({"scam_type": scam_type.value})
        if count > 0:
            by_type[scam_type.value] = count
    
    # Count by language
    by_language = {}
    for lang in ScamExampleLanguage:
        count = await db.scam_examples.count_documents({"language": lang.value})
        if count > 0:
            by_language[lang.value] = count
    
    return {
        "total_examples": total,
        "active_examples": active,
        "by_scam_type": by_type,
        "by_language": by_language
    }

# =====================
# ADMIN: USERS DASHBOARD API
# =====================
@api_router.get("/admin/users")
async def admin_list_users(
    admin_token: str = Depends(require_admin),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100)
):
    """List all users with their stats"""
    users = await db.users.find().skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    # Enrich with call stats
    enriched_users = []
    for user in users:
        total_calls = await db.calls.count_documents({"user_id": user["id"]})
        scam_calls = await db.calls.count_documents({"user_id": user["id"], "scam_score": {"$gt": 70}})
        
        enriched_users.append({
            "id": user["id"],
            "phone": user["phone"],
            "language": user.get("language", "en"),
            "emergency_contacts_count": len(user.get("emergency_contacts", [])),
            "has_fcm_token": bool(user.get("device_info", {}).get("fcm_token") if isinstance(user.get("device_info"), dict) else False),
            "onboarding_completed": user.get("onboarding_completed", False),
            "is_active": user.get("is_active", True),
            "total_calls": total_calls,
            "scam_calls": scam_calls,
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        })
    
    total_users = await db.users.count_documents({})
    
    return {
        "users": enriched_users,
        "total": total_users,
        "skip": skip,
        "limit": limit
    }

@api_router.get("/admin/users/{user_id}")
async def admin_get_user_detail(user_id: str, admin_token: str = Depends(require_admin)):
    """Get detailed user info including all calls"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all calls for this user
    calls = await db.calls.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)
    
    # Calculate stats
    total_calls = len(calls)
    scam_calls = sum(1 for c in calls if c.get("scam_score", 0) > 70)
    alerts_sent = sum(1 for c in calls if c.get("alerted", False))
    
    return {
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "language": user.get("language", "en"),
            "emergency_contacts": user.get("emergency_contacts", []),
            "device_info": user.get("device_info"),
            "onboarding_completed": user.get("onboarding_completed", False),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        },
        "stats": {
            "total_calls": total_calls,
            "scam_calls": scam_calls,
            "legit_calls": total_calls - scam_calls,
            "alerts_sent": alerts_sent
        },
        "calls": [{
            "id": c["id"],
            "caller_number": c.get("caller_number"),
            "scam_score": c.get("scam_score", 0),
            "scam_type": c.get("scam_type"),
            "duration_seconds": c.get("duration_seconds", 0),
            "alerted": c.get("alerted", False),
            "timestamp": c.get("timestamp")
        } for c in calls]
    }

@api_router.get("/admin/dashboard/stats")
async def admin_dashboard_stats(admin_token: str = Depends(require_admin)):
    """Get overall dashboard statistics"""
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    total_calls = await db.calls.count_documents({})
    scam_calls = await db.calls.count_documents({"scam_score": {"$gt": 70}})
    alerts_sent = await db.calls.count_documents({"alerted": True})
    
    # Users with FCM tokens (can receive push)
    users_with_fcm = await db.users.count_documents({"device_info.fcm_token": {"$exists": True, "$ne": None}})
    
    # Scam types breakdown
    scam_types = {}
    for scam_type in ["bank_impersonation", "police_scam", "utility_scam", "family_emergency", "lottery", "tech_support"]:
        count = await db.calls.count_documents({"scam_type": scam_type, "scam_score": {"$gt": 70}})
        if count > 0:
            scam_types[scam_type] = count
    
    # Recent activity (last 24h)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_calls = await db.calls.count_documents({"timestamp": {"$gte": yesterday}})
    recent_scams = await db.calls.count_documents({"timestamp": {"$gte": yesterday}, "scam_score": {"$gt": 70}})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "with_push_enabled": users_with_fcm
        },
        "calls": {
            "total": total_calls,
            "scam_detected": scam_calls,
            "legitimate": total_calls - scam_calls,
            "alerts_sent": alerts_sent
        },
        "scam_types": scam_types,
        "last_24h": {
            "calls": recent_calls,
            "scams": recent_scams
        }
    }

# =====================
# ADMIN WEB INTERFACE
# =====================

@api_router.get("/admin/users-dashboard", response_class=HTMLResponse)
async def admin_users_dashboard(admin_token: Optional[str] = Cookie(default=None)):
    """Admin users dashboard page"""
    if not admin_token or not verify_session(admin_token):
        return RedirectResponse(url="/api/admin/login", status_code=303)
    
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StopFrauda Admin - Users Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        h1 { font-size: 28px; display: flex; align-items: center; gap: 10px; }
        .nav-links { display: flex; gap: 15px; align-items: center; }
        .nav-links a {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .nav-links a:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .nav-links a.active { background: rgba(74,222,128,0.2); color: #4ade80; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 25px;
            text-align: center;
        }
        .stat-value { font-size: 42px; font-weight: bold; color: #4ade80; }
        .stat-value.warning { color: #fbbf24; }
        .stat-value.danger { color: #ef4444; }
        .stat-label { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 8px; }
        .section { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; margin-bottom: 20px; }
        .section-title { font-size: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; font-weight: 600; }
        tr:hover { background: rgba(255,255,255,0.03); }
        .badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-success { background: rgba(74,222,128,0.2); color: #4ade80; }
        .badge-warning { background: rgba(251,191,36,0.2); color: #fbbf24; }
        .badge-danger { background: rgba(239,68,68,0.2); color: #ef4444; }
        .badge-info { background: rgba(96,165,250,0.2); color: #60a5fa; }
        .badge-gray { background: rgba(107,114,128,0.2); color: #9ca3af; }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary { background: #4ade80; color: #000; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
        .btn-danger { background: #ef4444; color: #fff; }
        .user-phone { font-family: monospace; font-weight: 600; }
        .mini-chart {
            display: flex;
            gap: 2px;
            height: 20px;
            align-items: flex-end;
        }
        .mini-chart-bar {
            width: 8px;
            background: #4ade80;
            border-radius: 2px;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active { display: flex; }
        .modal-content {
            background: #1a1a2e;
            border-radius: 16px;
            padding: 30px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .modal-close {
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
        }
        .call-list { max-height: 300px; overflow-y: auto; }
        .call-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .scam-types-chart { display: flex; gap: 10px; flex-wrap: wrap; }
        .scam-type-item {
            background: rgba(0,0,0,0.2);
            padding: 10px 15px;
            border-radius: 8px;
            text-align: center;
        }
        .scam-type-count { font-size: 24px; font-weight: bold; color: #ef4444; }
        .scam-type-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.5); }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>👥 Users Dashboard</h1>
            <div class="nav-links">
                <a href="/api/admin">📚 Knowledge Base</a>
                <a href="/api/admin/users-dashboard" class="active">👥 Users</a>
                <a href="/api/admin/logout">🚪 Logout</a>
            </div>
        </header>

        <!-- Overview Stats -->
        <div class="stats-grid" id="overview-stats">
            <div class="stat-card">
                <div class="stat-value" id="stat-total-users">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-active-users">-</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-total-calls">-</div>
                <div class="stat-label">Total Calls</div>
            </div>
            <div class="stat-card">
                <div class="stat-value danger" id="stat-scam-calls">-</div>
                <div class="stat-label">Scams Detected</div>
            </div>
            <div class="stat-card">
                <div class="stat-value warning" id="stat-alerts-sent">-</div>
                <div class="stat-label">Alerts Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-push-enabled">-</div>
                <div class="stat-label">Push Enabled</div>
            </div>
        </div>

        <!-- Scam Types Breakdown -->
        <div class="section">
            <h2 class="section-title">🚨 Scam Types Detected</h2>
            <div class="scam-types-chart" id="scam-types-chart">
                <div class="empty-state">Loading...</div>
            </div>
        </div>

        <!-- Users Table -->
        <div class="section">
            <h2 class="section-title">📋 Registered Users</h2>
            <table>
                <thead>
                    <tr>
                        <th>Phone</th>
                        <th>Language</th>
                        <th>Contacts</th>
                        <th>Calls</th>
                        <th>Scams</th>
                        <th>Push</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="users-table">
                    <tr><td colspan="8" class="empty-state">Loading users...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- User Detail Modal -->
    <div class="modal" id="user-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">User Details</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div id="modal-body">Loading...</div>
        </div>
    </div>

    <script>
        const API_BASE = '/api';
        
        async function handleResponse(res) {
            if (res.status === 401) {
                window.location.href = '/api/admin/login';
                throw new Error('Unauthorized');
            }
            return res;
        }
        
        async function loadDashboardStats() {
            try {
                const res = await fetch(`${API_BASE}/admin/dashboard/stats`);
                await handleResponse(res);
                const data = await res.json();
                
                document.getElementById('stat-total-users').textContent = data.users.total;
                document.getElementById('stat-active-users').textContent = data.users.active;
                document.getElementById('stat-total-calls').textContent = data.calls.total;
                document.getElementById('stat-scam-calls').textContent = data.calls.scam_detected;
                document.getElementById('stat-alerts-sent').textContent = data.calls.alerts_sent;
                document.getElementById('stat-push-enabled').textContent = data.users.with_push_enabled;
                
                // Render scam types
                const scamTypesContainer = document.getElementById('scam-types-chart');
                if (Object.keys(data.scam_types).length === 0) {
                    scamTypesContainer.innerHTML = '<div class="empty-state">No scams detected yet 🎉</div>';
                } else {
                    scamTypesContainer.innerHTML = Object.entries(data.scam_types)
                        .map(([type, count]) => `
                            <div class="scam-type-item">
                                <div class="scam-type-count">${count}</div>
                                <div class="scam-type-label">${formatScamType(type)}</div>
                            </div>
                        `).join('');
                }
            } catch (e) {
                console.error('Failed to load stats:', e);
            }
        }
        
        async function loadUsers() {
            try {
                const res = await fetch(`${API_BASE}/admin/users`);
                await handleResponse(res);
                const data = await res.json();
                
                const tbody = document.getElementById('users-table');
                
                if (data.users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No users registered yet</td></tr>';
                    return;
                }
                
                tbody.innerHTML = data.users.map(user => `
                    <tr>
                        <td class="user-phone">${user.phone}</td>
                        <td><span class="badge badge-info">${user.language.toUpperCase()}</span></td>
                        <td>${user.emergency_contacts_count}</td>
                        <td>${user.total_calls}</td>
                        <td>${user.scam_calls > 0 ? `<span class="badge badge-danger">${user.scam_calls}</span>` : '0'}</td>
                        <td>${user.has_fcm_token ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-gray">✗</span>'}</td>
                        <td>${user.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="viewUser('${user.id}')">View</button>
                        </td>
                    </tr>
                `).join('');
            } catch (e) {
                console.error('Failed to load users:', e);
            }
        }
        
        async function viewUser(userId) {
            document.getElementById('user-modal').classList.add('active');
            document.getElementById('modal-body').innerHTML = 'Loading...';
            
            try {
                const res = await fetch(`${API_BASE}/admin/users/${userId}`);
                await handleResponse(res);
                const data = await res.json();
                
                document.getElementById('modal-title').textContent = `User: ${data.user.phone}`;
                document.getElementById('modal-body').innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <h4 style="margin-bottom: 10px;">📱 User Info</h4>
                            <p><strong>Phone:</strong> ${data.user.phone}</p>
                            <p><strong>Language:</strong> ${data.user.language.toUpperCase()}</p>
                            <p><strong>Status:</strong> ${data.user.is_active ? '✅ Active' : '❌ Inactive'}</p>
                            <p><strong>Onboarding:</strong> ${data.user.onboarding_completed ? '✅ Complete' : '⏳ Pending'}</p>
                            <p><strong>Push:</strong> ${data.user.device_info?.fcm_token ? '✅ Enabled' : '❌ Not registered'}</p>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 10px;">📊 Stats</h4>
                            <p><strong>Total Calls:</strong> ${data.stats.total_calls}</p>
                            <p><strong>Scam Calls:</strong> <span style="color: #ef4444;">${data.stats.scam_calls}</span></p>
                            <p><strong>Legit Calls:</strong> <span style="color: #4ade80;">${data.stats.legit_calls}</span></p>
                            <p><strong>Alerts Sent:</strong> ${data.stats.alerts_sent}</p>
                        </div>
                    </div>
                    
                    <h4 style="margin-bottom: 10px;">👨‍👩‍👧 Emergency Contacts (${data.user.emergency_contacts.length})</h4>
                    ${data.user.emergency_contacts.length > 0 ? `
                        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            ${data.user.emergency_contacts.map(c => `
                                <p>• ${c.name}: ${c.phone}</p>
                            `).join('')}
                        </div>
                    ` : '<p style="color: rgba(255,255,255,0.5); margin-bottom: 20px;">No emergency contacts</p>'}
                    
                    <h4 style="margin-bottom: 10px;">📞 Recent Calls</h4>
                    <div class="call-list">
                        ${data.calls.length > 0 ? data.calls.map(call => `
                            <div class="call-item">
                                <div>
                                    <strong>${call.caller_number || 'Unknown'}</strong>
                                    <br><small style="color: rgba(255,255,255,0.5);">${formatScamType(call.scam_type || 'unknown')}</small>
                                </div>
                                <div style="text-align: right;">
                                    <span class="badge ${call.scam_score > 70 ? 'badge-danger' : 'badge-success'}">${call.scam_score}%</span>
                                    ${call.alerted ? '<span class="badge badge-warning" style="margin-left: 5px;">Alerted</span>' : ''}
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state">No calls recorded</div>'}
                    </div>
                `;
            } catch (e) {
                document.getElementById('modal-body').innerHTML = '<div class="empty-state">Failed to load user details</div>';
            }
        }
        
        function closeModal() {
            document.getElementById('user-modal').classList.remove('active');
        }
        
        function formatScamType(type) {
            const labels = {
                'bank_impersonation': '🏦 Bank',
                'police_scam': '👮 Police',
                'utility_scam': '⚡ Utility',
                'family_emergency': '👨‍👩‍👧 Family',
                'lottery': '🎰 Lottery',
                'tech_support': '💻 Tech Support',
                'legitimate': '✅ Legit',
                'unknown': '❓ Unknown'
            };
            return labels[type] || type;
        }
        
        // Close modal on outside click
        document.getElementById('user-modal').addEventListener('click', (e) => {
            if (e.target.id === 'user-modal') closeModal();
        });
        
        // Initial load
        loadDashboardStats();
        loadUsers();
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

@api_router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(admin_token: Optional[str] = Cookie(default=None)):
    """Admin dashboard for managing the scam knowledge base"""
    # Check if authenticated
    if not admin_token or not verify_session(admin_token):
        return RedirectResponse(url="/api/admin/login", status_code=303)
    
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StopFrauda Admin - Knowledge Base</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        h1 { font-size: 28px; display: flex; align-items: center; gap: 10px; }
        .nav-links { display: flex; gap: 15px; align-items: center; }
        .nav-links a {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .nav-links a:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .nav-links a.active { background: rgba(74,222,128,0.2); color: #4ade80; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .stat-value { font-size: 36px; font-weight: bold; color: #4ade80; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 5px; }
        .section { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; margin-bottom: 20px; }
        .section-title { font-size: 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { margin-bottom: 15px; }
        .form-group.full { grid-column: 1 / -1; }
        label { display: block; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 5px; }
        input, select, textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            background: rgba(0,0,0,0.3);
            color: #fff;
            font-size: 14px;
        }
        textarea { min-height: 120px; resize: vertical; font-family: monospace; }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #4ade80;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary { background: #4ade80; color: #000; }
        .btn-primary:hover { background: #22c55e; }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
        .examples-list { margin-top: 20px; }
        .example-card {
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #4ade80;
        }
        .example-card.inactive { border-left-color: #6b7280; opacity: 0.6; }
        .example-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
        .example-title { font-weight: 600; font-size: 16px; }
        .example-meta { display: flex; gap: 10px; margin-bottom: 10px; }
        .badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-type { background: rgba(74,222,128,0.2); color: #4ade80; }
        .badge-lang { background: rgba(96,165,250,0.2); color: #60a5fa; }
        .example-transcript {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            max-height: 150px;
            overflow-y: auto;
        }
        .example-keywords { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
        .keyword { background: rgba(251,191,36,0.2); color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .example-actions { margin-top: 15px; display: flex; gap: 10px; }
        .filters { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-group { display: flex; align-items: center; gap: 8px; }
        .filter-group select { width: auto; min-width: 150px; }
        .empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.5); }
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: #fff;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            z-index: 1000;
        }
        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Knowledge Base</h1>
            <div class="nav-links">
                <a href="/api/admin" class="active">📚 Knowledge Base</a>
                <a href="/api/admin/users-dashboard">👥 Users</a>
                <a href="/api/admin/logout">🚪 Logout</a>
            </div>
        </header>

        <!-- Stats -->
        <div class="stats-grid" id="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="stat-total">-</div>
                <div class="stat-label">Total Examples</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-active">-</div>
                <div class="stat-label">Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-ro">-</div>
                <div class="stat-label">Romanian</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-en">-</div>
                <div class="stat-label">English</div>
            </div>
        </div>

        <!-- Add New Example -->
        <div class="section">
            <h2 class="section-title">📝 Add New Scam Example</h2>
            <form id="add-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="title" placeholder="e.g., Bank Card Block Scam" required>
                    </div>
                    <div class="form-group">
                        <label>Scam Type *</label>
                        <select id="scam_type" required>
                            <option value="bank_impersonation">🏦 Bank Impersonation</option>
                            <option value="police_scam">👮 Police Scam</option>
                            <option value="utility_scam">⚡ Utility Scam</option>
                            <option value="family_emergency">👨‍👩‍👧 Family Emergency</option>
                            <option value="lottery">🎰 Lottery</option>
                            <option value="tech_support">💻 Tech Support</option>
                            <option value="unknown">❓ Unknown/Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Language *</label>
                        <select id="language" required>
                            <option value="ro">🇷🇴 Romanian</option>
                            <option value="en">🇬🇧 English</option>
                            <option value="ru">🇷🇺 Russian</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Keywords (comma separated)</label>
                        <input type="text" id="keywords" placeholder="urgent, block card, verify identity">
                    </div>
                    <div class="form-group full">
                        <label>Scam Transcript / Text *</label>
                        <textarea id="transcript" placeholder="Paste the scam call transcript or message here..." required></textarea>
                    </div>
                    <div class="form-group full">
                        <label>Admin Notes (optional)</label>
                        <input type="text" id="notes" placeholder="Any additional notes about this scam pattern">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">➕ Add to Knowledge Base</button>
            </form>
        </div>

        <!-- Examples List -->
        <div class="section">
            <h2 class="section-title">📚 Knowledge Base Examples</h2>
            
            <div class="filters">
                <div class="filter-group">
                    <label>Type:</label>
                    <select id="filter-type">
                        <option value="">All Types</option>
                        <option value="bank_impersonation">🏦 Bank Impersonation</option>
                        <option value="police_scam">👮 Police Scam</option>
                        <option value="utility_scam">⚡ Utility Scam</option>
                        <option value="family_emergency">👨‍👩‍👧 Family Emergency</option>
                        <option value="lottery">🎰 Lottery</option>
                        <option value="tech_support">💻 Tech Support</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Language:</label>
                    <select id="filter-lang">
                        <option value="">All Languages</option>
                        <option value="ro">🇷🇴 Romanian</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="ru">🇷🇺 Russian</option>
                    </select>
                </div>
                <button class="btn btn-secondary" onclick="loadExamples()">🔄 Refresh</button>
            </div>

            <div class="examples-list" id="examples-list">
                <div class="empty-state">Loading...</div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = '/api';
        
        // Handle 401 unauthorized - redirect to login
        async function handleResponse(res) {
            if (res.status === 401) {
                window.location.href = '/api/admin/login';
                throw new Error('Unauthorized');
            }
            return res;
        }
        
        // Load stats
        async function loadStats() {
            try {
                const res = await fetch(`${API_BASE}/admin/scam-examples/stats/summary`);
                await handleResponse(res);
                const data = await res.json();
                document.getElementById('stat-total').textContent = data.total_examples;
                document.getElementById('stat-active').textContent = data.active_examples;
                document.getElementById('stat-ro').textContent = data.by_language?.ro || 0;
                document.getElementById('stat-en').textContent = data.by_language?.en || 0;
            } catch (e) {
                console.error('Failed to load stats:', e);
            }
        }

        // Load examples
        async function loadExamples() {
            const type = document.getElementById('filter-type').value;
            const lang = document.getElementById('filter-lang').value;
            
            let url = `${API_BASE}/admin/scam-examples?active_only=false`;
            if (type) url += `&scam_type=${type}`;
            if (lang) url += `&language=${lang}`;
            
            try {
                const res = await fetch(url);
                await handleResponse(res);
                const examples = await res.json();
                renderExamples(examples);
            } catch (e) {
                console.error('Failed to load examples:', e);
                document.getElementById('examples-list').innerHTML = '<div class="empty-state">Failed to load examples</div>';
            }
        }

        function renderExamples(examples) {
            const container = document.getElementById('examples-list');
            
            if (examples.length === 0) {
                container.innerHTML = '<div class="empty-state">No scam examples yet. Add your first one above! ☝️</div>';
                return;
            }
            
            container.innerHTML = examples.map(ex => `
                <div class="example-card ${ex.is_active ? '' : 'inactive'}">
                    <div class="example-header">
                        <div class="example-title">${escapeHtml(ex.title)}</div>
                        <span style="font-size: 11px; color: rgba(255,255,255,0.4);">
                            ${new Date(ex.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="example-meta">
                        <span class="badge badge-type">${getTypeLabel(ex.scam_type)}</span>
                        <span class="badge badge-lang">${getLangLabel(ex.language)}</span>
                        ${!ex.is_active ? '<span class="badge" style="background:rgba(107,114,128,0.3);color:#9ca3af;">Inactive</span>' : ''}
                    </div>
                    <div class="example-transcript">${escapeHtml(ex.transcript)}</div>
                    ${ex.keywords?.length ? `
                        <div class="example-keywords">
                            ${ex.keywords.map(k => `<span class="keyword">${escapeHtml(k)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${ex.notes ? `<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,0.5);">📝 ${escapeHtml(ex.notes)}</div>` : ''}
                    <div class="example-actions">
                        <button class="btn btn-secondary" onclick="toggleActive('${ex.id}', ${!ex.is_active})">
                            ${ex.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                        </button>
                        <button class="btn btn-danger" onclick="deleteExample('${ex.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
        }

        function getTypeLabel(type) {
            const labels = {
                'bank_impersonation': '🏦 Bank',
                'police_scam': '👮 Police',
                'utility_scam': '⚡ Utility',
                'family_emergency': '👨‍👩‍👧 Family',
                'lottery': '🎰 Lottery',
                'tech_support': '💻 Tech',
                'unknown': '❓ Unknown'
            };
            return labels[type] || type;
        }

        function getLangLabel(lang) {
            const labels = { 'ro': '🇷🇴 RO', 'en': '🇬🇧 EN', 'ru': '🇷🇺 RU' };
            return labels[lang] || lang;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        // Add example
        document.getElementById('add-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const keywords = document.getElementById('keywords').value
                .split(',')
                .map(k => k.trim())
                .filter(k => k);
            
            const data = {
                title: document.getElementById('title').value,
                scam_type: document.getElementById('scam_type').value,
                language: document.getElementById('language').value,
                transcript: document.getElementById('transcript').value,
                keywords: keywords,
                notes: document.getElementById('notes').value || null
            };
            
            try {
                const res = await fetch(`${API_BASE}/admin/scam-examples`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (res.ok) {
                    showToast('✓ Scam example added to knowledge base!', 'success');
                    document.getElementById('add-form').reset();
                    loadStats();
                    loadExamples();
                } else {
                    const err = await res.json();
                    showToast('Error: ' + (err.detail || 'Failed to add'), 'error');
                }
            } catch (e) {
                showToast('Network error: ' + e.message, 'error');
            }
        });

        async function toggleActive(id, newState) {
            try {
                const res = await fetch(`${API_BASE}/admin/scam-examples/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: newState })
                });
                
                if (res.ok) {
                    showToast(newState ? '✓ Example activated' : '✓ Example deactivated', 'success');
                    loadStats();
                    loadExamples();
                }
            } catch (e) {
                showToast('Error updating example', 'error');
            }
        }

        async function deleteExample(id) {
            if (!confirm('Are you sure you want to delete this example?')) return;
            
            try {
                const res = await fetch(`${API_BASE}/admin/scam-examples/${id}`, {
                    method: 'DELETE'
                });
                
                if (res.ok) {
                    showToast('✓ Example deleted', 'success');
                    loadStats();
                    loadExamples();
                }
            } catch (e) {
                showToast('Error deleting example', 'error');
            }
        }

        function showToast(message, type) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // Filter change listeners
        document.getElementById('filter-type').addEventListener('change', loadExamples);
        document.getElementById('filter-lang').addEventListener('change', loadExamples);

        // Initial load
        loadStats();
        loadExamples();
        document.getElementById('last-updated').textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

# =====================
# PRIVACY POLICY PAGE
# =====================
@api_router.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    """Public privacy policy page required by Google Play"""
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StopFrauda - Privacy Policy</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.7; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; padding: 48px 24px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .header p { opacity: 0.85; font-size: 15px; }
        .container { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
        h2 { font-size: 20px; font-weight: 700; color: #4f46e5; margin: 32px 0 12px; }
        p, li { font-size: 15px; color: #374151; margin-bottom: 10px; }
        ul { padding-left: 24px; margin-bottom: 16px; }
        .update { text-align: center; color: #6b7280; font-size: 13px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>StopFrauda Privacy Policy</h1>
        <p>Your privacy matters to us</p>
    </div>
    <div class="container">
        <p><strong>Effective Date:</strong> March 3, 2026</p>

        <h2>1. Introduction</h2>
        <p>StopFrauda ("we", "our", "the App") is an AI-powered scam call detection application designed to protect users in Moldova from fraudulent phone calls. This Privacy Policy explains what data we collect, why we collect it, and how we handle it.</p>

        <h2>2. Data We Collect</h2>
        <p>To provide our scam-detection service, the App may collect or access the following:</p>
        <ul>
            <li><strong>Microphone / Audio Recording (RECORD_AUDIO):</strong> During phone calls, the App may record audio in short segments (up to 30 seconds) for real-time scam analysis. Audio is transmitted securely to our server, analyzed by AI, and is <strong>not stored permanently</strong>. Recordings are discarded after analysis is complete.</li>
            <li><strong>Contacts (READ_CONTACTS):</strong> With your permission, the App reads your contact list so you can select trusted emergency contacts who will be alerted if a scam is detected. We do not upload or store your full contact list on our servers.</li>
            <li><strong>Phone Number:</strong> Your phone number is used to create your account and identify you within the service.</li>
            <li><strong>Emergency Contact Details:</strong> The names, phone numbers, and email addresses of contacts you explicitly select are stored so we can send them scam alerts on your behalf.</li>
            <li><strong>Device Token (FCM):</strong> A Firebase Cloud Messaging token is stored to send you push notifications about detected scams.</li>
            <li><strong>Call Metadata:</strong> Caller number, call duration, and timestamps are stored to provide your call history and scam statistics.</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
            <li><strong>Scam Detection:</strong> Audio recordings are analyzed in real-time using AI to determine if a phone call is a scam.</li>
            <li><strong>Alerting:</strong> When a scam is detected, we notify you via push notification and alert your selected emergency contacts via email and/or SMS.</li>
            <li><strong>Statistics:</strong> Call metadata is used to show you your personal protection dashboard (total calls analyzed, scams detected, etc.).</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>We do <strong>not</strong> sell, trade, or rent your personal data to third parties. Data may be shared only in these limited cases:</p>
        <ul>
            <li><strong>AI Analysis:</strong> Audio transcripts are sent to our AI provider (OpenAI) for scam analysis. No personally identifiable information is included in these requests.</li>
            <li><strong>Alert Delivery:</strong> Emergency contact details (email, phone) are used with email (Gmail SMTP) and SMS (Twilio) services solely to deliver scam alerts.</li>
            <li><strong>Push Notifications:</strong> Firebase Cloud Messaging is used to deliver push notifications to your device.</li>
        </ul>

        <h2>5. Data Storage &amp; Security</h2>
        <ul>
            <li>Your data is stored on secure servers with encrypted connections (HTTPS/TLS).</li>
            <li>Audio recordings are processed in real-time and are <strong>not permanently stored</strong>.</li>
            <li>Account data (phone number, emergency contacts, call history) is stored in a secure database for as long as you use the service.</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
            <li>Revoke microphone or contacts permissions at any time through your device settings.</li>
            <li>Request deletion of your account and all associated data by contacting us.</li>
            <li>Modify your emergency contacts at any time within the App.</li>
        </ul>

        <h2>7. Children's Privacy</h2>
        <p>StopFrauda is not intended for use by children under 13. We do not knowingly collect personal data from children.</p>

        <h2>8. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated effective date.</p>

        <h2>9. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy or your data, please contact us at:</p>
        <p><strong>Email:</strong> revulet.oleg@gmail.com</p>

        <div class="update">Last updated: March 3, 2026</div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# CODE DOWNLOAD ENDPOINT (Added after router inclusion)
# =====================
from fastapi.responses import FileResponse

@app.get("/api/download/code")
async def download_code():
    """Download the StopFrauda source code as a ZIP file"""
    zip_path = ROOT_DIR / "stopfrauda_code.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP file not found")
    return FileResponse(
        path=str(zip_path),
        filename="stopfrauda_code.zip",
        media_type="application/zip"
    )

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
