const RENDER_API_URL = "https://imap-bi2w.onrender.com";

// Helper: Get Current Day Code (M, T, W, R, F, S, U)
function getTodayCode() {
    const day = new Date().getDay();
    return ["U", "M", "T", "W", "R", "F", "S"][day];
}

// Converts HHMM ranges like "0800-0850" to "08:00 - 08:50"
function formatTimeRange(timeStr) {
    if (!timeStr) return "N/A";

    const formatHHMM = (hhmm) => {
        const clean = hhmm.trim();
        if (clean.length === 4) {
            return `${clean.slice(0, 2)}:${clean.slice(2)}`;
        }
        return clean;
    };

    if (timeStr.includes("-")) {
        return timeStr
            .split("-")
            .map(t => formatHHMM(t))
            .join(" - ");
    }

    return formatHHMM(timeStr);
}

// Coordinate tracker relative to SVG viewBox
function setupCoordinateTracker() {
    const mouseX = document.getElementById("mouse-x");
    const mouseY = document.getElementById("mouse-y");

    document.querySelectorAll(".room-overlay").forEach(svg => {
        svg.addEventListener("mousemove", (e) => {
            const rect = svg.getBoundingClientRect();
            const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
            const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000);

            if (mouseX) mouseX.textContent = x;
            if (mouseY) mouseY.textContent = y;
        });
    });
}

// ============================================================
// FETCH & DISPLAY ROOM / PROFESSOR INFORMATION
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
    roomDescription.textContent = "Loading schedule and office information...";

    try {
        const response = await fetch(
            `${RENDER_API_URL}/api/room-times?fullRoomId=${encodeURIComponent(fullRoomId)}&building=${encodeURIComponent(building)}&day=${today}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const classes = data.classes || [];
        const professors = data.professors || [];

        if (classes.length === 0 && professors.length === 0) {
            roomDescription.textContent = "No classes scheduled or faculty offices assigned to this room.";
            return;
        }

        roomDescription.replaceChildren();

        // 1. Render Faculty Office Occupants with all requested fields
        if (professors.length > 0) {
            const profHeading = document.createElement("strong");
            profHeading.textContent = "Faculty Office Occupant(s):";
            roomDescription.appendChild(profHeading);

            professors.forEach(prof => {
                const entry = document.createElement("div");
                entry.className = "room-prof";
                entry.style.margin = "8px 0";
                entry.style.padding = "10px";
                entry.style.background = "#eef6ff";
                entry.style.borderLeft = "4px solid #0056b3";
                entry.style.borderRadius = "4px";

                entry.innerHTML = `
                    <div style="font-size: 1.05em; font-weight: bold; margin-bottom: 4px;">${prof.name}</div>
                    <div style="font-size: 0.9em; color: #333; margin-bottom: 2px;">
                        <strong>Email:</strong> ${prof.email ? `<a href="mailto:${prof.email}">${prof.email}</a>` : "N/A"}
                    </div>
                    <div style="font-size: 0.9em; color: #333; margin-bottom: 2px;">
                        <strong>Department:</strong> ${prof.department || "N/A"}
                    </div>
                    <div style="font-size: 0.9em; color: #333; margin-bottom: 2px;">
                        <strong>College:</strong> ${prof.college || "N/A"}
                    </div>
                    <div style="font-size: 0.9em; color: #333;">
                        <strong>CNU Website:</strong> ${prof.website ? `<a href="${prof.website}" target="_blank" rel="noopener noreferrer">Profile Link</a>` : "N/A"}
                    </div>
                `;
                roomDescription.appendChild(entry);
            });
        }

        // 2. Render Today's Scheduled Classes
        if (classes.length > 0) {
            const heading = document.createElement("strong");
            heading.textContent = "Today's Classes:";
            heading.style.marginTop = "14px";
            heading.style.display = "block";
            roomDescription.appendChild(heading);

            classes.forEach(item => {
                const entry = document.createElement("div");
                entry.className = "room-class";
                entry.style.marginTop = "8px";
                entry.style.padding = "8px";
                entry.style.background = "#f0f4f8";
                entry.style.borderRadius = "4px";

                const formattedTime = formatTimeRange(item.time);

                entry.innerHTML = `
                    <strong>${formattedTime}</strong><br>
                    <span>${item.course} - ${item.title}</span><br>
                    <small>Instructor: ${item.instructor || "N/A"}</small>
                `;
                roomDescription.appendChild(entry);
            });
        }

    } catch (error) {
        console.error("Error fetching room details from Python API:", error);
        roomDescription.textContent = "Unable to fetch class schedule or office information.";
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

            // Clear previous room selection across all floor SVG overlays
            document.querySelectorAll(".room.selected").forEach(r => r.classList.remove("selected"));

            // Highlight newly clicked room polygon
            this.classList.add("selected");

            // Update sidebar content
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

// Bind showFloor globally to support inline onclick="showFloor(n)" in HTML
window.showFloor = showFloor;

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

    if (navSearchBtn) {
        navSearchBtn.addEventListener("click", (e) => {
            e.preventDefault();
            roomInfoView.hidden = true;
            searchInfoView.hidden = false;
        });
    }

    if (backToRoomBtn) {
        backToRoomBtn.addEventListener("click", () => {
            searchInfoView.hidden = true;
            roomInfoView.hidden = false;
        });
    }

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
                    department: "Department name:",
                    college: "College name:",
                    office: "Office room (e.g., LUTR 238):",
                    location: "Building / location:",
                    room: "Room ID:"
                };
                queryLabel.textContent = labels[val] || "Search query:";
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            searchForm.reset();
            searchResults.replaceChildren();
            if (filterTypeSelect) filterTypeSelect.dispatchEvent(new Event("change"));
        });
    }

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
                searchResults.textContent = "No results found matching your criteria.";
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
                card.style.padding = "10px";
                card.style.background = item.result_type === "professor" ? "#eef6ff" : "#f0f4f8";
                if (item.result_type === "professor") card.style.borderLeft = "4px solid #0056b3";
                card.style.borderRadius = "4px";

                if (item.result_type === "professor") {
                    card.innerHTML = `
                        <div style="font-weight: bold; font-size: 1.05em; margin-bottom: 4px;">${item.name}</div>
                        <div><strong>Office:</strong> ${item.office || "N/A"}</div>
                        <div><strong>Email:</strong> ${item.email ? `<a href="mailto:${item.email}">${item.email}</a>` : "N/A"}</div>
                        <div><strong>Department:</strong> ${item.department || "N/A"}</div>
                        <div><strong>College:</strong> ${item.college || "N/A"}</div>
                        <div><strong>CNU Website:</strong> ${item.website ? `<a href="${item.website}" target="_blank" rel="noopener noreferrer">Profile Link</a>` : "N/A"}</div>
                    `;
                } else {
                    const formattedTime = formatTimeRange(item.time);
                    card.innerHTML = `
                        <strong>${item.course} - ${item.title}</strong><br>
                        <span>CRN: ${item.crn} | Room: ${item.location}</span><br>
                        <span>Time: ${formattedTime}</span><br>
                        <small>Instructor: ${item.instructor || "N/A"}</small>
                    `;
                }
                searchResults.appendChild(card);
            });

        } catch (err) {
            console.error("Search error:", err);
            searchResults.textContent = "Error conducting search.";
        }
    });
}

// Initialize script once DOM content is ready
document.addEventListener("DOMContentLoaded", () => {
    initializeRooms();
    setupSearchHandlers();
    setupCoordinateTracker();
});