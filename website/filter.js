
/* ============================================================
   filter.js
   Reusable course filtering functions.
   ============================================================ */


// ============================================================
// SEARCH BY CRN
// ============================================================

export function filterByCRN(courses, value) {
    const crn = String(value ?? "").trim();

    if (!crn) return null;

    return courses.find(course =>
        String(course.CRN || "").trim() === crn
    ) || null;
}


// ============================================================
// SEARCH BY COURSE CODE
// Example: CPSC 300
// ============================================================

export function filterByCourse(courses, value) {
    const search = String(value ?? "").trim().toLowerCase();

    if (!search) return [];

    return courses.filter(course =>
        String(course.Course || "").trim().toLowerCase() === search
    );
}


// ============================================================
// SEARCH BY LOCATION
// Matches a location prefix, such as LUTR.
// ============================================================

export function filterByLocation(courses, value) {
    const search = String(value ?? "").trim().toLowerCase();

    if (!search) return [];

    return courses.filter(course => {
        const locations = String(course.Location || "")
            .split(";")
            .map(location => location.trim().toLowerCase());

        return locations.some(location =>
            location.startsWith(search)
        );
    });
}


// ============================================================
// SEARCH BY INSTRUCTOR
// Supports partial-name searches.
// ============================================================

export function filterByInstructor(courses, value) {
    const search = String(value ?? "").trim().toLowerCase();

    if (!search) return [];

    return courses.filter(course =>
        String(course.Instructor || "")
            .toLowerCase()
            .includes(search)
    );
}


// ============================================================
// SEARCH BY TIME AND DAY
// Time is in HHMM format, e.g. 1000 for 10:00 AM.
// ============================================================

export function filterByTime(courses, value, day) {
    const time = Number(value);

    if (!Number.isFinite(time) || !day) {
        return [];
    }

    return courses.filter(course => {
        const days = String(course.Days || "");
        const ranges = String(course.Time || "")
            .split(";")
            .map(range => range.trim());

        if (!days.includes(day)) {
            return false;
        }

        return ranges.some(range => {
            const parts = range.split("-");

            if (parts.length !== 2) return false;

            const start = Number(parts[0].trim());
            const end = Number(parts[1].trim());

            return (
                Number.isFinite(start) &&
                Number.isFinite(end) &&
                start <= time &&
                time <= end
            );
        });
    });
}


// ============================================================
// SEARCH BY ROOM
// Requires both building and room number.
// Example: LUTR + 1181A
// ============================================================


export function filterByRoom(courses, room, building) {
    const rawRoom = String(room ?? "").trim().toUpperCase();
    const buildingName = String(building ?? "").trim().toUpperCase();

    if (!rawRoom || !buildingName) {
        return [];
    }

    // Extract primary room token (e.g., "105" from "105 Studio 1")
    const roomToken = rawRoom.split(/\s+/)[0];
    const expectedFull = `${buildingName} ${rawRoom}`;

    return courses.filter(course => {
        const locations = String(course.Location || "")
            .split(";")
            .map(loc => loc.trim().toUpperCase());

        return locations.some(loc => {
            if (!loc.startsWith(buildingName)) return false;

            // Extract the room portion after the building code (e.g., "2070A" from "FORBES 2070A")
            const csvRoom = loc.replace(buildingName, "").trim();

            return (
                loc === expectedFull ||               // Exact match: "TFAC 124A" === "TFAC 124A"
                csvRoom === rawRoom ||                // Clean room match: "1181A" === "1181A"
                csvRoom.startsWith(roomToken) ||      // Sub-room match: "2070A" starts with "2070"
                roomToken.startsWith(csvRoom)         // Base room match: "1181A" starts with "1181"
            );
        });
    });
}

// ============================================================
// GET CLASS TIMES FOR A ROOM ON A SPECIFIC DAY
// Returns the details used by the room information panel.
// ============================================================

export function filterRoomTimes(courses, room, day, building) {
    const matchingCourses =
        filterByRoom(courses, room, building);

    const times = [];

    for (const course of matchingCourses) {
        const days = String(course.Days || "");

        if (!days.includes(day)) {
            continue;
        }

        const ranges = String(course.Time || "")
            .split(";")
            .map(range => range.trim());

        for (const range of ranges) {
            const parts = range.split("-");

            if (parts.length !== 2) {
                continue;
            }

            const start = parts[0].trim();
            const end = parts[1].trim();

            if (!start || !end) {
                continue;
            }

            times.push({
                start,
                end,
                course: course.Course || "",
                title: course.Title || "",
                instructor: course.Instructor || "",
                crn: course.CRN || ""
            });
        }
    }

    return times;
}
