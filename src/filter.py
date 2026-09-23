import csv

# from dataloader import Load_CSV, Full_Load_CSV
import configs as cfg
import utils as u

def search_by():
    filters = ["CRN","Course","Section","Title","Hours","Area of LLC","Type","Days","Time","Location","Instructor","Seats Still Available","STATUS"]
    i = 0
    for filter in filters:
        print(f"{i}: {filter}")
        i += 1

def CRN(val):
        for row in cfg.COURSES:
            if row.CRN == str(val):
                return row
        return None
#TODO Refactor for Load_CSV()
def Location(val, rooms=cfg.COURSES):
    # L_dict = {}
    # for row in rooms: 
    #     if (row.location).lower()[:len(val)] == val.lower():
    #         if (row.location)[-5].isnumeric():
    #             if (row.location)[-4:] == " ": v = 3
    #             else: v = 5
    #         elif (row.location)[-4] == " ": v = 3
    #         else: v = 4
    #         if (row.location)[-v:] not in L_dict:
    #             L_dict[(row.location)[-v:]] = 1
    #         else:
    #             L_dict[(row.location)[-v:]] += 1                
    # return L_dict
    L_dict = []
    for row in rooms: 
        if (row.location).lower()[:len(val)] == val.lower():
            if (row.location)[-5].isnumeric():
                if (row.location)[-4:] == " ": v = 3
                else: v = 5
            elif (row.location)[-4] == " ": v = 3
            else: v = 4
            if (row.location)[-v:] not in L_dict:
                L_dict.append(row)
            else:
                L_dict.append(row)               
    return L_dict

def Time(t, d):
    t = int(t)
    courses = cfg.COURSES

    used = []
    unused = []

    for course in courses:
        time_ranges = [x.strip() for x in course.time.split(";")]

        course_is_active = False

        if d in course.days:
            for time_range in time_ranges:
                start, end = time_range.split("-")

                if int(start) <= t <= int(end):
                    course_is_active = True
                    break

        if course_is_active:
            used.append(course)
        else:
            unused.append(course)

    return used, unused

# def Time(t, d):
#     t = int(t)
#     courses = Load_CSV()

#     used = []
#     all_rooms = set()

#     for course in courses:
#         location = course.location
#         days = course.days
#         times = course.time

#         locations = [x.strip() for x in location.split(";")]
#         time_ranges = [x.strip() for x in times.split(";")]

#         # Keep track of every room
#         for room in locations:
#             all_rooms.add(room)

#         # Determine whether THIS course is happening at t on d
#         course_is_active = False

#         if d in days:
#             for time_range in time_ranges:
#                 start, end = time_range.split("-")

#                 if int(start) <= t <= int(end):
#                     course_is_active = True
#                     break

#         # If the course is active, its rooms are being used
#         if course_is_active:
#             for room in locations:
#                 used.setdefault(room, []).append(course)

#     # Anything not used is unused
#     unused = []

#     for room in all_rooms:
#         if room not in used:
#             unused.append(room)

#     return used, unused

#     # Converting Dicts
#     # used_rooms = {}
#     # unused_rooms = {}

#     # for key in used:
#     #     location, room = key.split(" ")[0], key.split(" ")[-1]

#     #     if location not in used_rooms:
#     #         used_rooms[location] = [room]
#     #     else:
#     #         used_rooms[location].append(room)

#     # for key in unused:
#     #     location, room = key.split(" ")[0], key.split(" ")[-1]

#     #     if location not in unused_rooms:
#     #         unused_rooms[location] = [room]
#     #     else:
#     #         unused_rooms[location].append(room)

#     # return u.clean_dict(used_rooms), u.clean_dict(unused_rooms)

def ID_room(R, rooms=cfg.COURSES):
    R = str(R)
    for room in rooms:
        if R in room.location:
            return room

def Instructor(N, full=False):
    if full: 
        courses = cfg.FULL_COURSES
    else: 
        courses = cfg.COURSES
    N = N.split(" ")
    Ilist = []
    for row in courses:
        I = row.instructor
        if I == [] or I == None or I == '': continue
        if '; ' in I:
            I = I.split('; ')
            c = 0
            for i in I:
                print(I, i)
                I[c] = i.split(', ')
                c += 1
            for _ in range(len(I)):
                I.append(I[0][0])
                I.append(I[0][1])
                I.remove(I[0])
        else: 
            I = I.split(', ')
        if len(N) == 1:
            if N[0].capitalize() in I: 
                Ilist.append(row)
        elif N[0].capitalize() in I and N[1].capitalize() in I:
            Ilist.append(row)
    return Ilist



if __name__ == "__main__":
    # used = Time(1930, "T")[0]
    # for room in used:
    #     # print(room.location)
    #     pass
    # print(ID_room(3387, Location('SERC', used)).row)

    for row in Instructor("Burket"):
        print(row.row)