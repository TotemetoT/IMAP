import csv

import configs as cfg

class Course:
    def __init__(self, row):
        self.row = row
        self.CRN = row[0]
        self.course = row[1]
        self.title = row[3]
        self.days = row[7]
        self.time = row[8]
        self.location = row[9]
        self.instructor = row[10]

class Prof:
    def __init__(self, row):
        self.row = row
        self.prof = row[0]
        self.office = row[1]
        self.department = row[2]
        self.college = row[3]
        self.email = row[4]
        self.website = row[5]


def C_Load_CSV():
    """
    Loads the CSV without courses that are not in person:
    ARR, HYB, ASY, etc. 
    
    @return: List of rows of SYN classes
    """
    fname = cfg.COURSE_PATH
    rows = []
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader) 
        for row in reader:
            if row[9] != " " and row[9] != "HYB " and row[9] != "ASY " and row[9] != "ARR ":
                rows.append(Course(row))
    return rows

def C_Full_Load_CSV():
    """
    Loads the CSV with courses that are not in person:
    ARR, HYB, ASY, etc. 
    
    @return: List of rows of SYN classes
    """
    fname = cfg.COURSE_PATH
    rows = []
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader) 
        for row in reader:
            rows.append(Course(row))
    return rows

def P_Load_CSV():
    fname = cfg.PROF_PATH
    rows = []
    with open(fname, "r") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            rows.append(Prof(row))
    return rows