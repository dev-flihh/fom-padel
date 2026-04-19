const CONFIG = {
  DOC_ID_KEY: 'DOC_ID',
  SECRET_KEY: 'WEBHOOK_SECRET',
  SOURCE_URL_KEY: 'SOURCE_RAW_URL'
};
const SCRIPT_VERSION = 'v4-non-empty-guards';

function doPost(e) {
  try {
    const payload = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const secret = PropertiesService.getScriptProperties().getProperty(CONFIG.SECRET_KEY) || '';
    if (!secret || payload.secret !== secret) {
      return jsonResponse_({ ok: false, error: 'Unauthorized' }, 401);
    }

    const markdown = (payload.markdown || '').trim();
    if (!markdown) {
      return jsonResponse_({ ok: false, error: 'markdown is required' }, 400);
    }

    const docId = PropertiesService.getScriptProperties().getProperty(CONFIG.DOC_ID_KEY);
    if (!docId) {
      return jsonResponse_({ ok: false, error: 'DOC_ID not configured' }, 500);
    }

    renderMarkdownToDoc_(docId, markdown);
    return jsonResponse_({ ok: true, updatedAt: new Date().toISOString(), version: SCRIPT_VERSION }, 200);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 500);
  }
}

function syncFromRawNow() {
  const docId = PropertiesService.getScriptProperties().getProperty(CONFIG.DOC_ID_KEY);
  const sourceUrl = PropertiesService.getScriptProperties().getProperty(CONFIG.SOURCE_URL_KEY);

  if (!docId) throw new Error('DOC_ID not configured');
  if (!sourceUrl) throw new Error('SOURCE_RAW_URL not configured');

  const res = UrlFetchApp.fetch(sourceUrl, { muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) {
    throw new Error('Failed to fetch markdown. HTTP ' + res.getResponseCode());
  }

  const markdown = res.getContentText('UTF-8');
  renderMarkdownToDoc_(docId, markdown);
}

function renderMarkdownToDoc_(docId, markdown) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  // Safe clear for Google Docs:
  // never remove the last paragraph node.
  if (body.getNumChildren() === 0) {
    body.appendParagraph(' ');
  }
  while (body.getNumChildren() > 1) {
    body.removeChild(body.getChild(1));
  }
  const first = body.getChild(0);
  if (first.getType() === DocumentApp.ElementType.PARAGRAPH) {
    first.asParagraph().setText(' ');
  } else {
    body.insertParagraph(0, ' ');
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((line) => {
    if (!line.trim()) {
      body.appendParagraph(' ');
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = safeText_(headingMatch[2].trim());
      const p = body.appendParagraph(text);
      if (level === 1) p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      else if (level === 2) p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      else if (level === 3) p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      else p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      body.appendListItem(safeText_(stripInlineMarkdown_(orderedMatch[1]))).setGlyphType(DocumentApp.GlyphType.NUMBER);
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      body.appendListItem(safeText_(stripInlineMarkdown_(bulletMatch[1]))).setGlyphType(DocumentApp.GlyphType.BULLET);
      return;
    }

    body.appendParagraph(safeText_(stripInlineMarkdown_(line)));
  });

  doc.saveAndClose();
}

function stripInlineMarkdown_(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

function safeText_(text) {
  const normalized = (text || '').trim();
  return normalized ? normalized : ' ';
}

function jsonResponse_(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify({ status, ...obj }))
    .setMimeType(ContentService.MimeType.JSON);
}
