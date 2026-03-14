const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

// Get file URL from Telegram
async function getTelegramFileUrl(fileId) {
    const response = await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const filePath = response.data.result.file_path;
    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
}

// Download file from URL
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
    console.log("Fetching voice message from Telegram for Groq Whisper...");
    
    const apiKey = process.env.GEMINI_API_KEY; // Using the same key from .env (which is now Groq)
    if (!apiKey || !apiKey.startsWith('gsk_')) {
        console.error("Invalid or missing Groq API Key in speechToText.");
        return null;
    }

    let tempPath;
    try {
        const fileUrl = await getTelegramFileUrl(fileId);
        if (!fileUrl) throw new Error("Could not find file URL");

        tempPath = `./temp_voice_${Date.now()}.ogg`;
        await downloadFile(fileUrl, tempPath);

        console.log("Voice downloaded, transcribing with Groq Whisper...");

        const form = new FormData();
        form.append("file", fs.createReadStream(tempPath));
        form.append("model", "whisper-large-v3-turbo");
        form.append("response_format", "json");

        const response = await axios.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`,
                }
            }
        );

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        const transcription = response.data.text.trim();
        console.log("Whisper Transcription:", transcription);
        return transcription;

    } catch (err) {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.error("Voice processing error (Groq):", err.response ? JSON.stringify(err.response.data) : err.message);
        return null;
    }
}

module.exports = { convertSpeechToText };
