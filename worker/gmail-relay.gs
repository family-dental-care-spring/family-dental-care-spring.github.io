/**
 * Gmail relay for the booking worker.
 * Deploy this as a Google Apps Script Web App (see worker/README.md for
 * the exact clicks). It receives a POST from the Cloudflare Worker and
 * sends the email from the practice's own Gmail account via MailApp.
 */
function doPost(e) {
  var result = { ok: false };
  try {
    var body = JSON.parse(e.postData.contents);

    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || body.secret !== secret) {
      result.error = 'unauthorized';
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var to = Array.isArray(body.to) ? body.to.filter(Boolean).join(',') : String(body.to || '');
    if (!to) throw new Error('no recipients');

    MailApp.sendEmail({
      to: to,
      subject: body.subject || 'Family Dental Care of Spring',
      htmlBody: body.html || '',
      name: body.name || 'Family Dental Care of Spring',
      replyTo: body.replyTo || undefined,
    });

    result.ok = true;
  } catch (err) {
    result.ok = false;
    result.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
