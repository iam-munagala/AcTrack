const express = require('express');
const mongoose = require('mongoose');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const bodyParser=require('body-parser');
const cors=require('cors');

const app = express();
const PORT = 3001;

// MongoDB connection (use your MongoDB Atlas URI or local MongoDB connection string)
const mongoURI = 'mongodb://127.0.0.1:27017/userActivityDB'; // Update this if using MongoDB Atlas
mongoose.connect(mongoURI, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Create a Project schema
const projectSchema = new mongoose.Schema({
    projectName: String,
    clientName: String,
    isBillable: Boolean,
    members: {
        managers: [String],
        users: [String],
        viewers: [String]
    },
    budget: {
        budgetType: String,
        basedOn: String,
        cost: Number
    },
    teams: [String]
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


app.use(bodyParser.json());
app.use(cors());

// POST endpoint to save a new project
app.post('/projects', async (req, res) => {
    try {
        const newProject = new Project(req.body);
        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET endpoint to fetch all projects
app.get('/projects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT endpoint to update activity (when timer stops)
app.put('/projects/:id/activity', async (req, res) => {
    try {
        const { startTime, endTime } = req.body;
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { $push: { activity: { startTime, endTime } } },
            { new: true }
        );
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
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


// Save budget and limits to a project
app.post('/projects/budget', async (req, res) => {
    try {
        const { budgetType, basedOn, cost, projectId } = req.body;
        const project = await Project.findById(projectId); // Assume you pass projectId from frontend

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
        const project = await Project.findById(projectId); // Assume you pass projectId from frontend

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

// // Define the Screenshot schema
// const screenshotSchema = new mongoose.Schema({
//     userId: String,
//     timestamp: { type: Date, default: Date.now },
//     imagePath: String  // Path to the screenshot image file
// });

// Create models
const UserActivity = mongoose.model('UserActivity', userActivitySchema);
// const Screenshot = mongoose.model('Screenshot', screenshotSchema);


// Middleware to serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Add the root route ("/") to serve the "index.html"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Take a screenshot and save it to MongoDB
app.get('/api/take-screenshot', (req, res) => {
    const userId = "user123"; // You should use actual user IDs from your system

    screenshot({ format: 'png' }).then((img) => {
        const screenshotPath = path.join(__dirname, 'public', 'screenshots', `screenshot-${Date.now()}.png`);
        fs.writeFileSync(screenshotPath, img);

        // Save the screenshot information to MongoDB
        const newScreenshot = new Screenshot({
            userId: userId,
            imagePath: screenshotPath
        });
        
        newScreenshot.save()
            .then(() => res.json({ message: 'Screenshot saved successfully' }))
            .catch(err => res.status(500).json({ error: 'Error saving screenshot', details: err }));
    }).catch((err) => {
        res.status(500).json({ error: 'Error taking screenshot', details: err });
    });
});
app.get('/', (req, res) => {
    res.send('Welcome to the Persist Ventures API');
  });

// Store user activity
app.post('/api/track-activity', (req, res) => {
    const userId = "user123"; // You should use actual user IDs from your system
    const { workedTime, idleTime, mouseActivity, keyboardActivity } = req.body; // Data from frontend

    const newUserActivity = new UserActivity({
        userId: userId,
        workedTime: workedTime,
        idleTime: idleTime,
        mouseActivity: mouseActivity,
        keyboardActivity: keyboardActivity
    });

    newUserActivity.save()
        .then(() => res.json({ message: 'User activity saved successfully' }))
        .catch(err => res.status(500).json({ error: 'Error saving user activity', details: err }));
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
app.get('/projects/count', async (req, res) => {
    try {
        const count = await Project.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


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

// API to get recent screenshots
app.get('/api/recent-screenshots', async (req, res) => {
    try {
        const screenshots = await Screenshot.find().sort({ timestamp: -1 }).limit(5);  // Get the latest 5 screenshots
        res.status(200).json(screenshots);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching recent screenshots', details: error });
    }
});

