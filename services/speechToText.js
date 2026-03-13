const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function convertSpeechToText(fileId) {

    console.log("Fetching voice message from Telegram...");

    // 1. Get file URL
    const fileUrl = await getTelegramFileUrl(fileId);
    if (!fileUrl) throw new Error("Could not find file URL");

    // 2. Download it locally temporarily
    const tempPath = `./temp_voice_${Date.now()}.ogg`;
    await downloadFile(fileUrl, tempPath);

    console.log("Voice downloaded, processing with Gemini...");

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const audioData = fs.readFileSync(tempPath);

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/ogg",
                    data: audioData.toString("base64")
                }
            },
            {
                text: "Transcribe this voice message exactly as spoken. Output only the text."
            }
        ]);

        const transcription = result.response.text().trim();

        fs.unlinkSync(tempPath);

        return transcription;

    } catch (err) {

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.error("Voice processing error:", err);
        return null;

    }
}

module.exports = { convertSpeechToText };
