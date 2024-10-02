# AcTracker

This project is a **User Activity Tracker** built using **Node.js**, **Express**, **MongoDB**, and **React**. It tracks user activity (mouse, keyboard, idle time), captures screenshots during work, and stores project details in a MongoDB database.
The application displays recent projects worked on in a table format, with additional functionality like taking screenshots automatically, sending email invitations, and updating project-related information.

## Features
- Tracks user mouse and keyboard activity, as well as idle time.
- Takes periodic screenshots automatically while a timer is running.
- Stores project details (name, client, team members, budget, etc.) in MongoDB.
- Displays recent projects with details like last worked date and time.
- Sends email invitations via **Nodemailer** for project collaboration.
- RESTful API for managing projects, screenshots, and activity data.
