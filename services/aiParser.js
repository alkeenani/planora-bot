const { GoogleGenAI, Type, Schema } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parseTaskFromText(text) {
    console.log("Parsing text with Gemini...");
    
    // We want a JSON output matching Planora's expected structure
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the following task description into a JSON object. Ensure translations where needed (support Arabic and English).
Input: "${text}"

Required JSON schema:
{
    "title": "Task title (translated to English if necessary or kept in original, whichever is clearer)",
    "description": "Any additional context (or empty string)",
    "date": "YYYY-MM-DD format (or empty string if not mentioned)",
    "start_time": "HH:MM format in 24hr (or empty string)",
    "end_time": "HH:MM format in 24hr (or empty string)",
    "priority": "low, medium, or high (default to medium if not mentioned)"
}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        date: { type: Type.STRING },
                        start_time: { type: Type.STRING },
                        end_time: { type: Type.STRING },
                        priority: { type: Type.STRING },
                    },
                    required: ["title"] // Only title is strictly required to be generated
                }
            }
        });

        const jsonString = response.text();
        return JSON.parse(jsonString);
    } catch (err) {
        console.error("Gemini Parsing Error:", err);
        return null;
    }
}

module.exports = { parseTaskFromText };
