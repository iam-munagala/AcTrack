// Timer Control Variables
let timerInterval;
let isTimerRunning = false;
let secondsElapsed = 0;

// Helper: Format Time in HH:MM:SS
function formatTime(seconds) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
}

// Timer Functions
function startTimer() {
    const projectSelect = document.getElementById('project-select');
    const projectId = projectSelect.value;

    if (!projectId) {
        alert('Please select a project before starting the timer.');
        return;
    }

    isTimerRunning = true;
    document.getElementById('play-pause-btn').innerHTML = '⏸️';
    document.getElementById('start-timer-btn').disabled = true;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        document.getElementById('timer-display').innerText = formatTime(secondsElapsed);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;

    const productiveTime = Math.floor((Date.now() - startTime) / 1000);
    console.log('Productive time (in seconds):', productiveTime);

    resetTimerDisplay();
}

function pauseTimer() {
    isTimerRunning = false;
    document.getElementById('play-pause-btn').innerHTML = '▶️';
    clearInterval(timerInterval);
}

function resetTimerDisplay() {
    secondsElapsed = 0;
    document.getElementById('timer-display').innerText = '00:00:00';
    pauseTimer();
    document.getElementById('start-timer-btn').disabled = false;
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    if (modalId === 'web-timer-modal') {
        fetchProjects();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    resetTimerDisplay(); // Optional: Reset timer on modal close
}

// Tab Switching
function openTab(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Project Functions
let projects = [];

function fetchProjects() {
    fetch('http://localhost:5000/projects')
        .then(response => response.json())
        .then(data => {
            projects = data;
            const projectSelect = document.getElementById('project-select');
            projectSelect.innerHTML = '<option value="" disabled selected>Select a project</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project._id;
                option.textContent = project.projectName;
                projectSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching projects:', error));
}

function filterProjects() {
    const input = document.getElementById('project-search').value.toLowerCase();
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    if (input.length === 0) {
        projectList.style.display = 'none';
        return;
    }

    const filteredProjects = projects.filter(project => project.name.toLowerCase().includes(input));
    if (filteredProjects.length > 0) {
        filteredProjects.forEach(project => {
            const div = document.createElement('div');
            div.textContent = project.name;
            div.onclick = () => selectProject(project);
            projectList.appendChild(div);
        });
        projectList.style.display = 'block';
    } else {
        projectList.style.display = 'none';
    }
}

function selectProject(project) {
    document.getElementById('project-search').value = project.name;
    document.getElementById('project-list').style.display = 'none';
}

// Save Timer Data
function saveTimer() {
    const projectName = document.getElementById('project-search').value;
    const timeSpent = secondsElapsed;

    fetch('http://localhost:5000/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, timeSpent }),
    })
    .then(response => response.json())
    .then(() => {
        alert('Timer data saved successfully!');
        closeModal('web-timer-modal');
        resetTimerDisplay();
    })
    .catch(error => console.error('Error saving timer:', error));
}

// Example: Date and Time Display
setInterval(() => {
    document.getElementById('date-time').innerText = new Date().toLocaleString();
}, 1000);

// Example: Chart.js Activity Graph
const ctx = document.getElementById('activity-chart').getContext('2d');
const activityChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Activity',
            data: [12, 19, 3, 5, 2, 3, 7],
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: false,
        }]
    },
    options: {
        scales: {
            y: { beginAtZero: true }
        }
    }
});

// Fetch Project Count on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    fetchProjectCount();
});

function fetchProjectCount() {
    fetch('http://localhost:5000/projects/count')
        .then(response => response.json())
        .then(data => {
            document.getElementById('projects-worked').innerText = data.count;
        })
        .catch(error => console.error('Error fetching project count:', error));
}

// Additional Event Listeners and Actions
document.getElementById('start-timer-btn').addEventListener('click', startTimer);
document.getElementById('floating-stop-btn').addEventListener('click', stopTimer);

// Example Screenshot Capture
function captureScreenshot() {
    fetch('http://localhost:5000/api/take-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.screenshot) {
            fetchRecentScreenshots();
        }
    })
    .catch(error => console.error('Error taking screenshot:', error));
}

function fetchRecentScreenshots() {
    fetch('http://localhost:5000/api/recent-screenshots')
        .then(response => response.json())
        .then(screenshots => {
            const screenshotsContainer = document.getElementById('recent-screenshots');
            screenshotsContainer.innerHTML = '';

            screenshots.forEach(screenshot => {
                const img = document.createElement('img');
                img.src = screenshot.imagePath;
                img.alt = `Screenshot taken at ${new Date(screenshot.timestamp).toLocaleString()}`;
                img.width = 200;
                img.height = 150;
                screenshotsContainer.appendChild(img);
            });
        })
        .catch(error => console.error('Error fetching recent screenshots:', error));
}

// Make Floating Timer Draggable
function makeDraggable(element, dragHandle) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;

    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        posX = mouseX - e.clientX;
        posY = mouseY - e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Initialize draggable timer
makeDraggable(document.getElementById('floating-timer'), document.getElementById('floating-timer-header'));

