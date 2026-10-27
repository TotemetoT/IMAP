import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI()

# Allow your website domain (or "*" for open access) to send requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CSV once when service boots
df = pd.read_csv("Fall2026.csv")

@app.get("/")
def home():
    return {"message": "Campus Map API is live!"}

@app.get("/api/room-times")
def get_room_times(fullRoomId: str, day: str):
    search_id = fullRoomId.strip().upper()
    matching_rows = []

    for idx, row in df.iterrows():
        loc_str = str(row['Location']) if pd.notna(row['Location']) else ""
        locations = [l.strip().upper() for l in loc_str.split(';')]

        if any(loc == search_id or loc.startswith(search_id) for loc in locations):
            days = str(row['Days']) if pd.notna(row['Days']) else ""
            if day in days:
                matching_rows.append({
                    "course": str(row['Course']),
                    "title": str(row['Title']),
                    "instructor": str(row['Instructor']) if pd.notna(row['Instructor']) else "",
                    "crn": str(row['CRN']),
                    "time": str(row['Time'])
                })

    return {"room": search_id, "classes": matching_rows}