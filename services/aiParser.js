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
    const systemPrompt = `You are "Planora Assistant", an expert Egyptian Task Manager.
Your job is to parse user input and return EXACT JSON.

Current Date: ${today}

JSON Schema:
{
  "intent": "create", // "create" (DEFAULT), "query", "update"
  "taskData": {
    "title": "",
    "description": "",
    "category": "task", // "task", "diary", "subject", "course"
    "date": "${today}",
    "start_time": "",
    "end_time": ""
  },
  "updateData": { "title_query": "", "new_status": "" },
  "response_text": "" // Your response in warm Egyptian Slang.
}

### INTENT LOGIC:
1. **create**: (DEFAULT) Use when the user states a task, an action, or something they DID.
   - Example: "عندي مذاكرة", "خلصت تمرين", "سجل كورس فلاتر".
2. **query**: Use ONLY if the user asks a QUESTION (e.g., "عندي إيه؟", "ورايا إيه؟", "في مهام؟").
   - If there is NO question word/mark, it is NOT a query.
3. **update**: Use when the user wants to change an existing task (e.g., "خلي حالة كذا تم").

### CATEGORY LOGIC:
- "diary": Accomplishments ("خلصت", "انجزت", "عملت") or personal notes.
- "subject": College/School materials ("مادة", "محاضرة", "شباتر").
- "course": Online/External courses ("كورس", "درس").
- "task": Standard todos.

### PERSONALITY:
- Talk like a helpful Egyptian friend.
- If it's a new task: "من عيوني! سجلت لك [title] يا بطل."
- If it's an accomplishment (diary): "عاش يا وحش! سيفنا إنك خلصت [title]."
- If it's a query: "هشوف لك حالا وراك إيه.."

### DATA RULES:
- Date: YYYY-MM-DD only.
- Time: HH:MM (24h) only (e.g., "9 الصبح" = 09:00, "9 بليل" = 21:00).
- NO ARABIC in JSON fields.

### EXAMPLES (Egyptian Slang):
- "انا عندي تاسك عن الرمجه النهارده من الساعه 9 لي 10" -> {"intent": "create", "taskData": {"title": "تاسك برمجة", "category": "task", "date": "${today}", "start_time": "09:00", "end_time": "10:00"}, "response_text": "من عيوني! سجلت لك تاسك البرمجة النهاردة يا بطل."}
- "انا انجزت النهاره فيديو تعلم الللغه الانكليزي" -> {"intent": "create", "taskData": {"title": "فيديو لغة إنجليزية", "category": "diary", "date": "${today}"}, "response_text": "عاش بجد! سجلت لك إنجاز كورس الإنجليزي في اليوميات."}
- "في تاسكات عليا ولا لا" -> {"intent": "query", "taskData": {"date": "${today}"}, "response_text": "ثواني أشوف لك وراك إيه النهاردة يا بطل.."}
- "خلصت مادة التشريح" -> {"intent": "create", "taskData": {"title": "مادة التشريح", "category": "diary", "date": "${today}"}, "response_text": "عاش يا بطل! سجلت إنك خلصت مادة التشريح."}

Return ONLY raw JSON.`;

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

        const lastBrace = cleaned.lastIndexOf('}');
        const firstBrace = cleaned.indexOf('{');
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            console.log("No JSON structural integrity. Raw was:", raw);
            throw new Error(`AI returned invalid JSON structure.`);
        }

        const jsonString = cleaned.substring(firstBrace, lastBrace + 1);

        try {
            const task = JSON.parse(jsonString);
            console.log("Parsed task:", task);
            return task;
        } catch (parseErr) {
            console.error("JSON.parse failure. Literal string was:", jsonString);
            throw new Error(`AI returned malformed JSON: ${parseErr.message}`);
        }

    } catch (err) {
        const xaiErr = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("xAI Parser Error:", xaiErr);
        throw new Error(`AI parsing failed: ${xaiErr}`);
    }
}

module.exports = { parseTaskFromText };
