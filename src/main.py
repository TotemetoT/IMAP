from contextlib import asynccontextmanager
from fastapi import FastAPI
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

# MUST BE ADDED IMMEDIATELY AFTER app = FastAPI(...)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://totemetot.github.io",  # Explicitly allow your GitHub Pages site
        "*"                             # Fallback to allow any origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Campus Map API is live!"}

@app.get("/api/room-times")
def get_room_times(fullRoomId: str, day: str):
    search_id = fullRoomId.strip().upper()
    room_number = search_id.split()[-1] if " " in search_id else search_id

    matching_courses = []

    for course in cfg.COURSES:
        c_location = str(course.location or "").upper()
        c_days = str(course.days or "")

        locations = [x.strip() for x in c_location.split(";")]

        location_matches = any(
            search_id in loc or room_number in loc
            for loc in locations
        )

        if location_matches and day in c_days:
            matching_courses.append({
                "course": str(course.course or ""),
                "title": str(course.title or ""),
                "instructor": str(course.instructor or ""),
                "crn": str(course.CRN or ""),
                "time": str(course.time or ""),
                "location": str(course.location or "")
            })

    raw_times = f.RoomTimes(room_number, day)

    return {
        "room": search_id,
        "times": raw_times,
        "classes": matching_courses
    }