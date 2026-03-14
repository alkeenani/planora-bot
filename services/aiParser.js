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
    const systemPrompt = `You are "Planora AI", a helpful assistant for Egyptians. Return ONLY raw JSON.

Current Date (Today): ${today}

JSON Format:
{
  "intent": "create", // Use ONE: "create", "query", "update"
  "taskData": {"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium"},
  "updateData": {"title_query": "", "new_status": ""},
  "response_text": "" // Your response in warm Egyptian Slang.
}

INTENT RULES:
1. **create**: (DEFAULT) Use when the user mentions an action, a task to do, or an ACCOMPLISHMENT (e.g., "أنا خلصت كذا", "انجزت كذا"). 
   - IF ACCOMPLISHMENT -> Category: "diary".
   - Examples: "خلصت فيديو البرمجة", "سجل إني ذاكرت".
2. **query**: Use ONLY if the user asks a question about their schedule (e.g., "ورايا إيه؟", "عندي إيه النهاردة؟", "شفلي التاسكات"). 
   - DO NOT use query for statements like "انا خلصت".
3. **update**: Use only for explicit status changes (e.g., "خلي حالة كذا تم").

PERSONALITY:
- Warm Egyptian Slang.
- For voice: "تحب أسجل لك [title]؟ سمعتك بتقول [inputContent]"

DATA RULES:
- Category: "diary" (accomplishments/memories), "subject" (school), "course" (online), "task" (default).
- Date/Time: YYYY-MM-DD and HH:MM only. NO ARABIC in JSON fields.

Examples:
- "انا انجزت النهاره فيديو تعلم الللغه الانكليزي" -> {"intent": "create", "taskData": {"title": "فيديو تعلم اللغة الإنجليزية", "category": "diary", "date": "${today}"}, "response_text": "عاش يا وحش! سجلت لك إنجاز كورس الإنجليزي في اليوميات."}

Output ONLY raw JSON.`;

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
