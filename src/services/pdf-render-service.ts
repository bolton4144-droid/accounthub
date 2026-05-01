type PdfRenderInput = {
  template: string;
  title: string;
  payload: Record<string, unknown>;
};

export class PdfRenderService {
  renderHtml(input: PdfRenderInput) {
    const rows = Object.entries(input.payload).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(JSON.stringify(value))}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#101815}h1{color:#3e7257}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #d8e3dd;padding:8px}</style></head><body><h1>${escapeHtml(input.title)}</h1><p>Template: ${escapeHtml(input.template)}</p><table>${rows}</table></body></html>`;
  }

  renderQueuedPdfRecord(input: PdfRenderInput) {
    return {
      status: 'queued_for_pdf_worker',
      renderer: 'html_to_pdf_worker',
      storage: 'encrypted_object_storage',
      html: this.renderHtml(input)
    };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}
