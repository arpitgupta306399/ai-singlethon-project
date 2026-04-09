// ── Firebase Configuration ────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 PASTE YOUR REAL FIREBASE CONFIG HERE
const firebaseConfig = {
     apiKey: "AIzaSyANWqZjDebuCrp737G-Bb_C2x_tZ9L0qwg",
  authDomain: "ai-placement-predictor-42991.firebaseapp.com",
  projectId: "ai-placement-predictor-42991",
  storageBucket: "ai-placement-predictor-42991.firebasestorage.app",
  messagingSenderId: "767009469283",
  appId: "1:767009469283:web:b6e81283a32ffd8b10d956",
  measurementId: "G-KD1W8433V9"
};

// ── Initialize Firebase ───────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const COLLECTION = "predictions";


// ── AI LOGIC (PLACEMENT PREDICTION) 🔥 ───────────────────────────────────────
export function calculatePrediction(input) {
    let { marks, attendance, skills_count, projects, backlogs } = input;

    marks = Number(marks);
    attendance = Number(attendance);
    skills_count = Number(skills_count);
    projects = Number(projects);
    backlogs = Number(backlogs);

    // 🎯 Score calculation
    let score =
        (marks * 0.3) +
        (attendance * 0.2) +
        (skills_count * 10 * 0.2) +
        (projects * 10 * 0.2) -
        (backlogs * 10);

    score = Math.max(0, Math.min(100, Math.round(score)));

    // 🔥 Risk Level
    let risk_level = "High";
    if (score >= 75) risk_level = "Low";
    else if (score >= 50) risk_level = "Medium";

    // 🔥 Missing Skills
    let missing_skills = [];
    if (skills_count < 3) {
        missing_skills = [
            "Data Structures",
            "System Design",
            "SQL",
            "Projects"
        ];
    }

    // 🔥 Action Plan
    let action_plan = {
        month_1_2: "Focus on Data Structures & Programming Fundamentals",
        month_3_4: "Build Projects & Apply for Internships",
        month_5_6: "Prepare for Interviews & Mock Tests"
    };

    return {
        placement_probability: score,
        risk_level,
        missing_skills,
        action_plan
    };
}


// ── Save Prediction ───────────────────────────────────────────────────────────
export async function savePrediction(data) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving data:", error);
        return null;
    }
}


// ── Fetch Predictions ─────────────────────────────────────────────────────────
export async function fetchPredictions() {
    try {
        const q = query(collection(db, COLLECTION), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}


// ── Real-time Listener ────────────────────────────────────────────────────────
export function listenPredictions(callback) {
    try {
        const q = query(collection(db, COLLECTION), orderBy("timestamp", "desc"));
        return onSnapshot(q, snap => {
            const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(records);
        });
    } catch (error) {
        console.error("Realtime error:", error);
    }
}


// ── Delete Single Prediction ─────────────────────────────────────────────────
export async function deletePrediction(id) {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
        console.error("Delete error:", error);
    }
}


// ── Clear All Predictions ─────────────────────────────────────────────────────
export async function clearAllPredictions() {
    try {
        const snap = await getDocs(collection(db, COLLECTION));
        const deletes = snap.docs.map(d => deleteDoc(doc(db, COLLECTION, d.id)));
        await Promise.all(deletes);
    } catch (error) {
        console.error("Clear error:", error);
    }
}