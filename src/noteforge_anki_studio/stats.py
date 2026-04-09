"""Learning statistics tracking for Nanki."""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from .models import Card, NoteDocument


class StudySession:
    """Represents a single study session."""
    
    def __init__(
        self,
        started_at: str | None = None,
        ended_at: str | None = None,
        cards_reviewed: int = 0,
        cards_created: int = 0,
        notes_created: int = 0,
    ):
        self.started_at = started_at or datetime.now().isoformat()
        self.ended_at = ended_at
        self.cards_reviewed = cards_reviewed
        self.cards_created = cards_created
        self.notes_created = notes_created
    
    @property
    def duration_minutes(self) -> int:
        """Calculate session duration in minutes."""
        if not self.ended_at:
            return 0
        start = datetime.fromisoformat(self.started_at)
        end = datetime.fromisoformat(self.ended_at)
        return int((end - start).total_seconds() / 60)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "cards_reviewed": self.cards_reviewed,
            "cards_created": self.cards_created,
            "notes_created": self.notes_created,
            "duration_minutes": self.duration_minutes,
        }


class LearningStats:
    """Tracks all learning statistics."""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.stats_file = data_dir / "learning_stats.json"
        self.sessions: list[StudySession] = []
        self.current_session: StudySession | None = None
        self._load()
    
    def _load(self) -> None:
        """Load stats from disk."""
        if self.stats_file.exists():
            try:
                with open(self.stats_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.sessions = [
                        StudySession(**s) for s in data.get("sessions", [])
                    ]
            except (json.JSONDecodeError, TypeError):
                self.sessions = []
    
    def _save(self) -> None:
        """Save stats to disk."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        data = {
            "sessions": [s.to_dict() for s in self.sessions],
            "last_updated": datetime.now().isoformat(),
        }
        with open(self.stats_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    
    def start_session(self) -> StudySession:
        """Start a new study session."""
        if self.current_session:
            self.end_session()
        self.current_session = StudySession()
        return self.current_session
    
    def end_session(self) -> None:
        """End current session and save it."""
        if self.current_session:
            self.current_session.ended_at = datetime.now().isoformat()
            self.sessions.append(self.current_session)
            self.current_session = None
            self._save()
    
    def record_cards_created(self, count: int = 1) -> None:
        """Record cards created."""
        if self.current_session:
            self.current_session.cards_created += count
            self._save()
    
    def record_notes_created(self, count: int = 1) -> None:
        """Record notes created."""
        if self.current_session:
            self.current_session.notes_created += count
            self._save()
    
    def record_cards_pushed(self, count: int = 1) -> None:
        """Record cards pushed to Anki."""
        if self.current_session:
            self.current_session.cards_reviewed += count
            self._save()
    
    def get_stats_summary(self) -> dict[str, Any]:
        """Get comprehensive statistics summary."""
        now = datetime.now()
        
        # Calculate time ranges
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        def filter_sessions(since: datetime) -> list[StudySession]:
            return [
                s for s in self.sessions 
                if datetime.fromisoformat(s.started_at) >= since
            ]
        
        def sum_sessions(sessions: list[StudySession]) -> dict[str, int]:
            return {
                "cards_created": sum(s.cards_created for s in sessions),
                "notes_created": sum(s.notes_created for s in sessions),
                "cards_pushed": sum(s.cards_reviewed for s in sessions),
                "study_minutes": sum(s.duration_minutes for s in sessions),
                "sessions_count": len(sessions),
            }
        
        today_stats = sum_sessions(filter_sessions(today_start))
        week_stats = sum_sessions(filter_sessions(week_start))
        month_stats = sum_sessions(filter_sessions(month_start))
        all_stats = sum_sessions(self.sessions)
        
        return {
            "today": today_stats,
            "this_week": week_stats,
            "this_month": month_stats,
            "all_time": all_stats,
            "current_session": self.current_session.to_dict() if self.current_session else None,
            "streak_days": self._calculate_streak(),
        }
    
    def _calculate_streak(self) -> int:
        """Calculate study streak in days."""
        if not self.sessions:
            return 0
        
        # Get days with activity
        days_with_sessions = set()
        for session in self.sessions:
            day = datetime.fromisoformat(session.started_at).date()
            days_with_sessions.add(day)
        
        # Calculate streak
        streak = 0
        today = datetime.now().date()
        check_date = today
        
        while check_date in days_with_sessions:
            streak += 1
            check_date -= timedelta(days=1)
        
        return streak


class StatsService:
    """Service for managing learning statistics."""
    
    def __init__(self, data_dir: Path):
        self.stats = LearningStats(data_dir)
    
    def get_dashboard_data(self, workspace_notes: list[NoteDocument]) -> dict:
        """Get complete dashboard data."""
        # Calculate note/card stats from workspace
        total_notes = len(workspace_notes)
        total_cards = sum(len(note.cards) for note in workspace_notes)
        cards_pushed = sum(
            1 for note in workspace_notes 
            for card in note.cards 
            if card.last_pushed_at
        )
        cards_pending = total_cards - cards_pushed
        
        stats_summary = self.stats.get_stats_summary()
        
        return {
            **stats_summary,
            "workspace": {
                "total_notes": total_notes,
                "total_cards": total_cards,
                "cards_pushed": cards_pushed,
                "cards_pending": cards_pending,
                "push_percentage": round(cards_pushed / total_cards * 100, 1) if total_cards > 0 else 0,
            },
        }
