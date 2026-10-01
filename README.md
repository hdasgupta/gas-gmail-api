# Gmail Send API (Google Apps Script)

A POST endpoint that sends an email from your Gmail account, with optional file attachments.

## Project structure
```
gas-gmail-api/
├── src/
│   ├── Code.gs            # doPost / doGet handlers
│   └── appsscript.json    # manifest (scopes, web app config)
├── scripts/fix-clasp.js   # keeps manifest + rootDir after `clasp create`
├── scripts/appsscript.backup.json
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

### Without attachments
```json
{
  "to": "user@example.com, other@example.com",
  "subject": "Hello",
  "htmlBody": "<h1>Hi</h1><p>This is an HTML email.</p>",
  "apiKey": "your-secret"
}
```

### With an attachment
`attachments` is optional. Each attachment contains:
- `filename` — required file name shown in the email.
- `mimeType` — optional MIME type; defaults to `application/octet-stream`.
- `content` — required Base64-encoded file contents.

```json
{
  "to": "user@example.com",
  "subject": "Report",
  "htmlBody": "<p>Please find the report attached.</p>",
  "attachments": [
    {
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "content": "<base64-encoded-file-content>"
    }
  ],
  "apiKey": "your-secret"
}
```

Multiple files can be sent by adding more objects to the `attachments` array:

```json
{
  "to": "user@example.com",
  "subject": "Reports",
  "htmlBody": "<p>Attached are both reports.</p>",
  "attachments": [
    {
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "content": "<base64-pdf>"
    },
    {
      "filename": "data.csv",
      "mimeType": "text/csv",
      "content": "<base64-csv>"
    }
  ],
  "apiKey": "your-secret"
}
```

### curl
```bash
curl -L -X POST "https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Report","htmlBody":"<p>See attachment.</p>","attachments":[{"filename":"report.pdf","mimeType":"application/pdf","content":"<base64-pdf>"}],"apiKey":"your-secret"}'
```

### Creating Base64 content
For example, on Linux/macOS:
```bash
base64 -w 0 report.pdf
```
On macOS versions where `-w` is unavailable:
```bash
base64 report.pdf | tr -d '\n'
```

In JavaScript (Node.js):
```js
const fs = require('fs');
const content = fs.readFileSync('report.pdf').toString('base64');
```

The Base64 string is decoded by Apps Script and converted to a Blob before being passed to `GmailApp.sendEmail`.

## Response
```json
{ "success": true,  "message": "Email sent successfully to user@example.com" }
{ "success": false, "message": "Missing required field: subject" }
```

## Attachment notes
- Attachments are decoded from Base64 on the Apps Script server, so the request body is larger than the original files. Keep the JSON request within Apps Script/web request and Gmail message-size limits.
- Use the correct MIME type when known, such as `application/pdf`, `text/csv`, `image/png`, or `application/zip`.
- Invalid Base64, missing `filename`, missing `content`, or a non-array `attachments` value returns a `success: false` response.
- Gmail and Apps Script enforce message-size, execution, and daily quota limits. Large or numerous attachments may cause the send to fail.

## Notes
- Apps Script always returns HTTP 200 (after a 302 redirect; use `curl -L` / follow redirects). Check the `success` field.
- From browsers, send `Content-Type: text/plain` with a JSON string body to avoid CORS preflight; it is parsed the same way.
- Gmail quota: ~100 recipients/day (consumer), ~1,500/day (Workspace).
- After editing code, run `npm run redeploy` so the live URL picks up changes.
