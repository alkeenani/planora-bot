const db = require('../database');

exports.createTask = (req, res) => {
    const { title, description, date, start_time, end_time, priority, user_id, notification_before_start, notification_before_end, category } = req.body;
    
    if (!title || !user_id) {
        return res.status(400).json({ error: 'Title and user_id are required' });
    }

    const query = `INSERT INTO tasks (title, description, date, start_time, end_time, priority, user_id, notification_before_start, notification_before_end, category) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [
        title, 
        description || '', 
        date || '', 
        start_time || '', 
        end_time || '', 
        priority || 'medium', 
        user_id,
        notification_before_start || 0,
        notification_before_end || 0,
        category || 'task'
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Task created successfully' });
    });
};

exports.createTaskInternal = (taskData, user_id) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO tasks (title, description, date, start_time, end_time, priority, user_id, notification_before_start, notification_before_end, category) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(query, [
            taskData.title, 
            taskData.description || '', 
            taskData.date || '', 
            taskData.start_time || '', 
            taskData.end_time || '', 
            taskData.priority || 'medium', 
            user_id,
            taskData.notification_before_start || 0,
            taskData.notification_before_end || 0,
            taskData.category || 'task'
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

// Get a summary text of tasks for the bot to reply with
exports.getTasksSummary = (userId, date = null) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT title, start_time, category FROM tasks WHERE user_id = ? AND status != 'done'`;
        let params = [userId];
        if (date) {
            query += ` AND date = ?`;
            params.push(date);
        }
        query += ` ORDER BY start_time ASC`;

        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0) return resolve("مفيش مهام مسجلة حالياً.. ريح شوية! 😎");

            let summary = rows.map(t => {
                let icon = "📍";
                if (t.category === 'diary') icon = "📔";
                if (t.category === 'course') icon = "🎓";
                if (t.category === 'subject') icon = "📚";
                return `${icon} ${t.title} ${t.start_time ? `(الساعة ${t.start_time})` : ''}`;
            }).join('\n');
            
            resolve(`وراك الحاجات دي:\n\n${summary}`);
        });
    });
};

// Update task status by searching for a title match
exports.updateTaskStatusByName = (userId, titleQuery, newStatus) => {
    return new Promise((resolve, reject) => {
        // Simple LIKE search for the title
        const query = `UPDATE tasks SET status = ? WHERE user_id = ? AND title LIKE ? AND status != 'done'`;
        db.run(query, [newStatus, userId, `%${titleQuery}%`], function(err) {
            if (err) reject(err);
            else resolve(this.changes); // Returns number of rows updated
        });
    });
};
