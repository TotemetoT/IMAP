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

    // Grab room identifier (e.g., "TFAC 205" or "SERC 1181")
    const fullRoomId = room.dataset.name || room.id || room.dataset.room || "Selected Room";
    const today = getTodayCode();

    roomName.textContent = fullRoomId;
    roomDescription.textContent = "Loading schedule...";

    try {
        const response = await fetch(
            `${RENDER_API_URL}/api/room-times?fullRoomId=${encodeURIComponent(fullRoomId)}&day=${today}`
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

            entry.innerHTML = `
                <strong>${item.time}</strong><br>
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
});

// Expose floor switching to window for HTML onclick attributes
window.showFloor = showFloor;