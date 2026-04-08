// AI Placement Predictor - Frontend JavaScript
// Handles form submission, data storage, and result display across multiple pages

// Dashboard Form Submission - Store data and navigate to results
if (document.getElementById('predictionForm')) {
    document.getElementById('predictionForm').addEventListener('submit', function(e) {
        e.preventDefault();

        // Collect form data
        const formData = {
            name: document.getElementById('name').value,
            marks: parseFloat(document.getElementById('marks').value),
            attendance: parseFloat(document.getElementById('attendance').value),
            backlogs: parseInt(document.getElementById('backlogs').value),
            skills: document.getElementById('skills').value,
            projects: document.getElementById('projects').value
        };

        // Store data in localStorage for cross-page access
        localStorage.setItem('placementData', JSON.stringify(formData));

        // Navigate to results page
        window.location.href = 'result.html';
    });
}

// Result Page Logic - Show loading then results
if (window.location.pathname.includes('result.html')) {
    window.addEventListener('load', function() {
        const loadingSection = document.getElementById('loadingSection');
        const resultsSection = document.getElementById('resultsSection');

        // Simulate AI processing time
        setTimeout(() => {
            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('fade-in');

            // Load and display results from stored data
            const data = JSON.parse(localStorage.getItem('placementData'));
            if (data) {
                displayResults(data);
            }
        }, 2000); // 2 second loading animation
    });
}

// Analysis Page Logic - Display detailed breakdown
if (window.location.pathname.includes('analysis.html')) {
    window.addEventListener('load', function() {
        const data = JSON.parse(localStorage.getItem('placementData'));
        if (data) {
            displayAnalysis(data);
        }
    });
}

// Function to calculate and display placement probability
function displayResults(data) {
    const marks = data.marks;
    const backlogs = data.backlogs;
    const skillCount = data.skills.split(',').length;
    const projectCount = data.projects.split(',').length || 1;

    // Mock AI algorithm: weighted calculation
    let probability = (marks * 0.4) + (skillCount * 5) + (projectCount * 3) - (backlogs * 10);
    probability = Math.max(10, Math.min(98, probability)); // Clamp between 10-98%

    // Update UI elements
    const probValue = document.getElementById('probValue');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const card = document.getElementById('statusCard');

    // Set probability display and color coding
    probValue.innerText = `${Math.floor(probability)}%`;
    progressBar.style.width = `${probability}%`;

    if(probability >= 75) {
        statusText.innerText = "High Probability";
        progressBar.style.backgroundColor = "var(--success)";
        card.style.borderTop = "4px solid var(--success)";
    } else if (probability >= 50) {
        statusText.innerText = "Medium Probability";
        progressBar.style.backgroundColor = "var(--warning)";
        card.style.borderTop = "4px solid var(--warning)";
    } else {
        statusText.innerText = "Low Probability";
        progressBar.style.backgroundColor = "var(--danger)";
        card.style.borderTop = "4px solid var(--danger)";
    }

    // Store calculated probability for analysis page
    data.probability = probability;
    localStorage.setItem('placementData', JSON.stringify(data));
}

// Function to display detailed analysis breakdown
function displayAnalysis(data) {
    const marks = data.marks;
    const backlogs = data.backlogs;
    const skillCount = data.skills.split(',').length;
    const projectCount = data.projects.split(',').length || 1;

    // Calculate individual scores
    const academicScore = Math.min(100, marks);
    const skillsScore = Math.min(100, skillCount * 10 + 40);
    const projectsScore = Math.min(100, projectCount * 20 + 50);
    const backlogsScore = backlogs > 0 ? Math.max(0, 100 - backlogs * 20) : 95;

    // Update progress bars
    document.getElementById('bar-marks').style.width = `${academicScore}%`;
    document.getElementById('bar-skills').style.width = `${skillsScore}%`;
    document.getElementById('bar-projects').style.width = `${projectsScore}%`;
    document.getElementById('bar-backlogs').style.width = `${backlogsScore}%`;

    // Update score value displays
    document.getElementById('score-marks').innerText = `${Math.floor(academicScore)}%`;
    document.getElementById('score-skills').innerText = `${Math.floor(skillsScore)}%`;
    document.getElementById('score-projects').innerText = `${Math.floor(projectsScore)}%`;
    document.getElementById('score-backlogs').innerText = `${Math.floor(backlogsScore)}%`;

    // Display suggested skill gaps
    const gaps = ['Cloud Computing', 'System Design', 'Unit Testing', 'Docker/CI-CD'];
    const gapContainer = document.getElementById('skillGaps');
    gapContainer.innerHTML = gaps.map(skill => `<span class="gap-tag">${skill}</span>`).join('');
}