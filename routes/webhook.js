const express = require('express');
const router = express.Router();
const { sendTelegramMessage } = require('../services/telegramService');
const { parseTaskFromText } = require('../services/aiParser');
const { convertSpeechToText } = require('../services/speechToText');
const { createTaskInternal, getTasksSummary, updateTaskStatusByName } = require('../controllers/taskController');

// In-memory store for pending confirmations (per user or per chat)
const pendingActions = {};

router.post('/', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;
    const voice = message.voice;

    // 0. Handle Commands first
    if (text === '/start') {
        sendTelegramMessage(chatId, "مرحباً بك في Planora! 🚀\n\nأرسل لي أي مهمة أو ريكورد وهسجلهالك فوراً.\n\nاستخدم /myid لمعرفة الـ ID بتاعك لربطه بالتطبيق.");
        return res.sendStatus(200);
    }
    if (text === '/myid') {
        sendTelegramMessage(chatId, `🆔 *Telegram User ID بتاعك هو:*\n\`${userId}\`\n\nانسخ هذا الـ ID وضعه في التطبيق.`);
        return res.sendStatus(200);
    }
    if (text === '/verify') {
        const db = require('../database');
        db.get(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ?`, [userId], (err, row) => {
            const count = row ? row.count : 0;
            sendTelegramMessage(chatId, `✅ مربوط بنجاح! وراك حالياً *${count}* مهام.`);
        });
        return res.sendStatus(200);
    }

    try {
        // 1. Handle "Confirmation" for pending actions
        const userAction = pendingActions[chatId];
        if (userAction && text) {
            const normalizedText = text.toLowerCase();
            const positiveWords = ['تمام', 'ماشي', 'اوك', 'صح', 'اه', 'yes', 'ok', 'confirm', 'أيوة', 'ايوة', 'سجل'];
            
            if (positiveWords.some(w => normalizedText.includes(w))) {
                await createTaskInternal(userAction, userId);
                sendTelegramMessage(chatId, "✅ من عيوني! سجلتها لك خلاص. 🚀");
                delete pendingActions[chatId];
                return res.sendStatus(200);
            } else if (normalizedText.includes('لا') || normalizedText.includes('cancel') || normalizedText.includes('إلغاء')) {
                sendTelegramMessage(chatId, "ولا يهمك.. لغيت التسجيل. قولي لو عاوز تضيف حاجة تانية! 😊");
                delete pendingActions[chatId];
                return res.sendStatus(200);
            }
        }

        // 2. Transcribe voice if present
        let inputContent = text;
        if (voice) {
            inputContent = await convertSpeechToText(voice.file_id);
            if (!inputContent) {
                await sendTelegramMessage(chatId, "❌ للأسف مقدرتش أسمع الصوت كويس. جرب مرة تانية؟");
                return res.sendStatus(200);
            }
        }

        if (!inputContent) return res.sendStatus(200);

        // 3. AI Parsing
        const aiResponse = await parseTaskFromText(inputContent);
        const { intent, taskData, updateData, response_text } = aiResponse;

        // 4. Handle Intents
        if (intent === 'query') {
            const summary = await getTasksSummary(userId, taskData?.date);
            await sendTelegramMessage(chatId, `${response_text}\n\n${summary}`);
            return res.sendStatus(200);
        }

        if (intent === 'update') {
            const changes = await updateTaskStatusByName(userId, updateData.title_query, updateData.new_status);
            if (changes > 0) {
                await sendTelegramMessage(chatId, response_text || "🎯 تمام، حدثت لك البيانات!");
            } else {
                await sendTelegramMessage(chatId, "🔍 ملقيتش حاجة بالاسم ده حالياً.");
            }
            return res.sendStatus(200);
        }

        // 5. Creation Intent (Handle Voice Confirmation)
        if (voice) {
            pendingActions[chatId] = taskData;
            // Explicitly show what was heard to satisfy user request
            const confirmationText = `أنا سمعتك بتقول: "${inputContent}"\n\n📝 ${response_text || "أسجلها لك؟"}\n\n(قول تمام أو أيوة للتأكيد)`;
            await sendTelegramMessage(chatId, confirmationText);
            return res.sendStatus(200);
        } else {
            // Text creation - save immediately
            await createTaskInternal(taskData, userId);
            await sendTelegramMessage(chatId, response_text || "✅ سجلتها لك يا بطل!");
            return res.sendStatus(200);
        }

    } catch (error) {
        console.error('Webhook Error:', error);
        sendTelegramMessage(chatId, "❌ حصلت مشكلة عندي.. جرب كمان شوية؟");
    }

    res.sendStatus(200);
});

module.exports = router;
