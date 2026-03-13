const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId, text) {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text
        });
    } catch (err) {
        console.error("Error sending Telegram message:", err.response ? err.response.data : err.message);
    }
}

async function getTelegramFileUrl(fileId) {
    try {
        const response = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
        const filePath = response.data.result.file_path;
        return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    } catch (err) {
        console.error("Error fetching file path:", err.message);
        return null;
    }
}

async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        console.error("Download Error:", err.message);
        throw err;
    }
}

module.exports = {
    sendTelegramMessage,
    getTelegramFileUrl,
    downloadFile
};
