# Planora Backend API & Telegram Bot

This directory contains the Node.js Express server that manages AI-powered task creation directly through the Telegram account `@planora_assistant_bot`.

## Project Structure
- `server.js` - Main entry point, Express server & cron job
- `database.js` - SQLite local database handling
- `routes/webhook.js` - Telegram webhook logic 
- `services/aiParser.js` - Text extraction using Gemini 1.5 Flash
- `services/speechToText.js` - Transcribes Telegram Voice messages directly using Gemini Files API.
- `services/telegramService.js` - Helper for sending messages and downloading Bot files.
- `controllers/taskController.js` - Handlers for API endpoints and db operations.

## Environment Variables
Ensure `.env` contains the following:
```env
TELEGRAM_BOT_TOKEN=8510126071:AAH0adh0eZ4JFA7XzRaa5H6wDT-th2lY-uE
GEMINI_API_KEY=AIzaSyB1H-RXzO14ty846r_UlenjHSenuDS-vDU
BOT_USERNAME=planora_assistant_bot
PORT=3000
```

## API Endpoints

1. **Telegram Webhook**
   - `POST /webhook`
   - Handles text and voice message payloads from Telegram servers.

2. **Sync Route for Flutter App**
   - `GET /tasks/user/:id`
   - Returns JSON list of all tasks created by the specific user on Telegram.

3. **Manual Insertion API**
   - `POST /tasks/from-telegram`
   - Accepts manual POST requests.

## Deployment to Railway

1. **Upload to GitHub**: Push this specific `backend/` folder to a new GitHub repository or as a sub-directory in a root repo.
2. **Setup Railway**:
   - Go to [Railway.app](https://railway.app/).
   - Click **New Project** -> Deploy from GitHub Repo.
   - Choose the repository created in step 1.
3. **Environment Setup on Railway**:
   - Navigate to the **Variables** tab for your new service.
   - Add the three keys defined above (`TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `BOT_USERNAME`).
4. **Deploy**:
   - Wait for the build phase to succeed.
   - Go to **Settings** -> Networks and click **Generate Domain**.
   - Copy the URL (e.g., `https://your-domain.up.railway.app`).

## Telegram Webhook Setup
Once the server is deployed on Railway, tell the Telegram API to send messages to your backend instead of doing long polling.

Open your browser and paste this URL (replace the domain):
```text
https://api.telegram.org/bot8510126071:AAH0adh0eZ4JFA7XzRaa5H6wDT-th2lY-uE/setWebhook?url=https://[YOUR_RAILWAY_DOMAIN]/webhook
```

If it succeeds, you'll see a JSON response with `"ok": true`.

## Flutter Integration
Use the generated `lib/services/bot_sync_service.dart` in Flutter.
Just change `'https://your-domain.up.railway.app'` to your newly generated Railway domain!
Call `syncTasksToLocalDatabase()` with your registered Telegram User ID.
