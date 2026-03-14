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
    const systemPrompt = `You are "Planora AI", a helpful assistant for Egyptians. Your role is to understand user intentions and return a STRICT JSON object.

Current Date (Today): ${today}

JSON Format:
{
  "intent": "create", // Use ONE: "create", "query", "update"
  "taskData": {"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium"},
  "updateData": {"title_query": "", "new_status": ""},
  "response_text": "" // Your response in warm Egyptian Slang.
}

INTENT DETECTION RULES:
1. **create**: DEFAULT intent. Use if the user mentions an action, task, or accomplishment.
   - If user says anything like "سجل", "انا عملت", "خلصت فيديو", "عندي مذاكرة" -> intent: "create".
2. **query**: Use ONLY if the user is explicitly asking for a list of tasks (e.g., "عندي إيه؟", "شفلي ورايا إيه؟").
3. **update**: Use if the user specifies they finished a SPECIFIC task they already had (e.g., "حدث حالة كورس البرمجة لتم").

PERSONALITY & RESPONSE:
- Response MUST be in Egyptian Slang (Ammiya). 
- If it's a voice record, your response_text should start with what you heard (e.g., "سمعتك بتقول [transcription]..").

CRITICAL DATA RULES:
- Category: "diary" (accomplishments/memories), "subject" (school), "course" (online), "task" (default).
- Date/Time: YYYY-MM-DD and HH:MM only. NO ARABIC in JSON.

Examples:
- "انا خلصت فيديو البرمجة النهاردة" -> {"intent": "create", "taskData": {"title": "فيديو البرمجة", "category": "diary", "date": "${today}"}, "response_text": "عاش يا بطل! سجلت لك إنجاز فيديو البرمجة في اليوميات."}
- "عندي إيه بكرة؟" -> {"intent": "query", "taskData": {"date": "(tomorrow's date)"}, "response_text": "ثواني أشوف لك وراك إيه بكرة.."}

Output ONLY raw JSON. No extra text.`;

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
