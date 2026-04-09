"""Application configuration."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "static" / "templates"
OUTPUT_DIR = BASE_DIR.parent / "output"
UPLOAD_DIR = BASE_DIR.parent / "uploads"

# DCS kneeboard dimensions (standard)
KNEEBOARD_WIDTH = 768
KNEEBOARD_HEIGHT = 1024

# Colors (R, G, B)
COLORS = {
    "bg_dark": (30, 32, 36),
    "bg_panel": (40, 44, 52),
    "text_white": (220, 220, 220),
    "text_green": (0, 255, 100),
    "text_amber": (255, 191, 0),
    "text_red": (255, 60, 60),
    "text_cyan": (0, 200, 255),
    "line_dim": (80, 85, 95),
    "line_bright": (140, 145, 155),
    "header_bg": (20, 60, 90),
    "row_alt": (35, 38, 44),
}

# Font sizes
FONT_SIZES = {
    "title": 28,
    "header": 20,
    "body": 16,
    "small": 13,
    "tiny": 11,
}

# Ensure dirs exist
OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
