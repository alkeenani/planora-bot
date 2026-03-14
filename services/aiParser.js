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
    const systemPrompt = `You are an expert AI data extractor. Your role is to convert Egyptian Arabic (Ammiya) voice/text into a STRICT JSON format for a task management app.

Current Date (Today): ${today}

JSON Format (You MUST return ONLY this):
{"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium","notification_before_start":0, "notification_before_end":0}

CRITICAL RULES:
1. **NO ARABIC IN DATE/TIME**: You MUST return dates as YYYY-MM-DD and times as HH:MM. Never return "النهاردة" or "بليل".
2. **Handle Typos**: Egyptians often misspell words. 
   - "النعارده", "انهارده", "النهاردة" -> ${today}
   - "السعه", "الساعه", "ساعه" -> Reference for time extraction.
3. **Time Conversion**:
   - "10 الصبح" -> "10:00"
   - "10 بليل" -> "22:00"
   - "العصر" -> "16:00"
   - "المغرب" -> "18:00"
   - "بعد العشا" -> "20:00"
4. **Date Conversion**:
   - "بكرة" -> (Calculate tomorrow's date based on ${today})
   - "بعده" / "بعد بكرة" -> (Calculate date after tomorrow)
5. **Clean Title**: Remove all fluff like "أنا عندي", "سجل لي", "بص يا بوت". Title should only be the task name.
6. **Category**:
   - "diary": Personal thoughts/memories.
   - "subject": College/School materials and lectures.
   - "course": Online courses/lessons.
   - "task": General to-dos.

Example:
Input: "اتا عندي تاسك برمجه بتاريخ النعارده السعه 10 الصبح"
Output: {"title": "برمجه", "category": "task", "date": "${today}", "start_time": "10:00", "priority": "medium"}

Output MUST be valid raw JSON only.`;

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
