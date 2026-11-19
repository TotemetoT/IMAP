import csv
import re
import configs as cfg
import utils as u

BUILDING_ALIASES = {
    "FORBES": "FORBES",
    "LUTR": "LUTR",
    "LUTER": "LUTR",
    "TRIB": "TRIB",
    "TRIBLE": "TRIB",
    "TFAC": "TFAC",
    "MCM": "MCM",
    "MCMURRAN": "MCM",
    "SERC": "SERC",
    "FERG": "FERG",
    "FERGUSON": "FERG",
}

def normalize_building(building_str):
    if not building_str:
        return ""
    clean = re.sub(r"[^A-Z]", "", building_str.strip().upper())
    return BUILDING_ALIASES.get(clean, clean)

def parse_building_room(location_str):
    """
    Parses strings like 'Luter 238', 'FORBES 3016', or 'MCM 201J'
    into ('LUTR', '238'), ('FORBES', '3016'), ('MCM', '201J').
    """
    if not location_str:
        return "", ""
    clean = location_str.strip().upper()
    match = re.match(r"^([A-Z]+)\s+(\d{3,5}[A-Z]?)$", clean)
    if match:
        return normalize_building(match.group(1)), match.group(2)
    return "", ""

# ==============================
#    PROFESSOR OFFICE FILTERS
# ==============================

def ProfessorDepartment(query):
    query = query.lower().strip()
    return [p for p in cfg.PROFS if query in (p.department or "").lower()]

def ProfessorCollege(query):
    query = query.lower().strip()
    return [p for p in cfg.PROFS if query in (p.college or "").lower()]

def ProfessorOffice(query):
    clean_query = (query or "").strip()

    # Check if user entered only a room number (3-5 digits + optional letter) without a building
    if re.fullmatch(r"\d{3,5}[A-Za-z]?", clean_query):
        raise ValueError("missing building name, use the following format (LUTR 121)")

    target_building, target_room = parse_building_room(clean_query)
    if not target_building or not target_room:
        raise ValueError("missing building name, use the following format (LUTR 121)")

    results = []
    for p in cfg.PROFS:
        p_building, p_room = parse_building_room(p.office or "")
        if p_building == target_building and p_room == target_room:
            results.append(p)
    return results

# ============================== 
#        COURSE FILTERS
# ==============================

def CRN(val):
    for row in cfg.COURSES:
        if row.CRN == str(val):
            return row
    return None

def Location(val, rooms=cfg.COURSES):
    L_dict = []
    for row in rooms: 
        if (row.location).lower()[:len(val)] == val.lower():
            L_dict.append(row)               
    return L_dict

def Time(t, d):
    t = int(t)
    courses = cfg.COURSES
    used = []
    unused = []

    for course in courses:
        time_ranges = [x.strip() for x in course.time.split(";")]
        course_is_active = False

        if d in course.days:
            for time_range in time_ranges:
                start, end = time_range.split("-")
                if int(start) <= t <= int(end):
                    course_is_active = True
                    break

        if course_is_active:
            used.append(course)
        else:
            unused.append(course)

    return used, unused

def RoomTimes(room, d):
    courses = cfg.COURSES
    times = []
    for course in courses:
        locations = [x.strip() for x in course.location.split(";")]
        if not any(room in loc for loc in locations):
            continue
        if d not in course.days:
            continue
        time_ranges = [x.strip() for x in course.time.split(";")]
        for time_range in time_ranges:
            start, end = time_range.split("-")
            times.append({"start": start, "end": end})
    return times

def ID_room(R, rooms=cfg.COURSES):
    R = str(R)
    for room in rooms:
        if R in room.location:
            return room

def Instructor(N, full=False):
    if full: 
        courses = cfg.FULL_COURSES
    else: 
        courses = cfg.COURSES
    N = N.split(" ")
    Ilist = []
    for row in courses:
        I = row.instructor
        if I == [] or I == None or I == '': continue
        if '; ' in I:
            I = I.split('; ')
            c = 0
            for i in I:
                I[c] = i.split(', ')
                c += 1
            for _ in range(len(I)):
                I.append(I[0][0])
                I.append(I[0][1])
                I.remove(I[0])
        else: 
            I = I.split(', ')
        if len(N) == 1:
            if N[0].capitalize() in I: 
                Ilist.append(row)
        elif N[0].capitalize() in I and N[1].capitalize() in I:
            Ilist.append(row)
    return Ilist

def Course(C):
    courses = cfg.COURSES
    cList = []
    for course in courses:
        if (course.course).lower() == C.lower():
            cList.append(course)
    return cList