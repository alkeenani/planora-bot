const axios = require('axios');

async function parseTaskFromText(text) {
    console.log("Parsing text with Groq (Llama):", text);
    
    // Check if Groq API Key exists (using the same env variable for now to prevent breaking other things)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.startsWith('gsk_')) {
        console.error("Invalid or missing Groq API Key.");
        throw new Error("Invalid Groq API Key. Must start with 'gsk_'.");
    }

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a professional task extraction assistant. Your goal is to extract clean, actionable task data from user messages (Arabic/English) and return ONLY a raw JSON object.

JSON Format:
{"title":"","description":"","date":"","start_time":"","end_time":"","priority":"medium","notification_before_start":0, "notification_before_end":0}

Core Extraction Rules:
1. **Title Extraction**: Ignore filler phrases like "أنا عندي تاسك", "سجل لي", "مهمة", "تذكير بـ", "عاوز أضيف". Extract only the core action.
   - Example: "عندي تاسك مذاكرة فيزيا" -> Title: "مذاكرة فيزيا"
   - Example: "سجل لي موعد دكتور" -> Title: "موعد دكتور"
2. **Date Logic**: Today is ${today}.
   - "بكرة" = tomorrow.
   - "بعد بكرة" = day after tomorrow.
   - "الخميس الجاي" = next Thursday.
   - If no date mentioned, return "".
3. **Time Logic**:
   - Return 24h format HH:MM.
   - "8" usually means 08:00 unless "مساء" (evening) is mentioned (20:00).
4. **Reminders**:
   - "ذكرني قبلها بـ X دقيقة" -> notification_before_start = X.
   - "قبل ما تخلص" -> notification_before_end.

Examples:
- Input: "عندي تاسك مذاكرة رياضة بكرة الساعة 10"
  Output: {"title":"مذاكرة رياضة","description":"","date":"(calculate tomorrow)","start_time":"10:00","end_time":"","priority":"medium","notification_before_start":0,"notification_before_end":0}

- Input: "سجل لي موعد جيم الساعة 5 مساء وذكرني قبلها ب 15 دقيقة"
  Output: {"title":"موعد جيم","description":"","date":"","start_time":"17:00","end_time":"","priority":"medium","notification_before_start":15,"notification_before_end":0}

Return ONLY the raw JSON string. No notes, no markdown.`;

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const raw = response.data.choices[0].message.content.trim();
        console.log("Groq raw response:", raw);

        // Remove markdown code blocks if the AI still included them
        const cleaned = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        // Extract JSON object safely
        const match = cleaned.match(/\{[\s\S]*\}/);

        if (!match) {
            console.log("No JSON detected from AI. Raw was:", raw);
            throw new Error(`AI returned no JSON. Raw: ${raw.substring(0, 100)}`);
        }

        const task = JSON.parse(match[0]);
        console.log("Parsed task:", task);

        return task;

    } catch (err) {
        const xaiErr = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("xAI Parser Error:", xaiErr);
        throw new Error(`AI parsing failed: ${xaiErr}`);
    }
}

module.exports = { parseTaskFromText };
