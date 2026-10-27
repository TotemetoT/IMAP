const RENDER_API_URL = "https://imap-bi2w.onrender.com";

// ============================================================
// HELPER: GET CURRENT DAY CODE
// M = Monday, T = Tuesday, W = Wednesday,
// R = Thursday, F = Friday, S = Saturday, U = Sunday.
// ============================================================
function getTodayCode() {
    const day = new Date().getDay();
    return ["U", "M", "T", "W", "R", "F", "S"][day];
}


// ============================================================
// FETCH & DISPLAY ROOM INFORMATION FROM PYTHON BACKEND
// ============================================================
async function updateRoomInformation(room) {
    const roomName = document.getElementById("room-name");
    const roomDescription = document.getElementById("room-description");

    if (!roomName || !roomDescription || !room) return;

    let fullRoomId = room.dataset.name || room.id || room.dataset.room || "Selected Room";
    const building = document.body.dataset.building || "";
    const today = getTodayCode();

    if (building && !fullRoomId.startsWith(building)) {
        fullRoomId = `${building} ${fullRoomId}`;
    }

    roomName.textContent = fullRoomId;
    roomDescription.textContent = "Loading schedule...";

    try {
        const response = await fetch(
            `${RENDER_API_URL}/api/room-times?fullRoomId=${encodeURIComponent(fullRoomId)}&building=${encodeURIComponent(building)}&day=${today}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const classes = data.classes;

        if (!classes || classes.length === 0) {
            roomDescription.textContent = "No classes scheduled today.";
            return;
        }

        roomDescription.replaceChildren();

        const heading = document.createElement("strong");
        heading.textContent = "Today's Classes";
        roomDescription.appendChild(heading);

        classes.forEach(item => {
            const entry = document.createElement("div");
            entry.className = "room-class";
            entry.style.marginTop = "10px";
            entry.style.padding = "8px";
            entry.style.background = "#f0f4f8";
            entry.style.borderRadius = "4px";

            // Format the raw HHMM time range here
            const formattedTime = formatTimeRange(item.time);

            entry.innerHTML = `
                <strong>${formattedTime}</strong><br>
                <span>${item.course} - ${item.title}</span><br>
                <small>Instructor: ${item.instructor || "N/A"}</small>
            `;
            roomDescription.appendChild(entry);
        });

    } catch (error) {
        console.error("Error fetching room details from Python API:", error);
        roomDescription.textContent = "Unable to fetch class schedule.";
    }
}


// ============================================================
// ROOM SELECTION & CLICK HANDLERS
// ============================================================
function initializeRooms() {
    const rooms = document.querySelectorAll(".room");

    rooms.forEach(room => {
        room.addEventListener("click", function (e) {
            e.stopPropagation();

            // Remove selection state from all rooms
            rooms.forEach(r => r.classList.remove("selected"));

            // Highlight clicked polygon
            this.classList.add("selected");

            // Fetch and update sidebar info
            updateRoomInformation(this);
        });
    });

    console.log(`Initialized click handlers for ${rooms.length} rooms.`);
}


// ============================================================
// FLOOR SWITCHING FUNCTIONALITY
// ============================================================
function showFloor(floorNumber) {
    document.querySelectorAll(".floor").forEach(floor => {
        floor.classList.remove("active");
    });

    const selectedFloor = document.getElementById(`floor-${floorNumber}`);
    if (selectedFloor) {
        selectedFloor.classList.add("active");
    }
}


// ============================================================
// INITIALIZATION ON DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initializeRooms();
    setupSearchHandlers();
});

// Expose floor switching to window for HTML onclick attributes
window.showFloor = showFloor;

// Converts "0800-0850" to "08:00 - 08:50" or single "0800" to "08:00"
function formatTimeRange(timeStr) {
    if (!timeStr) return "N/A";

    const formatHHMM = (hhmm) => {
        const clean = hhmm.trim();
        if (clean.length === 4) {
            return `${clean.slice(0, 2)}:${clean.slice(2)}`;
        }
        return clean;
    };

    // If it's a range like "0800-0850" or "0800 - 0850"
    if (timeStr.includes("-")) {
        return timeStr
            .split("-")
            .map(t => formatHHMM(t))
            .join(" - ");
    }

    return formatHHMM(timeStr);
}


// ============================================================
// SEARCH PANEL VIEW CONTROLLER
// ============================================================

function setupSearchHandlers() {
    const navSearchBtn = document.getElementById("nav-search-btn");
    const backToRoomBtn = document.getElementById("back-to-room");
    const clearSearchBtn = document.getElementById("clear-search");
    const roomInfoView = document.getElementById("room-info-view");
    const searchInfoView = document.getElementById("search-info-view");
    const filterTypeSelect = document.getElementById("filter-type");
    const queryField = document.getElementById("query-field");
    const queryLabel = document.getElementById("query-label");
    const timeOptions = document.getElementById("time-options");
    const searchForm = document.getElementById("course-search-form");
    const searchResults = document.getElementById("search-results");

    if (!searchForm) return;

    // Open Search View
    if (navSearchBtn) {
        navSearchBtn.addEventListener("click", (e) => {
            e.preventDefault();
            roomInfoView.hidden = true;
            searchInfoView.hidden = false;
        });
    }

    // Close Search View (Back to Room Info)
    if (backToRoomBtn) {
        backToRoomBtn.addEventListener("click", () => {
            searchInfoView.hidden = true;
            roomInfoView.hidden = false;
        });
    }

    // Toggle input fields based on filter selection
    if (filterTypeSelect) {
        filterTypeSelect.addEventListener("change", () => {
            const val = filterTypeSelect.value;
            if (val === "time") {
                queryField.hidden = true;
                timeOptions.hidden = false;
            } else {
                queryField.hidden = false;
                timeOptions.hidden = true;

                const labels = {
                    course: "Course code:",
                    crn: "CRN:",
                    instructor: "Instructor name:",
                    location: "Building / location:",
                    room: "Room ID:"
                };
                queryLabel.textContent = labels[val] || "Search query:";
            }
        });
    }

    // Clear search form
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            searchForm.reset();
            searchResults.replaceChildren();
            if (filterTypeSelect) filterTypeSelect.dispatchEvent(new Event("change"));
        });
    }

    // Execute Search API request
    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const filterType = filterTypeSelect.value;
        const queryVal = document.getElementById("filter-query").value.trim();
        const dayVal = document.getElementById("filter-day").value;
        const timeVal = document.getElementById("filter-time").value.trim();

        searchResults.textContent = "Searching...";

        try {
            const url = new URL(`${RENDER_API_URL}/api/search`);
            url.searchParams.append("type", filterType);
            url.searchParams.append("query", queryVal);
            url.searchParams.append("day", dayVal);
            url.searchParams.append("time", timeVal);

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            const results = data.results;

            if (!results || results.length === 0) {
                searchResults.textContent = "No courses found matching your criteria.";
                return;
            }

            searchResults.replaceChildren();

            const countHeading = document.createElement("strong");
            countHeading.textContent = `Found ${results.length} result(s):`;
            searchResults.appendChild(countHeading);

            results.forEach(item => {
                const card = document.createElement("div");
                card.className = "search-result-card";
                card.style.marginTop = "10px";
                card.style.padding = "8px";
                card.style.background = "#f0f4f8";
                card.style.borderRadius = "4px";

                const formattedTime = formatTimeRange(item.time);

                card.innerHTML = `
                    <strong>${item.course} - ${item.title}</strong><br>
                    <span>CRN: ${item.crn} | Room: ${item.location}</span><br>
                    <span>Time: ⏰ ${formattedTime}</span><br>
                    <small>Instructor: ${item.instructor || "N/A"}</small>
                `;
                searchResults.appendChild(card);
            });

        } catch (err) {
            console.error("Search error:", err);
            searchResults.textContent = "Error conducting search.";
        }
    });
}