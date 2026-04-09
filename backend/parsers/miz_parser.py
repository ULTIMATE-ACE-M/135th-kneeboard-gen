"""
DCS .miz file parser.

A .miz file is a ZIP archive containing Lua tables. The key file is 'mission'
which contains the full mission definition including waypoints, frequencies,
coalition data, weather, etc.
"""
from __future__ import annotations
import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Optional

from backend.kneeboard.models import (
    MissionData, Waypoint, Frequency, FlightMember, ThreatInfo
)


class MizParser:
    """Parse DCS World .miz files into MissionData."""

    THEATERS = {
        "Caucasus": "Caucasus", "Nevada": "NTTR", "PersianGulf": "Persian Gulf",
        "Syria": "Syria", "MarianaIslands": "Mariana Islands",
        "SouthAtlantic": "South Atlantic", "Sinai": "Sinai",
        "Kola": "Kola", "Afghanistan": "Afghanistan",
    }

    def __init__(self, miz_path: Optional[str | Path] = None,
                 miz_bytes: Optional[bytes] = None):
        if miz_path:
            self._zip = zipfile.ZipFile(str(miz_path), "r")
        elif miz_bytes:
            self._zip = zipfile.ZipFile(BytesIO(miz_bytes), "r")
        else:
            raise ValueError("Provide either miz_path or miz_bytes")
        self._mission_lua = self._zip.read("mission").decode("utf-8", errors="replace")

    def close(self):
        self._zip.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
    @staticmethod
    def _extract_string(lua: str, key: str) -> str:
        pattern = rf'\["{re.escape(key)}"\]\s*=\s*"([^"]*)"'
        m = re.search(pattern, lua)
        return m.group(1) if m else ""

    @staticmethod
    def _extract_number(lua: str, key: str) -> float:
        pattern = rf'\["{re.escape(key)}"\]\s*=\s*([-\d.]+)'
        m = re.search(pattern, lua)
        return float(m.group(1)) if m else 0.0

    @staticmethod
    def _extract_bool(lua: str, key: str) -> bool:
        pattern = rf'\["{re.escape(key)}"\]\s*=\s*(true|false)'
        m = re.search(pattern, lua)
        return m.group(1) == "true" if m else False

    def _find_block(self, lua: str, key: str) -> str:
        pattern = rf'\["{re.escape(key)}"\]\s*=\s*\{{'
        m = re.search(pattern, lua)
        if not m:
            return ""
        start = m.end() - 1
        depth = 0
        for i in range(start, len(lua)):
            if lua[i] == "{":
                depth += 1
            elif lua[i] == "}":
                depth -= 1
                if depth == 0:
                    return lua[start:i + 1]
        return ""

    def _find_indexed_blocks(self, lua: str) -> list[str]:
        blocks = []
        pattern = r'\[\d+\]\s*=\s*\{'
        for m in re.finditer(pattern, lua):
            start = m.end() - 1
            depth = 0
            for i in range(start, len(lua)):
                if lua[i] == "{":
                    depth += 1
                elif lua[i] == "}":
                    depth -= 1
                    if depth == 0:
                        blocks.append(lua[start:i + 1])
                        break
        return blocks
    @staticmethod
    def _meters_to_dms(x: float, y: float, theater: str = "Caucasus") -> tuple[str, str]:
        if theater == "Caucasus":
            lat = 42.0 + y / 111320.0
            lon = 40.0 + x / (111320.0 * 0.743)
        elif theater in ("Syria", "PersianGulf", "Sinai"):
            lat = 33.0 + y / 111320.0
            lon = 36.0 + x / (111320.0 * 0.838)
        else:
            lat = 36.0 + y / 111320.0
            lon = -115.0 + x / (111320.0 * 0.809)
        lat_d = int(abs(lat))
        lat_m = (abs(lat) - lat_d) * 60
        lon_d = int(abs(lon))
        lon_m = (abs(lon) - lon_d) * 60
        ns = "N" if lat >= 0 else "S"
        ew = "E" if lon >= 0 else "W"
        return f"{ns}{lat_d:02d}\u00b0{lat_m:05.2f}'", f"{ew}{lon_d:03d}\u00b0{lon_m:05.2f}'"

    def parse(self, coalition: str = "blue", group_name: str = "") -> MissionData:
        lua = self._mission_lua
        data = MissionData()
        data.mission_name = self._extract_string(lua, "sortie") or "UNTITLED"
        data.theater = self._extract_string(lua, "theatre") or "Caucasus"
        data.theater = self.THEATERS.get(data.theater, data.theater)
        day = int(self._extract_number(lua, "Day") or 1)
        month = int(self._extract_number(lua, "Month") or 1)
        year = int(self._extract_number(lua, "Year") or 2024)
        start_time = int(self._extract_number(lua, "start_time") or 0)
        hours = start_time // 3600
        minutes = (start_time % 3600) // 60
        data.mission_date = f"{year}-{month:02d}-{day:02d}"
        data.mission_time = f"{hours:02d}:{minutes:02d}L"
        weather_block = self._find_block(lua, "weather")
        if weather_block:
            wind_speed = self._extract_number(weather_block, "speed")
            cloud_base = self._extract_number(weather_block, "base")
            data.weather = f"Wind {wind_speed:.0f}m/s, Clouds {cloud_base:.0f}m"
        coalition_block = self._find_block(lua, coalition)
        if not coalition_block:
            return data
        self._parse_groups(coalition_block, data, group_name)
        return data
    def _parse_groups(self, coalition_lua: str, data: MissionData,
                      target_group: str = ""):
        plane_block = self._find_block(coalition_lua, "plane")
        heli_block = self._find_block(coalition_lua, "helicopter")
        for vehicle_block in [plane_block, heli_block]:
            if not vehicle_block:
                continue
            group_blocks = self._find_block(vehicle_block, "group")
            if not group_blocks:
                continue
            for group_lua in self._find_indexed_blocks(group_blocks):
                gname = self._extract_string(group_lua, "name")
                if target_group and gname != target_group:
                    continue
                if not data.callsign:
                    data.callsign = gname
                    data.aircraft_type = self._extract_string(group_lua, "type")
                    route_block = self._find_block(group_lua, "route")
                    if route_block:
                        points_block = self._find_block(route_block, "points")
                        if points_block:
                            for i, pt_lua in enumerate(self._find_indexed_blocks(points_block)):
                                name = self._extract_string(pt_lua, "name") or f"WP{i}"
                                alt = self._extract_number(pt_lua, "alt")
                                speed = self._extract_number(pt_lua, "speed")
                                action = self._extract_string(pt_lua, "action")
                                wp_type = self._extract_string(pt_lua, "type")
                                wp = Waypoint(
                                    number=i, name=name,
                                    alt_ft=int(alt * 3.28084),
                                    speed_kts=int(speed * 1.94384),
                                    action=action or wp_type,
                                )
                                data.waypoints.append(wp)
                    units_block = self._find_block(group_lua, "units")
                    if units_block:
                        for ui, unit_lua in enumerate(self._find_indexed_blocks(units_block)):
                            uname = self._extract_string(unit_lua, "name")
                            utype = self._extract_string(unit_lua, "type")
                            member = FlightMember(
                                callsign=uname, number=ui + 1,
                                aircraft=utype,
                                role="Lead" if ui == 0 else f"Wing {ui}",
                            )
                            data.flight_members.append(member)
                    freq = self._extract_number(group_lua, "frequency")
                    if freq:
                        data.frequencies.append(Frequency(
                            name=f"{gname} Flight",
                            freq=f"{freq:.3f}", modulation="AM",
                        ))
                if target_group:
                    return

    def parse_all_groups(self, coalition: str = "blue") -> list[str]:
        coalition_block = self._find_block(self._mission_lua, coalition)
        if not coalition_block:
            return []
        names = []
        for block_type in ["plane", "helicopter"]:
            vehicle_block = self._find_block(coalition_block, block_type)
            if not vehicle_block:
                continue
            group_block = self._find_block(vehicle_block, "group")
            if not group_block:
                continue
            for group_lua in self._find_indexed_blocks(group_block):
                name = self._extract_string(group_lua, "name")
                if name:
                    names.append(name)
        return names
