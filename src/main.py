from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import configs as cfg
import dataloader as dl
import filter as f

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load course data into configs on startup
    cfg.COURSES = dl.Load_CSV()
    cfg.FULL_COURSES = dl.Full_Load_CSV()
    print(f"Loaded {len(cfg.COURSES)} courses into memory.")
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
def get_room_times(fullRoomId: str, day: str):
    search_id = fullRoomId.strip().upper()
    room_number = search_id.split()[-1] if " " in search_id else search_id

    matching_courses = []

    for course in cfg.COURSES:
        locations = [x.strip().upper() for x in course.location.split(";")]

        location_matches = any(
            search_id in loc or room_number in loc
            for loc in locations
        )

        if location_matches and day in course.days:
            matching_courses.append({
                "course": course.course,
                "title": course.title,
                "instructor": course.instructor,
                "crn": course.CRN,
                "time": course.time,
                "location": course.location
            })

    raw_times = f.RoomTimes(room_number, day)

    return {
        "room": search_id,
        "times": raw_times,
        "classes": matching_courses
    }