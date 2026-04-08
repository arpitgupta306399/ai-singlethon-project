// Shared AI Placement Predictor frontend logic
// Handles form submission, result display, analysis rendering, and state persistence

const STORAGE_KEY = 'futurehirePlacementData';

// Helper: Parse comma-separated skill strings into normalized array
function parseSkills(value) {
    if (!value || typeof value !== 'string') return [];
    return value
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);
}

// Helper: Normalize text values for skill matching
function normalizeSkill(skill) {
    return skill.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// Calculate placement probability using weighted scoring
function calculatePlacement(student) {
    const marks = Math.max(0, Math.min(100, Number(student.marks || 0)));
    const attendance = Math.max(0, Math.min(100, Number(student.attendance || 0)));
    const backlogs = Math.max(0, Number(student.backlogs || 0));
    const skills = parseSkills(student.skills || '');
    const projects = Math.max(0, Number(student.projects || 0));
    const consistency = Math.max(0, Math.min(100, Number(student.consistency || 75)));

    const skillScore = Math.min(100, skills.length * 9 + 12);
    const projectScore = Math.min(100, projects * 12 + 20);
    const backlogPenalty = Math.min(30, backlogs * 8);

    const rawScore = (
        marks * 0.34 +
        attendance * 0.16 +
        skillScore * 0.24 +
        projectScore * 0.16 +
        consistency * 0.10 -
        backlogPenalty
    );

    const variance = rawScore * (Math.random() * 0.16 - 0.08);
    const finalScore = Math.max(0, Math.min(100, rawScore + variance));

    return {
        score: Number(finalScore.toFixed(1)),
        rawScore: Number(rawScore.toFixed(1)),
        variation: Number((variance * 100 / rawScore || 0).toFixed(1))
    };
}

function getRiskLabel(score) {
    if (score >= 80) return 'High Chance (Low Risk)';
    if (score >= 50) return 'Medium Chance';
    return 'High Risk';
}

function getRiskColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

function getMissingSkills(skills) {
    const required = ['DSA', 'DBMS', 'OS', 'System Design', 'SQL', 'Aptitude'];
    const normalized = skills.map(normalizeSkill);
    return required.filter(req => !normalized.includes(normalizeSkill(req)));
}

function buildExplanation(student, result) {
    const reasons = [];
    if (student.marks < 65) reasons.push('low academic score');
    if (student.attendance < 75) reasons.push('attendance below threshold');
    if (student.backlogs > 0) reasons.push('active backlogs');
    if (parseSkills(student.skills).length < 4) reasons.push('limited technical skills');
    if (student.projects < 2) reasons.push('few projects');

    if (!reasons.length) {
        return 'Your profile is strong, with a balanced mix of academics, skills, and project experience.';
    }
    return `Your score is low due to ${reasons.join(', ')}. Improve these areas for a better placement outlook.`;
}

function buildActionPlan(student) {
    const plan = {
        'Month 1-2': [],
        'Month 3-4': [],
        'Month 5-6': []
    };

    const skills = parseSkills(student.skills);
    const performanceIssues = student.marks < 70;
    const attendanceIssues = student.attendance < 80;
    const backlogIssues = student.backlogs > 0;
    const skillIssues = skills.length < 5;
    const projectIssues = student.projects < 3;

    if (backlogIssues) {
        plan['Month 1-2'].push('Clear pending backlogs and stabilize academic progress.');
        plan['Month 1-2'].push('Prioritize weekly revision to avoid backlog recurrence.');
    }
    if (performanceIssues) {
        plan['Month 1-2'].push('Review core subjects and strengthen fundamentals.');
        plan['Month 3-4'].push('Practice sample papers and exam-oriented problems.');
    }
    if (attendanceIssues) {
        plan['Month 1-2'].push('Improve attendance to 85%+ by attending lectures regularly.');
    }
    if (skillIssues) {
        plan['Month 1-2'].push('Master DSA fundamentals, SQL, and core programming concepts.');
        plan['Month 3-4'].push('Build a full-stack mini project with a database backend.');
        plan['Month 5-6'].push('Prepare problem-solving patterns and system design basics.');
    }
    if (projectIssues) {
        plan['Month 3-4'].push('Create 2-3 portfolio projects with real-world features.');
    }

    if (!plan['Month 1-2'].length) {
        plan['Month 1-2'].push('Refine fundamentals and build consistency across academics.');
        plan['Month 3-4'].push('Develop advanced projects, including cloud or AI components.');
        plan['Month 5-6'].push('Practice interviews and polish soft skills.');
    }

    plan['Month 5-6'].unshift('Start mock interviews and time-bound coding practice.');
    plan['Month 5-6'].push('Apply to internships and placement opportunities actively.');

    for (const key of Object.keys(plan)) {
        if (plan[key].length > 5) plan[key] = plan[key].slice(0, 5);
    }

    return plan;
}

function saveState(studentData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studentData));
}

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function initDashboardPage() {
    const form = document.getElementById('predictionForm');
    if (!form) return;

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const skillsInput = document.getElementById('skills').value;
        const projectsInput = document.getElementById('projects').value;
        
        // Parse skills from comma-separated string
        const userSkills = skillsInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        
        // Parse projects count from textarea input
        const projectsCount = projectsInput.split('\n').filter(p => p.trim()).length;
        
        const data = {
            name: document.getElementById('name').value.trim(),
            marks: Number(document.getElementById('marks').value),
            attendance: Number(document.getElementById('attendance').value),
            backlogs: Number(document.getElementById('backlogs').value),
            skills_count: userSkills.length,
            projects: projectsCount || Number(projectsInput) || 0,
            user_skills: userSkills,
            // Store original values for frontend display
            originalSkills: skillsInput,
            originalProjects: projectsInput
        };

        const button = document.getElementById('predictBtn');
        const loader = document.getElementById('btnLoader');
        const buttonText = button.querySelector('span');

        button.disabled = true;
        loader.style.display = 'inline-block';
        buttonText.textContent = 'Analyzing...';

        try {
            // Call backend API
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Backend API error: ' + response.statusText);
            }

            const result = await response.json();
            
            // Save combined data to localStorage
            const combinedData = {
                ...data,
                apiResult: result
            };
            saveState(combinedData);
            
            // Redirect to result page
            window.location.href = 'result.html';
        } catch (error) {
            console.error('Error:', error);
            loader.style.display = 'none';
            button.disabled = false;
            buttonText.textContent = 'Analyze Profile';
            alert('Error connecting to backend. Make sure the server is running on http://localhost:5000');
        }
    });
}

function initResultPage() {
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    if (!loadingSection || !resultsSection) return;

    document.addEventListener('DOMContentLoaded', () => {
        const student = loadState();
        if (!student || !student.marks) {
            loadingSection.querySelector('h3').textContent = 'No profile data found.';
            return;
        }

        setTimeout(() => {
            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('fade-in');
            renderResult(student);
        }, 1600);
    });
}

function renderResult(student) {
    // Use backend API result if available, otherwise fall back to local calculation
    let prediction, missingSkills, explanation;
    let riskLabel, riskColor;
    
    if (student.apiResult) {
        // Use backend results
        prediction = { score: student.apiResult.placement_probability };
        missingSkills = student.apiResult.missing_skills;
        explanation = student.apiResult.explanation;
        riskLabel = student.apiResult.risk_level;
        
        // Map risk level to color
        if (riskLabel === 'High Risk') {
            riskColor = '#ef4444';
        } else if (riskLabel === 'Medium Risk') {
            riskColor = '#f59e0b';
        } else {
            riskColor = '#22c55e';
        }
    } else {
        // Fallback to local calculation
        const skills = parseSkills(student.originalSkills || student.skills);
        missingSkills = getMissingSkills(skills);
        prediction = calculatePlacement(student);
        riskLabel = getRiskLabel(prediction.score);
        riskColor = getRiskColor(prediction.score);
        explanation = buildExplanation(student, prediction);
    }

    document.getElementById('probValue').textContent = `${prediction.score}%`;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${prediction.score}%`;
    progressBar.style.background = riskColor;

    const statusText = document.getElementById('statusText');
    statusText.textContent = riskLabel;
    statusText.style.color = riskColor;

    const statusCard = document.getElementById('statusCard');
    statusCard.style.borderTop = `4px solid ${riskColor}`;

    const gapContainer = document.getElementById('skillGaps');
    if (gapContainer) {
        gapContainer.innerHTML = missingSkills.length
            ? missingSkills.map(skill => `<span class="gap-tag">${skill}</span>`).join('')
            : '<span class="gap-tag">No skill gaps</span>';
    }

    if (document.getElementById('resultExplanation')) {
        document.getElementById('resultExplanation').textContent = explanation;
    }

    const analysisData = {
        ...student,
        prediction,
        missingSkills
    };
    saveState(analysisData);
}

function initAnalysisPage() {
    const hasAnalysis = document.getElementById('bar-marks');
    if (!hasAnalysis) return;

    document.addEventListener('DOMContentLoaded', () => {
        const student = loadState();
        if (!student || !student.marks) return;
        renderAnalysis(student);
    });
}

function renderAnalysis(student) {
    const skills = parseSkills(student.skills);
    const missingSkills = getMissingSkills(skills);
    const prediction = student.prediction || calculatePlacement(student);

    const academicScore = Math.min(100, Number(student.marks || 0));
    const skillsScore = Math.min(100, skills.length * 12 + 20);
    const projectsScore = Math.min(100, Number(student.projects || 0) * 15 + 25);
    const backlogsScore = student.backlogs > 0 ? Math.max(0, 100 - student.backlogs * 18) : 92;

    document.getElementById('bar-marks').style.width = `${academicScore}%`;
    document.getElementById('bar-skills').style.width = `${skillsScore}%`;
    document.getElementById('bar-projects').style.width = `${projectsScore}%`;
    document.getElementById('bar-backlogs').style.width = `${backlogsScore}%`;

    document.getElementById('score-marks').textContent = `${academicScore}%`;
    document.getElementById('score-skills').textContent = `${skillsScore}%`;
    document.getElementById('score-projects').textContent = `${projectsScore}%`;
    document.getElementById('score-backlogs').textContent = `${backlogsScore}%`;

    const gapContainer = document.getElementById('skillGaps');
    if (gapContainer) {
        gapContainer.innerHTML = missingSkills.length
            ? missingSkills.map(skill => `<span class="gap-tag">${skill}</span>`).join('')
            : '<span class="gap-tag">No major skill gaps detected</span>';
    }

    if (document.getElementById('analysisHeader')) {
        document.getElementById('analysisHeader').textContent = student.name
            ? `Hi ${student.name}, here is your profile breakdown` : 'Profile breakdown overview';
    }
}

function initActionPlanPage() {
    const planSection = document.getElementById('planCards');
    if (!planSection) return;

    document.addEventListener('DOMContentLoaded', () => {
        const student = loadState();
        const plan = buildActionPlan(student);
        planSection.innerHTML = Object.entries(plan)
            .map(([phase, tasks]) => `
                <div class="timeline-item">
                    <div class="timeline-content glass-card">
                        <span class="month">${phase}</span>
                        <h4>${phase} Focus</h4>
                        <ul>${tasks.map(task => `<li>${task}</li>`).join('')}</ul>
                    </div>
                </div>
            `).join('');
    });
}

function initializePage() {
    initDashboardPage();
    initResultPage();
    initAnalysisPage();
    initActionPlanPage();
}

initializePage();
