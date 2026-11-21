"""
Firebase Cloud Messaging (FCM) & Firestore Presence Service for ChatterBuds.
Dispatches high-priority push notifications to wake background / closed mobile browsers
and rings the recipient device with action buttons.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

logger = logging.getLogger("chatterbuds.fcm")

_firebase_initialized = False
_firestore_db = None


def init_firebase_admin():
    """Initialize Firebase Admin SDK with credentials from environment variable."""
    global _firebase_initialized, _firestore_db
    if _firebase_initialized:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        service_account_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        cred = None

        if service_account_raw:
            if service_account_raw.startswith("{") and service_account_raw.endswith("}"):
                # Parsed from JSON string
                cert_dict = json.loads(service_account_raw)
                cred = credentials.Certificate(cert_dict)
            elif os.path.exists(service_account_raw):
                # Parsed from file path
                cred = credentials.Certificate(service_account_raw)

        if cred:
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            try:
                _firestore_db = firestore.client()
            except Exception as e:
                logger.warning(f"Firestore client could not be initialized: {e}")
            logger.info("Firebase Admin initialized successfully with Service Account.")
        else:
            # Try default credentials or mark unconfigured
            try:
                firebase_admin.initialize_app()
                _firebase_initialized = True
                _firestore_db = firestore.client()
                logger.info("Firebase Admin initialized with default credentials.")
            except Exception:
                logger.info("FIREBASE_SERVICE_ACCOUNT_JSON not provided. Running in standalone fallback mode.")

    except Exception as e:
        logger.warning(f"Firebase Admin SDK initialization notice: {e}")


class FCMService:
    def __init__(self):
        self.in_memory_tokens: Dict[str, str] = {}
        init_firebase_admin()

    async def register_device_token(self, phone_number: str, fcm_token: str) -> bool:
        """
        Store FCM token in in-memory cache and sync with Firestore users collection.
        """
        if not phone_number or not fcm_token:
            return False

        clean_phone = phone_number.strip()
        self.in_memory_tokens[clean_phone] = fcm_token
        logger.info(f"Registered FCM device token for {clean_phone} (in-memory)")

        global _firestore_db
        if _firestore_db:
            try:
                doc_ref = _firestore_db.collection("users").document(clean_phone)
                doc_ref.set(
                    {
                        "phoneNumber": clean_phone,
                        "fcmToken": fcm_token,
                        "updatedAt": datetime.now(timezone.utc).isoformat(),
                    },
                    merge=True,
                )
                logger.info(f"FCM token saved to Firestore users/{clean_phone}")
                return True
            except Exception as e:
                logger.warning(f"Could not persist FCM token to Firestore: {e}")

        return True

    async def get_device_token(self, phone_number: str) -> Optional[str]:
        """
        Lookup FCM device token from in-memory cache or Firestore.
        """
        clean_phone = phone_number.strip()
        if clean_phone in self.in_memory_tokens:
            return self.in_memory_tokens[clean_phone]

        global _firestore_db
        if _firestore_db:
            try:
                doc_ref = _firestore_db.collection("users").document(clean_phone)
                doc = doc_ref.get()
                if doc.exists:
                    data = doc.to_dict()
                    token = data.get("fcmToken")
                    if token:
                        self.in_memory_tokens[clean_phone] = token
                        return token
            except Exception as e:
                logger.warning(f"Error reading Firestore token for {clean_phone}: {e}")

        return None

    async def send_incoming_call_push(
        self,
        to_phone: str,
        from_phone: str,
        room_id: str,
        caller_lang: str = "English",
    ) -> bool:
        """
        Sends high-priority FCM push notification to callee device.
        Wakes background service worker and displays system notification with Accept & Decline buttons.
        """
        token = await self.get_device_token(to_phone)
        if not token:
            logger.info(f"No FCM token registered for {to_phone}. Cannot send background push.")
            return False

        try:
            from firebase_admin import messaging

            click_url = f"/?incomingRoom={room_id}&caller={from_phone}&autoJoin=1"

            message = messaging.Message(
                token=token,
                data={
                    "type": "INCOMING_CALL",
                    "roomId": str(room_id),
                    "callerNumber": str(from_phone),
                    "callerLang": str(caller_lang),
                    "clickAction": click_url,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                notification=messaging.Notification(
                    title="Incoming Translation Call",
                    body=f"{from_phone} is calling you on ChatterBuds. Tap to accept.",
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        channel_id="chatterbuds_calls",
                        sound="default",
                        priority="max",
                        default_vibrate_timings=True,
                    ),
                ),
                webpush=messaging.WebpushConfig(
                    headers={"Urgency": "high"},
                    notification=messaging.WebpushNotification(
                        title="Incoming Translation Call",
                        body=f"{from_phone} is calling you on ChatterBuds.",
                        icon="/icons/icon-192.svg",
                        badge="/icons/icon-192.svg",
                        tag="chatterbuds-call",
                        renotify=True,
                        require_interaction=True,
                        actions=[
                            messaging.WebpushNotificationAction("accept", "🟢 Accept & Talk"),
                            messaging.WebpushNotificationAction("decline", "🔴 Decline"),
                        ],
                        data={
                            "url": click_url,
                            "roomId": str(room_id),
                            "caller": str(from_phone),
                        },
                    ),
                ),
            )

            response = messaging.send(message)
            logger.info(f"FCM call notification sent to {to_phone} (message_id: {response})")
            return True

        except Exception as e:
            logger.error(f"FCM call push failed for {to_phone}: {e}")
            return False


fcm_service = FCMService()
