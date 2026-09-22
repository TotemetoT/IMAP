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
                rows.append(Course(row))
    return rows

def Full_Load_CSV():
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
            rows.append(Course(row))
    return rows