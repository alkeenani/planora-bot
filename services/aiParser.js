const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseTaskFromText(text) {
    console.log("Parsing text with Gemini:", text);
    console.log("API Key exists:", !!process.env.GEMINI_API_KEY);

    // Throw errors so the caller can catch and display them
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash"
    });

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a task parser. Extract task info from the message below and return ONLY a raw JSON object. No markdown, no code blocks, no explanation. Just the JSON.

Message: "${text}"

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
- Return ONLY the JSON object, nothing else`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    console.log("Gemini raw response:", raw);

    // Remove markdown code blocks if present
    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    // Extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
        console.log("No JSON detected from AI. Raw was:", raw);
        throw new Error(`AI returned no JSON. Raw: ${raw.substring(0, 100)}`);
    }

    const task = JSON.parse(match[0]);
    console.log("Parsed task:", task);

    return task;
}

module.exports = { parseTaskFromText };
