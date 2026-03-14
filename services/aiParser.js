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
    const systemPrompt = `You are a professional task extraction assistant specialized in Egyptian Arabic (Ammiya) and English. Your goal is to extract clean data and return ONLY a raw JSON object.

JSON Format:
{"title":"","description":"","category":"task","date":"","start_time":"","end_time":"","priority":"medium","notification_before_start":0, "notification_before_end":0}

Core Extraction Rules:
1. **Category (category)**: 
   - "diary" (يوميات): If the user wants to record a thought, diary entry, or journal.
   - "course" (كورسات): If the user mentions a course and lessons.
   - "subject" (مواد): If the user mentions a college subject or lectures.
   - "task" (Default): For general todos.
2. **Title Extraction**: Ignore Egyptian filler phrases like "أنا عندي تاسك", "سجل لي", "بص يا بوت", "عاوز أضيف".
3. **Description**: Store extra details like lesson names or lecture counts here.
4. **Slang Recognition**: 
   - "أنا عندي بكرة مادة كذا" -> Category: subject.
   - "سجل في اليوميات إني..." -> Category: diary.
   - "في كورس البرمجة خلصت درسين" -> Category: course.
   - "بكرة" = tomorrow, "بعده" = day after tomorrow.

Examples:
- "سجل في اليوميات إني قابلت صحابي النهاردة" -> category: diary
- "عندي مادة الرياضة فيها 10 محاضرات" -> category: subject, description: "10 محاضرات"

Return ONLY the raw JSON string.`;

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
