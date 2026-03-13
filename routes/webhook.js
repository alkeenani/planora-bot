const express = require('express');
const router = express.Router();
const { sendTelegramMessage } = require('../services/telegramService');
const { parseTaskFromText, parseTaskFromTextDebug } = require('../services/aiParser');
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
                    "Welcome to Planora! 🚀\n\nأرسل لي أي مهمة بالعربي أو الإنجليزي وسأضيفها تلقائياً في التطبيق.\n\nمثال: *عندي مذاكرة فيزيا بكرا الساعة 9*\n\nاستخدم /myid لمعرفة الـ ID بتاعك لربطه بالتطبيق.");
            }
            if (inputText === '/myid') {
                return sendTelegramMessage(chatId,
                    `🆔 *Telegram User ID بتاعك هو:*\n\`${userId}\`\n\nانسخ هذا الـ ID وضعه في التطبيق (الملف الشخصي ← ربط حساب Telegram).`);
            }
        } else if (update.message.voice) {
            const fileId = update.message.voice.file_id;
            sendTelegramMessage(chatId, "🎙️ Processing your voice message...");
            inputText = await convertSpeechToText(fileId);
            
            if (!inputText) {
                return sendTelegramMessage(chatId, "❌ Failed to understand the voice message.");
            }
            // DEBUG: show what was heard
            sendTelegramMessage(chatId, `🔊 فهمت: "${inputText}"`);
        } else {
            return sendTelegramMessage(chatId, "Please send a text or voice message.");
        }

        sendTelegramMessage(chatId, "🤖 Parsing task using AI...");

        // Parse with Gemini - get raw response for debugging
        let taskData = null;
        let rawDebug = "";
        
        try {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const today = new Date().toISOString().split('T')[0];
            const prompt = `You are a task parser. Extract task info from the message below and return ONLY a raw JSON object. No markdown, no code blocks, no explanation. Just the JSON.

Message: "${inputText}"

Return this exact JSON format:
{"title":"","description":"","date":"","start_time":"","end_time":"","priority":"medium"}

Rules:
- Understand Arabic and English
- "بكرة" means tomorrow, calculate actual date (today is ${today})
- "الساعة 8" means 08:00, "الساعة 8 مساء" means 20:00
- Time must be in HH:MM 24-hour format
- If no date, return empty string for date
- If no time, return empty string for start_time
- Priority: low, medium, or high (default: medium)
- Return ONLY the JSON object, nothing else`;

            const result = await model.generateContent(prompt);
            rawDebug = result.response.text().trim();
            
            // DEBUG: Send raw response to Telegram
            sendTelegramMessage(chatId, `🔍 DEBUG Gemini:\n${rawDebug.substring(0, 200)}`);
            
            // Strip markdown code blocks
            const cleaned = rawDebug
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                taskData = JSON.parse(match[0]);
            }
        } catch (aiErr) {
            sendTelegramMessage(chatId, `🔴 AI Error: ${aiErr.message}`);
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
        sendTelegramMessage(chatId, `❌ Internal Error: ${err.message}`);
    }
});

module.exports = router;
