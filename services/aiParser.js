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
    const systemPrompt = `You are "Planora AI", a smart assistant specialized in Egyptian Arabic (Ammiya). Your role is to understand user intentions and return a STRICT JSON object.

Current Date (Today): ${today}

JSON Format:
{
  "intent": "create", // "create", "query", "update"
  "taskData": {"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium"},
  "updateData": {"title_query": "", "new_status": ""}, // Only for "update" intent
  "response_text": "" // YOUR reply in warm, helpful Egyptian Slang (Ammiya)
}

INTENT RULES:
1. **create**: User wants to add something.
   - Response: "من عيوني! سجلت لك [title] في [category]."
2. **query**: User asks what they have (e.g., "عندي إيه؟", "ورايا إيه بكرة؟").
   - Response: "هشوف لك حالاً يا بطل.. ثواني."
3. **update**: User says they finished something (e.g., "خلصت كورس البرمجة", "تم مذاكرة الرياضة").
   - Response: "عاش بجد! حدثت لك حالة [title] لـ [status]."

CRITICAL DATA RULES:
- **Title**: Clean and concise. Symbols like "C++" allowed.
- **Category**: "diary" (accomplishments/memories), "subject" (school), "course" (online), "task" (default).
- **Date/Time**: STRICTLY YYYY-MM-DD and HH:MM. NO ARABIC!
- **Typo Resilience**: "النعارده", "السعه" -> Extract correctly.

Examples:
- "عندي إيه النهاردة؟" -> {"intent": "query", "taskData": {"date": "${today}"}, "response_text": "ثواني أشوف لك وراك إيه النهاردة يا بطل.."}
- "خلصت كورس البرمجة" -> {"intent": "update", "updateData": {"title_query": "كورس البرمجة", "new_status": "done"}, "response_text": "عاش يا وحش! خليت لك كورس البرمجة (تم)."}

Output MUST be a single line of raw JSON. No extra text.`;

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
