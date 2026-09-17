# XYFRONIX '26 — Public Deployment

## Recommended architecture
One Render Web Service serves both:
- the website (`public/`)
- the Node/Express API
- Socket.IO realtime connections

Supabase stores the persistent event data.

## GitHub
1. Create a new GitHub repository.
2. Upload ALL files in this folder.
3. Do not upload `.env` or any Supabase secret key.

## Supabase
Run `supabase_setup.sql` in Supabase SQL Editor.

## Render
Create a Web Service from the GitHub repository.

Build Command:
npm install

Start Command:
npm start

Environment variables:
COORDINATOR_CODE = your private coordinator code
SUPABASE_URL = https://rcyxppynhdbwskevrjyl.supabase.co
SUPABASE_SECRET_KEY = your Supabase SECRET key

Render provides a public HTTPS URL and WebSocket support for the web service.

After deployment, open the Render URL:
https://YOUR-SERVICE.onrender.com

Participant:
same URL → Participant

Coordinator:
same URL → Coordinator
Code = your COORDINATOR_CODE

No same-Wi-Fi requirement: phones can use mobile data or any Wi-Fi.
