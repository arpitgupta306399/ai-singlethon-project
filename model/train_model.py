import pandas as pd
from sklearn.linear_model import LogisticRegression
import pickle
import os

data = pd.read_csv("data/student.csv")

X = data[["attendance", "internals", "backlogs"]]
y = data["placed"]

model = LogisticRegression()
model.fit(X, y)

os.makedirs("model", exist_ok=True)
with open("model/placement_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model trained and saved successfully!")
