const express = require('express');
const mongoose = require('mongoose');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
require('dotenv').config();  // Load environment variables from .env file

const app = express();
const PORT = 5000;

// MongoDB connection
const mongoURI = 'mongodb://127.0.0.1:27017/userActivityDB'; // Update this if using MongoDB Atlas
mongoose.connect(mongoURI, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

    const projectSchema = new mongoose.Schema({
        projectName: { type: String, required: true },
        clientName: { type: String, required: true },
        isBillable: { type: Boolean, default: false },
        members: {
            managers: { type: [String], default: [] },
            users: { type: [String], default: [] },
            viewers: { type: [String], default: [] }
        },
        budget: {
            budgetType: { type: String, default: '' },
            basedOn: { type: String, default: '' },
            cost: { type: Number, default: 0 }
        },
        teams: { type: [String], default: [] },
        lastWorked: { type: Date, default: null }
    });
    
    
    

const screenshotSchema = new mongoose.Schema({
    userId: String,          // User ID for tracking who took the screenshot
    timestamp: { 
        type: Date, 
        default: Date.now     // Automatically adds the date and time of the screenshot
    },
    imagePath: String        // Path to the saved screenshot
});

const Screenshot = mongoose.model('Screenshot', screenshotSchema);
const Project = mongoose.model('Project', projectSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Add the root route ("/") to serve the "index.html"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST endpoint to save a new project
app.post('/projects', async (req, res) => {
    console.log('Received data:', req.body);  // Log the received data

    try {
        // Create the new project using the request body
        const newProject = new Project({
            projectName: req.body.projectName,
            clientName: req.body.clientName,
            isBillable: req.body.isBillable || false,
            members: {
                managers: req.body.managers ? req.body.managers.split(',').map(item => item.trim()) : [], // Split and trim to handle extra spaces
                users: req.body.users ? req.body.users.split(',').map(item => item.trim()) : [],
                viewers: req.body.viewers ? req.body.viewers.split(',').map(item => item.trim()) : []
            },
            budget: {
                budgetType: req.body.budgetType || '',
                basedOn: req.body.basedOn || '',
                cost: parseFloat(req.body.cost) || 0 // Ensure cost is stored as a number
            },
            teams: req.body.teamsSearch ? [req.body.teamsSearch] : [] // Store teams in an array
        });

        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Error saving project:', error);  // Detailed error logging
        res.status(500).json({ error: error.message });
    }
});

app.use(bodyParser.json()); // Ensure this line is present




// GET endpoint to fetch all projects
app.get('/projects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Store project members
app.post('/projects/members', async (req, res) => {
    const { projectId, managers, users, viewers } = req.body;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.members.managers = managers || [];
        project.members.users = users || [];
        project.members.viewers = viewers || [];
        await project.save();

        res.status(200).json(project);
    } catch (error) {
        console.error('Error saving members:', error);
        res.status(400).json({ error: error.message });
    }
});
// Endpoint to get projects worked this week
app.get('/api/projects/this-week', async (req, res) => {
    try {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of the week (Sunday)

        const projectsThisWeek = await Project.find({
            createdAt: { $gte: startOfWeek } // Filter projects created this week
        });

        res.status(200).json({ count: projectsThisWeek.length });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects', details: error.message });
    }
});

// Endpoint to get projects worked today
app.get('/api/projects/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day

        const projectsToday = await Project.find({
            createdAt: { $gte: startOfDay } // Filter projects created today
        });

        res.status(200).json({ count: projectsToday.length });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects', details: error.message });
    }
});


// Save budget to a project
app.post('/projects/budget', async (req, res) => {
    try {
        const { budgetType, basedOn, cost, projectId } = req.body;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.budget.budgetType = budgetType || project.budget.budgetType;
        project.budget.basedOn = basedOn || project.budget.basedOn;
        project.budget.cost = cost || project.budget.cost;
        await project.save();

        res.status(200).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Save teams to a project
app.post('/projects/teams', async (req, res) => {
    try {
        const { teamsSearch, projectId } = req.body;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.teams.push(teamsSearch); // Add team to the existing array
        await project.save();

        res.status(200).json(project);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Define the User Activity schema
const userActivitySchema = new mongoose.Schema({
    userId: String,
    date: { type: Date, default: Date.now },
    workedTime: Number,   // In minutes
    idleTime: Number,     // In minutes
    mouseActivity: Number,   // Mouse event count
    keyboardActivity: Number // Keyboard event count
});

// Create models
const UserActivity = mongoose.model('UserActivity', userActivitySchema);

// Take a screenshot and save it to MongoDB
app.post('/api/take-screenshot', async (req, res) => {
    const userId = req.body.userId || "user123";  // Ideally, get this from authentication
    const screenshotPath = path.join(__dirname, 'public', 'screenshots', `screenshot-${Date.now()}.png`);

    try {
        // Take a screenshot and save it locally
        const img = await screenshot({ format: 'png' });
        fs.writeFileSync(screenshotPath, img);

        // Save screenshot details in MongoDB
        const newScreenshot = new Screenshot({
            userId: userId,
            imagePath: `/screenshots/${path.basename(screenshotPath)}`  // Save relative path
        });

        await newScreenshot.save();

        // Respond with the screenshot details
        res.status(201).json({
            message: 'Screenshot saved successfully',
            screenshot: newScreenshot
        });
    } catch (err) {
        console.error('Error taking screenshot:', err);
        res.status(500).json({ error: 'Error taking screenshot', details: err });
    }
});

// Retrieve user activities
app.get('/api/get-activity/:userId', (req, res) => {
    const userId = req.params.userId;
    UserActivity.find({ userId: userId })
        .then(activities => res.json(activities))
        .catch(err => res.status(500).json({ error: 'Error retrieving user activities', details: err }));
});

// Retrieve screenshots
app.get('/api/get-screenshots/:userId', (req, res) => {
    const userId = req.params.userId;
    Screenshot.find({ userId: userId })
        .then(screenshots => res.json(screenshots))
        .catch(err => res.status(500).json({ error: 'Error retrieving screenshots', details: err }));
});

// API to get recent screenshots
app.get('/api/recent-screenshots', async (req, res) => {
    try {
        const screenshots = await Screenshot.find().sort({ timestamp: -1 }).limit(5);  // Get the latest 5 screenshots
        res.status(200).json(screenshots);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching recent screenshots', details: error });
    }
});

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Async function to send an email
async function sendEmail(toEmail, inviteLink) {
    try {
        // Send mail with defined transport object
        let info = await transporter.sendMail({
            from: `"AcTrack" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "You are invited to join the team!",
            html: `
                <h1>Team Invitation</h1>
                <p>You have been invited to join our team. Click the link below to accept the invitation:</p>
                <a href="${inviteLink}">Join the Team</a>
            `
        });

        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// POST endpoint to handle sending the email invitation
app.post('/api/send-invite', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        // Generate an invitation link (replace with your actual app URL)
        const inviteLink = `http://localhost:5000/join-team?email=${encodeURIComponent(email)}`;

        // Send the email
        await sendEmail(email, inviteLink);

        // Respond with success
        res.status(200).json({ message: 'Invitation sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send invitation', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
app.get('/projects/count', async (req, res) => {
    try {
        const count = await Project.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
const timeEntrySchema = new mongoose.Schema({
    userId: String,
    projectId: String,   // ID of the project
    workedTime: Number,  // Time in seconds
    date: { type: Date, default: Date.now } // Automatically adds date when the entry is created
});

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);
// POST endpoint to save time entry for a project
app.post('/api/save-time-entry', async (req, res) => {
    const { userId, projectId, workedTime } = req.body;

    try {
        const newTimeEntry = new TimeEntry({
            userId: userId,
            projectId: projectId,
            workedTime: workedTime
        });

        const savedTimeEntry = await newTimeEntry.save();
        res.status(201).json(savedTimeEntry);
    } catch (error) {
        console.error('Error saving time entry:', error);
        res.status(500).json({ error: 'Error saving time entry', details: error.message });
    }
});
// Example: Update when starting the timer
app.post('/start-timer', async (req, res) => {
    const { projectId } = req.body;
    try {
        // Update the last worked date when the timer starts
        await Project.findByIdAndUpdate(projectId, { lastWorked: new Date() });
        // Start timer logic...
        res.status(200).json({ message: 'Timer started and project updated.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Example: Update when stopping the timer
app.post('/stop-timer', async (req, res) => {
    // Timer stop logic...
    res.status(200).json({ message: 'Timer stopped.' });
});
