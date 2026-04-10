"""Text-to-Speech service for Nanki cards."""
from __future__ import annotations

import base64
import tempfile
from pathlib import Path
from typing import Literal

# TTS Provider options
TTSProvider = Literal["browser", "elevenlabs", "openai"]


class TTSService:
    """Text-to-Speech service for reading cards aloud."""
    
    def __init__(self, provider: TTSProvider = "browser"):
        self.provider = provider
        self.cache_dir = Path(tempfile.gettempdir()) / "nanki_tts"
        self.cache_dir.mkdir(exist_ok=True)
    
    def speak_text(self, text: str, language: str = "de") -> dict:
        """Generate speech from text.
        
        Returns dict with audio data or URL.
        """
        if self.provider == "browser":
            return self._browser_tts(text, language)
        elif self.provider == "elevenlabs":
            return self._elevenlabs_tts(text)
        else:
            return {"error": f"Provider {self.provider} not implemented"}
    
    def _browser_tts(self, text: str, language: str) -> dict:
        """Use browser's built-in TTS (Web Speech API)."""
        # Returns text to be spoken by browser
        return {
            "type": "browser",
            "text": text,
            "language": language,
        }
    
    def _elevenlabs_tts(self, text: str) -> dict:
        """Generate speech using ElevenLabs API."""
        # Placeholder for ElevenLabs integration
        return {
            "type": "elevenlabs",
            "text": text,
            "message": "ElevenLabs API key required",
        }
    
    def generate_card_audio(self, card: dict) -> dict:
        """Generate audio for a flashcard (front + back)."""
        front_audio = self.speak_text(card.get("front", ""))
        back_audio = self.speak_text(card.get("back", ""))
        
        return {
            "card_id": card.get("id"),
            "front": front_audio,
            "back": back_audio,
        }


class TTSController:
    """Controller for TTS functionality in UI."""
    
    def __init__(self):
        self.tts = TTSService()
        self.currently_speaking = False
    
    def speak_card(self, card: dict, side: str = "front") -> dict:
        """Speak a specific card side."""
        text = card.get(side, "")
        if not text:
            return {"error": "No text to speak"}
        
        result = self.tts.speak_text(text)
        self.currently_speaking = True
        
        return result
    
    def stop_speaking(self) -> None:
        """Stop current speech."""
        self.currently_speaking = False
    
    def is_speaking(self) -> bool:
        """Check if currently speaking."""
        return self.currently_speaking
