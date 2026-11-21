"""
Room and connection manager for ChatterBuds.
Ensures maximum 2 participants per room and manages peer state notifications.
"""

import asyncio
from typing import Dict, List, Optional
from fastapi import WebSocket


class Participant:
    def __init__(self, websocket: WebSocket, language: str):
        self.websocket = websocket
        self.language = language


class RoomManager:
    def __init__(self):
        # Maps room_id -> list of Participant instances
        self.rooms: Dict[str, List[Participant]] = {}
        # Maps room_id -> list of recent voice notes/messages
        self.room_history: Dict[str, List[dict]] = {}
        self._lock = asyncio.Lock()

    async def add_history(self, room_id: str, message: dict):
        """Append voice note / translation to in-memory room history."""
        async with self._lock:
            history = self.room_history.setdefault(room_id, [])
            history.append(message)
            # Retain last 50 messages per room
            if len(history) > 50:
                history.pop(0)

    async def get_history(self, room_id: str) -> List[dict]:
        """Retrieve recent voice notes for the room."""
        async with self._lock:
            return list(self.room_history.get(room_id, []))

    async def update_note_status(self, room_id: str, note_id: str, status: str):
        """Update played or delivered status of a voice note."""
        async with self._lock:
            history = self.room_history.get(room_id, [])
            for item in history:
                if item.get("note_id") == note_id:
                    item["status"] = status
                    break

    async def add_participant(self, room_id: str, websocket: WebSocket, language: str) -> bool:
        """
        Add a participant to the room.
        Returns True if successful, False if the room already has 2 participants.
        """
        async with self._lock:
            participants = self.rooms.setdefault(room_id, [])
            if len(participants) >= 2:
                return False

            participants.append(Participant(websocket, language))
            return True

    async def remove_participant(self, room_id: str, websocket: WebSocket) -> Optional[Participant]:
        """
        Remove participant from a room.
        Returns the remaining participant if one exists, otherwise None.
        Cleans up empty rooms.
        """
        async with self._lock:
            if room_id not in self.rooms:
                return None

            participants = self.rooms[room_id]
            self.rooms[room_id] = [p for p in participants if p.websocket != websocket]

            if not self.rooms[room_id]:
                del self.rooms[room_id]
                return None

            return self.rooms[room_id][0]

    async def get_partner(self, room_id: str, websocket: WebSocket) -> Optional[Participant]:
        """
        Retrieve the other participant in the same room.
        """
        async with self._lock:
            participants = self.rooms.get(room_id, [])
            for p in participants:
                if p.websocket != websocket:
                    return p
            return None

    async def get_all_in_room(self, room_id: str) -> List[Participant]:
        """
        Retrieve all participants in a room.
        """
        async with self._lock:
            return list(self.rooms.get(room_id, []))

    def get_stats(self) -> dict:
        """
        Return active room count and total active WebSocket connections.
        """
        active_rooms = len(self.rooms)
        total_connections = sum(len(p) for p in self.rooms.values())
        return {
            "active_rooms": active_rooms,
            "total_connections": total_connections,
        }


room_manager = RoomManager()
