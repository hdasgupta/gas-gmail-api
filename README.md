# Gmail Send API (Google Apps Script)

A POST endpoint that sends an email from your Gmail account.

## Project structure
```
gas-gmail-api/
├── src/
│   ├── Code.gs            # doPost / doGet handlers
│   └── appsscript.json    # manifest (scopes, web app config)
├── scripts/fix-clasp.js   # keeps manifest + rootDir after `clasp create`
├── .clasp.json            # clasp config (scriptId, rootDir)
├── .claspignore
└── package.json           # npm scripts wrapping clasp
```

## Setup with clasp
Requires Node.js 18+.

1. Enable the Apps Script API for your account: https://script.google.com/home/usersettings
2. Install and log in:
   ```bash
   npm install
   npm run login
   ```
3. Create the Apps Script project (or link an existing one):
   - New project: delete `.clasp.json`, then run `npm run create`
   - Existing project: put its Script ID (Project Settings > IDs) into `.clasp.json`
4. Upload the code:
   ```bash
   npm run push
   ```
5. Open the editor (`npm run open`), run `testSend` once to grant Gmail permissions, and optionally add Script Property `API_KEY`.
6. Deploy as web app:
   ```bash
   npm run deploy
   ```
   The output shows a deployment ID. Your endpoint is
   `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`
7. To update the same URL later:
   ```bash
   DEPLOYMENT_ID=<DEPLOYMENT_ID> npm run redeploy
   ```

Note: the first time, you may need to confirm web app access in the editor via Deploy > Manage deployments (Execute as: Me, Who has access: Anyone). `appsscript.json` already sets these.

## Manual setup (without clasp)
1. Create a project at https://script.google.com.
2. Paste `src/Code.gs`; enable "Show appsscript.json" in Project Settings and paste `src/appsscript.json`.
3. Run `testSend`, then Deploy > New deployment > Web app.

## Request
POST `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

```json
{
  "to": "user@example.com, other@example.com",
  "subject": "Hello",
  "htmlBody": "<h1>Hi</h1><p>This is an HTML email.</p>",
  "apiKey": "your-secret"
}
```

```bash
curl -L -X POST "https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Hello","htmlBody":"<b>Hi</b>","apiKey":"your-secret"}'
```

## Response
```json
{ "success": true,  "message": "Email sent successfully to user@example.com" }
{ "success": false, "message": "Missing required field: subject" }
```

## Notes
- Apps Script always returns HTTP 200 (after a 302 redirect; use `curl -L` / follow redirects). Check the `success` field.
- From browsers, send `Content-Type: text/plain` with a JSON string body to avoid CORS preflight; it is parsed the same way.
- Gmail quota: ~100 recipients/day (consumer), ~1,500/day (Workspace).
- After editing code, run `npm run redeploy` so the live URL picks up changes.
