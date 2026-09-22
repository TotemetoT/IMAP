import csv

import configs as cfg

# fname = "data/Fall2026.csv"
# lDict = {}
# c = 0
# with open(fname, "r") as f:
#     reader = csv.reader(f)
#     next(reader) 
#     for row in reader:
#         room = row[9]
#         if room != " " and room != "HYB " and room != "ASY " and room != "ARR ":
#             if room not in lDict:
#                 lDict[room] = 1
#             else: 
#                 lDict[room] += 1
#         c += 1

# print(f'Total: {c}')
# # print(lDict)

# bDict = {}

# for key in lDict:
#     key = str(key)
#     if key[0:4] not in bDict:
#         bDict[key[0:4]] = {key: lDict[key]}
#     else:
#         bDict[key[0:4]][key] = lDict[key]

# for key in bDict:
#     print(f'~~~~~~~~~~~~~~~~~~~~~~~{key, len(bDict[key])}~~~~~~~~~~~~~~~~~~~~~~~')
#     print(bDict[key])
#     print("\n\n")
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
            

def CRN_search(val):
    fname = cfg.FALL_2026_PATH
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader) 
        for row in reader:
            if row[0] == str(val):
                return row
        return None
#TODO Refactor for Load_CSV()
def Location_search(val):
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

def search_by():
    filters = ["CRN","Course","Section","Title","Hours","Area of LLC","Type","Days","Time","Location","Instructor","Seats Still Available","STATUS"]
    i = 0
    for filter in filters:
        print(f"{i}: {filter}")
        i += 1

def Time_search(val):
    courses = Load_CSV()
    used, unused = {}, {}
    for course in courses:
        start, end = course[8].split("-")
        if start <= val <= end:
            if course[9][:4] not in used:
                used[course[9][:4]] = {course[9]: 1}
                


search_by()
# print(Location_search("FERG"))
