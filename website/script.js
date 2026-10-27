/* ============================================================
   script.js
   Main browser controller for the building floor plans.
   ============================================================ */

import {
    filterByCRN,
    filterByCourse,
    filterByLocation,
    filterByInstructor,
    filterByTime,
    filterByRoom,
    filterRoomTimes
} from "./filter.js";

// Replace this with your actual Render API URL
const RENDER_API_URL = "https://IMAP.onrender.com";

async function updateRoomInformation(room) {
    const roomName = document.getElementById("room-name");
    const roomDescription = document.getElementById("room-description");

    if (!roomName || !roomDescription || !room) return;

    const fullRoomId = room.id || room.dataset.name || room.dataset.room || "";
    const today = getTodayCode();

    roomName.textContent = fullRoomId;
    roomDescription.textContent = "Loading schedule...";

    try {
        const response = await fetch(
            `${RENDER_API_URL}/api/room-times?fullRoomId=${encodeURIComponent(fullRoomId)}&day=${today}`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const times = data.classes;

        if (times.length === 0) {
            roomDescription.textContent = "No classes scheduled today.";
            return;
        }

        roomDescription.replaceChildren();

        const heading = document.createElement("strong");
        heading.textContent = "Today's Classes";
        roomDescription.appendChild(heading);

        times.forEach(item => {
            const entry = document.createElement("div");
            entry.className = "room-class";
            entry.innerHTML = `
                <strong>${item.time}</strong><br>
                <span>${item.course} - ${item.title}</span><br>
                <small>${item.instructor}</small>
            `;
            roomDescription.appendChild(entry);
        });

    } catch (error) {
        console.error("Error fetching room details:", error);
        roomDescription.textContent = "Unable to fetch class schedule.";
    }
}


// ============================================================
// COURSE DATA
// ============================================================

let courses = [];

// ============================================================
// DECODE HTML ENTITIES
// ============================================================

function decodeHTMLEntities(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    return doc.body.textContent || text;
}

// ============================================================
// LOAD COURSE DATA
// ============================================================

async function loadCourses() {
    try {
        const response = await fetch("../../../data/Fall2026.csv");

        if (!response.ok) {
            throw new Error(
                `Could not load Fall2026.csv (${response.status})`
            );
        }

        const csvText = await response.text();

        courses = parseCSV(csvText);

        console.log(`Loaded ${courses.length} courses.`);

        // Refresh room details if a room was selected
        // before the CSV finished loading.
        updateSelectedRoom();

    } catch (error) {
        console.error("Failed to load course data:", error);

        const roomDescription =
            document.getElementById("room-description");

        if (roomDescription) {
            roomDescription.textContent =
                "Unable to load the course schedule.";
        }
    }
}


// ============================================================
// CSV PARSER
// Handles quoted fields, commas inside quotes,
// escaped double quotes, and Windows line endings.
// ============================================================

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            field += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(field);
            field = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") {
                i++;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows.shift().map((header, index) =>
        index === 0
            ? header.trim().replace(/^\uFEFF/, "")
            : header.trim()
    );

    return rows
        .filter(row => row.some(value => value.trim() !== ""))
        .map(row => {
            const course = {};

            headers.forEach((header, index) => {
                const rawVal = (row[index] || "").trim();
                // Decode entities (e.g. &#39;) for all CSV fields here
                course[header] = decodeHTMLEntities(rawVal);
            });

            return course;
        });
}


// ============================================================
// DAY HANDLING
// M = Monday, T = Tuesday, W = Wednesday,
// R = Thursday, F = Friday, S = Saturday, U = Sunday.
// ============================================================

function getTodayCode() {
    const day = new Date().getDay();

    return ["U", "M", "T", "W", "R", "F", "S"][day];
}


// ============================================================
// BUILDING SUPPORT
// Each HTML page should specify data-building on its body.
// Example: <body data-building="TFAC">
// ============================================================

function getCurrentBuilding() {
    return (document.body.dataset.building || "").trim();
}


// ============================================================
// ROOM TIMES
// Filtering is handled by filter.js.
// ============================================================

function roomTimes(room, day) {
    return filterRoomTimes(
        courses,
        room,
        day,
        getCurrentBuilding()
    );
}


// ============================================================
// TIME FORMATTING
// Converts 0800 to 8:00 AM and 1700 to 5:00 PM.
// ============================================================

function formatTime(time) {
    if (!time || time.length < 4) {
        return time;
    }

    const hours = parseInt(time.substring(0, 2), 10);
    const minutes = time.substring(2, 4);

    if (Number.isNaN(hours)) {
        return time;
    }

    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${suffix}`;
}


// ============================================================
// TIME CONVERSION
// ============================================================

function timeToMinutes(time) {
    if (!time || !/^\d{4}$/.test(time)) {
        return null;
    }

    const hours = parseInt(time.substring(0, 2), 10);
    const minutes = parseInt(time.substring(2, 4), 10);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours > 23 ||
        minutes > 59
    ) {
        return null;
    }

    return hours * 60 + minutes;
}


// ============================================================
// CHECK WHETHER A CLASS IS CURRENTLY IN PROGRESS
// ============================================================

function isClassCurrentlyActive(start, end) {
    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    if (startMinutes === null || endMinutes === null) {
        return false;
    }

    return (
        startMinutes <= currentMinutes &&
        currentMinutes <= endMinutes
    );
}


// ============================================================
// ROOM INFORMATION
// ============================================================

function updateRoomInformation(room) {
    const roomName = document.getElementById("room-name");
    const roomDescription =
        document.getElementById("room-description");

    if (!roomName || !roomDescription || !room) {
        return;
    }

    const rawName =
        room.dataset.name ||
        room.dataset.room ||
        "Selected Room";

    const name = decodeHTMLEntities(rawName);

    const number = room.dataset.room;
    const today = getTodayCode();

    const times = roomTimes(number, today);

    roomName.textContent = name;

    if (times.length === 0) {
        roomDescription.textContent =
            "No classes scheduled today.";
        return;
    }

    // Create elements instead of inserting CSV values
    // directly into HTML.
    roomDescription.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = "Today's Classes";
    roomDescription.appendChild(heading);

    for (const time of times) {
        const entry = document.createElement("div");
        entry.className = "room-class";

        const timeLabel = document.createElement("strong");
        timeLabel.textContent =
            `${formatTime(time.start)} - ${formatTime(time.end)}`;

        entry.appendChild(timeLabel);

        if (isClassCurrentlyActive(time.start, time.end)) {
            const activeLabel = document.createElement("strong");
            activeLabel.textContent = " (In use now)";
            entry.appendChild(activeLabel);
        }

        if (time.course || time.title) {
            const courseDetails = document.createElement("div");

            courseDetails.textContent =
                [time.course, time.title]
                    .filter(Boolean)
                    .join(" - ");

            entry.appendChild(courseDetails);
        }

        if (time.instructor) {
            const instructor = document.createElement("small");
            instructor.textContent = time.instructor;

            entry.appendChild(instructor);
        }

        roomDescription.appendChild(entry);
    }
}


// ============================================================
// UPDATE CURRENTLY SELECTED ROOM
// ============================================================

function updateSelectedRoom() {
    const selectedRoom =
        document.querySelector(".room.selected");

    if (selectedRoom) {
        updateRoomInformation(selectedRoom);
    }
}


// ============================================================
// ROOM CLICK HANDLERS
// ============================================================

function initializeRooms() {
    const rooms = document.querySelectorAll(".room");

    rooms.forEach(room => {
        room.addEventListener("click", function () {
            rooms.forEach(r =>
                r.classList.remove("selected")
            );

            this.classList.add("selected");

            updateRoomInformation(this);
        });
    });

    console.log(`Initialized ${rooms.length} rooms.`);
}


// ============================================================
// FLOOR SWITCHING
// Supports showFloor(1), showFloor(2), etc.
// ============================================================

function showFloor(floorNumber) {
    document.querySelectorAll(".floor").forEach(floor => {
        floor.classList.remove("active");
    });

    const selectedFloor =
        document.getElementById(`floor-${floorNumber}`);

    if (selectedFloor) {
        selectedFloor.classList.add("active");
    }
}


// ============================================================
// COURSE SEARCH
// Chooses the appropriate filter and returns matching courses.
// ============================================================

function searchCourses(searchType, query) {
    if (courses.length === 0) {
        return [];
    }

    switch (searchType) {
        case "CRN": {
            const result = filterByCRN(courses, query);
            return result ? [result] : [];
        }

        case "Course":
            return filterByCourse(courses, query);

        case "Location":
            return filterByLocation(courses, query);

        case "Instructor":
            return filterByInstructor(courses, query);

        case "Room":
            return filterByRoom(
                courses,
                query,
                getCurrentBuilding()
            );

        case "Time":
            return filterByTime(
                courses,
                query,
                getTodayCode()
            );

        default:
            return [];
    }
}


// ============================================================
// DISPLAY SEARCH RESULTS
// Expects an element with id="search-results".
// ============================================================

function displaySearchResults(results) {
    const container =
        document.getElementById("search-results");

    if (!container) {
        console.warn("Missing #search-results element.");
        return;
    }

    container.replaceChildren();

    if (results.length === 0) {
        container.textContent = courses.length === 0
            ? "The course schedule has not loaded yet."
            : "No matching courses found.";

        return;
    }

    for (const course of results) {
        const item = document.createElement("div");
        item.className = "search-result";

        const heading = document.createElement("strong");
        heading.textContent =
            `${course.Course || ""} — ${course.Title || ""}`;

        const details = document.createElement("p");
        details.textContent =
            `CRN: ${course.CRN || ""} | ` +
            `Days: ${course.Days || ""} | ` +
            `Time: ${course.Time || ""} | ` +
            `Location: ${course.Location || ""} | ` +
            `Instructor: ${course.Instructor || ""}`;

        item.append(heading, details);
        container.appendChild(item);
    }
}


// ============================================================
// SEARCH UI INITIALIZATION
//
// Optional HTML controls:
//   #course-search       Search input
//   #search-type         Select with filter options
//   #search-button       Search button
//   #search-results      Results container
//
// The HTML must use these IDs for this automatic wiring.
// ============================================================

function initializeSearch() {
    const input = document.getElementById("course-search");
    const typeSelect = document.getElementById("search-type");
    const button = document.getElementById("search-button");

    if (!input || !typeSelect) {
        // The building page may not have a search interface.
        return;
    }

    function runSearch() {
        const query = input.value.trim();
        const type = typeSelect.value;

        if (!query) {
            displaySearchResults([]);
            return;
        }

        displaySearchResults(
            searchCourses(type, query)
        );
    }

    if (button) {
        button.addEventListener("click", runSearch);
    }

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            runSearch();
        }
    });
}


// ============================================================
// SVG MOUSE COORDINATES
// ============================================================

function initializeMouseCoordinates() {
    const coordinateBox =
        document.getElementById("mouse-coordinates");

    const xDisplay =
        document.getElementById("mouse-x");

    const yDisplay =
        document.getElementById("mouse-y");

    const overlays =
        document.querySelectorAll("svg.room-overlay");

    if (!coordinateBox || !xDisplay || !yDisplay) {
        return;
    }

    overlays.forEach(svg => {
        svg.addEventListener("mousemove", event => {
            const matrix = svg.getScreenCTM();

            if (!matrix) return;

            const point = svg.createSVGPoint();

            point.x = event.clientX;
            point.y = event.clientY;

            const svgPoint =
                point.matrixTransform(matrix.inverse());

            const viewBox = svg.viewBox.baseVal;

            const x = Math.max(
                viewBox.x,
                Math.min(viewBox.x + viewBox.width, svgPoint.x)
            );

            const y = Math.max(
                viewBox.y,
                Math.min(viewBox.y + viewBox.height, svgPoint.y)
            );

            xDisplay.textContent = Math.round(x);
            yDisplay.textContent = Math.round(y);

            coordinateBox.style.display = "block";
        });

        svg.addEventListener("mouseleave", () => {
            xDisplay.textContent = "---";
            yDisplay.textContent = "---";
        });
    });
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    initializeRooms();
    initializeSearch();
    initializeMouseCoordinates();
    initializePanelToggle();

    loadCourses();
});


// ============================================================
// OPTIONAL GLOBAL FUNCTIONS
// Keep these if your HTML uses inline onclick attributes,
// such as onclick="showFloor(2)".
// ============================================================

window.showFloor = showFloor;
window.searchCourses = searchCourses;
window.displaySearchResults = displaySearchResults;
window.updateSelectedRoom = updateSelectedRoom;

// ============================================================
// PANEL TOGGLING (ROOM INFO vs SEARCH VIEW)
// ============================================================

function initializePanelToggle() {
    // Target the navbar Search button using its ID or text content
    const navSearchBtn = document.getElementById("nav-search-btn");
    const roomInfoView = document.getElementById("room-info-view");
    const searchInfoView = document.getElementById("search-info-view");
    const backToRoomBtn = document.getElementById("back-to-room");

    function showSearchPanel(event) {
        if (event) event.preventDefault();
        if (roomInfoView && searchInfoView) {
            roomInfoView.hidden = true;
            searchInfoView.hidden = false;
        }
    }

    function showRoomPanel() {
        if (roomInfoView && searchInfoView) {
            searchInfoView.hidden = true;
            roomInfoView.hidden = false;
        }
    }

    if (navSearchBtn) {
        navSearchBtn.addEventListener("click", showSearchPanel);
    }

    if (backToRoomBtn) {
        backToRoomBtn.addEventListener("click", showRoomPanel);
    }
}