const express = require('express');
const router = express.Router();
const { sendTelegramMessage } = require('../services/telegramService');
const { parseTaskFromText } = require('../services/aiParser');
const { convertSpeechToText } = require('../services/speechToText');
const { createTaskInternal } = require('../controllers/taskController');

// Webhook endpoint
router.post('/', async (req, res) => {
    res.sendStatus(200); // Always acknowledge receipt to Telegram

    const update = req.body;
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const userId = update.message.from.id; // Telegram user ID

    try {
        let inputText = "";

        if (update.message.text) {
            inputText = update.message.text;
            if (inputText === '/start') {
                return sendTelegramMessage(chatId,
                    "مرحباً بك في Planora! 🚀\n\nأرسل لي أي مهمة بالعربي أو الإنجليزي وسأضيفها تلقائياً في التطبيق.\n\nمثال: *عندي مذاكرة فيزيا بكرا الساعة 9*\n\nاستخدم /myid لمعرفة الـ ID بتاعك لربطه بالتطبيق.");
            }
            if (inputText === '/myid') {
                return sendTelegramMessage(chatId,
                    `🆔 *Telegram User ID بتاعك هو:*\n\`${userId}\`\n\nانسخ هذا الـ ID وضعه في التطبيق (الملف الشخصي ← ربط حساب Telegram).`);
            }
            if (inputText === '/verify') {
                const db = require('../database');
                return db.get(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ?`, [userId], (err, row) => {
                    if (err) return sendTelegramMessage(chatId, "❌ خطأ في فحص البيانات.");
                    const count = row ? row.count : 0;
                    return sendTelegramMessage(chatId, 
                        `✅ *تم التحقق!*\n\nحسابك مربوط بنجاح.\nيوجد حالياً *${count}* مهام مسجلة لهذا الـ ID في قاعدة البيانات.`);
                });
            }
        } else if (update.message.voice) {
            const fileId = update.message.voice.file_id;
            sendTelegramMessage(chatId, "🎙️ Processing your voice message...");
            inputText = await convertSpeechToText(fileId);
            
            if (!inputText) {
                return sendTelegramMessage(chatId, "❌ Failed to understand the voice message.");
            }
        } else {
            return sendTelegramMessage(chatId, "Please send a text or voice message.");
        }

        sendTelegramMessage(chatId, "🤖 Parsing task using AI...");

        // Parse with Gemini
        let taskData;
        try {
            taskData = await parseTaskFromText(inputText);
        } catch (aiErr) {
            return sendTelegramMessage(chatId, `🔴 AI Error: ${aiErr.message}`);
        }
        
        if (!taskData || !taskData.title) {
            return sendTelegramMessage(chatId, "❌ Failed to parse task from your message. Please be clearer.");
        }

        // Save to DB
        await createTaskInternal(taskData, userId);

        let confirmationMsg = `✅ *Task Created*\n\n*Title:* ${taskData.title}`;
        if (taskData.date) confirmationMsg += `\n*Date:* ${taskData.date}`;
        if (taskData.start_time) confirmationMsg += `\n*Start Time:* ${taskData.start_time}`;
        if (taskData.end_time) confirmationMsg += `\n*End Time:* ${taskData.end_time}`;
        
        sendTelegramMessage(chatId, confirmationMsg);

    } catch (err) {
        console.error("Webhook Error:", err);
        sendTelegramMessage(chatId, "❌ An internal error occurred while processing your request.");
    }
});

module.exports = router;
