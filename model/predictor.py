import pickle

def predict_placement(attendance, internals, backlogs):
    with open("model/placement_model.pkl", "rb") as file:
        model = pickle.load(file)

    probability = model.predict_proba(
        [[attendance, internals, backlogs]]
    )[0][1]

    return round(probability * 100, 2)