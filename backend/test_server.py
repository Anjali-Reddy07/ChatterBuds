import sys
import unittest
from fastapi.testclient import TestClient
from main import app
from room_manager import room_manager
from voices import LANGUAGE_CONFIG, get_tts_voice, get_whisper_code

class TestChatterBudsBackend(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "ChatterBuds Voice Engine")
        self.assertIn("active_rooms", data)
        self.assertIn("total_connections", data)
        print("Health Check Passed:", data)

    def test_voice_mappings(self):
        # Verify key languages are configured
        for lang in ["English", "Telugu", "Hindi", "Odia", "Tamil", "Spanish", "French", "Japanese"]:
            self.assertIn(lang, LANGUAGE_CONFIG)
            voice = get_tts_voice(lang)
            self.assertTrue(len(voice) > 0)
        print("Voice Mapping Tests Passed!")

    def test_websocket_ping_pong(self):
        with self.client.websocket_connect("/ws/9999/English") as ws:
            first_event = ws.receive_json()
            self.assertEqual(first_event["event"], "partner_status")
            self.assertFalse(first_event["connected"])

            ws.send_json({"type": "ping"})
            reply = ws.receive_json()
            self.assertEqual(reply["type"], "pong")
            self.assertIn("timestamp", reply)
            print("WebSocket Ping/Pong Passed:", reply)

if __name__ == "__main__":
    unittest.main()
