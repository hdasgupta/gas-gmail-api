/**
 * Gmail Send API — Google Apps Script Web App
 *
 * POST JSON body:
 * {
 *   "to": "someone@example.com",          // required, comma-separated for multiple
 *   "subject": "Hello",                   // required
 *   "htmlBody": "<h1>Hi</h1><p>Test</p>", // required
 *   "attachments": [                       // optional
 *     {
 *       "filename": "report.pdf",
 *       "mimeType": "application/pdf",
 *       "content": "<base64-encoded-file-content>"
 *     }
 *   ],
 *   "apiKey": "your-secret"               // required only if API_KEY script property is set
 * }
 *
 * Response JSON:
 * { "success": true,  "message": "Email sent successfully to ..." }
 * { "success": false, "message": "Missing required field: to" }
 */

var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  try {
    var payload = parseRequest_(e);

    // Optional API key protection (set via Project Settings > Script Properties)
    var requiredKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (requiredKey && payload.apiKey !== requiredKey) {
      return respond_(false, 'Unauthorized: invalid or missing apiKey');
    }

    var to = (payload.to || '').toString().trim();
    var subject = (payload.subject || '').toString().trim();
    var htmlBody = (payload.htmlBody || payload.html || payload.body || '').toString();

    if (!to) return respond_(false, 'Missing required field: to');
    if (!subject) return respond_(false, 'Missing required field: subject');
    if (!htmlBody.trim()) return respond_(false, 'Missing required field: htmlBody');

    var recipients = to.split(',').map(function (s) { return s.trim(); }).filter(String);
    var invalid = recipients.filter(function (addr) { return !EMAIL_REGEX.test(addr); });
    if (invalid.length) {
      return respond_(false, 'Invalid email address(es): ' + invalid.join(', '));
    }

    var remaining = MailApp.getRemainingDailyQuota();
    if (remaining < recipients.length) {
      return respond_(false, 'Daily email quota exceeded. Remaining: ' + remaining);
    }

    var options = {
      htmlBody: htmlBody
    };
    var attachments = buildAttachments_(payload.attachments);
    if (attachments.length) {
      options.attachments = attachments;
    }

    GmailApp.sendEmail(recipients.join(','), subject, stripHtml_(htmlBody), options);

    return respond_(true, 'Email sent successfully to ' + recipients.join(', '));
  } catch (err) {
    console.error(err);
    return respond_(false, 'Failed to send email: ' + (err && err.message ? err.message : err));
  }
}

/** Builds Gmail attachments from [{filename, mimeType, content}] objects. */
function buildAttachments_(attachments) {
  if (attachments == null) return [];
  if (!Array.isArray(attachments)) {
    throw new Error('attachments must be an array');
  }

  return attachments.map(function (attachment, index) {
    if (!attachment || typeof attachment !== 'object') {
      throw new Error('Attachment at index ' + index + ' must be an object');
    }

    var filename = (attachment.filename || '').toString().trim();
    var content = (attachment.content || '').toString().trim();
    var mimeType = (attachment.mimeType || 'application/octet-stream').toString().trim();

    if (!filename) {
      throw new Error('Attachment at index ' + index + ' is missing filename');
    }
    if (!content) {
      throw new Error('Attachment at index ' + index + ' is missing base64 content');
    }

    try {
      var bytes = Utilities.base64Decode(content);
      return Utilities.newBlob(bytes, mimeType, filename);
    } catch (err) {
      throw new Error('Attachment at index ' + index + ' has invalid base64 content');
    }
  });
}

/** Health check for GET requests. */
function doGet() {
  return respond_(true, 'Gmail Send API is running. Use POST to send an email.');
}

/** Accepts JSON body, or form/query parameters as a fallback. */
function parseRequest_(e) {
  if (!e) throw new Error('No request data received');
  if (e.postData && e.postData.contents) {
    var type = (e.postData.type || '').toLowerCase();
    if (type.indexOf('application/json') !== -1 || type.indexOf('text/plain') !== -1) {
      try {
        return JSON.parse(e.postData.contents);
      } catch (parseErr) {
        throw new Error('Invalid JSON body');
      }
    }
  }
  return e.parameter || {};
}

/** Plain-text fallback for clients that don't render HTML. */
function stripHtml_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function respond_(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to authorize Gmail scopes and test locally. */
function testSend() {
  var res = doPost({
    postData: {
      type: 'application/json',
      contents: JSON.stringify({
        to: Session.getActiveUser().getEmail(),
        subject: 'GAS Gmail API test',
        htmlBody: '<h2>It works</h2><p>Sent from Apps Script.</p>',
        apiKey: PropertiesService.getScriptProperties().getProperty('API_KEY')
      })
    }
  });
  console.log(res.getContent());
}
