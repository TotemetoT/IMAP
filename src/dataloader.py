import csv
import re
import configs as cfg

SUFFIXES = {"ii", "iii", "iv", "jr", "sr", "phd", "md", "edd"}


def parse_name_parts(raw_name):
    if not raw_name:
        return []
    cleaned = re.sub(r"[,.]", " ", str(raw_name))
    parts = [p.strip().lower() for p in cleaned.split() if p.strip()]
    return [p for p in parts if p not in SUFFIXES]


class Course:
    def __init__(self, row):
        self.row = row
        self.CRN = row[0].strip() if len(row) > 0 else ""
        self.course = row[1].strip() if len(row) > 1 else ""
        self.section = row[2].strip() if len(row) > 2 else ""
        self.title = row[3].strip() if len(row) > 3 else ""
        self.days = row[7].strip() if len(row) > 7 else ""
        self.time = row[8].strip() if len(row) > 8 else ""
        self.location = row[9].strip() if len(row) > 9 else ""
        self.instructor = row[10].strip() if len(row) > 10 else ""
        self.instructors_list = [
            parse_name_parts(inst)
            for inst in self.instructor.split(";")
            if inst.strip()
        ]


class Prof:
    def __init__(self, row):
        self.row = row
        self.prof = row[0].strip() if len(row) > 0 else ""
        self.office = row[1].strip() if len(row) > 1 else ""
        self.department = row[2].strip() if len(row) > 2 else ""
        self.college = row[3].strip() if len(row) > 3 else ""
        self.email = row[4].strip() if len(row) > 4 else ""
        self.website = row[5].strip() if len(row) > 5 else ""
        self.name_parts = parse_name_parts(self.prof)


def C_Load_CSV():
    """
    Loads the CSV without courses that are not in person:
    ARR, HYB, ASY, etc.
    """
    fname = cfg.COURSE_PATH
    rows = []
    with open(fname, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row or len(row) < 11:
                continue
            loc = row[9].strip()
            if loc and loc not in ("HYB", "ASY", "ARR"):
                rows.append(Course(row))
    return rows


def C_Full_Load_CSV():
    """
    Loads all courses from the CSV including ARR, HYB, ASY.
    """
    fname = cfg.COURSE_PATH
    rows = []
    with open(fname, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row or len(row) < 11:
                continue
            rows.append(Course(row))
    return rows


def P_Load_CSV():
    fname = cfg.PROF_PATH
    rows = []
    with open(fname, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row or not row[0].strip():
                continue
            rows.append(Prof(row))
    return rows