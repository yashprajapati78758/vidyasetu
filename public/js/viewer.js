// VidyaSetu Dedicated In-Browser Read-Only Document & Solved Paper Viewer
const DocViewer = {
  activeDoc: null,
  zoomLevel: 100,

  open(title, type, contentOrUrl, meta = {}) {
    this.activeDoc = { title, type, contentOrUrl, meta };
    this.zoomLevel = 100;

    const overlay = document.getElementById('viewerModalOverlay');
    const titleElem = document.getElementById('viewerTitle');
    const badgeElem = document.getElementById('viewerTypeBadge');
    const metaElem = document.getElementById('viewerMetaText');
    const bodyElem = document.getElementById('viewerDocContent');

    if (!overlay) return;

    titleElem.textContent = title;
    badgeElem.textContent = (type || 'READ-ONLY').toUpperCase();
    metaElem.textContent = meta.author || meta.verified_by || meta.publisher || 'GTU Academic Repository';

    // Render based on document type
    if (type === 'solution' || type === 'notes_text') {
      const parsedHtml = this.renderMarkdown(contentOrUrl);
      bodyElem.innerHTML = `
        <div class="document-sheet protected-reader" id="viewerSheet" oncontextmenu="return false;" style="transform: scale(${this.zoomLevel / 100}); transform-origin: top center; position: relative;">
          <div class="watermark-overlay">VIDYASETU READ ONLY</div>
          
          <div style="border-bottom: 2px solid rgba(56, 189, 248, 0.4); padding-bottom: 1.5rem; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                🔒 IN-BROWSER READ ONLY MODE (DOWNLOAD DISABLED)
              </span>
              <span style="color: #38bdf8; font-size: 0.85rem; font-weight: 600;">
                ⭐ Verified by: ${meta.verified_by || 'GTU Gold Medalist & Faculty'}
              </span>
            </div>
            <h1 style="font-size: 1.7rem; color: #fff; margin-bottom: 0.5rem; line-height: 1.3;">${title}</h1>
            <p style="color: #94a3b8; font-size: 0.88rem;">Step-by-step examination model answers with formulas, diagrams, and marking distribution.</p>
          </div>

          <div class="solution-markdown-view" style="color: #e2e8f0; line-height: 1.8; font-size: 0.95rem;">
            ${parsedHtml}
          </div>

          <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div style="font-size: 0.82rem; color: #94a3b8;">
              🎓 VidyaSetu Digital Reading Portal • Protected Academic Digital Reading Mode
            </div>
            <button class="btn btn-secondary btn-sm" onclick="DocViewer.copyCurrentContent()">
              📋 Copy Notes
            </button>
          </div>
        </div>
      `;
    } else {
      // Study Notes / Textbook / Question Paper In-Browser Reader Mode
      const typeLabel = type === 'book' ? 'GTU Prescribed Textbook' : type === 'paper' ? 'GTU Official Examination Question Paper' : 'Chapter Lecture Notes';
      const icon = type === 'book' ? '📚' : type === 'paper' ? '❓' : '📑';
      const descContent = meta.description || 'Comprehensive GTU diploma curriculum material structured for semester examination preparation, unit explanations, key formulas, illustrative schematics, and high-frequency GTU topics.';
      const formattedDesc = this.renderMarkdown(descContent);

      bodyElem.innerHTML = `
        <div class="document-sheet protected-reader" id="viewerSheet" oncontextmenu="return false;" style="transform: scale(${this.zoomLevel / 100}); transform-origin: top center; position: relative;">
          <div class="watermark-overlay">VIDYASETU READ ONLY</div>

          <div style="text-align: center; padding: 1.5rem 0 2rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem;">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(56,189,248,0.12); color: #38bdf8; font-weight: 700; padding: 4px 14px; border-radius: var(--radius-full); font-size: 0.78rem; margin-bottom: 1rem;">
              <span>🔒</span> PROTECTED READ-ONLY DIGITAL VIEWER (NO DOWNLOAD)
            </div>
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">${icon}</div>
            <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.5rem;">${title}</h2>
            <p style="color: #38bdf8; font-weight: 600; font-size: 0.95rem;">
              ${meta.publisher || meta.author || 'Gujarat Technological University (GTU)'}
            </p>
            <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.75rem; color: #94a3b8; font-size: 0.85rem; flex-wrap: wrap;">
              <span>📑 ${typeLabel}</span>
              <span>💾 Size: ${meta.file_size || '3.2 MB'}</span>
              <span>🔒 Mode: Full Screen In-Browser Reading</span>
            </div>
          </div>

          <!-- Document Syllabus & Summary Content with Markdown support -->
          <div style="background: rgba(10,15,29,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
            <h4 style="color: #38bdf8; margin-bottom: 0.75rem; font-size: 1rem;">📖 Document Coverage & Syllabus Details:</h4>
            <div style="color: #cbd5e1; font-size: 0.92rem; line-height: 1.7;">
              ${formattedDesc}
            </div>
          </div>

          <!-- Embedded In-Browser PDF Reader if file is uploaded on server -->
          ${(meta.file_url && meta.file_url.startsWith('/uploads/') && meta.file_url.toLowerCase().endsWith('.pdf')) ? `
            <div style="margin-bottom: 2rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h4 style="color: #38bdf8; font-size: 1rem; margin: 0;">📄 In-Browser Document Preview (Protected):</h4>
                <span style="font-size: 0.78rem; color: #34d399; font-weight: 700;">🔒 Download Disabled</span>
              </div>
              <iframe src="${meta.file_url}#toolbar=0&navpanes=0" class="viewer-pdf-frame" title="${title}"></iframe>
            </div>
          ` : ''}

          <!-- Interactive Reading Content -->
          <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
            <h4 style="color: #34d399; margin-bottom: 1rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>✨</span> Key Study Highlights & Concepts
            </h4>
            <ul style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.8; margin-left: 1.25rem;">
              <li>Official GTU diploma curriculum aligned notes and syllabus mapping.</li>
              <li>Includes core engineering definitions, step-by-step algorithms, and circuit/block diagrams.</li>
              <li>Contains high-frequency GTU 3-mark, 4-mark and 7-mark question templates with model solutions.</li>
              <li>Optimized for on-screen digital reading, self-study, and quick revision.</li>
            </ul>
          </div>

          <div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08);">
            🎓 VidyaSetu Student Portal • Protected Academic Digital Reading Mode • Direct Download Disabled
          </div>
        </div>
      `;
    }

    overlay.classList.add('active');
    this.updateZoom();
  },

  copyCurrentContent() {
    if (!this.activeDoc) return;
    const content = typeof this.activeDoc.contentOrUrl === 'string' ? this.activeDoc.contentOrUrl : this.activeDoc.title;
    navigator.clipboard.writeText(content);
    if (window.App) App.showToast('Content copied to clipboard!', 'success');
  },

  close() {
    const overlay = document.getElementById('viewerModalOverlay');
    if (overlay) overlay.classList.remove('active');
    this.activeDoc = null;
  },

  zoomIn() {
    if (this.zoomLevel < 150) {
      this.zoomLevel += 15;
      this.updateZoom();
    }
  },

  zoomOut() {
    if (this.zoomLevel > 60) {
      this.zoomLevel -= 15;
      this.updateZoom();
    }
  },

  resetZoom() {
    this.zoomLevel = 100;
    this.updateZoom();
  },

  updateZoom() {
    const sheet = document.getElementById('viewerSheet');
    const zoomText = document.getElementById('viewerZoomLevel');
    if (sheet) sheet.style.transform = `scale(${this.zoomLevel / 100})`;
    if (zoomText) zoomText.textContent = `${this.zoomLevel}%`;
  },

  renderMarkdown(text) {
    if (!text) return '';

    // Normalize newlines
    let str = text.replace(/\r\n/g, '\n');

    // Code blocks
    str = str.replace(/```(c|cpp|python|sql|java|html|css)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div style="background: rgba(10,15,29,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin: 1rem 0; overflow-x: auto;"><div style="background: rgba(255,255,255,0.05); padding: 4px 12px; font-size: 0.75rem; color: #38bdf8; font-family: monospace; border-bottom: 1px solid rgba(255,255,255,0.08);">${(lang || 'code').toUpperCase()}</div><pre style="margin: 0; padding: 1rem; font-family: 'Fira Code', monospace; font-size: 0.88rem; color: #a5f3fc; line-height: 1.5;"><code>${escapedCode}</code></pre></div>`;
    });

    // Parse Tables
    const lines = str.split('\n');
    let inTable = false;
    let tableBuffer = [];
    const outputLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
      } else {
        if (inTable) {
          outputLines.push(this.formatTable(tableBuffer));
          tableBuffer = [];
          inTable = false;
        }
        outputLines.push(lines[i]);
      }
    }
    if (inTable) {
      outputLines.push(this.formatTable(tableBuffer));
    }

    str = outputLines.join('\n');

    // Headings
    str = str.replace(/^### (.*$)/gim, '<h3 style="color: #38bdf8; margin: 1.5rem 0 0.5rem 0; font-size: 1.25rem;">$1</h3>');
    str = str.replace(/^#### (.*$)/gim, '<h4 style="color: #fbbf24; margin: 1.25rem 0 0.4rem 0; font-size: 1.05rem;">$1</h4>');
    str = str.replace(/^## (.*$)/gim, '<h2 style="color: #fff; margin: 1.75rem 0 0.75rem 0; font-size: 1.45rem;">$1</h2>');

    // Math display expressions ($$ ... $$)
    str = str.replace(/\$\$([\s\S]*?)\$\$/g, '<div style="background: rgba(56,189,248,0.08); border-left: 3px solid #38bdf8; padding: 0.75rem 1.25rem; margin: 1rem 0; border-radius: 4px; font-family: \'Fira Code\', monospace; color: #7dd3fc; overflow-x: auto;">$1</div>');

    // Inline math ($ ... $)
    str = str.replace(/\$([^\$\n]+)\$/g, '<code style="background: rgba(56,189,248,0.12); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: \'Fira Code\', monospace;">$1</code>');

    // Bold, Italic, Inline Code
    str = str.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>');
    str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
    str = str.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');

    // Lists
    str = str.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.35rem;">$1</li>');
    str = str.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.35rem;">$2</li>');

    // Horizontal Rule
    str = str.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0;">');

    // Paragraph breaks
    str = str.replace(/\n\n+/g, '<div style="height: 0.75rem;"></div>');

    return str;
  },

  formatTable(rows) {
    if (!rows || rows.length === 0) return '';
    let html = '<div style="overflow-x: auto; margin: 1.25rem 0;"><table class="solution-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; background: rgba(10,15,29,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">';

    let isHeader = true;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (row.includes('---')) {
        isHeader = false;
        continue;
      }
      const cells = row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">';
      for (let c = 0; c < cells.length; c++) {
        const text = cells[c].trim();
        if (isHeader) {
          html += `<th style="padding: 0.75rem 1rem; background: rgba(56,189,248,0.12); color: #38bdf8; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.06);">${text}</th>`;
        } else {
          html += `<td style="padding: 0.65rem 1rem; color: #cbd5e1; border-right: 1px solid rgba(255,255,255,0.06);">${text}</td>`;
        }
      }
      html += '</tr>';
      if (isHeader) isHeader = false;
    }

    html += '</table></div>';
    return html;
  }
};
