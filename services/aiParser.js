const axios = require('axios');

async function parseTaskFromText(text) {
    console.log("Parsing text with xAI (Grok):", text);
    
    // Check if xAI API Key exists (using the same env variable for now to prevent breaking other things)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.startsWith('xai-')) {
        console.error("Invalid or missing xAI API Key.");
        throw new Error("Invalid xAI API Key. Must start with 'xai-'.");
    }

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a strict task parser. Extract task info from the user's message and return ONLY a raw JSON object. No markdown formatting, no code blocks (like \`\`\`json), no explanation. Just the raw JSON string.

Return this exact JSON format:
{"title":"","description":"","date":"","start_time":"","end_time":"","priority":"medium"}

Rules:
- Understand Arabic and English
- "بكرة" means tomorrow, calculate the actual date (today is ${today})
- "الساعة 8" means 08:00
- "الساعة 8 مساء" means 20:00
- Time must be in HH:MM 24-hour format
- If no date, return empty string for date
- If no time, return empty string for start_time
- Priority can be: low, medium, high (default: medium)
- Return ONLY the JSON object, absolutely nothing else.`;

    try {
        const response = await axios.post(
            'https://api.x.ai/v1/chat/completions',
            {
                model: "grok-4-1-fast-non-reasoning",
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
        console.log("xAI raw response:", raw);

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
