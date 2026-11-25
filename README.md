# HentaiAI starter

A small Node.js website starter with:
- pink anime-inspired frontend
- character creation saved to `data/store.json`
- roleplay chat endpoint (demo until an AI provider is configured)
- prompt builder for an external image-generation provider
- server-side API key configuration

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run: `npm start`
3. Open `http://127.0.0.1:3000`

## Connect a chat model
Set these environment variables on the server:
- `AI_API_URL`: OpenAI-compatible chat completions endpoint
- `AI_API_KEY`: secret key, server-side only
- `AI_MODEL`: model name

Never put API keys in `public/` or commit them to Git.

The image page currently prepares prompts only. To generate images, choose an image provider and implement its API call on the server; provider terms, content policies, moderation, and costs apply.

## Before public launch
This is a starter, not a production-ready service. Add proper authentication, per-user data isolation, database backups, rate limits, abuse reporting, content moderation, secure hosting, privacy/terms pages, and an image storage provider. The gallery is currently a placeholder. Do not advertise the service as fully free until hosting and model costs are funded.


## Deploy free on Render
1. Create a GitHub repository and upload the *contents* of this folder to its root.
2. In Render, choose **New → Web Service**, connect that GitHub repository.
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Select the **Free** instance plan and deploy.
5. Render will provide a public `onrender.com` URL.

Free Render services sleep after 15 minutes without traffic and can take about a minute to wake. Their local filesystem is ephemeral: this starter's JSON character store can be reset after restarts/sleep/redeploy. For durable user accounts and characters, connect a persistent external database before treating this as a public community product.
