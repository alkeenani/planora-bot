const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseTaskFromText(text) {

    console.log("Parsing text with Gemini:", text);

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const prompt = `
Extract a task from this message and return ONLY JSON.

Message:
${text}

Return JSON in this format only:

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
- "بكرة" = tomorrow
- Time must be HH:MM 24h
- If no date return ""
- If no time return ""
- Priority default = medium
- Output JSON only
`;

        const result = await model.generateContent(prompt);

        const raw = result.response.text();

        console.log("Gemini raw response:", raw);

        // استخراج JSON فقط
        const match = raw.match(/\{[\s\S]*\}/);

        if (!match) {
            console.log("No JSON detected from AI");
            return null;
        }

        const task = JSON.parse(match[0]);

        return task;

    } catch (err) {

        console.error("AI Parser Error:", err);
        return null;

    }
}

module.exports = { parseTaskFromText };
