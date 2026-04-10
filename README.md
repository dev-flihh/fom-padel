<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/27d60198-41b0-4446-92d0-3c510bc94635

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production (HTTPS + PWA Installable)

1. Build app:
   `npm run build`
2. Login to Firebase:
   `npx firebase-tools login`
3. Deploy hosting (HTTPS by default):
   `npx firebase-tools deploy --only hosting --project gen-lang-client-0996764238`

After deploy, open the `https://...web.app` URL and check install prompt in browser/mobile.
