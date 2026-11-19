import csv
import re
import configs as cfg
import dataloader as dl
import utils as u

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


def parse_building_room(location_str):
    """
    Parses canonical '<BUILDING> <ROOM>' strings:
      'LUTR 325'     -> ('LUTR', '325')
      'FORBES 3016'  -> ('FORBES', '3016')
      'FERG R113'    -> ('FERG', 'R113')
      'TRIB 240-1'   -> ('TRIB', '240-1')
    """
    if not location_str:
        return "", ""
    clean = location_str.strip().upper()
    match = re.match(r"^([A-Z]+)\s+([A-Z]?\d{3,5}(?:-[A-Z0-9]+|[A-Z])?)$", clean)
    if match:
        return match.group(1), match.group(2)
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
    if re.fullmatch(r"[A-Za-z]?\d{3,5}(?:-[A-Za-z0-9]+|[A-Za-z])?", clean_query):
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

def ProfessorName(query):
    query_tokens = dl.parse_name_parts(query)
    if not query_tokens:
        return []

    results = []
    for p in cfg.PROFS:
        prof_tokens = getattr(p, "name_parts", None) or dl.parse_name_parts(p.prof or "")
        if not prof_tokens:
            continue
        if all(_token_matches(q_tok, prof_tokens) for q_tok in query_tokens):
            results.append(p)
    return results


# ==============================
#        COURSE FILTERS
# ==============================

def CRN(val):
    for row in cfg.COURSES:
        if row.CRN == str(val).strip():
            return row
    return None


def Location(val, rooms=cfg.COURSES):
    clean_val = (val or "").strip()
    target_b, target_r = parse_building_room(clean_val)
    upper_val = clean_val.upper()

    L_dict = []
    for row in rooms:
        raw_loc = str(getattr(row, "location", "") or "").strip()
        if not raw_loc:
            continue
        for loc in [x.strip() for x in raw_loc.split(";") if x.strip()]:
            loc_b, loc_r = parse_building_room(loc)
            if target_b and target_r:
                if loc_b == target_b and loc_r == target_r:
                    L_dict.append(row)
                    break
            elif loc_b == upper_val or loc.lower().startswith(clean_val.lower()):
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
    clean_building = (building or "").strip().upper()
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
            if clean_building:
                if loc_b == clean_building and loc_r == clean_room:
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


def _token_matches(q_tok, inst_tokens):
    if q_tok in inst_tokens:
        return True
    variants = FIRST_NAME_VARIANTS.get(q_tok)
    if variants and any(v in inst_tokens for v in variants):
        return True
    return False


def Instructor(N, full=False):
    courses = cfg.FULL_COURSES if full else cfg.COURSES
    query_tokens = dl.parse_name_parts(N)
    if not query_tokens:
        return []

    Ilist = []
    for row in courses:
        inst_lists = getattr(row, "instructors_list", None)
        if not inst_lists:
            raw_inst = str(getattr(row, "instructor", "") or "")
            inst_lists = [dl.parse_name_parts(i) for i in raw_inst.split(";") if i.strip()]

        for inst_tokens in inst_lists:
            if not inst_tokens:
                continue
            if all(_token_matches(q_tok, inst_tokens) for q_tok in query_tokens):
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