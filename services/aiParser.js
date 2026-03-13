const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseTaskFromText(text) {
    console.log("Parsing text with Gemini...");

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Parse the following task description into a JSON object. Ensure translations where needed (support Arabic and English).
Input: "${text}"

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
    "title": "Task title (translated to English if necessary or kept in original, whichever is clearer)",
    "description": "Any additional context (or empty string)",
    "date": "YYYY-MM-DD format (or empty string if not mentioned)",
    "start_time": "HH:MM format in 24hr (or empty string)",
    "end_time": "HH:MM format in 24hr (or empty string)",
    "priority": "low, medium, or high (default to medium if not mentioned)"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Strip markdown code fences if present
        const clean = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        return JSON.parse(clean);
    } catch (err) {
        console.error("Gemini Parsing Error:", err);
        return null;
    }
}

module.exports = { parseTaskFromText };
