const db = require('../database');

// Create a task manually (or from Webhook)
exports.createTask = (req, res) => {
    const { title, description, date, start_time, end_time, priority, user_id } = req.body;
    
    if (!title || !user_id) {
        return res.status(400).json({ error: 'Title and user_id are required' });
    }

    const query = `INSERT INTO tasks (title, description, date, start_time, end_time, priority, user_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [
        title, 
        description || '', 
        date || '', 
        start_time || '', 
        end_time || '', 
        priority || 'medium', 
        user_id
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Task created successfully' });
    });
};

// Internal function to create task straight from bot
exports.createTaskInternal = (taskData, user_id) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO tasks (title, description, date, start_time, end_time, priority, user_id) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(query, [
            taskData.title, 
            taskData.description || '', 
            taskData.date || '', 
            taskData.start_time || '', 
            taskData.end_time || '', 
            taskData.priority || 'medium', 
            user_id
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Get all tasks for a particular user (for Flutter Sync)
exports.getTasksByUser = (req, res) => {
    const userId = req.params.id;
    const query = `SELECT * FROM tasks WHERE user_id = ? ORDER BY date ASC, start_time ASC`;
    
    db.all(query, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ tasks: rows });
    });
};
