const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseTaskFromText(text) {

    console.log("Parsing text with Gemini...");

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const prompt = `
Parse the following task description into JSON.

Message:
"${text}"

Return ONLY JSON in this format:

{
"title": "",
"description": "",
"date": "",
"start_time": "",
"end_time": "",
"priority": ""
}

Rules:
- Understand Arabic and English
- "بكرة" means tomorrow
- Time must be HH:MM 24h
- Priority default = medium
- Output JSON only
`;

        const result = await model.generateContent(prompt);

        const responseText = result.response.text().trim();

        // استخراج JSON من النص
        const match = responseText.match(/\{[\s\S]*\}/);

        if (!match) {
            console.log("No JSON found in response:", responseText);
            return null;
        }

        const json = JSON.parse(match[0]);

        return json;

    } catch (err) {

        console.error("Gemini Parsing Error:", err);
        return null;
    }
}

module.exports = { parseTaskFromText };
