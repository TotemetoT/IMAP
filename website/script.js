const RENDER_API_URL = "https://imap-bi2w.onrender.com";

async function updateRoomInformation(room) {
    const roomName = document.getElementById("room-name");
    const roomDescription = document.getElementById("room-description");

    if (!roomName || !roomDescription || !room) return;

    const fullRoomId = room.id || room.dataset.name || room.dataset.room || "Selected Room";
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