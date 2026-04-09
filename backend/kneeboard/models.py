"""Data models for kneeboard generation."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Waypoint:
    number: int
    name: str
    lat: str = ""
    lon: str = ""
    alt_ft: int = 0
    speed_kts: int = 0
    tos: str = ""  # Time on station / ETA
    action: str = ""
    notes: str = ""


@dataclass
class Frequency:
    name: str
    freq: str
    modulation: str = "AM"  # AM or FM
    notes: str = ""


@dataclass
class FlightMember:
    callsign: str
    number: int
    aircraft: str = ""
    pilot: str = ""
    role: str = ""
    laser_code: str = ""
    tacan: str = ""


@dataclass
class ThreatInfo:
    name: str
    type: str  # SAM, AAA, Fighter, etc.
    location: str = ""
    range_nm: str = ""
    notes: str = ""


@dataclass
class MissionData:
    # Header
    mission_name: str = "UNTITLED MISSION"
    mission_date: str = ""
    mission_time: str = ""
    theater: str = "Caucasus"
    weather: str = ""

    # Flight info
    callsign: str = ""
    flight_size: int = 2
    aircraft_type: str = ""
    package_name: str = ""
    mission_type: str = ""  # CAP, CAS, SEAD, Strike, etc.

    # Data
    waypoints: list[Waypoint] = field(default_factory=list)
    frequencies: list[Frequency] = field(default_factory=list)
    flight_members: list[FlightMember] = field(default_factory=list)
    threats: list[ThreatInfo] = field(default_factory=list)

    # Codes
    bullseye: str = ""
    laser_code: str = "1688"
    tacan_channel: str = ""
    ils_freq: str = ""
    departure_airfield: str = ""
    recovery_airfield: str = ""
    divert_airfield: str = ""

    # Notes
    roe: str = ""  # Rules of engagement
    notes: str = ""

    # Squadron branding
    squadron_name: str = ""
    squadron_motto: str = ""


@dataclass
class ChecklistItem:
    step: str
    action: str
    expected: str = ""
    notes: str = ""


@dataclass
class ReferenceCard:
    title: str
    card_type: str  # "checklist", "reference", "comms", "custom"
    items: list[dict] = field(default_factory=list)
    columns: list[str] = field(default_factory=list)
    notes: str = ""
    squadron_name: str = ""
