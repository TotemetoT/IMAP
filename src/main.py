from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import configs as cfg
import dataloader as dl
import filter as f


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg.COURSES = dl.C_Load_CSV()
    cfg.FULL_COURSES = dl.C_Full_Load_CSV()
    cfg.PROFS = dl.P_Load_CSV()
    print(f"Loaded {len(cfg.COURSES)} courses and {len(cfg.PROFS)} professors into memory.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Campus Map API is live!"}


@app.get("/api/room-times")
def get_room_times(
    fullRoomId: str = Query(..., alias="fullRoomId"),
    building: str = Query(None),
    day: str = Query("M")
):
    search_id = fullRoomId.strip().upper()
    parsed_b, parsed_r = f.parse_building_room(search_id)

    building_prefix = building.strip().upper() if building else parsed_b
    room_number = parsed_r if parsed_r else (search_id.split()[-1] if " " in search_id else search_id)

    matching_courses = []

    for course in cfg.COURSES:
        c_location = str(getattr(course, "location", "") or "").upper()
        c_days = str(getattr(course, "days", "") or "")
        locations = [x.strip() for x in c_location.split(";") if x.strip()]

        location_matches = False
        for loc in locations:
            loc_b, loc_r = f.parse_building_room(loc)
            if building_prefix and loc_b == building_prefix and loc_r == room_number:
                location_matches = True
                break
            elif not building_prefix and (search_id == loc or room_number == loc_r):
                location_matches = True
                break

        if location_matches and day in c_days:
            matching_courses.append({
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "days": str(getattr(course, "days", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })

    # Match faculty strictly by building + room number pair
    professors = []
    for prof in cfg.PROFS:
        p_office_raw = str(getattr(prof, "office", "") or "").strip()
        if not p_office_raw:
            continue

        p_b, p_r = f.parse_building_room(p_office_raw)
        if building_prefix and p_b == building_prefix and p_r == room_number:
            prof_name = str(getattr(prof, "prof", "") or "")
            try:
                matched_prof_courses = f.Instructor(prof_name, full=True)
            except Exception as err:
                print(f"Error looking up courses for {prof_name}: {err}")
                matched_prof_courses = []

            prof_courses = [
                {
                    "course": str(getattr(c, "course", "") or ""),
                    "title": str(getattr(c, "title", "") or ""),
                    "crn": str(getattr(c, "CRN", "") or ""),
                    "days": str(getattr(c, "days", "") or ""),
                    "time": str(getattr(c, "time", "") or ""),
                    "location": str(getattr(c, "location", "") or "")
                }
                for c in matched_prof_courses
            ]
            professors.append({
                "name": prof_name,
                "office": p_office_raw,
                "email": str(getattr(prof, "email", "") or ""),
                "department": str(getattr(prof, "department", "") or ""),
                "college": str(getattr(prof, "college", "") or ""),
                "website": str(getattr(prof, "website", "") or ""),
                "courses": prof_courses
            })

    try:
        raw_times = f.RoomTimes(room_number, day, building_prefix)
    except Exception:
        raw_times = []

    return {
        "room": search_id,
        "times": raw_times,
        "classes": matching_courses,
        "professors": professors
    }


@app.get("/api/search")
def search_courses(
    type: str = Query("course"),
    query: str = Query(""),
    day: str = Query(None),
    time: str = Query(None)
):
    results = []

    if type == "course":
        for course in f.Course(query):
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "days": str(getattr(course, "days", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })
    elif type == "crn":
        match = f.CRN(query)
        if match:
            results.append({
                "result_type": "course",
                "course": str(getattr(match, "course", "") or ""),
                "title": str(getattr(match, "title", "") or ""),
                "instructor": str(getattr(match, "instructor", "") or ""),
                "crn": str(getattr(match, "CRN", "") or ""),
                "days": str(getattr(match, "days", "") or ""),
                "time": str(getattr(match, "time", "") or ""),
                "location": str(getattr(match, "location", "") or "")
            })
    elif type == "instructor":
        for course in f.Instructor(query, full=True):
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "days": str(getattr(course, "days", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })
    elif type in ("location", "room"):
        for course in f.Location(query):
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "days": str(getattr(course, "days", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })
    elif type == "department":
        for p in f.ProfessorDepartment(query):
            results.append({
                "result_type": "professor",
                "name": p.prof,
                "office": p.office,
                "email": p.email,
                "department": p.department,
                "college": p.college,
                "website": p.website
            })
    elif type == "college":
        for p in f.ProfessorCollege(query):
            results.append({
                "result_type": "professor",
                "name": p.prof,
                "office": p.office,
                "email": p.email,
                "department": p.department,
                "college": p.college,
                "website": p.website
            })
    elif type == "office":
        try:
            profs = f.ProfessorOffice(query)
        except ValueError as err:
            return {"results": [], "error": str(err)}

        for p in profs:
            results.append({
                "result_type": "professor",
                "name": p.prof,
                "office": p.office,
                "email": p.email,
                "department": p.department,
                "college": p.college,
                "website": p.website
            })
    elif type == "time":
        if time and day:
            used, _ = f.Time(time, day)
            for course in used:
                results.append({
                    "result_type": "course",
                    "course": str(getattr(course, "course", "") or ""),
                    "title": str(getattr(course, "title", "") or ""),
                    "instructor": str(getattr(course, "instructor", "") or ""),
                    "crn": str(getattr(course, "CRN", "") or ""),
                    "days": str(getattr(course, "days", "") or ""),
                    "time": str(getattr(course, "time", "") or ""),
                    "location": str(getattr(course, "location", "") or "")
                })
    elif type == "professor":
        for p in f.ProfessorName(query):
            results.append({
                "result_type": "professor",
                "name": p.prof,
                "office": p.office,
                "email": p.email,
                "department": p.department,
                "college": p.college,
                "website": p.website
            })

    return {"results": results}