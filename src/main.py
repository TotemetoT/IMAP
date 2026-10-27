import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import dataloader as dl
import filter as f
import configs as cfg

# Lifespan context manager loads CSV data once when Render boots the app
@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg.COURSES = dl.Load_CSV()
    cfg.FULL_COURSES = dl.Full_Load_CSV()
    print(f"Loaded {len(cfg.COURSES)} active courses.")
    yield

app = FastAPI(lifespan=lifespan)

# Enable CORS for your interactive frontend
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
    """
    Fetches class times and course details for a clicked room on a specific day.
    Matches inputs like 'TFAC 205', '205', or 'SERC 1181'.
    """
    search_id = fullRoomId.strip().upper()

    # Extract room number token if fullRoomId includes building code (e.g., "205" from "TFAC 205")
    room_number = search_id.split()[-1] if " " in search_id else search_id

    matching_courses = []

    for course in cfg.COURSES:
        locations = [x.strip().upper() for x in course.location.split(";")]

        # Check if course location matches full string ("TFAC 205") or room number ("205")
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

    # Get formatted time ranges using your filter.py RoomTimes function
    raw_times = f.RoomTimes(room_number, day)

    return {
        "room": search_id,
        "times": raw_times,
        "classes": matching_courses
    }

@app.get("/api/search")
def search_courses(type: str, query: str, day: str = "M"):
    """
    Executes search queries using filter.py functions.
    """
    results = []

    if type == "Course":
        courses = f.Course(query)
        results = [
            {
                "course": c.course,
                "title": c.title,
                "instructor": c.instructor,
                "time": c.time,
                "location": c.location,
                "crn": c.CRN
            }
            for c in courses
        ]

    elif type == "Instructor":
        courses = f.Instructor(query)
        results = [
            {
                "course": c.course,
                "title": c.title,
                "instructor": c.instructor,
                "time": c.time,
                "location": c.location,
                "crn": c.CRN
            }
            for c in courses
        ]

    elif type == "CRN":
        c = f.CRN(query)
        if c:
            results = [
                {
                    "course": c.course,
                    "title": c.title,
                    "instructor": c.instructor,
                    "time": c.time,
                    "location": c.location,
                    "crn": c.CRN
                }
            ]

    return {"results": results}