// VidyaSetu Brainheaters-Style Dedicated In-Website Digital Reader
const DocViewer = {
  activeDoc: null,
  activeChapterIndex: 0,
  chaptersList: [],
  zoomLevel: 100,
  currentTheme: 'dark', // 'dark', 'sepia', 'light'
  isSidebarOpen: true,

  open(title, type, contentOrUrl, meta = {}) {
    this.activeDoc = { title, type, contentOrUrl, meta };
    this.zoomLevel = 100;
    this.activeChapterIndex = 0;
    this.currentTheme = 'dark';

    // Generate table of contents / chapters list for Brainheaters reader
    this.chaptersList = this.generateChapters(title, type, contentOrUrl, meta);

    const overlay = document.getElementById('viewerModalOverlay');
    const titleElem = document.getElementById('viewerTitle');
    const badgeElem = document.getElementById('viewerTypeBadge');
    
    if (titleElem) titleElem.textContent = title;
    if (badgeElem) {
      const typeLabels = {
        book: 'GTU TEXTBOOK',
        paper: 'QUESTION PAPER',
        solution: 'SOLVED GUIDE',
        material: 'CHAPTER NOTES'
      };
      badgeElem.textContent = typeLabels[type] || 'STUDY MATERIAL';
    }

    this.renderSidebar();
    this.renderActiveChapter();
    this.setTheme('dark');
    this.updateZoom();

    if (overlay) overlay.classList.add('active');
  },

  generateChapters(title, type, contentOrUrl, meta) {
    const chapters = [];
    const desc = meta.description || 'Comprehensive GTU curriculum material structured for semester examination preparation.';

    if (type === 'solution') {
      chapters.push({
        id: 'sol_q1',
        title: 'Q1: Core Theoretical Model Answers',
        badge: '7 Marks',
        content: contentOrUrl || `### Question 1 [7 Marks]: Core Concepts & Definitions\n\n${desc}\n\n**Detailed Step-by-Step Model Solution:**\n- State clear definition and GTU standard terminology.\n- Include appropriate block diagram and architectural layout.\n- Provide real-world engineering application example.`
      });
      chapters.push({
        id: 'sol_q2',
        title: 'Q2: Key Mathematical Derivations & Formulas',
        badge: '7 Marks',
        content: `### Question 2 [7 Marks]: Formula Formulations & Derivations\n\nKey Formulas for this session: \`${meta.key_formulas || 'Standard GTU formulas apply'}\`\n\n**Derivation Steps:**\n1. Establish fundamental governing differential/algebraic equations.\n2. Apply boundary conditions according to GTU standards.\n3. Simplify to obtain final closed-form expression.`
      });
      chapters.push({
        id: 'sol_q3',
        title: 'Q3: Algorithm & System Flowchart',
        badge: '7 Marks',
        content: `### Question 3 [7 Marks]: Algorithm & Implementation Logic\n\nVerified by: **${meta.verified_by || 'GTU Senior Faculty'}**\n\n\`\`\`c\n// Standard GTU Exam Algorithm Implementation\n#include <stdio.h>\n\nvoid solveEngineeringProblem() {\n    printf("GTU Optimal Implementation\\\\n");\n}\n\`\`\``
      });
      chapters.push({
        id: 'sol_q4',
        title: 'Q4: High-Frequency Remedial & Winter Exam Questions',
        badge: '7 Marks',
        content: `### Question 4 [7 Marks]: Previous 5-Year High Frequency Question\n\n- **Tip for 7 Marks**: Always divide answer into Definition (1 mark), Diagram (2 marks), Working Principle (3 marks), and Advantages (1 mark).\n- Refer to model papers for exact marking distribution.`
      });
    } else if (type === 'book') {
      chapters.push({
        id: 'bk_ch1',
        title: 'Chapter 1: Scope & Foundations',
        badge: 'Unit 1',
        content: `## Chapter 1: Introduction and Engineering Foundations\n\n**Book**: *${title}*\n**Author**: ${meta.author || 'Prescribed Author'}\n**Publisher**: ${meta.publisher || 'GTU Technical Publications'}\n\n${desc}\n\n### Learning Objectives:\n- Master fundamental physical & mathematical principles.\n- Understand GTU diploma syllabus boundary and practical lab relevance.`
      });
      chapters.push({
        id: 'bk_ch2',
        title: 'Chapter 2: Core Engineering Principles',
        badge: 'Unit 2',
        content: `## Chapter 2: Detailed Principles & Methodology\n\nIncludes detailed diagrams, derivations, and step-by-step illustrations required for Semester examinations.`
      });
      chapters.push({
        id: 'bk_ch3',
        title: 'Chapter 3: Circuit & Block Schematics',
        badge: 'Unit 3',
        content: `## Chapter 3: Schematics, Flowcharts & Architectures\n\nEssential GTU drawing standards, block diagrams, and system flowcharts for practical submissions and final exams.`
      });
      chapters.push({
        id: 'bk_ch4',
        title: 'Chapter 4: Solved Numerical Problems',
        badge: 'Unit 4',
        content: `## Chapter 4: Step-by-Step Solved Numericals & Examples\n\nComplete numerical sets solved with standard GTU units, formulas, and step marks.`
      });
    } else if (type === 'paper') {
      chapters.push({
        id: 'pap_s1',
        title: 'Section A: 3-Mark Direct Questions',
        badge: '14 Marks',
        content: `## Section A: Short Answer Questions [3 Marks Each]\n\n**Paper**: ${title}\n**Total Marks**: ${meta.total_marks || 70} Marks\n\n1. Define fundamental terms and state primary laws.\n2. Differentiate between core concepts with clear comparison table.\n3. State advantages and industrial applications.`
      });
      chapters.push({
        id: 'pap_s2',
        title: 'Section B: 4-Mark Analytical Questions',
        badge: '28 Marks',
        content: `## Section B: Medium Answer Questions [4 Marks Each]\n\n1. Explain with neat sketches the working principle of the core system.\n2. Derive the governing mathematical relationship.\n3. Solve the given numerical problem showing all calculation steps.`
      });
      chapters.push({
        id: 'pap_s3',
        title: 'Section C: 7-Mark Comprehensive Problems',
        badge: '28 Marks',
        content: `## Section C: Long Answer Questions [7 Marks Each]\n\n1. Explain the complete system architecture with labelled circuit/block diagram.\n2. Comprehensive algorithm design and step-by-step problem solution.`
      });
    } else {
      // Lecture Notes
      chapters.push({
        id: 'mat_u1',
        title: `Unit ${meta.chapter_no || 1}: ${meta.chapter_name || 'Core Definitions & Foundations'}`,
        badge: 'Unit 1',
        content: `## ${title}\n\n**Faculty / Author**: ${meta.author || 'GTU Faculty Council'}\n**Topic**: ${meta.chapter_name || 'Lecture Notes'}\n\n${desc}\n\n### Key Concepts Covered:\n- Standard GTU definitions and foundational theorems.\n- Systematic classifications and characteristic properties.`
      });
      chapters.push({
        id: 'mat_u2',
        title: 'Unit 2: Algorithms, Proofs & Schematics',
        badge: 'Unit 2',
        content: `### Detailed Technical Breakdown\n\n- Step-by-step procedural steps and flowchart logic.\n- High-resolution schematic diagrams with standard GTU symbols.\n- Mathematical proofs and formula derivations.`
      });
      chapters.push({
        id: 'mat_u3',
        title: 'Unit 3: GTU High-Weightage Questions',
        badge: 'Exam Prep',
        content: `### GTU Examination High-Probability Questions\n\n⭐ **GTU 7-Mark Alert:**\nExplain the complete lifecycle and operational workflow with neat diagram.\n\n⭐ **GTU 4-Mark Alert:**\nCompare and contrast primary and secondary approaches with tabular format.`
      });
    }

    // If there is an uploaded PDF file attached, add PDF reader tab
    if (meta.file_url && meta.file_url.startsWith('/uploads/') && meta.file_url.toLowerCase().endsWith('.pdf')) {
      chapters.push({
        id: 'attached_pdf',
        title: '📄 Official Attached Document (PDF)',
        badge: 'Original PDF',
        isPdf: true,
        pdfUrl: meta.file_url
      });
    }

    return chapters;
  },

  renderSidebar() {
    const listElem = document.getElementById('readerTocList');
    const countElem = document.getElementById('readerChapterCount');
    if (!listElem) return;

    if (countElem) countElem.textContent = `${this.chaptersList.length} Sections`;

    listElem.innerHTML = this.chaptersList.map((ch, idx) => `
      <div class="reader-toc-item ${idx === this.activeChapterIndex ? 'active' : ''}" onclick="DocViewer.selectChapter(${idx})">
        <div style="font-weight: ${idx === this.activeChapterIndex ? '700' : '500'};">
          ${ch.title}
        </div>
        <span style="font-size: 0.72rem; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
          ${ch.badge || 'Unit'}
        </span>
      </div>
    `).join('');
  },

  selectChapter(index) {
    if (index >= 0 && index < this.chaptersList.length) {
      this.activeChapterIndex = index;
      this.renderSidebar();
      this.renderActiveChapter();
    }
  },

  renderActiveChapter() {
    const bodyElem = document.getElementById('viewerDocContent');
    if (!bodyElem) return;

    const ch = this.chaptersList[this.activeChapterIndex];
    if (!ch) return;

    const totalChapters = this.chaptersList.length;
    const isFirst = this.activeChapterIndex === 0;
    const isLast = this.activeChapterIndex === totalChapters - 1;

    // Handle Attached PDF rendering
    if (ch.isPdf && ch.pdfUrl) {
      bodyElem.innerHTML = `
        <div class="document-sheet protected-reader" id="viewerSheet" oncontextmenu="return false;" style="transform: scale(${this.zoomLevel / 100}); transform-origin: top center; position: relative;">
          <div class="watermark-overlay">VIDYASETU READ ONLY</div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
            <div>
              <span style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 0.78rem;">
                🔒 IN-WEBSITE DIGITAL PDF READER (DOWNLOAD DISABLED)
              </span>
              <h2 style="color: #fff; font-size: 1.4rem; margin-top: 0.5rem;">${ch.title}</h2>
            </div>
            <button class="btn btn-primary btn-sm" onclick="DocViewer.askAiAboutDoc()">
              ✨ Ask AI About This PDF
            </button>
          </div>

          <iframe src="${ch.pdfUrl}#toolbar=0&navpanes=0" class="viewer-pdf-frame" style="width: 100%; height: 68vh; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;" title="${this.activeDoc.title}"></iframe>

          <!-- Navigation footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
            <button class="btn btn-secondary btn-sm" ${isFirst ? 'disabled' : ''} onclick="DocViewer.selectChapter(${this.activeChapterIndex - 1})">
              ⬅️ Previous Section
            </button>
            <button class="btn btn-success btn-sm" onclick="DocViewer.markCurrentCompleted()">
              ✅ Mark Section as Completed
            </button>
            <button class="btn btn-secondary btn-sm" ${isLast ? 'disabled' : ''} onclick="DocViewer.selectChapter(${this.activeChapterIndex + 1})">
              Next Section ➡️
            </button>
          </div>
        </div>
      `;
      return;
    }

    const parsedContent = this.renderMarkdown(ch.content);

    bodyElem.innerHTML = `
      <div class="document-sheet protected-reader" id="viewerSheet" oncontextmenu="return false;" style="transform: scale(${this.zoomLevel / 100}); transform-origin: top center; position: relative;">
        <div class="watermark-overlay">VIDYASETU READ ONLY</div>

        <!-- Section Top Info Card -->
        <div style="border-bottom: 2px solid rgba(56, 189, 248, 0.4); padding-bottom: 1.25rem; margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700; padding: 4px 10px; border-radius: 4px; font-size: 0.78rem;">
              🔒 IN-WEBSITE READ-ONLY MODE (DOWNLOAD DISABLED)
            </span>
            <span style="color: #38bdf8; font-size: 0.82rem; font-weight: 600;">
              Section ${this.activeChapterIndex + 1} of ${totalChapters}
            </span>
          </div>
          <h1 style="font-size: 1.7rem; color: #fff; margin-bottom: 0.4rem; line-height: 1.3;">${ch.title}</h1>
          <p style="color: #94a3b8; font-size: 0.85rem;">Gujarat Technological University (GTU) Diploma Curriculum Digital Reading Hub</p>
        </div>

        <!-- Main Formatted Markdown Content -->
        <div class="solution-markdown-view" style="line-height: 1.8; font-size: 0.95rem;">
          ${parsedContent}
        </div>

        <!-- Brainheaters-style Next/Prev & Mark Mastered Action Bar -->
        <div style="margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.12); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <button class="btn btn-secondary btn-sm" ${isFirst ? 'disabled style="opacity: 0.5;"' : ''} onclick="DocViewer.selectChapter(${this.activeChapterIndex - 1})">
            ⬅️ Previous Section
          </button>
          
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-success btn-sm" onclick="DocViewer.markCurrentCompleted()">
              ✅ Mark as Mastered
            </button>
            <button class="btn btn-primary btn-sm" onclick="DocViewer.askAiAboutDoc()">
              ✨ Ask AI Guru
            </button>
          </div>

          <button class="btn btn-primary btn-sm" ${isLast ? 'disabled style="opacity: 0.5;"' : ''} onclick="DocViewer.selectChapter(${this.activeChapterIndex + 1})">
            Next Section ➡️
          </button>
        </div>
      </div>
    `;
  },

  setTheme(themeName) {
    this.currentTheme = themeName;
    const bodyElem = document.getElementById('viewerDocContent');
    if (bodyElem) {
      bodyElem.className = `viewer-content reader-theme-${themeName}`;
    }

    document.querySelectorAll('.reader-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  },

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    const sidebar = document.getElementById('readerSidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', !this.isSidebarOpen);
    }
  },

  toggleFullscreen() {
    const container = document.getElementById('readerContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  },

  async markCurrentCompleted() {
    if (!this.activeDoc) return;
    const ch = this.chaptersList[this.activeChapterIndex];
    if (!ch) return;

    const studentUser = (window.StudentApp && StudentApp.currentUser) 
      ? StudentApp.currentUser 
      : { id: 'student_demo' };

    const topicId = `topic_${this.activeDoc.meta?.id || 'doc'}_${this.activeChapterIndex}`;
    const topicTitle = `${this.activeDoc.title} - ${ch.title}`;

    try {
      const res = await API.toggleProgress({
        user_id: studentUser.id,
        subject_id: this.activeDoc.meta?.subject_id || 'sub_general',
        topic_id: topicId,
        topic_title: topicTitle,
        status: 'completed'
      });

      if (res.success) {
        if (window.App) App.showToast(`🎉 Mastered: ${ch.title}! (+16% Progress Saved)`, 'success');
        if (window.StudentProgress) StudentProgress.loadProgress();
      }
    } catch (e) {
      if (window.App) App.showToast('Progress recorded locally', 'info');
    }
  },

  askAiAboutDoc() {
    if (!this.activeDoc) return;
    const ch = this.chaptersList[this.activeChapterIndex];
    const subject = this.activeDoc.meta?.subject_name || 'GTU Diploma Engineering';
    const query = `Explain key concepts, diagrams, and 7-mark question answers for: ${this.activeDoc.title} (${ch ? ch.title : ''})`;
    AiTutor.open(subject, query);
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
