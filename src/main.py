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
    room_number = search_id.split()[-1] if " " in search_id else search_id
    raw_building = building.upper() if building else (search_id.split()[0] if " " in search_id else "")
    building_prefix = f.normalize_building(raw_building)

    matching_courses = []

    for course in cfg.COURSES:
        c_location = str(getattr(course, "location", "") or "").upper()
        c_days = str(getattr(course, "days", "") or "")
        locations = [x.strip() for x in c_location.split(";")]

        location_matches = False
        for loc in locations:
            loc_building, loc_room = f.parse_building_room(loc)
            if building_prefix and loc_building == building_prefix and loc_room == room_number:
                location_matches = True
                break
            elif not building_prefix and (search_id == loc or room_number == loc_room):
                location_matches = True
                break

        if location_matches and day in c_days:
            matching_courses.append({
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })

    # Search for faculty matching BOTH the exact building code and room number
    professors = []
    for prof in cfg.PROFS:
        p_office_raw = str(getattr(prof, "office", "") or "").strip()
        if not p_office_raw:
            continue

        p_building, p_room = f.parse_building_room(p_office_raw)
        if building_prefix and p_building == building_prefix and p_room == room_number:
            professors.append({
                "name": str(getattr(prof, "prof", "") or ""),
                "office": p_office_raw,
                "email": str(getattr(prof, "email", "") or ""),
                "department": str(getattr(prof, "department", "") or ""),
                "college": str(getattr(prof, "college", "") or ""),
                "website": str(getattr(prof, "website", "") or "")
            })

    try:
        raw_times = f.RoomTimes(room_number, day)
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
        courses = f.Course(query)
        for course in courses:
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
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
                "time": str(getattr(match, "time", "") or ""),
                "location": str(getattr(match, "location", "") or "")
            })
    elif type == "instructor":
        courses = f.Instructor(query)
        for course in courses:
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })
    elif type in ("location", "room"):
        courses = f.Location(query)
        for course in courses:
            results.append({
                "result_type": "course",
                "course": str(getattr(course, "course", "") or ""),
                "title": str(getattr(course, "title", "") or ""),
                "instructor": str(getattr(course, "instructor", "") or ""),
                "crn": str(getattr(course, "CRN", "") or ""),
                "time": str(getattr(course, "time", "") or ""),
                "location": str(getattr(course, "location", "") or "")
            })
    elif type == "department":
        profs = f.ProfessorDepartment(query)
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
    elif type == "college":
        profs = f.ProfessorCollege(query)
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
                    "time": str(getattr(course, "time", "") or ""),
                    "location": str(getattr(course, "location", "") or "")
                })

    return {"results": results}