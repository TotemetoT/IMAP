const RENDER_API_URL = "https://imap-bi2w.onrender.com";

// Dynamically determine the base path for localhost vs. GitHub Pages
const BASE_PATH = window.location.hostname.includes("github.io")
    ? `/${window.location.pathname.split("/")[1]}`
    : "";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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
// BUILDING & ROOM NAVIGATION HELPERS
// ============================================================

// Helper: Navigate to a target building & room polygon
function navigateToBuildingRoom(buildingCode, roomId) {
    if (!roomId) return;

    const currentBuilding = (document.body.dataset.building || "").toUpperCase();
    const targetBuilding = (buildingCode || "").toUpperCase();

    const buildingPages = {
        "TFAC": `${BASE_PATH}/website/Buildings/TFAC/index.html`,
        "LUTR": `${BASE_PATH}/website/Buildings/LUTR/index.html`,
        "SERC": `${BASE_PATH}/website/Buildings/SERC/index.html`,
        "FORBES": `${BASE_PATH}/website/Buildings/FORBES/index.html`,
        "MCM": `${BASE_PATH}/website/Buildings/MCM/index.html`,
        "TRIB": `${BASE_PATH}/website/Buildings/TRIB/index.html`,
        "FERG": `${BASE_PATH}/website/Buildings/FERG/index.html`
    };

    // CASE A: User is on a DIFFERENT building page -> Redirect with URL parameters
    if (targetBuilding && targetBuilding !== currentBuilding && buildingPages[targetBuilding]) {
        window.location.href = `${buildingPages[targetBuilding]}?room=${encodeURIComponent(roomId)}`;
        return;
    }

    // CASE B: User is ALREADY on the target building page -> Select room immediately
    selectAndHighlightRoom(roomId);
}

// Helper: Switch floor, find room polygon, and trigger click event
function selectAndHighlightRoom(roomId) {
    if (!roomId) return;

    const cleanRoomId = roomId.trim().toUpperCase();

    // Floor number corresponds to first digit (e.g., 238 -> Floor 2)
    const floorNum = cleanRoomId.charAt(0);

    // 1. Switch to the correct floor first
    if (typeof showFloor === "function") {
        showFloor(floorNum);
    }

    // 2. Allow DOM/CSS transition to register before selecting polygon
    setTimeout(() => {
        const targetRoom = document.querySelector(
            `.room[data-room="${cleanRoomId}"], .room[data-name*="${cleanRoomId}"]`
        );

        if (targetRoom) {
            // Clear previous room selection across all floors
            document.querySelectorAll(".room.selected").forEach(r => r.classList.remove("selected"));

            // Add selection class
            targetRoom.classList.add("selected");

            // Update sidebar content
            updateRoomInformation(targetRoom);

            // Scroll polygon into view
            targetRoom.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            console.warn(`Room polygon for ${cleanRoomId} not found on floor ${floorNum}.`);
        }
    }, 150);
}

// Helper: Check if URL contains ?room=XXX parameter on page load
function checkUrlForTargetRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoomId = urlParams.get("room");

    if (targetRoomId) {
        setTimeout(() => {
            selectAndHighlightRoom(targetRoomId);
        }, 400);
    }
}

// ============================================================
// COURSE SECTIONS DISPLAY IN INFO BOX
// ============================================================

// Helper: Display all offered sections of a selected course in the Info Box
async function displayCourseSections(courseCode) {
    const roomDescription = document.getElementById("room-description");
    const roomName = document.getElementById("room-name");

    if (!roomDescription || !roomName) return;

    roomName.textContent = `Course: ${courseCode}`;
    roomDescription.textContent = "Fetching course sections...";

    try {
        const url = new URL(`${RENDER_API_URL}/api/search`);
        url.searchParams.append("type", "course");
        url.searchParams.append("query", courseCode);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        const results = data.results || [];

        if (results.length === 0) {
            roomDescription.textContent = `No active sections found for ${courseCode}.`;
            return;
        }

        roomDescription.replaceChildren();

        const heading = document.createElement("strong");
        heading.textContent = `Offered Sections for ${courseCode}:`;
        heading.style.display = "block";
        heading.style.marginBottom = "8px";
        roomDescription.appendChild(heading);

        results.forEach(item => {
            const entry = document.createElement("div");
            entry.className = "course-section-card";
            entry.style.marginTop = "8px";
            entry.style.padding = "8px";
            entry.style.background = "#f0f4f8";
            entry.style.borderRadius = "4px";

            const formattedTime = formatTimeRange(item.time);
            const rawLocation = item.location || "N/A";
            const fullCourseLabel = item.course ? `${item.course}${item.title ? ` - ${item.title}` : ''}` : courseCode;

            entry.innerHTML = `
                <strong>CRN: ${item.crn || "N/A"}</strong> - <span>${fullCourseLabel}</span><br>
                <small>Time: ${formattedTime}</small><br>
                <small>Location: <a href="#" class="section-room-link" style="color: #0056b3; font-weight: bold; text-decoration: underline; cursor: pointer;">${rawLocation}</a></small><br>
                <small>Instructor: ${item.instructor || "N/A"}</small>
            `;

            // CLICKABLE ROOM LOCATION: Navigates map to classroom location
            const roomLink = entry.querySelector(".section-room-link");
            if (roomLink && rawLocation !== "N/A") {
                roomLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const bMatch = rawLocation.match(/^[A-Z]+/i);
                    const rMatch = rawLocation.match(/\d+[A-Z]?/i);

                    if (rMatch) {
                        const bCode = bMatch ? bMatch[0].toUpperCase() : (document.body.dataset.building || "");
                        navigateToBuildingRoom(bCode, rMatch[0]);
                    }
                });
            }

            roomDescription.appendChild(entry);
        });

    } catch (err) {
        console.error("Error fetching course sections:", err);
        roomDescription.textContent = `Unable to fetch sections for ${courseCode}.`;
    }
}

// ============================================================
// DISPLAY PROFESSOR DETAILS & COURSES TAUGHT
// ============================================================
async function displayProfessorDetails(prof) {
    const roomName = document.getElementById("room-name");
    const roomDescription = document.getElementById("room-description");

    if (!roomName || !roomDescription || !prof) return;

    roomName.textContent = prof.name;
    roomDescription.textContent = "Loading professor details and courses...";

    // Highlight the professor's office on the floorplan map
    const officeLocation = prof.office || "";
    if (officeLocation) {
        const bMatch = officeLocation.match(/^[A-Z]+/i);
        const rMatch = officeLocation.match(/\d+[A-Z]?/i);
        if (rMatch) {
            const bCode = bMatch ? bMatch[0].toUpperCase() : (document.body.dataset.building || "");
            navigateToBuildingRoom(bCode, rMatch[0]);
        }
    }

    try {
        roomDescription.replaceChildren();

        // 1. Render Professor Information Header Card
        const profHeader = document.createElement("div");
        profHeader.className = "prof-info-header";
        profHeader.style.padding = "10px";
        profHeader.style.marginBottom = "12px";
        profHeader.style.background = "#eef6ff";
        profHeader.style.borderLeft = "4px solid #0056b3";
        profHeader.style.borderRadius = "4px";

        profHeader.innerHTML = `
            <div style="font-size: 0.95em; color: #333; margin-bottom: 3px;">
                <strong>Email:</strong> ${prof.email ? `<a href="mailto:${prof.email}">${prof.email}</a>` : "N/A"}
            </div>
            <div style="font-size: 0.95em; color: #333; margin-bottom: 3px;">
                <strong>Department:</strong> ${prof.department || "N/A"}
            </div>
            <div style="font-size: 0.95em; color: #333; margin-bottom: 3px;">
                <strong>College:</strong> ${prof.college || "N/A"}
            </div>
            <div style="font-size: 0.95em; color: #333; margin-bottom: 3px;">
                <strong>Office:</strong> <a href="#" class="prof-office-link" style="color: #0056b3; text-decoration: underline; cursor: pointer;">${officeLocation || "N/A"}</a>
            </div>
            <div style="font-size: 0.95em; color: #333;">
                <strong>CNU Website:</strong> ${prof.website ? `<a href="${prof.website}" target="_blank" rel="noopener noreferrer">Profile Link</a>` : "N/A"}
            </div>
        `;

        const profOfficeLink = profHeader.querySelector(".prof-office-link");
        if (profOfficeLink && officeLocation) {
            profOfficeLink.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bMatch = officeLocation.match(/^[A-Z]+/i);
                const rMatch = officeLocation.match(/\d+[A-Z]?/i);
                if (rMatch) {
                    const bCode = bMatch ? bMatch[0].toUpperCase() : (document.body.dataset.building || "");
                    navigateToBuildingRoom(bCode, rMatch[0]);
                }
            });
        }

        roomDescription.appendChild(profHeader);

        // 2. Fetch courses taught by this instructor across all rooms
        const url = new URL(`${RENDER_API_URL}/api/search`);
        url.searchParams.append("type", "instructor");
        url.searchParams.append("query", prof.name);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        const courses = data.results || [];

        const coursesHeading = document.createElement("strong");
        coursesHeading.textContent = `Courses Taught by ${prof.name}:`;
        coursesHeading.style.display = "block";
        coursesHeading.style.marginTop = "10px";
        coursesHeading.style.marginBottom = "6px";
        roomDescription.appendChild(coursesHeading);

        if (courses.length === 0) {
            const noCourses = document.createElement("p");
            noCourses.textContent = "No active course sections found for this instructor.";
            noCourses.style.fontSize = "0.9em";
            noCourses.style.color = "#666";
            roomDescription.appendChild(noCourses);
            return;
        }

        courses.forEach(item => {
            const card = document.createElement("div");
            card.className = "prof-course-card";
            card.style.marginTop = "8px";
            card.style.padding = "8px";
            card.style.background = "#f0f4f8";
            card.style.borderRadius = "4px";

            const formattedTime = formatTimeRange(item.time);
            const rawLocation = item.location || "N/A";
            const fullCourseLabel = `${item.course}${item.title ? ` - ${item.title}` : ''}`;

            card.innerHTML = `
                <span><a href="#" class="course-full-link" style="color: #004d99; font-weight: bold; text-decoration: underline; cursor: pointer;">${fullCourseLabel}</a></span><br>
                <small>CRN: ${item.crn || "N/A"}</small><br>
                <small>Time: ${formattedTime}</small><br>
                <small>Location: <a href="#" class="section-room-link" style="color: #0056b3; font-weight: bold; text-decoration: underline; cursor: pointer;">${rawLocation}</a></small>
            `;

            // Combined Course Title + Code Click Handler
            const courseLink = card.querySelector(".course-full-link");
            if (courseLink) {
                courseLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    displayCourseSections(item.course);
                });
            }

            // Clickable Room Location Link
            const roomLink = card.querySelector(".section-room-link");
            if (roomLink && rawLocation !== "N/A") {
                roomLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const bMatch = rawLocation.match(/^[A-Z]+/i);
                    const rMatch = rawLocation.match(/\d+[A-Z]?/i);
                    if (rMatch) {
                        const bCode = bMatch ? bMatch[0].toUpperCase() : (document.body.dataset.building || "");
                        navigateToBuildingRoom(bCode, rMatch[0]);
                    }
                });
            }

            roomDescription.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading professor details:", err);
        roomDescription.textContent = `Unable to load courses for ${prof.name}.`;
    }
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

        // -------------------------------------------------------------
        // 1. RENDER FACULTY OCCUPANTS (EXPLICIT PROFESSOR CLICK BINDING)
        // -------------------------------------------------------------
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

                const officeLocation = prof.office || fullRoomId;

                // Create Name Header & Dedicated Professor Click Link
                const nameHeader = document.createElement("div");
                nameHeader.style.cssText = "font-size: 1.05em; font-weight: bold; margin-bottom: 4px;";

                const profLink = document.createElement("a");
                profLink.href = "#";
                profLink.textContent = prof.name;
                profLink.style.cssText = "color: #004d99; text-decoration: underline; cursor: pointer;";

                // CLICK PROFESSOR NAME -> Opens Professor Info & Courses Taught
                profLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    displayProfessorDetails(prof);
                });

                nameHeader.appendChild(profLink);
                entry.appendChild(nameHeader);

                // Add contact details HTML
                const detailsDiv = document.createElement("div");
                detailsDiv.style.cssText = "font-size: 0.9em; color: #333;";
                detailsDiv.innerHTML = `
                    <div style="margin-bottom: 2px;"><strong>Email:</strong> ${prof.email ? `<a href="mailto:${prof.email}">${prof.email}</a>` : "N/A"}</div>
                    <div style="margin-bottom: 2px;"><strong>Department:</strong> ${prof.department || "N/A"}</div>
                    <div style="margin-bottom: 2px;"><strong>College:</strong> ${prof.college || "N/A"}</div>
                    <div style="margin-bottom: 2px;"><strong>Office:</strong> <a href="#" class="office-link-target" style="color: #0056b3; text-decoration: underline; cursor: pointer;">${officeLocation}</a></div>
                    <div><strong>CNU Website:</strong> ${prof.website ? `<a href="${prof.website}" target="_blank" rel="noopener noreferrer">Profile Link</a>` : "N/A"}</div>
                `;

                // CLICK OFFICE LINK -> Highlights Room on Floorplan Map
                const officeBtn = detailsDiv.querySelector(".office-link-target");
                if (officeBtn) {
                    officeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const bMatch = officeLocation.match(/^[A-Z]+/i);
                        const rMatch = officeLocation.match(/\d+[A-Z]?/i);
                        if (rMatch) {
                            const bCode = bMatch ? bMatch[0].toUpperCase() : (document.body.dataset.building || "");
                            navigateToBuildingRoom(bCode, rMatch[0]);
                        }
                    });
                }

                entry.appendChild(detailsDiv);
                roomDescription.appendChild(entry);
            });
        }

        // -------------------------------------------------------------
        // 2. RENDER TODAY'S CLASSES (COMBINED COURSE CODE + TITLE LINK)
        // -------------------------------------------------------------
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
                const fullCourseLabel = `${item.course}${item.title ? ` - ${item.title}` : ''}`;

                entry.innerHTML = `
                    <strong>${formattedTime}</strong><br>
                    <span><a href="#" class="course-full-link" style="color: #004d99; font-weight: bold; text-decoration: underline; cursor: pointer;">${fullCourseLabel}</a></span><br>
                    <small>Instructor: ${item.instructor || "N/A"}</small>
                `;

                // Combined Course Code & Title click handler
                const courseLink = entry.querySelector(".course-full-link");
                if (courseLink) {
                    courseLink.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        displayCourseSections(item.course);
                    });
                }

                roomDescription.appendChild(entry);
            });
        }

    } catch (error) {
        console.error("Error fetching room details from API:", error);
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
            if (roomInfoView) roomInfoView.hidden = true;
            if (searchInfoView) searchInfoView.hidden = false;
        });
    }

    if (backToRoomBtn) {
        backToRoomBtn.addEventListener("click", () => {
            if (searchInfoView) searchInfoView.hidden = true;
            if (roomInfoView) roomInfoView.hidden = false;
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
                card.style.cursor = "pointer";
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

                // Click event: Navigate to room polygon from search result card
                card.addEventListener("click", () => {
                    const rawRoomStr = item.result_type === "professor" ? item.office : item.location;
                    if (!rawRoomStr) return;

                    const buildingMatch = rawRoomStr.match(/^[A-Z]+/i);
                    const roomMatch = rawRoomStr.match(/\d+[A-Z]?/i);

                    if (!roomMatch) return;

                    const targetBuilding = buildingMatch ? buildingMatch[0].toUpperCase() : "";
                    const roomId = roomMatch[0];

                    navigateToBuildingRoom(targetBuilding, roomId);
                });

                searchResults.appendChild(card);
            });

        } catch (err) {
            console.error("Search error:", err);
            searchResults.textContent = "Error conducting search.";
        }
    });
}

// ======================================
//        Partial Views Injection
// ======================================
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // 1. Load Navbar Partial
        const navRes = await fetch(`${BASE_PATH}/website/navbar.html`);
        if (navRes.ok) {
            const navData = await navRes.text();
            const navContainer = document.getElementById('navbar-placeholder');
            if (navContainer) {
                navContainer.innerHTML = navData;

                // Fix root-relative href and src paths inside the injected navbar for GitHub Pages
                if (BASE_PATH) {
                    navContainer.querySelectorAll('a[href^="/"]').forEach(link => {
                        link.setAttribute('href', `${BASE_PATH}${link.getAttribute('href')}`);
                    });
                    navContainer.querySelectorAll('img[src^="/"]').forEach(img => {
                        img.setAttribute('src', `${BASE_PATH}${img.getAttribute('src')}`);
                    });
                }
            }
        }

        // 2. Load Searchbar Partial
        const searchRes = await fetch(`${BASE_PATH}/website/searchbar.html`);
        if (searchRes.ok) {
            const searchData = await searchRes.text();
            const searchContainer = document.getElementById('searchbar-placeholder');
            if (searchContainer) searchContainer.innerHTML = searchData;
        }

        // 3. Initialize search handlers AFTER partials are injected into DOM
        setupSearchHandlers();

    } catch (err) {
        console.error("Error loading component partials:", err);
    }
});

// ======================================
//         VIDEO PLAYBACK SPEED
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    const heroVideo = document.getElementById("hero-video");
    
    if (heroVideo) {
        heroVideo.playbackRate = 1; 
    }
});

// ======================================
//          DOM Initialization
// ======================================
document.addEventListener("DOMContentLoaded", () => {
    initializeRooms();
    setupCoordinateTracker();
    checkUrlForTargetRoom();
});