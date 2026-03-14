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
    const systemPrompt = `You are an expert AI data extractor. Your role is to convert Egyptian Arabic (Ammiya) or English voice/text into a STRICT JSON format for a task management app.

Current Date (Today): ${today}

JSON Format (You MUST return ONLY this):
{"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium","notification_before_start":0, "notification_before_end":0}

CRITICAL DATA RULES:
1. **Title**: Clean and concise. Symbols like "C++", "#", "@" are allowed. Remove fluff!
2. **Category Selection**:
   - "diary": Accomplishments ("إللي عملته", "خلصت"), personal thoughts, journal entries.
   - "subject": Scholastic subjects, lectures ("محاضرات"), chapters ("شباتر").
   - "course": Online courses, lessons ("دروس").
   - "task": Standard to-dos.
3. **Strict Formatting**: 
   - Date: YYYY-MM-DD only.
   - Time: HH:MM (24h) only.
   - No Arabic words in date/time fields.
4. **Typo Resilience**:
   - "الدرايبه", "درسايه", "النعارده", "السعه" -> Extract the intended meaning.

Examples:
- "عاوز تضيف ليا في قسم الكورس كورس اسمه C++" 
  -> {"title": "C++", "category": "course", "date": "${today}"}
- "عاوز تضيف ليا في قسم المواد الدرايبه ماده اسمها DTAD عدد الشباتر 8" 
  -> {"title": "DTAD", "category": "subject", "description": "8 شباتر", "date": "${today}"}
- "عاوزك تضيف ليا في قسم ايل ال انجزتو النهارده اني خلص داتا بيس" 
  -> {"title": "خلصت داتا بيس", "category": "diary", "date": "${today}"}

Output MUST be a single line of raw JSON. No preamble, no markdown, NO EXTRA TEXT after the closing bracket.`;

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
