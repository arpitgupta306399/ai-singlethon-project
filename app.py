import streamlit as st
from model.predictor import predict_placement
from logic.recommendation import action_plan

st.set_page_config(page_title="Placement Prediction System")

st.title("🎓 Student Placement Prediction System")
st.write("Predict placement probability and get a 6-month action plan")

attendance = st.slider("Attendance (%)", 0, 100, 75)
internals = st.slider("Internal Marks", 0, 100, 70)
backlogs = st.number_input("Number of Backlogs", 0, 10, 0)

if st.button("Predict Placement"):
    probability = predict_placement(attendance, internals, backlogs)

    st.subheader(f"📊 Placement Probability: {probability}%")

    st.subheader("📅 Personalized 6-Month Plan")
    plan = action_plan(attendance, internals, backlogs)

    for step in plan:
        st.write("✔", step)