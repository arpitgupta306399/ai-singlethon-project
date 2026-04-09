import {
    savePrediction,
    fetchPredictions,
    listenPredictions,
    deletePrediction,
    clearAllPredictions
} from "../static/firebase.js";

const STORAGE_KEY = "futurehirePlacementData";

function saveState(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }

function getRiskColor(risk) {
    if (risk === "Low")    return "#22c55e";
    if (risk === "Medium") return "#f59e0b";
    return "#ef4444";
}
function showError(id, msg) { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.classList.remove("hidden"); }
function hideError(id) { const el = document.getElementById(id); if (el) el.classList.add("hidden"); }
function formatTimestamp(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function setField(id, value) { const el = document.getElementById(id); if (el) el.value = value; }

// ── AI Logic ──────────────────────────────────────────────────────────────────
function calcProbability(marks, attendance, skillsCount, projects, backlogs) {
    const skillsNorm   = Math.min((skillsCount / 10) * 100, 100);
    const projectsNorm = Math.min((projects / 5) * 100, 100);
    const score = marks * 0.30 + attendance * 0.20 + skillsNorm * 0.20 + projectsNorm * 0.20 - backlogs * 10;
    return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}
function getRiskLevel(prob) {
    if (prob >= 75) return "Low";
    if (prob >= 50) return "Medium";
    return "High";
}
function getMissingSkills(skillsCount) {
    if (skillsCount < 3) return ["Data Structures", "System Design", "SQL", "Projects"];
    return [];
}
function getActionPlan(prob) {
    if (prob >= 75) return {
        month_1_2: "Strengthen DSA and system design concepts",
        month_3_4: "Build 2 advanced projects and contribute to open source",
        month_5_6: "Mock interviews, resume polish, and apply to top companies"
    };
    if (prob >= 50) return {
        month_1_2: "Focus on DSA fundamentals and fill skill gaps",
        month_3_4: "Build real-world projects and improve GitHub profile",
        month_5_6: "Practice mock interviews and apply to mid-tier companies"
    };
    return {
        month_1_2: "Clear backlogs, improve marks, and start DSA from scratch",
        month_3_4: "Learn SQL, System Design, and complete at least 2 projects",
        month_5_6: "Mock interviews, aptitude prep, and apply broadly"
    };
}
function getExplanation(prob, marks, attendance, backlogs, skillsCount, projects) {
    const issues = [], strengths = [];
    if (backlogs > 0)     issues.push(`${backlogs} active backlog(s)`);
    if (marks < 60)       issues.push("low academic marks");
    if (skillsCount < 3)  issues.push("insufficient technical skills");
    if (projects < 2)     issues.push("limited project experience");
    if (attendance < 75)  issues.push("low attendance");
    if (marks >= 75)      strengths.push("strong academics");
    if (projects >= 3)    strengths.push("solid project portfolio");
    if (attendance >= 85) strengths.push("excellent attendance");
    if (backlogs === 0)   strengths.push("no backlogs");
    let base = prob >= 75 ? "Excellent placement prospects!" : prob >= 50 ? "Moderate placement chances." : "High risk — immediate improvement needed.";
    if (issues.length)    base += ` Concerns: ${issues.join(", ")}.`;
    if (strengths.length) base += ` Strengths: ${strengths.join(", ")}.`;
    return base;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function initDashboardPage() {
    const form = document.getElementById("predictionForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError("formError");

        const name        = document.getElementById("name").value.trim();
        const marks       = Number(document.getElementById("marks").value);
        const attendance  = Number(document.getElementById("attendance").value);
        const backlogs    = Number(document.getElementById("backlogs").value);
        const projects    = Number(document.getElementById("projects").value);
        const skillsCount = Number(document.getElementById("skills_count").value);
        const skillsList  = document.getElementById("skills_list")?.value.trim() || "";

        if (!name)                              { showError("formError", "Please enter your name."); return; }
        if (marks < 0 || marks > 100)           { showError("formError", "Marks must be 0-100."); return; }
        if (attendance < 0 || attendance > 100) { showError("formError", "Attendance must be 0-100."); return; }

        const btn     = document.getElementById("predictBtn");
        const loader  = document.getElementById("btnLoader");
        const btnText = document.getElementById("btnText");
        btn.disabled = true;
        if (loader) loader.style.display = "inline-block";
        if (btnText) btnText.textContent = "Analyzing...";

        const prob        = calcProbability(marks, attendance, skillsCount, projects, backlogs);
        const risk        = getRiskLevel(prob);
        const missing     = getMissingSkills(skillsCount);
        const action_plan = getActionPlan(prob);
        const explanation = getExplanation(prob, marks, attendance, backlogs, skillsCount, projects);
        const result      = { placement_probability: prob, risk_level: risk, missing_skills: missing, action_plan, explanation };

        saveState({ name, marks, attendance, backlogs, projects, skills_count: skillsCount, skills_list: skillsList, firestore_id: null, apiResult: result });

        window.location.href = "result.html";

        // Firebase in background
        savePrediction({ name, marks, attendance, skills_count: skillsCount, projects, backlogs, skills_list: skillsList, placement_probability: prob, risk_level: risk, missing_skills: missing, action_plan, explanation })
            .then(id => { if (id) { const s = loadState(); s.firestore_id = id; saveState(s); } })
            .catch(err => console.warn("Firebase:", err));
    });
}

// ── Voice ─────────────────────────────────────────────────────────────────────
function initVoiceFeature() {
    const voiceBtn        = document.getElementById("voiceBtn");
    const voiceStatus     = document.getElementById("voiceStatus");
    const voiceStatusText = document.getElementById("voiceStatusText");
    if (!voiceBtn) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { voiceBtn.textContent = "🎤 Not Supported"; voiceBtn.disabled = true; return; }

    const rec = new SR();
    rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = false;
    let listening = false;

    voiceBtn.addEventListener("click", () => {
        if (listening) return;
        listening = true;
        voiceBtn.textContent = "🔴 Listening...";
        voiceBtn.disabled = true;
        if (voiceStatus) voiceStatus.classList.remove("hidden");
        if (voiceStatusText) voiceStatusText.textContent = "🎙️ Say: my name is Arpit marks 75 attendance 80 skills 3 projects 2 backlogs 0";
        try { rec.start(); } catch(e) { reset(); }
    });

    rec.onresult = (event) => {
        const text  = event.results[0][0].transcript.trim();
        const lower = text.toLowerCase();
        if (voiceStatusText) voiceStatusText.textContent = `✅ Heard: "${text}"`;

        // extract name
        const nameMatch = lower.match(/(?:my name is|name is|i am|i'm)\s+([a-z][a-z\s]{1,25}?)(?:\s+marks|\s+attendance|\s+skills|\s+projects|\s+backlogs|$)/);
        if (nameMatch) setField("name", nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()));

        const extract = (kws) => { for (const kw of kws) { const m = lower.match(new RegExp(kw + "[\\s:is]*(\\d+)")); if (m) return m[1]; } return null; };
        const nums = lower.match(/\d+/g) || [];

        const mv = extract(["marks","mark"]);
        const av = extract(["attendance","attend"]);
        const sv = extract(["skills","skill"]);
        const pv = extract(["projects","project"]);
        const bv = extract(["backlogs","backlog"]);

        if (mv) setField("marks", mv);        else if (nums[0]) setField("marks", nums[0]);
        if (av) setField("attendance", av);   else if (nums[1]) setField("attendance", nums[1]);
        if (sv) setField("skills_count", sv); else if (nums[2]) setField("skills_count", nums[2]);
        if (pv) setField("projects", pv);     else if (nums[3]) setField("projects", nums[3]);
        if (bv) setField("backlogs", bv);     else if (nums[4]) setField("backlogs", nums[4]);

        if (voiceStatusText) voiceStatusText.textContent = "✅ Done! Fields filled.";
        setTimeout(() => { if (voiceStatus) voiceStatus.classList.add("hidden"); }, 2500);
    };

    rec.onerror = (e) => {
        const m = { "not-allowed": "❌ Mic blocked! Allow in browser.", "no-speech": "🔇 No speech. Try again.", "audio-capture": "❌ No mic found." };
        if (voiceStatusText) voiceStatusText.textContent = m[e.error] || `❌ ${e.error}`;
        setTimeout(() => { if (voiceStatus) voiceStatus.classList.add("hidden"); }, 3000);
    };

    rec.onend = reset;

    function reset() { listening = false; voiceBtn.textContent = "🎤 Voice Input"; voiceBtn.disabled = false; }
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function initChatbot() {
    const API_KEY  = "AIzaSyB1gIgwiCUNqScATMoOdtFMX2BbQsEjUPQ";
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const PROMPT   = "You are an AI placement assistant for college students. Answer clearly and concisely about placement prep, skills, projects, interviews.";

    const fab      = document.getElementById("chatbotFab");
    const box      = document.getElementById("chatbotBox");
    const closeBtn = document.getElementById("chatbotClose");
    const input    = document.getElementById("chatInput");
    const sendBtn  = document.getElementById("chatSend");
    const messages = document.getElementById("chatMessages");
    if (!fab || !box || !messages) return;

    function addMsg(sender, text) {
        const d = document.createElement("div");
        d.className = `chat-msg ${sender}`;
        d.textContent = text;
        messages.appendChild(d);
        messages.scrollTop = messages.scrollHeight;
    }

    addMsg("bot", "👋 Hi! Ask me anything about placement prep!");

    fab.addEventListener("click", () => { box.style.display = box.style.display === "flex" ? "none" : "flex"; if (box.style.display === "flex" && input) input.focus(); });
    if (closeBtn) closeBtn.addEventListener("click", () => { box.style.display = "none"; });

    function localReply(msg) {
        const m = msg.toLowerCase();
        if (m.includes("placement") || m.includes("job"))       return "🎯 Clear backlogs, score 70%+, build 2-3 projects, learn DSA+SQL+System Design, practice mock interviews.";
        if (m.includes("dsa") || m.includes("data structure"))  return "💻 Start: Arrays→LinkedList→Trees→Graphs→DP. Do 2-3 LeetCode problems daily. Target 150+ problems.";
        if (m.includes("skill") || m.includes("learn"))         return "⭐ Top skills: DSA, SQL, System Design, React/Node or Django, Git, Communication.";
        if (m.includes("project"))                               return "🛠️ Build 2-3 projects: full-stack app, database project, API project. Host on GitHub.";
        if (m.includes("resume") || m.includes("cv"))           return "📄 1 page resume, projects+skills at top, action verbs, add GitHub/LinkedIn.";
        if (m.includes("interview"))                             return "💪 Practice DSA daily, revise DBMS/OS/CN, do mock interviews, prepare HR answers.";
        if (m.includes("backlog"))                               return "⚠️ Clear backlogs ASAP! Most companies have 0-backlog policy.";
        if (m.includes("cgpa") || m.includes("marks"))          return "🎓 Aim for 70%+. Minimum 60-65% for most companies.";
        if (m.includes("hello") || m.includes("hi"))            return "👋 Hello! Ask me about DSA, projects, resume, interviews or placement tips!";
        if (m.includes("thank"))                                 return "😊 Best of luck! You've got this! 🚀";
        return "🧠 Focus on: 1️⃣ DSA 2️⃣ 2-3 Projects 3️⃣ Core CS (DBMS,OS,CN) 4️⃣ Mock Interviews";
    }

    async function getAIResponse(message) {
        try {
            const res = await fetch(ENDPOINT, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT + "\n\nUser: " + message }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 300 } })
            });
            if (!res.ok) return localReply(message);
            const data = await res.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || localReply(message);
        } catch { return localReply(message); }
    }

    async function send() {
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        addMsg("user", msg);
        input.value = "";
        if (sendBtn) sendBtn.disabled = true;
        const t = document.createElement("div"); t.className = "chat-msg bot"; t.id = "chatTyping"; t.textContent = "Thinking..."; messages.appendChild(t); messages.scrollTop = messages.scrollHeight;
        const reply = await getAIResponse(msg);
        document.getElementById("chatTyping")?.remove();
        addMsg("bot", reply);
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }

    if (sendBtn) sendBtn.addEventListener("click", send);
    if (input)   input.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
}

// ── Result Page ───────────────────────────────────────────────────────────────
function initResultPage() {
    const loadingSection = document.getElementById("loadingSection");
    const resultsSection = document.getElementById("resultsSection");
    if (!loadingSection || !resultsSection) return;

    const state = loadState();
    if (!state?.apiResult) {
        loadingSection.querySelector("h3").textContent = "No prediction data found.";
        loadingSection.querySelector("p").textContent  = "Go to Dashboard and submit your profile first.";
        return;
    }

    loadingSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    resultsSection.classList.add("fade-in");

    const r     = state.apiResult;
    const prob  = r.placement_probability;
    const risk  = r.risk_level;
    const color = getRiskColor(risk);
    const missing = r.missing_skills || [];
    const plan    = r.action_plan    || {};

    const probEl = document.getElementById("probValue");
    if (probEl) probEl.textContent = `${prob}%`;

    const bar = document.getElementById("progressBar");
    if (bar) { bar.style.background = color; requestAnimationFrame(() => { bar.style.width = `${prob}%`; }); }

    const statusCard = document.getElementById("statusCard");
    if (statusCard) statusCard.style.borderTop = `4px solid ${color}`;

    const explEl = document.getElementById("resultExplanation");
    if (explEl) explEl.textContent = r.explanation || "";

    const riskBadge = document.getElementById("riskBadgeLarge");
    if (riskBadge) { riskBadge.textContent = `${risk} Risk`; riskBadge.style.cssText = `color:${color};font-size:2rem;font-weight:900;`; }

    const riskDesc = document.getElementById("riskDesc");
    if (riskDesc) riskDesc.textContent = risk === "Low" ? "Great prospects! Keep it up." : risk === "Medium" ? "Moderate chances. Focus on skill gaps." : "High risk. Prioritise backlogs and skills.";

    const statusText = document.getElementById("statusText");
    if (statusText) { statusText.textContent = `${risk} Risk`; statusText.style.color = color; }

    const gapEl = document.getElementById("skillGaps");
    if (gapEl) gapEl.innerHTML = missing.length ? missing.map(s => `<span class="gap-tag"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;margin-right:6px;"></i>${s}</span>`).join("") : `<span class="gap-tag" style="color:#22c55e;"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>No skill gaps!</span>`;

    const quickPlan = document.getElementById("quickPlan");
    if (quickPlan) quickPlan.innerHTML = Object.values(plan).map(t => `<li style="padding:6px 0;color:rgba(248,250,252,0.82);font-size:0.9rem;">→ ${t}</li>`).join("");

    const savedBadge = document.getElementById("savedBadge");
    if (savedBadge && state.firestore_id) { savedBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Saved to Firebase`; savedBadge.classList.remove("hidden"); }
}

// ── Analysis Page ─────────────────────────────────────────────────────────────
function initAnalysisPage() {
    if (!document.getElementById("bar-marks")) return;
    const state = loadState();
    if (!state?.apiResult) {
        document.getElementById("analysisHeader").textContent = "No data found. Please make a prediction first.";
        return;
    }

    const marks       = Number(state.marks        || 0);
    const attendance  = Number(state.attendance   || 0);
    const skillsCount = Number(state.skills_count || 0);
    const projects    = Number(state.projects     || 0);
    const backlogs    = Number(state.backlogs     || 0);
    const missing     = state.apiResult.missing_skills || [];

    const skillsScore   = Math.min(100, skillsCount * 10);
    const projectsScore = Math.min(100, projects * 20);
    const backlogRisk   = Math.min(100, backlogs * 25);

    const barMap   = { "bar-marks": marks, "bar-skills": skillsScore, "bar-projects": projectsScore, "bar-attendance": attendance, "bar-backlogs": backlogRisk };
    const scoreMap = { "score-marks": `${marks}%`, "score-skills": `${skillsScore}%`, "score-projects": `${projectsScore}%`, "score-attendance": `${attendance}%`, "score-backlogs": `${backlogRisk}%` };

    Object.entries(barMap).forEach(([id, val]) => { const el = document.getElementById(id); if (el) requestAnimationFrame(() => { el.style.width = `${val}%`; }); });
    Object.entries(scoreMap).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });

    const header = document.getElementById("analysisHeader");
    if (header && state.name) header.textContent = `Hi ${state.name}, here is your profile breakdown.`;

    const gapEl = document.getElementById("skillGaps");
    if (gapEl) gapEl.innerHTML = missing.length ? missing.map(s => `<span class="gap-tag"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;margin-right:6px;"></i>${s}</span>`).join("") : `<span class="gap-tag" style="color:#22c55e;"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>No skill gaps!</span>`;
}

// ── Action Plan Page ──────────────────────────────────────────────────────────
function initActionPlanPage() {
    const planCards = document.getElementById("planCards");
    if (!planCards) return;
    const state = loadState();
    if (!state?.apiResult) {
        planCards.innerHTML = `<div style="color:var(--muted);text-align:center;padding:40px;grid-column:1/-1;">No data found. <a href="dashboard.html" style="color:var(--primary);">Make a prediction first →</a></div>`;
        return;
    }
    const plan   = state.apiResult.action_plan || {};
    const phases = [
        { key: "month_1_2", label: "Month 1–2", icon: "fa-seedling", color: "#7c3aed" },
        { key: "month_3_4", label: "Month 3–4", icon: "fa-code",     color: "#38bdf8" },
        { key: "month_5_6", label: "Month 5–6", icon: "fa-trophy",   color: "#f472b6" }
    ];
    planCards.innerHTML = phases.map(({ key, label, icon, color }) => `
        <div class="timeline-item">
            <div class="timeline-content glass-card" style="border-top:3px solid ${color};">
                <span class="month" style="color:${color};"><i class="fa-solid ${icon}"></i> ${label}</span>
                <h4>${plan[key] || "No tasks defined."}</h4>
            </div>
        </div>`).join("");
}

// ── History Page ──────────────────────────────────────────────────────────────
function initHistoryPage() {
    const container = document.getElementById("historyContainer");
    const countEl   = document.getElementById("historyCount");
    const clearBtn  = document.getElementById("clearAllBtn");
    if (!container) return;

    container.innerHTML = `<div class="history-loading"><div class="loading-spinner"></div><p>Loading...</p></div>`;

    const unsubscribe = listenPredictions((records) => {
        if (countEl) countEl.textContent = `${records.length} record${records.length !== 1 ? "s" : ""}`;
        if (!records.length) {
            container.innerHTML = `<div class="history-empty glass-card"><i class="fa-solid fa-database" style="font-size:2.5rem;color:var(--muted);margin-bottom:16px;"></i><p>No predictions saved yet.</p><a href="dashboard.html" class="secondary-btn" style="margin-top:16px;"><i class="fa-solid fa-plus"></i> Make a Prediction</a></div>`;
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="history-card glass-card" id="record-${r.id}">
                <div class="history-card-header">
                    <div class="history-name"><i class="fa-solid fa-user-circle"></i><span>${r.name || "Anonymous"}</span></div>
                    <div class="history-meta">
                        <span class="history-date"><i class="fa-regular fa-clock"></i> ${formatTimestamp(r.timestamp)}</span>
                        <button class="delete-btn" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="history-stats">
                    <div class="history-prob" style="color:${getRiskColor(r.risk_level)};">${r.placement_probability}%</div>
                    <span class="risk-badge" style="background:${getRiskColor(r.risk_level)}20;color:${getRiskColor(r.risk_level)};border:1px solid ${getRiskColor(r.risk_level)}40;">${r.risk_level} Risk</span>
                </div>
                <div class="history-inputs">
                    <span><i class="fa-solid fa-graduation-cap"></i> Marks: <b>${r.marks}%</b></span>
                    <span><i class="fa-solid fa-calendar-check"></i> Attendance: <b>${r.attendance}%</b></span>
                    <span><i class="fa-solid fa-code"></i> Skills: <b>${r.skills_count}</b></span>
                    <span><i class="fa-solid fa-folder-open"></i> Projects: <b>${r.projects}</b></span>
                    <span><i class="fa-solid fa-circle-exclamation"></i> Backlogs: <b>${r.backlogs}</b></span>
                </div>
                ${r.missing_skills?.length ? `<div class="history-gaps"><span class="gap-label">Missing:</span>${r.missing_skills.map(s => `<span class="gap-tag">${s}</span>`).join("")}</div>` : ""}
                <p class="history-explanation">${r.explanation || ""}</p>
            </div>`).join("");

        container.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this record?")) return;
                btn.disabled = true;
                await deletePrediction(btn.dataset.id);
            });
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
            if (!confirm("Delete ALL records?")) return;
            clearBtn.disabled = true;
            await clearAllPredictions();
            clearBtn.disabled = false;
        });
    }
    window.addEventListener("beforeunload", unsubscribe);
}

// ── Analytics Page ────────────────────────────────────────────────────────────
async function initAnalyticsDashboard() {
    const totalEl  = document.getElementById("totalPredictions");
    const avgEl    = document.getElementById("avgProbability");
    const highEl   = document.getElementById("highRiskCount");
    const recentEl = document.getElementById("recentList");
    if (!totalEl) return;
    try {
        const records = await fetchPredictions();
        totalEl.textContent = records.length;
        if (records.length) {
            const avg = records.reduce((s, r) => s + r.placement_probability, 0) / records.length;
            avgEl.textContent  = `${avg.toFixed(1)}%`;
            highEl.textContent = records.filter(r => r.risk_level === "High").length;
            if (recentEl) recentEl.innerHTML = records.slice(0, 5).map(r => `
                <div class="recent-item">
                    <span class="recent-name">${r.name || "Anonymous"}</span>
                    <span class="recent-prob" style="color:${getRiskColor(r.risk_level)};">${r.placement_probability}%</span>
                    <span class="risk-badge" style="background:${getRiskColor(r.risk_level)}20;color:${getRiskColor(r.risk_level)};border:1px solid ${getRiskColor(r.risk_level)}40;">${r.risk_level}</span>
                </div>`).join("");
        } else {
            avgEl.textContent  = "—";
            highEl.textContent = "0";
            if (recentEl) recentEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px;">No data yet.</p>`;
        }
    } catch (err) { if (totalEl) totalEl.textContent = "—"; }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    initDashboardPage();
    initVoiceFeature();
    initChatbot();
    initResultPage();
    initAnalysisPage();
    initActionPlanPage();
    initHistoryPage();
    initAnalyticsDashboard();
});
