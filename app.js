// // Sample data for testing purposes
// const workedTime = "5 hrs 30 mins";
// const idleTime = "1 hr 15 mins";
// const screenshots = [
//     "screenshot1.png",
//     "screenshot2.png",
//     "screenshot3.png"
// ];

// // Load worked time and idle time
// document.getElementById('worked-time').textContent = workedTime;
// document.getElementById('idle-time').textContent = idleTime;

// // Load screenshots
// const screenshotContainer = document.getElementById('screenshot-container');
// screenshots.forEach(src => {
//     const img = document.createElement('img');
//     img.src = src;
//     screenshotContainer.appendChild(img);
// });

// // Chart.js to render mouse and keyboard activity
// const ctx = document.getElementById('activity-chart').getContext('2d');
// new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
//         datasets: [{
//             label: 'Activity Level',
//             data: [65, 59, 80, 81, 56],
//             backgroundColor: 'rgba(75, 192, 192, 0.2)',
//             borderColor: 'rgba(75, 192, 192, 1)',
//             borderWidth: 1
//         }]
//     },
//     options: {
//         scales: {
//             y: {
//                 beginAtZero: true
//             }
//         }
//     }
// });
