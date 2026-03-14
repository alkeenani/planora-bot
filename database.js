const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'planora.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Create tasks table
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            priority TEXT,
            status TEXT DEFAULT 'pending',
            user_id INTEGER NOT NULL,
            source TEXT DEFAULT 'telegram',
            notification_before_start INTEGER DEFAULT 0,
            notification_before_end INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table", err.message);
            } else {
                // Migration: Add columns if they don't exist
                db.run(`ALTER TABLE tasks ADD COLUMN notification_before_start INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes("duplicate column name")) console.log("Note: notification_before_start column already exists or skipped.");
                });
                db.run(`ALTER TABLE tasks ADD COLUMN notification_before_end INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes("duplicate column name")) console.log("Note: notification_before_end column already exists or skipped.");
                });
            }
        });
    }
});

module.exports = db;
