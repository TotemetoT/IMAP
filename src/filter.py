import csv
import configs as cfg
import utils as u

def ProfessorDepartment(query):
    query = query.lower().strip()
    return [p for p in cfg.PROFS if query in (p.department or "").lower()]

def ProfessorCollege(query):
    query = query.lower().strip()
    return [p for p in cfg.PROFS if query in (p.college or "").lower()]

def ProfessorOffice(query):
    query = query.lower().strip()
    results = []
    for p in cfg.PROFS:
        office = (p.office or "").lower().strip()
        if not office:
            continue
        if query in office:
            results.append(p)
    return results

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
    courses = cfg.FULL_COURSES if full else cfg.COURSES
    N = N.lower().split(" ")
    Ilist = []
    for row in courses:
        I = (row.instructor or "").lower()
        if not I:
            continue
        if all(part in I for part in N):
            Ilist.append(row)
    return Ilist

def Course(C):
    courses = cfg.COURSES
    cList = []
    for course in courses:
        if (course.course).lower() == C.lower():
            cList.append(course)
    return cList