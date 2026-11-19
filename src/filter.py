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

FIRST_NAME_VARIANTS = {
    "rob": {"rob", "robert", "bob", "bobby"},
    "robert": {"rob", "robert", "bob", "bobby"},
    "drew": {"drew", "andrew"},
    "andrew": {"drew", "andrew"},
    "joe": {"joe", "joey", "joseph"},
    "joey": {"joe", "joey", "joseph"},
    "joseph": {"joe", "joey", "joseph"},
    "russ": {"russ", "russell"},
    "russell": {"russ", "russell"},
    "bill": {"bill", "william", "will"},
    "will": {"bill", "william", "will"},
    "william": {"bill", "william", "will"},
    "mike": {"mike", "michael"},
    "michael": {"mike", "michael"},
    "chris": {"chris", "christopher"},
    "christopher": {"chris", "christopher"},
    "dan": {"dan", "daniel", "danny"},
    "daniel": {"dan", "daniel", "danny"},
    "matt": {"matt", "matthew"},
    "matthew": {"matt", "matthew"},
    "tom": {"tom", "thomas"},
    "thomas": {"tom", "thomas"},
    "jim": {"jim", "james", "jaime"},
    "james": {"jim", "james", "jaime"},
    "steve": {"steve", "steven", "stephen"},
    "steven": {"steve", "steven", "stephen"},
    "stephen": {"steve", "steven", "stephen"},
    "dave": {"dave", "david"},
    "david": {"dave", "david"},
    "liz": {"liz", "elizabeth", "beth"},
    "elizabeth": {"liz", "elizabeth", "beth"},
    "kate": {"kate", "katherine", "kathryn", "katie"},
    "katherine": {"kate", "katherine", "kathryn", "katie"},
    "kathryn": {"kate", "katherine", "kathryn", "katie"},
}

SUFFIXES = {"ii", "iii", "iv", "jr", "sr"}

def normalize_building(building_str):
    if not building_str:
        return ""
    clean = re.sub(r"[^A-Z]", "", building_str.strip().upper())
    return BUILDING_ALIASES.get(clean, clean)

def parse_building_room(location_str):
    """
    Parses strings like 'Luter 238', 'FORBES 3016', 'MCM 201J', or 'FERG T177'
    into ('LUTR', '238'), ('FORBES', '3016'), ('MCM', '201J'), ('FERG', 'T177').
    """
    if not location_str:
        return "", ""
    clean = location_str.strip().upper()
    match = re.match(r"^([A-Z]+)\s+([A-Z]?\d{3,5}[A-Z]?)$", clean)
    if match:
        return normalize_building(match.group(1)), match.group(2)
    return "", ""

def _strip_suffixes(tokens):
    return [t for t in tokens if re.sub(r"\.", "", t).lower() not in SUFFIXES]

def _first_names_match(first_a, first_b):
    a = first_a.lower().strip()
    b = first_b.lower().strip()
    if a == b:
        return True
    return b in FIRST_NAME_VARIANTS.get(a, {a})

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
    if re.fullmatch(r"[A-Za-z]?\d{3,5}[A-Za-z]?", clean_query):
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
    clean_val = (val or "").strip()
    target_b, target_r = parse_building_room(clean_val)
    norm_prefix = normalize_building(clean_val)

    L_dict = []
    for row in rooms:
        raw_loc = str(getattr(row, "location", "") or "").strip()
        if not raw_loc:
            continue
        locations = [x.strip() for x in raw_loc.split(";") if x.strip()]
        for loc in locations:
            loc_b, loc_r = parse_building_room(loc)
            if target_b and target_r:
                if loc_b == target_b and loc_r == target_r:
                    L_dict.append(row)
                    break
            elif norm_prefix and loc_b == norm_prefix:
                L_dict.append(row)
                break
            elif loc.lower().startswith(clean_val.lower()):
                L_dict.append(row)
                break
    return L_dict

def Time(t, d):
    t = int(t)
    courses = cfg.COURSES
    used = []
    unused = []

    for course in courses:
        raw_time = str(getattr(course, "time", "") or "").strip()
        raw_days = str(getattr(course, "days", "") or "")
        time_ranges = [x.strip() for x in raw_time.split(";") if "-" in x]
        course_is_active = False

        if d in raw_days:
            for time_range in time_ranges:
                parts = time_range.split("-", 1)
                if parts[0].isdigit() and parts[1].isdigit():
                    if int(parts[0]) <= t <= int(parts[1]):
                        course_is_active = True
                        break

        if course_is_active:
            used.append(course)
        else:
            unused.append(course)

    return used, unused

def RoomTimes(room, d, building=None):
    courses = cfg.COURSES
    times = []
    norm_building = normalize_building(building) if building else ""
    clean_room = (room or "").strip().upper()

    for course in courses:
        raw_loc = str(getattr(course, "location", "") or "")
        raw_days = str(getattr(course, "days", "") or "")
        raw_time = str(getattr(course, "time", "") or "")

        if d not in raw_days:
            continue

        locations = [x.strip() for x in raw_loc.split(";") if x.strip()]
        matched = False
        for loc in locations:
            loc_b, loc_r = parse_building_room(loc)
            if norm_building:
                if loc_b == norm_building and loc_r == clean_room:
                    matched = True
                    break
            elif loc_r == clean_room or clean_room in loc.upper():
                matched = True
                break

        if not matched:
            continue

        time_ranges = [x.strip() for x in raw_time.split(";") if "-" in x]
        for time_range in time_ranges:
            start, end = time_range.split("-", 1)
            times.append({"start": start.strip(), "end": end.strip()})

    return times

def ID_room(R, rooms=cfg.COURSES):
    R = str(R)
    for room in rooms:
        if R in room.location:
            return room

def Instructor(N, full=False):
    courses = cfg.FULL_COURSES if full else cfg.COURSES
    raw_query = (N or "").strip()
    if not raw_query:
        return []

    if "," in raw_query:
        last_part, first_part = [p.strip() for p in raw_query.split(",", 1)]
        q_first = first_part.split()[0].lower() if first_part else ""
        q_last = " ".join(_strip_suffixes(last_part.split())).lower()
    else:
        tokens = _strip_suffixes(raw_query.split())
        if len(tokens) == 1:
            q_first = ""
            q_last = tokens[0].lower()
        else:
            q_first = tokens[0].lower()
            q_last = " ".join(tokens[1:]).lower()

    Ilist = []
    for row in courses:
        raw_inst = getattr(row, "instructor", None)
        if not raw_inst:
            continue

        instructors = [i.strip() for i in str(raw_inst).split(";") if i.strip()]
        for inst in instructors:
            if "," in inst:
                inst_last_raw, inst_first_raw = [p.strip() for p in inst.split(",", 1)]
                inst_last = " ".join(_strip_suffixes(inst_last_raw.split())).lower()
                inst_first = inst_first_raw.split()[0].lower() if inst_first_raw else ""
            else:
                inst_tokens = _strip_suffixes(inst.split())
                inst_first = inst_tokens[0].lower() if inst_tokens else ""
                inst_last = " ".join(inst_tokens[1:]).lower() if len(inst_tokens) > 1 else ""

            if not q_first:
                if q_last == inst_last or q_last in inst_last.split() or _first_names_match(q_last, inst_first):
                    Ilist.append(row)
                    break
            else:
                last_matches = (q_last == inst_last) or (q_last.split()[-1] == inst_last.split()[-1])
                if last_matches and _first_names_match(q_first, inst_first):
                    Ilist.append(row)
                    break

    return Ilist

def Course(C):
    courses = cfg.COURSES
    cList = []
    for course in courses:
        if (course.course).lower() == C.lower():
            cList.append(course)
    return cList