// // ============================================================
// // Campus Interactive Map - Shared JavaScript
// // ============================================================
// //
// // This file is designed to be shared by all building pages.
// // Each building page should contain room elements like:
// //
// // <polygon
// //     class="room"
// //     data-room="318"
// //     data-name="TFAC 318"
// // />
// //
// // The course schedule is loaded directly from:
// // ./data/Fall2026.csv
// //
// // No Python or Flask is required.
// // ============================================================


// // ============================================================
// // COURSE DATA
// // ============================================================

// let courses = [];


// // Load the Fall 2026 CSV schedule
// async function loadCourses() {
//     try {
//         const response = await fetch("../../../data/Fall2026.csv");

//         if (!response.ok) {
//             throw new Error(
//                 `Could not load Fall2026.csv (${response.status})`
//             );
//         }

//         const csvText = await response.text();

//         courses = parseCSV(csvText);

//         console.log(`Loaded ${courses.length} courses.`);

//         // If a room was selected before the CSV finished loading,
//         // update its information now.
//         updateSelectedRoom();

//     } catch (error) {
//         console.error("Failed to load course data:", error);

//         const roomDescription =
//             document.getElementById("room-description");

//         if (roomDescription) {
//             roomDescription.textContent =
//                 "Unable to load the course schedule.";
//         }
//     }
// }


// // ============================================================
// // CSV PARSER
// // ============================================================
// //
// // Handles quoted CSV fields, commas inside quotes,
// // and escaped double quotes.
// //

// function parseCSV(text) {
//     const rows = [];
//     let row = [];
//     let field = "";
//     let insideQuotes = false;

//     for (let i = 0; i < text.length; i++) {
//         const char = text[i];
//         const next = text[i + 1];

//         // Escaped quote: ""
//         if (char === '"' && insideQuotes && next === '"') {
//             field += '"';
//             i++;
//         }

//         // Start/end quoted field
//         else if (char === '"') {
//             insideQuotes = !insideQuotes;
//         }

//         // End of field
//         else if (char === "," && !insideQuotes) {
//             row.push(field);
//             field = "";
//         }

//         // End of row
//         else if (
//             (char === "\n" || char === "\r") &&
//             !insideQuotes
//         ) {
//             if (char === "\r" && next === "\n") {
//                 i++;
//             }

//             row.push(field);
//             rows.push(row);

//             row = [];
//             field = "";
//         }

//         else {
//             field += char;
//         }
//     }

//     // Add final field and row
//     if (field !== "" || row.length > 0) {
//         row.push(field);
//         rows.push(row);
//     }

//     if (rows.length === 0) {
//         return [];
//     }

//     // First row contains the CSV column names
//     const headers = rows.shift().map(header => header.trim());

//     return rows
//         .filter(row => row.length > 1)
//         .map(row => {
//             const course = {};

//             headers.forEach((header, index) => {
//                 course[header] = (row[index] || "").trim();
//             });

//             return course;
//         });
// }


// // ============================================================
// // DAY HANDLING
// // ============================================================
// //
// // CNU's schedule uses:
// //
// // M = Monday
// // T = Tuesday
// // W = Wednesday
// // R = Thursday
// // F = Friday
// // S = Saturday
// // U = Sunday
// //

// function getTodayCode() {
//     const day = new Date().getDay();

//     return ["U", "M", "T", "W", "R", "F", "S"][day];
// }


// // ============================================================
// // ROOM TIMES
// // ============================================================
// //
// // Finds every course using the selected room on the
// // current day.
// //
// // This is the JavaScript equivalent of the Python
// // RoomTimes(room, day) function.
// //

// function roomTimes(room, day) {
//     const times = [];

//     for (const course of courses) {

//         const location = course.Location || "";
//         const days = course.Days || "";
//         const time = course.Time || "";

//         // Match the selected room against the course location.
//         if (!location.includes(room)) {
//             continue;
//         }

//         // Course does not meet today.
//         if (!days.includes(day)) {
//             continue;
//         }

//         // A course can contain multiple time ranges.
//         const timeRanges = time.split(";");

//         for (const timeRange of timeRanges) {

//             const parts = timeRange.trim().split("-");

//             if (parts.length !== 2) {
//                 continue;
//             }

//             const start = parts[0].trim();
//             const end = parts[1].trim();

//             if (!start || !end) {
//                 continue;
//             }

//             times.push({
//                 start: start,
//                 end: end,
//                 course: course.Course || "",
//                 title: course.Title || "",
//                 instructor: course.Instructor || "",
//                 crn: course.CRN || ""
//             });
//         }
//     }

//     return times;
// }


// // ============================================================
// // TIME FORMATTING
// // ============================================================
// //
// // Converts:
// //
// // 0800 -> 8:00 AM
// // 1215 -> 12:15 PM
// // 1700 -> 5:00 PM
// //

// function formatTime(time) {
//     if (!time || time.length < 4) {
//         return time;
//     }

//     const hours = parseInt(time.substring(0, 2), 10);
//     const minutes = time.substring(2, 4);

//     if (Number.isNaN(hours)) {
//         return time;
//     }

//     const suffix = hours >= 12 ? "PM" : "AM";
//     const displayHours = hours % 12 || 12;

//     return `${displayHours}:${minutes} ${suffix}`;
// }


// // ============================================================
// // CURRENT TIME
// // ============================================================

// function timeToMinutes(time) {
//     if (!time || time.length < 4) {
//         return null;
//     }

//     const hours = parseInt(time.substring(0, 2), 10);
//     const minutes = parseInt(time.substring(2, 4), 10);

//     if (
//         Number.isNaN(hours) ||
//         Number.isNaN(minutes)
//     ) {
//         return null;
//     }

//     return hours * 60 + minutes;
// }


// // ============================================================
// // CHECK WHETHER A CLASS IS CURRENTLY IN PROGRESS
// // ============================================================

// function isClassCurrentlyActive(start, end) {
//     const now = new Date();

//     const currentMinutes =
//         now.getHours() * 60 + now.getMinutes();

//     const startMinutes = timeToMinutes(start);
//     const endMinutes = timeToMinutes(end);

//     if (
//         startMinutes === null ||
//         endMinutes === null
//     ) {
//         return false;
//     }

//     return (
//         startMinutes <= currentMinutes &&
//         currentMinutes <= endMinutes
//     );
// }


// // ============================================================
// // ROOM INFORMATION
// // ============================================================

// function updateRoomInformation(room) {

//     const roomName =
//         document.getElementById("room-name");

//     const roomDescription =
//         document.getElementById("room-description");

//     if (!roomName || !roomDescription || !room) {
//         return;
//     }

//     const name = room.dataset.name || room.dataset.room;
//     const number = room.dataset.room;

//     const today = getTodayCode();

//     const times = roomTimes(number, today);

//     roomName.textContent = name;


//     // --------------------------------------------------------
//     // No classes today
//     // --------------------------------------------------------

//     if (times.length === 0) {

//         roomDescription.innerHTML =
//             "<strong>No classes scheduled today.</strong>";

//         return;
//     }


//     // --------------------------------------------------------
//     // Build schedule display
//     // --------------------------------------------------------

//     const scheduleHTML = times.map(time => {

//         const active =
//             isClassCurrentlyActive(
//                 time.start,
//                 time.end
//             );

//         const activeLabel =
//             active
//                 ? " <strong>(In use now)</strong>"
//                 : "";

//         let line =
//             `<div class="room-class">`;

//         line +=
//             `<strong>${formatTime(time.start)} - ` +
//             `${formatTime(time.end)}</strong>`;

//         line +=
//             `${activeLabel}`;

//         if (time.course) {
//             line +=
//                 `<br>${time.course}`;
//         }

//         if (time.title) {
//             line +=
//                 ` — ${time.title}`;
//         }

//         if (time.instructor) {
//             line +=
//                 `<br><small>${time.instructor}</small>`;
//         }

//         line += "</div>";

//         return line;

//     }).join("<br>");


//     roomDescription.innerHTML =
//         `<strong>Today's Classes</strong><br><br>` +
//         scheduleHTML;
// }


// // ============================================================
// // UPDATE CURRENTLY SELECTED ROOM
// // ============================================================

// function updateSelectedRoom() {

//     const selectedRoom =
//         document.querySelector(".room.selected");

//     if (selectedRoom) {
//         updateRoomInformation(selectedRoom);
//     }
// }


// // ============================================================
// // ROOM CLICK HANDLERS
// // ============================================================
// //
// // Works for rooms on ANY building page, as long as the
// // room uses class="room" and data-room/data-name.
// //

// function initializeRooms() {

//     const rooms =
//         document.querySelectorAll(".room");

//     rooms.forEach(room => {

//         room.addEventListener("click", function() {

//             // Remove selection from all rooms
//             rooms.forEach(r => {
//                 r.classList.remove("selected");
//             });

//             // Select clicked room
//             this.classList.add("selected");

//             // Update information panel
//             updateRoomInformation(this);

//         });

//     });

//     console.log(`Initialized ${rooms.length} rooms.`);
// }


// // ============================================================
// // FLOOR SWITCHING
// // ============================================================
// //
// // Preserves the existing TFAC.html behavior:
// //
// // showFloor(1)
// // showFloor(2)
// // showFloor(3)
// //
// // It also works with any number of floors using:
// //
// // id="floor-1"
// // id="floor-2"
// // id="floor-3"
// // etc.
// //

// function showFloor(floorNumber) {

//     // Hide all floors
//     document.querySelectorAll(".floor").forEach(floor => {
//         floor.classList.remove("active");
//     });

//     // Show requested floor
//     const selectedFloor =
//         document.getElementById(
//             "floor-" + floorNumber
//         );

//     if (selectedFloor) {
//         selectedFloor.classList.add("active");
//     }
// }


// // ============================================================
// // BUILDING SUPPORT
// // ============================================================
// //
// // Building pages can optionally identify themselves with:
// //
// // <body data-building="TFAC">
// //
// // or:
// //
// // <body data-building="FORBES">
// //
// // The schedule lookup uses the room's data-room value,
// // so the same script can be shared by all seven buildings.
// //

// function getCurrentBuilding() {

//     return document.body.dataset.building || "";
// }


// // ============================================================
// // INITIALIZATION
// // ============================================================

// document.addEventListener("DOMContentLoaded", () => {

//     initializeRooms();

//     loadCourses();

// });

// ============================================================
// Campus Interactive Map - Shared JavaScript
// ============================================================
//
// This file is designed to be shared by all building pages.
//
// Each building page should contain:
//
// <body data-building="TFAC">
//
// And room elements like:
//
// <polygon
//     class="room"
//     data-room="318"
//     data-name="TFAC 318"
// />
//
// The course schedule is loaded directly from:
// ./data/Fall2026.csv
//
// No Python or Flask is required.
// ============================================================


// ============================================================
// COURSE DATA
// ============================================================

let courses = [];


// ============================================================
// LOAD COURSE DATA
// ============================================================

// Load the Fall 2026 CSV schedule
async function loadCourses() {

    try {

        const response =
            await fetch("../../../data/Fall2026.csv");

        if (!response.ok) {
            throw new Error(
                `Could not load Fall2026.csv (${response.status})`
            );
        }

        const csvText =
            await response.text();

        courses =
            parseCSV(csvText);

        console.log(
            `Loaded ${courses.length} courses.`
        );


        // If a room was selected before the CSV
        // finished loading, update its information now.
        updateSelectedRoom();

    }

    catch (error) {

        console.error(
            "Failed to load course data:",
            error
        );

        const roomDescription =
            document.getElementById(
                "room-description"
            );

        if (roomDescription) {

            roomDescription.textContent =
                "Unable to load the course schedule.";

        }
    }
}


// ============================================================
// CSV PARSER
// ============================================================
//
// Handles quoted CSV fields, commas inside quotes,
// and escaped double quotes.
//

function parseCSV(text) {

    const rows = [];

    let row = [];
    let field = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];


        // Escaped quote: ""
        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            field += '"';

            i++;

        }


        // Start/end quoted field
        else if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }


        // End of field
        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(field);

            field = "";

        }


        // End of row
        else if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }

            row.push(field);

            rows.push(row);

            row = [];

            field = "";

        }


        else {

            field += char;

        }
    }


    // Add final field and row
    if (
        field !== "" ||
        row.length > 0
    ) {

        row.push(field);

        rows.push(row);

    }


    if (
        rows.length === 0
    ) {

        return [];

    }


    // First row contains CSV column names
    const headers =
        rows
            .shift()
            .map(
                header =>
                    header.trim()
            );


    return rows

        .filter(
            row =>
                row.length > 1
        )

        .map(row => {

            const course = {};


            headers.forEach(
                (header, index) => {

                    course[header] =
                        (
                            row[index] ||
                            ""
                        ).trim();

                }
            );


            return course;

        });
}


// ============================================================
// DAY HANDLING
// ============================================================
//
// CNU's schedule uses:
//
// M = Monday
// T = Tuesday
// W = Wednesday
// R = Thursday
// F = Friday
// S = Saturday
// U = Sunday
//

function getTodayCode() {

    const day =
        new Date().getDay();

    return [
        "U",
        "M",
        "T",
        "W",
        "R",
        "F",
        "S"
    ][day];
}


// ============================================================
// BUILDING SUPPORT
// ============================================================
//
// Each building page should have:
//
// <body data-building="TFAC">
//
// or:
//
// <body data-building="FORBES">
//
// or:
//
// <body data-building="LUTR">
//
// etc.
//

function getCurrentBuilding() {

    return (
        document.body.dataset.building ||
        ""
    ).trim();
}


// ============================================================
// ROOM TIMES
// ============================================================
//
// Finds every course using the selected room
// in the CURRENT BUILDING on the current day.
//
// Example:
//
// Building:
// TFAC
//
// Room:
// 301
//
// The function searches for:
//
// TFAC 301
//
// rather than simply:
//
// 301
//
// This prevents a room such as FORBES 301
// from appearing on the TFAC 301 schedule.
//

function roomTimes(room, day) {

    const times = [];


    // Get the building from the page
    const building =
        getCurrentBuilding();


    // Make sure the values are clean
    const roomNumber =
        String(room || "").trim();

    const buildingName =
        String(building || "").trim();


    // --------------------------------------------------------
    // Create the full room name
    // --------------------------------------------------------
    //
    // Example:
    //
    // TFAC + 301
    //
    // becomes:
    //
    // TFAC 301
    //

    const fullRoomName =
        `${buildingName} ${roomNumber}`.trim();


    console.log(
        "Looking for room:",
        fullRoomName
    );


    // --------------------------------------------------------
    // Search through every course
    // --------------------------------------------------------

    for (const course of courses) {

        const location =
            course.Location || "";

        const days =
            course.Days || "";

        const time =
            course.Time || "";


        // ----------------------------------------------------
        // Match the building + room
        // ----------------------------------------------------
        //
        // Instead of:
        //
        // location.includes(room)
        //
        // we now use:
        //
        // location.includes(fullRoomName)
        //
        // This means:
        //
        // TFAC 301
        //
        // will NOT match:
        //
        // FORBES 301
        //
        // ----------------------------------------------------

        if (
            !location
                .toUpperCase()
                .includes(
                    fullRoomName.toUpperCase()
                )
        ) {

            continue;

        }


        // ----------------------------------------------------
        // Course does not meet today
        // ----------------------------------------------------

        if (
            !days.includes(day)
        ) {

            continue;

        }


        // ----------------------------------------------------
        // A course can contain multiple time ranges
        // ----------------------------------------------------

        const timeRanges =
            time.split(";");


        for (
            const timeRange
            of timeRanges
        ) {

            const parts =
                timeRange
                    .trim()
                    .split("-");


            if (
                parts.length !== 2
            ) {

                continue;

            }


            const start =
                parts[0].trim();

            const end =
                parts[1].trim();


            if (
                !start ||
                !end
            ) {

                continue;

            }


            times.push({

                start: start,

                end: end,

                course:
                    course.Course || "",

                title:
                    course.Title || "",

                instructor:
                    course.Instructor || "",

                crn:
                    course.CRN || ""

            });

        }
    }


    return times;
}


// ============================================================
// TIME FORMATTING
// ============================================================
//
// Converts:
//
// 0800 -> 8:00 AM
// 1215 -> 12:15 PM
// 1700 -> 5:00 PM
//

function formatTime(time) {

    if (
        !time ||
        time.length < 4
    ) {

        return time;

    }


    const hours =
        parseInt(
            time.substring(0, 2),
            10
        );

    const minutes =
        time.substring(2, 4);


    if (
        Number.isNaN(hours)
    ) {

        return time;

    }


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    const displayHours =
        hours % 12 || 12;


    return (
        `${displayHours}:${minutes} ${suffix}`
    );
}


// ============================================================
// CURRENT TIME
// ============================================================

function timeToMinutes(time) {

    if (
        !time ||
        time.length < 4
    ) {

        return null;

    }


    const hours =
        parseInt(
            time.substring(0, 2),
            10
        );

    const minutes =
        parseInt(
            time.substring(2, 4),
            10
        );


    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {

        return null;

    }


    return (
        hours * 60 +
        minutes
    );
}


// ============================================================
// CHECK WHETHER A CLASS IS CURRENTLY IN PROGRESS
// ============================================================

function isClassCurrentlyActive(
    start,
    end
) {

    const now =
        new Date();


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    const startMinutes =
        timeToMinutes(start);

    const endMinutes =
        timeToMinutes(end);


    if (
        startMinutes === null ||
        endMinutes === null
    ) {

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

    const roomName =
        document.getElementById(
            "room-name"
        );

    const roomDescription =
        document.getElementById(
            "room-description"
        );


    if (
        !roomName ||
        !roomDescription ||
        !room
    ) {

        return;

    }


    // --------------------------------------------------------
    // Get room information
    // --------------------------------------------------------

    const name =
        room.dataset.name ||
        room.dataset.room;

    const number =
        room.dataset.room;


    // Get the current building
    const building =
        getCurrentBuilding();


    const today =
        getTodayCode();


    // --------------------------------------------------------
    // Find classes using:
    //
    // building + room + today's day
    // --------------------------------------------------------

    const times =
        roomTimes(
            number,
            today
        );


    // Update room name
    roomName.textContent =
        name;


    // --------------------------------------------------------
    // No classes today
    // --------------------------------------------------------

    if (
        times.length === 0
    ) {

        roomDescription.innerHTML =
            "<strong>No classes scheduled today.</strong>";

        return;

    }


    // --------------------------------------------------------
    // Build schedule display
    // --------------------------------------------------------

    const scheduleHTML =
        times

            .map(time => {

                const active =
                    isClassCurrentlyActive(
                        time.start,
                        time.end
                    );


                const activeLabel =
                    active
                        ? " <strong>(In use now)</strong>"
                        : "";


                let line =
                    `<div class="room-class">`;


                line +=
                    `<strong>` +
                    `${formatTime(time.start)} - ` +
                    `${formatTime(time.end)}` +
                    `</strong>`;


                line +=
                    `${activeLabel}`;


                if (
                    time.course
                ) {

                    line +=
                        `<br>${time.course}`;

                }


                if (
                    time.title
                ) {

                    line +=
                        ` — ${time.title}`;

                }


                if (
                    time.instructor
                ) {

                    line +=
                        `<br><small>` +
                        `${time.instructor}` +
                        `</small>`;

                }


                line +=
                    "</div>";


                return line;

            })

            .join("<br>");


    // --------------------------------------------------------
    // Display schedule
    // --------------------------------------------------------

    roomDescription.innerHTML =
        `<strong>Today's Classes</strong>` +
        `<br><br>` +
        scheduleHTML;
}


// ============================================================
// UPDATE CURRENTLY SELECTED ROOM
// ============================================================

function updateSelectedRoom() {

    const selectedRoom =
        document.querySelector(
            ".room.selected"
        );


    if (
        selectedRoom
    ) {

        updateRoomInformation(
            selectedRoom
        );

    }
}


// ============================================================
// ROOM CLICK HANDLERS
// ============================================================
//
// Works for rooms on ANY building page,
// as long as the room uses:
//
// class="room"
// data-room="..."
// data-name="..."
//
// The building is determined from:
//
// <body data-building="TFAC">
//


function initializeRooms() {

    const rooms =
        document.querySelectorAll(
            ".room"
        );


    rooms.forEach(room => {

        room.addEventListener(
            "click",
            function() {


                // Remove selection from all rooms
                rooms.forEach(r => {

                    r.classList.remove(
                        "selected"
                    );

                });


                // Select clicked room
                this.classList.add(
                    "selected"
                );


                // Update information panel
                updateRoomInformation(
                    this
                );

            }
        );

    });


    console.log(
        `Initialized ${rooms.length} rooms.`
    );
}


// ============================================================
// FLOOR SWITCHING
// ============================================================
//
// Preserves the existing TFAC.html behavior:
//
// showFloor(1)
// showFloor(2)
// showFloor(3)
//
// It also works with any number of floors using:
//
// id="floor-1"
// id="floor-2"
// id="floor-3"
// etc.
//

function showFloor(floorNumber) {


    // Hide all floors
    document
        .querySelectorAll(".floor")
        .forEach(floor => {

            floor.classList.remove(
                "active"
            );

        });


    // Show requested floor
    const selectedFloor =
        document.getElementById(
            "floor-" + floorNumber
        );


    if (
        selectedFloor
    ) {

        selectedFloor.classList.add(
            "active"
        );

    }
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeRooms();

        loadCourses();

    }
);
