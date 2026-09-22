def clean_dict(dict):
    new_dict = {}
    for key in dict:
        new_dict[key] = []
        for room in dict[key]:
            if room not in new_dict[key]:
                new_dict[key].append(room)
    for key in new_dict:
        new_dict[key] = sorted(new_dict[key])
    return new_dict