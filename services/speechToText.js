const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
        // 3. Upload file to Gemini using the Files API
        const uploadResult = await ai.files.upload({
           file: tempPath,
           mimeType: 'audio/ogg'
        });

        // 4. Extract text from audio
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                uploadResult,
                { text: "Accurately transcribe the spoken audio in this voice message. Transcribe it to exactly what the user said in either Arabic or English. Output strictly the transcription text without any markdown or quotes." }
            ]
        });

        const transcription = response.text().trim();
        
        // Clean up
        fs.unlinkSync(tempPath);
        return transcription;
        
    } catch (err) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.error("Voice processing error:", err);
        return null;
    }
}

module.exports = { convertSpeechToText };
