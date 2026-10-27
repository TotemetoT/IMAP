
# ==========================
# FILE I/O
# ==========================

from pathlib import Path

# Get the directory where configs.py lives
BASE_DIR = Path(__file__).resolve().parent

# If Fall2026.csv is in the SAME folder as main.py / configs.py:
COURSE_PATH = BASE_DIR / "Fall2026.csv"

COURSES = []
FULL_COURSES = []