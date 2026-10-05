from dataloader import Load_CSV, Full_Load_CSV

# ==========================
# FILE I/O
# ==========================

COURSE_PATH = "data/Fall2026.csv"

COURSES = Load_CSV()
FULL_COURSES = Full_Load_CSV()