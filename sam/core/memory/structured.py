from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_ack: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    discord_message_id: Mapped[str | None] = mapped_column(
        String, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), index=True, nullable=False
    )
    model: Mapped[str] = mapped_column(String, nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tool_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String, default="ok", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Family(Base):
    __tablename__ = "families"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    family_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("families.id"), nullable=False
    )
    firstname: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String, nullable=False)
    platform_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False
    )


def _default_db_path() -> Path:
    data_dir = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser().resolve()
    return data_dir / "sam.db"


def get_engine(db_path: str | Path | None = None):
    path = Path(db_path).expanduser().resolve() if db_path else _default_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{path}", echo=False)


_SessionFactory: sessionmaker | None = None


def configure_session(db_path: str | Path | None = None) -> None:
    global _SessionFactory
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    _SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)


def get_platform_id(member_id: int, platform: str) -> str | None:
    """Return the platform-specific ID for a member on a given platform."""
    with get_session() as s:
        ch = s.query(Channel).filter_by(member_id=member_id, platform=platform).first()
        return ch.platform_id if ch else None


def get_member_name(member_id: int) -> str:
    with get_session() as s:
        m = s.query(Member).filter_by(id=member_id).first()
        return m.firstname if m else str(member_id)


def get_due_reminders() -> list[Reminder]:
    with get_session() as s:
        return (
            s.query(Reminder)
            .filter(
                Reminder.due_at <= datetime.now(),
                Reminder.done.is_(False),
                Reminder.pending_ack.is_(False),
            )
            .all()
        )


def get_active_reminders() -> list[Reminder]:
    with get_session() as s:
        return (
            s.query(Reminder)
            .filter(Reminder.done.is_(False), Reminder.pending_ack.is_(False))
            .all()
        )


def get_reminder_by_message_id(discord_message_id: str) -> Reminder | None:
    with get_session() as s:
        return (
            s.query(Reminder).filter_by(discord_message_id=discord_message_id).first()
        )


def get_member_by_channel(platform: str, platform_id: str) -> dict | None:
    with get_session() as s:
        ch = (
            s.query(Channel)
            .filter_by(platform=platform, platform_id=platform_id)
            .first()
        )
        if not ch:
            return None
        member = s.query(Member).filter_by(id=ch.member_id).first()
        family = s.query(Family).filter_by(id=member.family_id).first()
        channels = s.query(Channel).filter_by(member_id=member.id).all()
        return {
            "member_id": member.id,
            "firstname": member.firstname,
            "family_id": family.id,
            "family_name": family.name,
            "channels": {c.platform: c.platform_id for c in channels},
        }


def get_family_members(family_id: int) -> list[dict]:
    with get_session() as s:
        members = s.query(Member).filter_by(family_id=family_id).all()
        result = []
        for m in members:
            channels = s.query(Channel).filter_by(member_id=m.id).all()
            result.append(
                {
                    "member_id": m.id,
                    "firstname": m.firstname,
                    "channels": {c.platform: c.platform_id for c in channels},
                }
            )
        return result


def get_all_members_flat() -> list[dict]:
    with get_session() as s:
        members = s.query(Member).all()
        result = []
        for m in members:
            family = s.query(Family).filter_by(id=m.family_id).first()
            channels = s.query(Channel).filter_by(member_id=m.id).all()
            result.append(
                {
                    "id": m.id,
                    "firstname": m.firstname,
                    "family_id": m.family_id,
                    "family": family.name if family else "",
                    "channels": {c.platform: c.platform_id for c in channels},
                }
            )
        return result


@contextmanager
def get_session() -> Generator[Session, None, None]:
    if _SessionFactory is None:
        raise RuntimeError("Call configure_session() before using get_session()")
    session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
