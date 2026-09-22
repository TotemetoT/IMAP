import csv

import configs as cfg
import utils as u

def search_by():
    filters = ["CRN","Course","Section","Title","Hours","Area of LLC","Type","Days","Time","Location","Instructor","Seats Still Available","STATUS"]
    i = 0
    for filter in filters:
        print(f"{i}: {filter}")
        i += 1

def Load_CSV():
    """
    Loads the CSV without courses that are not in person:
    ARR, HYB, ASY, etc. 
    
    @return: List of rows of SYN classes"""
    fname = cfg.COURSE_PATH
    rows = []
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader) 
        for row in reader:
            if row[9] != " " and row[9] != "HYB " and row[9] != "ASY " and row[9] != "ARR ":
                rows.append(row)
    return rows
            

def CRN(val):
    fname = cfg.FALL_2026_PATH
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader) 
        for row in reader:
            if row[0] == str(val):
                return row
        return None
#TODO Refactor for Load_CSV()
def Location(val):
    fname = cfg.COURSE_PATH
    L_dict = {}
    with open(fname, 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader: 
            if row[9].lower()[:len(val)] == val.lower():
                if row[9][-5].isnumeric():
                    if row[9][-4:] == " ": v = 3
                    else: v = 5
                elif row[9][-4] == " ": v = 3
                else: v = 4
                print(v, row[9][-v:])
                if row[9][-v:] not in L_dict:
                    L_dict[row[9][-v:]] = 1
                else:
                    L_dict[row[9][-v:]] += 1                
    return L_dict

def Time(t, d):
    t = int(t)
    courses = Load_CSV()

    used = {}
    all_rooms = set()

    for course in courses:
        location = course[9]
        days = course[7]
        times = course[8]

        locations = [x.strip() for x in location.split(";")]
        time_ranges = [x.strip() for x in times.split(";")]

        # Keep track of every room
        for room in locations:
            all_rooms.add(room)

        # Determine whether THIS course is happening at t on d
        course_is_active = False

        if d in days:
            for time_range in time_ranges:
                start, end = time_range.split("-")

                if int(start) <= t <= int(end):
                    course_is_active = True
                    break

        # If the course is active, its rooms are being used
        if course_is_active:
            for room in locations:
                used.setdefault(room, []).append(course[1])

    # Anything not used is unused
    unused = {}

    for room in all_rooms:
        if room not in used:
            unused[room] = []

    # Converting Dicts
    used_rooms = {}
    unused_rooms = {}

    for key in used:
        location, room = key.split(" ")[0], key.split(" ")[-1]

        if location not in used_rooms:
            used_rooms[location] = [room]
        else:
            used_rooms[location].append(room)

    for key in unused:
        location, room = key.split(" ")[0], key.split(" ")[-1]

        if location not in unused_rooms:
            unused_rooms[location] = [room]
        else:
            unused_rooms[location].append(room)

    return u.clean_dict(used_rooms), u.clean_dict(unused_rooms)

if __name__ == "__main__":
    dicts = Time("9000", "M")
    i = 0
    l = ["used", "unused"]
    for dict in dicts:
        print("======================")
        print(l[i])
        i += 1
        print("======================")
        for key in dict:
            print(f"{key}: {dict[key]}")
        print('\n')


    # print(Location("FERG"))