"""
Style Matcher \u2014 analyze an uploaded kneeboard image and extract its visual style
(colors, layout proportions, font sizing) so new kneeboards can be generated
to match.

Workflow:
1. User uploads a reference kneeboard PNG
2. StyleMatcher samples dominant colors, detects layout regions, measures spacing
3. Returns a StyleProfile that can be passed to the renderer
4. Renderer uses the profile instead of default COLORS/FONT_SIZES
"""
from __future__ import annotations
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Optional
from collections import Counter

from PIL import Image


@dataclass
class StyleProfile:
    """Extracted visual style from a reference kneeboard image."""
    bg_dark: tuple[int, int, int] = (30, 32, 36)
    bg_panel: tuple[int, int, int] = (40, 44, 52)
    text_primary: tuple[int, int, int] = (220, 220, 220)
    text_accent: tuple[int, int, int] = (0, 255, 100)
    text_highlight: tuple[int, int, int] = (255, 191, 0)
    text_warning: tuple[int, int, int] = (255, 60, 60)
    header_bg: tuple[int, int, int] = (20, 60, 90)
    line_color: tuple[int, int, int] = (80, 85, 95)
    row_alt: tuple[int, int, int] = (35, 38, 44)
    header_height_pct: float = 0.055
    margin_px: int = 12
    row_height_px: int = 22
    font_scale: float = 1.0
    is_dark_theme: bool = True
    source_width: int = 768
    source_height: int = 1024

    def to_colors_dict(self) -> dict:
        """Convert to the COLORS dict format used by the renderer."""
        return {
            "bg_dark": self.bg_dark,
            "bg_panel": self.bg_panel,
            "text_white": self.text_primary,
            "text_green": self.text_accent,
            "text_amber": self.text_highlight,
            "text_red": self.text_warning,
            "text_cyan": self.text_accent,
            "line_dim": self.line_color,
            "line_bright": tuple(min(c + 60, 255) for c in self.line_color),
            "header_bg": self.header_bg,
            "row_alt": self.row_alt,
        }
    def to_json(self) -> dict:
        """Serialize to JSON-friendly dict."""
        return {
            "bg_dark": list(self.bg_dark),
            "bg_panel": list(self.bg_panel),
            "text_primary": list(self.text_primary),
            "text_accent": list(self.text_accent),
            "text_highlight": list(self.text_highlight),
            "text_warning": list(self.text_warning),
            "header_bg": list(self.header_bg),
            "line_color": list(self.line_color),
            "row_alt": list(self.row_alt),
            "header_height_pct": self.header_height_pct,
            "margin_px": self.margin_px,
            "row_height_px": self.row_height_px,
            "font_scale": self.font_scale,
            "is_dark_theme": self.is_dark_theme,
            "source_width": self.source_width,
            "source_height": self.source_height,
        }

    @classmethod
    def from_json(cls, data: dict) -> "StyleProfile":
        """Deserialize from JSON dict."""
        return cls(
            bg_dark=tuple(data.get("bg_dark", [30, 32, 36])),
            bg_panel=tuple(data.get("bg_panel", [40, 44, 52])),
            text_primary=tuple(data.get("text_primary", [220, 220, 220])),
            text_accent=tuple(data.get("text_accent", [0, 255, 100])),
            text_highlight=tuple(data.get("text_highlight", [255, 191, 0])),
            text_warning=tuple(data.get("text_warning", [255, 60, 60])),
            header_bg=tuple(data.get("header_bg", [20, 60, 90])),
            line_color=tuple(data.get("line_color", [80, 85, 95])),
            row_alt=tuple(data.get("row_alt", [35, 38, 44])),
            header_height_pct=data.get("header_height_pct", 0.055),
            margin_px=data.get("margin_px", 12),
            row_height_px=data.get("row_height_px", 22),
            font_scale=data.get("font_scale", 1.0),
            is_dark_theme=data.get("is_dark_theme", True),
            source_width=data.get("source_width", 768),
            source_height=data.get("source_height", 1024),
        )


class StyleMatcher:
    """Analyze a reference kneeboard image to extract its visual style."""

    def __init__(self):
        pass

    def analyze(self, image: Image.Image) -> StyleProfile:
        img = image.convert("RGB")
        w, h = img.size
        profile = StyleProfile(source_width=w, source_height=h)
        bg_samples = self._sample_region(img, 0, int(h * 0.9), w, h) + \\
                     self._sample_region(img, 0, 0, 20, h)
        profile.bg_dark = self._dominant_color(bg_samples)
        bg_brightness = sum(profile.bg_dark) / 3
        profile.is_dark_theme = bg_brightness < 128
        header_samples = self._sample_region(img, 0, 0, w, int(h * 0.06))
        profile.header_bg = self._dominant_color(header_samples)
        header_h_pct = 0.055
        for pct in [0.04, 0.05, 0.06, 0.07, 0.08]:
            region_color = self._dominant_color(
                self._sample_region(img, 0, int(h * pct) - 5, w, int(h * pct) + 5)
            )
            if self._color_distance(region_color, profile.bg_dark) < 30:
                header_h_pct = pct
                break
        profile.header_height_pct = header_h_pct
        text_colors = self._extract_text_colors(img, profile.bg_dark)
        if text_colors:
            profile.text_primary = text_colors[0]
            if len(text_colors) > 1:
                profile.text_accent = text_colors[1]
            if len(text_colors) > 2:
                profile.text_highlight = text_colors[2]
        body_start = int(h * 0.1)
        body_end = int(h * 0.5)
        profile.row_alt = self._find_alt_row_color(img, body_start, body_end, profile.bg_dark)
        profile.line_color = self._find_line_color(img, body_start, body_end, profile.bg_dark)
        profile.row_height_px = self._estimate_row_height(img, body_start, body_end)
        profile.font_scale = h / 1024.0
        return profile
    def analyze_file(self, path: str | Path) -> StyleProfile:
        img = Image.open(path)
        return self.analyze(img)

    def analyze_bytes(self, data: bytes) -> StyleProfile:
        img = Image.open(BytesIO(data))
        return self.analyze(img)

    @staticmethod
    def _sample_region(img: Image.Image, x0: int, y0: int, x1: int, y1: int,
                       step: int = 4) -> list[tuple[int, int, int]]:
        samples = []
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(img.width, x1), min(img.height, y1)
        for y in range(y0, y1, step):
            for x in range(x0, x1, step):
                samples.append(img.getpixel((x, y)))
        return samples

    @staticmethod
    def _dominant_color(samples: list[tuple[int, int, int]],
                        bucket_size: int = 16) -> tuple[int, int, int]:
        if not samples:
            return (0, 0, 0)
        bucketed = [
            (r // bucket_size * bucket_size,
             g // bucket_size * bucket_size,
             b // bucket_size * bucket_size)
            for r, g, b in samples
        ]
        most_common = Counter(bucketed).most_common(1)[0][0]
        matching = [s for s, b in zip(samples, bucketed) if b == most_common]
        avg = tuple(sum(c) // len(matching) for c in zip(*matching))
        return avg

    @staticmethod
    def _color_distance(c1: tuple, c2: tuple) -> float:
        return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5

    def _extract_text_colors(self, img: Image.Image, bg_color: tuple,
                              min_distance: float = 80) -> list[tuple[int, int, int]]:
        w, h = img.size
        text_pixels = []
        for y in range(int(h * 0.05), int(h * 0.8), 3):
            for x in range(10, w - 10, 3):
                px = img.getpixel((x, y))
                if self._color_distance(px, bg_color) > min_distance:
                    text_pixels.append(px)
        if not text_pixels:
            return [(220, 220, 220)]
        colors = []
        bucket_size = 32
        bucketed_counts = Counter([
            (r // bucket_size * bucket_size,
             g // bucket_size * bucket_size,
             b // bucket_size * bucket_size)
            for r, g, b in text_pixels
        ])
        for color, count in bucketed_counts.most_common(10):
            if count < len(text_pixels) * 0.01:
                continue
            is_distinct = all(
                self._color_distance(color, c) > 60 for c in colors
            )
            if is_distinct:
                matching = [p for p in text_pixels if
                            abs(p[0] - color[0]) < bucket_size and
                            abs(p[1] - color[1]) < bucket_size and
                            abs(p[2] - color[2]) < bucket_size]
                avg = tuple(sum(c) // len(matching) for c in zip(*matching))
                colors.append(avg)
            if len(colors) >= 4:
                break
        return colors or [(220, 220, 220)]
    def _find_alt_row_color(self, img: Image.Image, y_start: int, y_end: int,
                             bg_color: tuple) -> tuple[int, int, int]:
        w = img.width
        row_colors = []
        for y in range(y_start, y_end, 2):
            samples = [img.getpixel((x, y)) for x in range(20, w - 20, 8)]
            avg = tuple(sum(c) // len(samples) for c in zip(*samples))
            dist = self._color_distance(avg, bg_color)
            if 5 < dist < 40:
                row_colors.append(avg)
        if row_colors:
            return self._dominant_color(row_colors, bucket_size=8)
        offset = 5 if sum(bg_color) / 3 < 128 else -5
        return tuple(max(0, min(255, c + offset)) for c in bg_color)

    def _find_line_color(self, img: Image.Image, y_start: int, y_end: int,
                          bg_color: tuple) -> tuple[int, int, int]:
        w = img.width
        line_candidates = []
        for y in range(y_start, y_end):
            samples = [img.getpixel((x, y)) for x in range(20, w - 20, 4)]
            if not samples:
                continue
            avg = tuple(sum(c) // len(samples) for c in zip(*samples))
            variance = sum(
                sum((s[i] - avg[i]) ** 2 for s in samples) / len(samples)
                for i in range(3)
            ) / 3
            dist = self._color_distance(avg, bg_color)
            if variance < 200 and 15 < dist < 100:
                line_candidates.append(avg)
        if line_candidates:
            return self._dominant_color(line_candidates, bucket_size=8)
        return (80, 85, 95)

    def _estimate_row_height(self, img: Image.Image, y_start: int, y_end: int) -> int:
        w = img.width
        brightness = []
        for y in range(y_start, y_end):
            samples = [sum(img.getpixel((x, y))) / 3 for x in range(20, w // 3, 8)]
            brightness.append(sum(samples) / len(samples) if samples else 0)
        if len(brightness) < 20:
            return 22
        transitions = []
        for i in range(1, len(brightness)):
            if abs(brightness[i] - brightness[i - 1]) > 5:
                transitions.append(i)
        if len(transitions) < 3:
            return 22
        gaps = [transitions[i + 1] - transitions[i] for i in range(len(transitions) - 1)]
        if not gaps:
            return 22
        common_gap = Counter(g for g in gaps if 10 < g < 60).most_common(1)
        return common_gap[0][0] if common_gap else 22
