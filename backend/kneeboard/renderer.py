"""Core kneeboard image renderer using Pillow."""
from __future__ import annotations
import io
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from backend.config import (
    KNEEBOARD_WIDTH, KNEEBOARD_HEIGHT, COLORS, FONT_SIZES, OUTPUT_DIR
)
from .models import MissionData, ReferenceCard


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Get a monospace font. Falls back to default if not available."""
    font_names = [
        "DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf",
        "Consolas-Bold.ttf" if bold else "Consolas.ttf",
        "LiberationMono-Bold.ttf" if bold else "LiberationMono-Regular.ttf",
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


class KneeboardRenderer:
    """Renders kneeboard pages as PNG images."""

    def __init__(self, width: int = KNEEBOARD_WIDTH, height: int = KNEEBOARD_HEIGHT,
                 style_profile=None):
        self.width = width
        self.height = height
        self._custom_colors = None
        self._font_scale = 1.0
        if style_profile is not None:
            self.apply_style(style_profile)

    def apply_style(self, profile):
        """Apply a StyleProfile to override default colors and sizing."""
        self._custom_colors = profile.to_colors_dict()
        self._font_scale = profile.font_scale
        self.width = profile.source_width or self.width
        self.height = profile.source_height or self.height
    @property
    def colors(self):
        return self._custom_colors or COLORS

    def _scaled_font_size(self, base_size: int) -> int:
        return max(8, int(base_size * self._font_scale))

    def _new_image(self) -> tuple[Image.Image, ImageDraw.Draw]:
        img = Image.new("RGB", (self.width, self.height), COLORS["bg_dark"])
        draw = ImageDraw.Draw(img)
        return img, draw

    def _draw_header(self, draw: ImageDraw.Draw, title: str, subtitle: str = "",
                     squadron: str = "", y_start: int = 0) -> int:
        """Draw page header banner. Returns the Y position after the header."""
        y = y_start
        draw.rectangle([0, y, self.width, y + 52], fill=COLORS["header_bg"])
        font_title = _get_font(FONT_SIZES["title"], bold=True)
        font_sub = _get_font(FONT_SIZES["small"])
        draw.text((12, y + 4), title.upper(), fill=COLORS["text_white"], font=font_title)
        if subtitle:
            draw.text((12, y + 34), subtitle, fill=COLORS["text_cyan"], font=font_sub)
        if squadron:
            bbox = draw.textbbox((0, 0), squadron, font=font_sub)
            tw = bbox[2] - bbox[0]
            draw.text((self.width - tw - 12, y + 34), squadron,
                       fill=COLORS["text_amber"], font=font_sub)
        y += 56
        draw.line([(0, y), (self.width, y)], fill=COLORS["line_bright"], width=2)
        return y + 4

    def _draw_table(self, draw: ImageDraw.Draw, y: int, headers: list[str],
                    rows: list[list[str]], col_widths: list[int],
                    header_color=None, row_colors=None) -> int:
        """Draw a table with headers and rows. Returns Y after table."""
        font_hdr = _get_font(FONT_SIZES["small"], bold=True)
        font_body = _get_font(FONT_SIZES["small"])
        row_h = 22
        pad = 8
        if header_color is None:
            header_color = COLORS["text_cyan"]
        x = pad
        for i, hdr in enumerate(headers):
            draw.text((x, y), hdr, fill=header_color, font=font_hdr)
            x += col_widths[i]
        y += row_h
        draw.line([(pad, y), (self.width - pad, y)], fill=COLORS["line_dim"])
        y += 2
        for ri, row in enumerate(rows):
            if ri % 2 == 1:
                draw.rectangle([0, y, self.width, y + row_h], fill=COLORS["row_alt"])
            x = pad
            for ci, cell in enumerate(row):
                color = COLORS["text_white"]
                if row_colors and ri < len(row_colors) and row_colors[ri]:
                    color = row_colors[ri]
                draw.text((x, y + 2), str(cell), fill=color, font=font_body)
                x += col_widths[ci]
            y += row_h
        return y + 4
    def _draw_section_label(self, draw: ImageDraw.Draw, y: int, label: str) -> int:
        """Draw a section separator label."""
        font = _get_font(FONT_SIZES["body"], bold=True)
        y += 6
        draw.line([(8, y + 8), (self.width - 8, y + 8)], fill=COLORS["line_dim"])
        draw.text((12, y + 12), f"\u2500\u2500 {label.upper()} \u2500\u2500", fill=COLORS["text_amber"], font=font)
        return y + 32

    def render_mission_card(self, data: MissionData) -> Image.Image:
        """Render the main mission planning kneeboard page."""
        img, draw = self._new_image()
        subtitle = f"{data.mission_type}  \u2022  {data.theater}  \u2022  {data.mission_date} {data.mission_time}"
        y = self._draw_header(draw, data.mission_name, subtitle, data.squadron_name)
        font = _get_font(FONT_SIZES["small"])
        font_b = _get_font(FONT_SIZES["small"], bold=True)
        info_lines = [
            f"CALLSIGN: {data.callsign}  |  PACKAGE: {data.package_name}  |  A/C: {data.aircraft_type}",
            f"DEP: {data.departure_airfield}  |  REC: {data.recovery_airfield}  |  DIV: {data.divert_airfield}",
            f"BULLSEYE: {data.bullseye}  |  LASER: {data.laser_code}  |  TACAN: {data.tacan_channel}",
        ]
        for line in info_lines:
            draw.text((12, y), line, fill=COLORS["text_green"], font=font)
            y += 18
        y += 4
        if data.waypoints:
            y = self._draw_section_label(draw, y, "Waypoints")
            headers = ["#", "NAME", "ALT", "SPD", "TOS", "ACTION"]
            col_w = [35, 140, 70, 65, 80, 200]
            rows = []
            for wp in data.waypoints:
                rows.append([
                    str(wp.number), wp.name, f"{wp.alt_ft}'",
                    f"{wp.speed_kts}kt" if wp.speed_kts else "",
                    wp.tos, wp.action
                ])
            y = self._draw_table(draw, y, headers, rows, col_w)
        if data.frequencies:
            y = self._draw_section_label(draw, y, "Frequencies")
            headers = ["NAME", "FREQ", "MOD", "NOTES"]
            col_w = [160, 120, 50, 300]
            rows = [[f.name, f.freq, f.modulation, f.notes] for f in data.frequencies]
            y = self._draw_table(draw, y, headers, rows, col_w)
        if data.flight_members:
            y = self._draw_section_label(draw, y, "Flight")
            headers = ["#", "CALLSIGN", "PILOT", "ROLE", "LASER"]
            col_w = [35, 140, 150, 120, 100]
            rows = [[str(m.number), m.callsign, m.pilot, m.role, m.laser_code]
                    for m in data.flight_members]
            y = self._draw_table(draw, y, headers, rows, col_w)
        if data.notes:
            y = self._draw_section_label(draw, y, "Notes")
            draw.text((12, y), data.notes, fill=COLORS["text_white"], font=font)
        if data.roe:
            y = self._draw_section_label(draw, y, "ROE")
            draw.text((12, y), data.roe, fill=COLORS["text_red"], font=font_b)
        return img
    def render_comms_card(self, data: MissionData) -> Image.Image:
        """Render a dedicated communications / frequencies page."""
        img, draw = self._new_image()
        y = self._draw_header(draw, "COMMS CARD", data.callsign, data.squadron_name)
        if data.frequencies:
            headers = ["NAME", "FREQUENCY", "MOD", "NOTES"]
            col_w = [200, 140, 55, 300]
            rows = [[f.name, f.freq, f.modulation, f.notes] for f in data.frequencies]
            y = self._draw_table(draw, y, headers, rows, col_w)
        font = _get_font(FONT_SIZES["body"])
        y += 10
        codes = [
            f"TACAN: {data.tacan_channel}" if data.tacan_channel else "",
            f"ILS: {data.ils_freq}" if data.ils_freq else "",
            f"BULLSEYE: {data.bullseye}" if data.bullseye else "",
        ]
        for line in filter(None, codes):
            draw.text((12, y), line, fill=COLORS["text_green"], font=font)
            y += 24
        return img

    def render_threat_card(self, data: MissionData) -> Image.Image:
        """Render a threat / SPINS page."""
        img, draw = self._new_image()
        y = self._draw_header(draw, "THREAT CARD", data.theater, data.squadron_name)
        if data.threats:
            headers = ["THREAT", "TYPE", "LOCATION", "RANGE", "NOTES"]
            col_w = [140, 80, 160, 70, 200]
            rows = [[t.name, t.type, t.location, t.range_nm, t.notes]
                    for t in data.threats]
            y = self._draw_table(draw, y, headers, rows, col_w,
                                 header_color=COLORS["text_red"])
        if data.roe:
            y = self._draw_section_label(draw, y, "Rules of Engagement")
            font = _get_font(FONT_SIZES["body"])
            draw.text((12, y), data.roe, fill=COLORS["text_red"], font=font)
        return img

    def render_reference_card(self, card: ReferenceCard) -> Image.Image:
        """Render a generic reference / checklist card."""
        img, draw = self._new_image()
        y = self._draw_header(draw, card.title, card.card_type.upper(), card.squadron_name)
        if card.card_type == "checklist" and card.items:
            font = _get_font(FONT_SIZES["small"])
            font_b = _get_font(FONT_SIZES["small"], bold=True)
            for i, item in enumerate(card.items):
                if i % 2 == 1:
                    draw.rectangle([0, y, self.width, y + 22], fill=COLORS["row_alt"])
                step = item.get("step", str(i + 1))
                action = item.get("action", "")
                expected = item.get("expected", "")
                draw.text((12, y + 2), f"{step}.", fill=COLORS["text_amber"], font=font_b)
                draw.text((40, y + 2), action, fill=COLORS["text_white"], font=font)
                if expected:
                    bbox = draw.textbbox((0, 0), expected, font=font)
                    tw = bbox[2] - bbox[0]
                    draw.text((self.width - tw - 12, y + 2), expected,
                               fill=COLORS["text_green"], font=font)
                y += 22
        elif card.columns and card.items:
            col_w = [self.width // len(card.columns)] * len(card.columns)
            rows = []
            for item in card.items:
                rows.append([item.get(c, "") for c in card.columns])
            y = self._draw_table(draw, y, [c.upper() for c in card.columns], rows, col_w)
        if card.notes:
            y = self._draw_section_label(draw, y, "Notes")
            font = _get_font(FONT_SIZES["small"])
            draw.text((12, y), card.notes, fill=COLORS["text_white"], font=font)
        return img

    def render_all(self, data: MissionData, output_dir: Optional[Path] = None,
                   prefix: str = "kneeboard") -> list[Path]:
        """Render all pages and save as PNGs. Returns list of file paths."""
        out = output_dir or OUTPUT_DIR
        out.mkdir(parents=True, exist_ok=True)
        pages = []
        mission_img = self.render_mission_card(data)
        p = out / f"{prefix}_01_mission.png"
        mission_img.save(p)
        pages.append(p)
        if data.frequencies:
            comms_img = self.render_comms_card(data)
            p = out / f"{prefix}_02_comms.png"
            comms_img.save(p)
            pages.append(p)
        if data.threats:
            threat_img = self.render_threat_card(data)
            p = out / f"{prefix}_03_threats.png"
            threat_img.save(p)
            pages.append(p)
        return pages

    def render_to_bytes(self, img: Image.Image) -> bytes:
        """Return PNG bytes for an image."""
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
