const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// الحصول على رابط الملف من Telegram
async function getTelegramFileUrl(fileId) {

    const response = await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    const filePath = response.data.result.file_path;

    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
}

// تحميل الملف من الرابط
async function downloadFile(url, path) {

    const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream"
    });

    const writer = fs.createWriteStream(path);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

async function convertSpeechToText(fileId) {

    console.log("Fetching voice message from Telegram...");

    const fileUrl = await getTelegramFileUrl(fileId);

    if (!fileUrl) throw new Error("Could not find file URL");

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
                text: "Transcribe this voice message exactly as spoken in Arabic or English. Return only the text."
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
