require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const webhookRoutes = require('./routes/webhook');
const taskController = require('./controllers/taskController');
const db = require('./database');
const { sendTelegramMessage } = require('./services/telegramService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/webhook', webhookRoutes);

// Endpoint for Planora Flutter app to fetch a user's bot tasks
app.get('/tasks/user/:id', taskController.getTasksByUser);

// Endpoint to manually add a task securely
app.post('/tasks/from-telegram', taskController.createTask);

// Root
app.get('/', (req, res) => {
    res.send('Planora Backend API is running.');
});

// Reminder System using node-cron
cron.schedule('* * * * *', () => {
    // Check every minute if a task is starting in exactly 10 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    
    // We compare hh:mm so we format the 'now + 10 mins'
    const targetHours = String(now.getHours()).padStart(2, '0');
    const targetMinutes = String(now.getMinutes()).padStart(2, '0');
    const targetTime = `${targetHours}:${targetMinutes}`;

    // Simple date string: YYYY-MM-DD
    const today = now.toISOString().split('T')[0];

    // Select tasks (source=telegram) that have start_time hitting in 10 minutes today
    // Note: Database needs to be queried accurately depending on timezone. 
    // This is a minimal example doing simple DB checks.
    db.all(`SELECT id, title, start_time, user_id FROM tasks WHERE status = 'pending' AND (date = ? OR date IS NULL) AND start_time = ?`, 
    [today, targetTime], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        rows.forEach(task => {
            console.log(`Sending reminder for Task ID: ${task.id}`);
            sendTelegramMessage(task.user_id, `⏰ *Planora Reminder*\nYour task "${task.title}" is starting in 10 minutes (at ${task.start_time}).`);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
