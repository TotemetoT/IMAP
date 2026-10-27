from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import configs as cfg
import dataloader as dl
import filter as f

@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg.COURSES = dl.Load_CSV()
    cfg.FULL_COURSES = dl.Full_Load_CSV()
    print(f"Loaded {len(cfg.COURSES)} courses into memory.")
    yield

app = FastAPI(lifespan=lifespan)

# Add CORS Middleware at the very top of app configuration
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
    
    # If building isn't provided separately, try extracting it from fullRoomId (e.g., "TFAC 102")
    building_prefix = building.upper() if building else (search_id.split()[0] if " " in search_id else "")

    matching_courses = []

    for course in cfg.COURSES:
        c_location = str(getattr(course, "location", "") or "").upper()
        c_days = str(getattr(course, "days", "") or "")

        locations = [x.strip() for x in c_location.split(";")]

        # Ensure matching requires BOTH the building prefix and the room number
        location_matches = False
        for loc in locations:
            if building_prefix and building_prefix in loc and room_number in loc:
                location_matches = True
                break
            elif not building_prefix and (search_id in loc or room_number in loc):
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

    try:
        raw_times = f.RoomTimes(room_number, day)
    except Exception:
        raw_times = []

    return {
        "room": search_id,
        "times": raw_times,
        "classes": matching_courses
    }