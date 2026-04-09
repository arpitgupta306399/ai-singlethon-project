AI Placement Predictor (FutureHire AI)

This project is a simple and practical system designed to help students understand their placement readiness and improve it in a structured way.

It takes basic inputs such as marks, attendance, skills, projects, and backlogs, and then predicts the placement probability along with a clear improvement plan.

Idea Behind the Project

In many colleges, students are unsure about their placement preparation and what they should focus on.

This project was built to:

- Estimate placement chances
- Identify weak areas
- Provide a clear 6-month improvement plan

Features

- Calculates placement probability (0–100%)
- Shows risk level (Low / Medium / High)
- Identifies missing or weak skills
- Generates a personalized 6-month action plan
- Supports voice input using browser speech recognition
- Includes an AI chatbot for guidance
- Stores data using Firebase

Technologies Used

Frontend:

- HTML
- CSS
- JavaScript

Backend / AI:

- Google Gemini API (for chatbot)

Database:

- Firebase Firestore

Other:

- Web Speech API (for voice input)

Working Logic

The system uses a weighted scoring model:

- Marks → 30%
- Attendance → 20%
- Skills → 20%
- Projects → 20%
- Backlogs → negative impact

Based on this, it calculates a final placement probability.

Risk Levels

- Low Risk → 75% and above
- Medium Risk → 50% to 74%
- High Risk → below 50%

Action Plan

Depending on the result, the system suggests:

- Month 1–2 → Focus on basics and skills
- Month 3–4 → Work on projects and practical exposure
- Month 5–6 → Prepare for interviews and tests

AI Chatbot

The chatbot is connected with the Gemini API and provides guidance related to:

- Placement preparation
- Skills improvement
- Interview tips

Voice Input

Users can enter their data using voice, making the system easier and faster to use.

How to Run

1. Clone or download the project
2. Open the folder
3. Run index.html in a browser
4. Add Firebase configuration in firebase.js
5. Add Gemini API key in script.js

About

Arpit Gupta
B.Tech CSE Student

Future Scope

- Integration of a real machine learning model
- Resume analysis feature
- Company-specific recommendations
- Interview simulation system

Conclusion

This project focuses on solving a real student problem in a simple and practical way by combining prediction, guidance, and user-friendly interaction.
