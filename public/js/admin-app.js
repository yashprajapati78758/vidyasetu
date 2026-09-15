// VidyaSetu Dedicated Standalone Admin Control Panel Logic
const AdminApp = {
  currentTab: 'overview',
  stats: null,
  allSubjects: [],
  allBranches: [],
  authToken: localStorage.getItem('vidyasetu_admin_token') || null,
  searchDebounce: null,

  pendingCallerSelectId: null,

  async init() {
    this.checkAuth();
    if (this.authToken) {
      await this.loadInitialData();
    }
  },

  checkAuth() {
    const authOverlay = document.getElementById('adminAuthOverlay');
    if (!this.authToken) {
      if (authOverlay) authOverlay.style.display = 'flex';
    } else {
      if (authOverlay) authOverlay.style.display = 'none';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('authUsername').value.trim();
    const p = document.getElementById('authPassword').value.trim();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();

      if (data.success) {
        this.authToken = data.token;
        localStorage.setItem('vidyasetu_admin_token', data.token);
        document.getElementById('adminAuthOverlay').style.display = 'none';
        if (window.App) App.showToast('Welcome to VidyaSetu Administrator Portal', 'success');
        await this.loadInitialData();
      } else {
        if (window.App) App.showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Login error: ' + err.message, 'error');
    }
  },

  logout() {
    this.authToken = null;
    localStorage.removeItem('vidyasetu_admin_token');
    document.getElementById('adminAuthOverlay').style.display = 'flex';
    if (window.App) App.showToast('Logged out successfully', 'info');
  },

  async loadInitialData() {
    await this.loadStats();
    await this.loadDependencies();
    await this.switchTab(this.currentTab);
  },

  async loadStats() {
    const res = await API.getAdminStats();
    if (res.success && res.data) {
      this.stats = res.data;
      this.renderOverviewStats();
    }
  },

  async loadDependencies() {
    const subRes = await API.getSubjects();
    if (subRes.success) this.allSubjects = subRes.data;

    const bRes = await API.getBranches();
    if (bRes.success) this.allBranches = bRes.data;

    this.populateModalSelects();
  },

  populateModalSelects() {
    this.filterModalSubjects('material');
    this.filterModalSubjects('book');
    this.filterModalSubjects('question');
    this.filterModalSubjects('solution');

    const branchSelect = document.getElementById('modalSubjectBranch');
    if (branchSelect && this.allBranches.length > 0) {
      branchSelect.innerHTML = this.allBranches.map(b => `
        <option value="${b.id}">${b.name} (${b.code})</option>
      `).join('');
    }
  },

  filterModalSubjects(modalType) {
    const branchMap = {
      material: 'filterMaterialBranch',
      book: 'filterBookBranch',
      question: 'filterQuestionBranch',
      solution: 'filterSolutionBranch'
    };
    const semMap = {
      material: 'filterMaterialSem',
      book: 'filterBookSem',
      question: 'filterQuestionSem',
      solution: 'filterSolutionSem'
    };
    const targetMap = {
      material: 'modalMaterialSubject',
      book: 'modalBookSubject',
      question: 'modalQuestionSubject',
      solution: 'modalSolutionSubject'
    };

    const branchFilter = document.getElementById(branchMap[modalType])?.value || 'all';
    const semFilter = document.getElementById(semMap[modalType])?.value || 'all';
    const targetSelect = document.getElementById(targetMap[modalType]);
    if (!targetSelect) return;

    let filtered = this.allSubjects;
    if (branchFilter && branchFilter !== 'all') {
      filtered = filtered.filter(s => s.branch_id === branchFilter);
    }
    if (semFilter && semFilter !== 'all') {
      const sNum = parseInt(semFilter, 10);
      filtered = filtered.filter(s => s.sem_number === sNum);
    }

    if (filtered.length === 0) {
      targetSelect.innerHTML = `<option value="">⚠️ No subjects match filter - Click "➕ Subject Not in List? Add New Subject" above</option>`;
      return;
    }

    // Group subjects by Semester (1 to 6)
    const semGroups = {};
    for (let sem = 1; sem <= 6; sem++) {
      const subs = filtered.filter(s => s.sem_number === sem);
      if (subs.length > 0) semGroups[sem] = subs;
    }

    const htmlOptions = Object.keys(semGroups).map(sem => {
      const subs = semGroups[sem];
      const opts = subs.map(s => {
        const schemeLabel = s.scheme === 'old' || s.subject_code.startsWith('33') ? '📜 Old 33' : '🌟 New 43';
        return `<option value="${s.id}">[Sem ${s.sem_number} • ${schemeLabel}] ${s.subject_code} - ${s.subject_name} (${s.branch_name || s.branch_code})</option>`;
      }).join('');
      return `<optgroup label="━━━ 📅 SEMESTER ${sem} (${subs.length} GTU Subjects) ━━━">${opts}</optgroup>`;
    }).join('');

    targetSelect.innerHTML = htmlOptions;
  },

  openQuickSubjectAdd(callerSelectId) {
    this.pendingCallerSelectId = callerSelectId;
    
    // Determine branch and semester filters from the active modal
    let branchVal = 'ce';
    let semVal = '3';

    if (callerSelectId === 'modalMaterialSubject') {
      const b = document.getElementById('filterMaterialBranch')?.value;
      const s = document.getElementById('filterMaterialSem')?.value;
      if (b && b !== 'all') branchVal = b;
      if (s && s !== 'all') semVal = s;
    } else if (callerSelectId === 'modalBookSubject') {
      const b = document.getElementById('filterBookBranch')?.value;
      const s = document.getElementById('filterBookSem')?.value;
      if (b && b !== 'all') branchVal = b;
      if (s && s !== 'all') semVal = s;
    } else if (callerSelectId === 'modalQuestionSubject') {
      const b = document.getElementById('filterQuestionBranch')?.value;
      const s = document.getElementById('filterQuestionSem')?.value;
      if (b && b !== 'all') branchVal = b;
      if (s && s !== 'all') semVal = s;
    } else if (callerSelectId === 'modalSolutionSubject') {
      const b = document.getElementById('filterSolutionBranch')?.value;
      const s = document.getElementById('filterSolutionSem')?.value;
      if (b && b !== 'all') branchVal = b;
      if (s && s !== 'all') semVal = s;
    }

    const branchSelect = document.getElementById('modalSubjectBranch');
    if (branchSelect && branchVal) branchSelect.value = branchVal;

    const semSelect = document.getElementById('modalSubjectSem');
    if (semSelect && semVal) semSelect.value = semVal;

    // Reset subject inputs
    const codeInput = document.getElementById('modalSubjectCode');
    if (codeInput) codeInput.value = '';
    const nameInput = document.getElementById('modalSubjectName');
    if (nameInput) nameInput.value = '';
    const descInput = document.getElementById('modalSubjectDesc');
    if (descInput) descInput.value = '';

    this.openModal('subjectModal');
  },

  selectAdminSemester(sem) {
    const pills = document.querySelectorAll('.admin-sem-pill');
    pills.forEach(p => {
      p.classList.toggle('active', p.dataset.sem === String(sem));
    });

    const semSelect = document.getElementById('adminSubjectSemFilter');
    if (semSelect) semSelect.value = String(sem);

    const titleEl = document.getElementById('adminSemSummaryTitle');
    const descEl = document.getElementById('adminSemSummaryDesc');
    if (titleEl && descEl) {
      if (sem === 'all') {
        titleEl.textContent = '🏛️ All GTU Diploma Subjects Directory';
        descEl.textContent = 'Organized semester-wise across all 7 engineering branches in database';
      } else {
        titleEl.textContent = `📅 GTU Diploma Semester ${sem} Subjects Directory`;
        descEl.textContent = `Filtered view showing all core, basic science & elective subjects prescribed for Semester ${sem}`;
      }
    }

    this.loadSubjects();
  },

  handleSemDropdownChange() {
    const semVal = document.getElementById('adminSubjectSemFilter')?.value || 'all';
    const pills = document.querySelectorAll('.admin-sem-pill');
    pills.forEach(p => {
      p.classList.toggle('active', p.dataset.sem === String(semVal));
    });

    const titleEl = document.getElementById('adminSemSummaryTitle');
    const descEl = document.getElementById('adminSemSummaryDesc');
    if (titleEl && descEl) {
      if (semVal === 'all') {
        titleEl.textContent = '🏛️ All GTU Diploma Subjects Directory';
        descEl.textContent = 'Organized semester-wise across all 7 engineering branches in database';
      } else {
        titleEl.textContent = `📅 GTU Diploma Semester ${semVal} Subjects Directory`;
        descEl.textContent = `Filtered view showing all subjects prescribed for Semester ${semVal}`;
      }
    }

    this.loadSubjects();
  },

  openSubjectModalWithSem() {
    const currentSem = document.getElementById('adminSubjectSemFilter')?.value;
    const currentBranch = document.getElementById('adminSubjectBranchFilter')?.value;

    const modalSemSelect = document.getElementById('modalSubjectSem');
    if (modalSemSelect && currentSem && currentSem !== 'all') {
      modalSemSelect.value = currentSem;
    }

    const modalBranchSelect = document.getElementById('modalSubjectBranch');
    if (modalBranchSelect && currentBranch && currentBranch !== 'all') {
      modalBranchSelect.value = currentBranch;
    }

    this.openModal('subjectModal');
  },

  handleSubjectCodeInput(e) {
    const code = e.target.value.trim();
    const schemeSelect = document.getElementById('modalSubjectScheme');
    if (schemeSelect && code.length >= 2) {
      if (code.startsWith('33')) {
        schemeSelect.value = 'old';
      } else if (code.startsWith('43')) {
        schemeSelect.value = 'new';
      }
    }
  },

  handleSearch(e) {
    const query = e.target.value.trim();
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.switchTab(this.currentTab, query);
    }, 250);
  },

  handleSubjectSearch(e) {
    const query = e.target.value.trim();
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.loadSubjects(query);
    }, 250);
  },

  async switchTab(tabName, searchQuery = '') {
    this.currentTab = tabName;

    // Update active menu link
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update Header Title
    const headerTitle = document.getElementById('adminHeaderTitle');
    const titles = {
      overview: 'System Overview & Analytics',
      materials: 'Study Materials & Chapter Notes',
      books: 'GTU Textbooks & Reference Guides',
      questions: 'GTU Question Banks (2020-2024)',
      solutions: 'Solved Paper Guides & Step-by-Step Solutions',
      subjects: 'GTU Diploma Subjects Directory',
      students: 'Registered Students & Progress',
      'ai-logs': 'AI Doubt Guru Query Monitor',
      announcements: 'GTU Official Circulars & Broadcasts'
    };
    if (headerTitle) headerTitle.textContent = titles[tabName] || 'Administrator Control';

    // Toggle Section visibility
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const activeSection = document.getElementById(`section-${tabName}`);
    if (activeSection) activeSection.classList.add('active');

    // Load data for specific tab
    if (tabName === 'overview') {
      await this.loadStats();
    } else if (tabName === 'materials') {
      await this.loadMaterials(searchQuery);
    } else if (tabName === 'books') {
      await this.loadBooks(searchQuery);
    } else if (tabName === 'questions') {
      await this.loadQuestions(searchQuery);
    } else if (tabName === 'solutions') {
      await this.loadSolutions(searchQuery);
    } else if (tabName === 'subjects') {
      await this.loadSubjects(searchQuery);
    } else if (tabName === 'students') {
      await this.loadStudents();
    } else if (tabName === 'ai-logs') {
      await this.loadAiLogs();
    } else if (tabName === 'announcements') {
      await this.loadAnnouncements();
    }
  },

  renderOverviewStats() {
    if (!this.stats) return;
    const c = this.stats.counts;

    const setVal = (id, val) => {
      const elem = document.getElementById(id);
      if (elem) elem.textContent = val !== undefined && val !== null ? val : '0';
    };

    setVal('statMatCount', c.materials);
    setVal('statBookCount', c.books);
    setVal('statPaperCount', c.questions);
    setVal('statSolCount', c.solutions);
    setVal('statSubCount', c.subjects);
    setVal('statStudCount', c.students);
    setVal('statAiCount', c.ai_queries);
    setVal('statDownCount', c.total_downloads);

    // Branch stats table in overview
    const branchTable = document.getElementById('overviewBranchStats');
    if (branchTable && this.stats.branch_stats) {
      branchTable.innerHTML = this.stats.branch_stats.map(b => `
        <tr>
          <td><strong style="color: #fff;">${b.name}</strong></td>
          <td><span class="badge-tag badge-blue">Code: ${b.code}</span></td>
          <td>${b.subjects_count} Subjects</td>
          <td>${b.materials_count} Notes</td>
          <td>${b.books_count} Books</td>
          <td>${b.questions_count} Papers</td>
        </tr>
      `).join('');
    }
  },

  // 1. Materials Module
  async loadMaterials(search = '') {
    const tbody = document.getElementById('materialsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading materials...</td></tr>`;

    const res = await API.getMaterials(search ? { search } : {});
    if (res.success && res.data) {
      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No study materials found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(m => `
        <tr>
          <td>#${m.id}</td>
          <td style="font-weight: 600; color: #fff;">${m.title}</td>
          <td><span class="badge-tag badge-purple">${m.subject_code}</span> ${m.subject_name}</td>
          <td>Unit ${m.chapter_no}: ${m.chapter_name || '-'}</td>
          <td>${m.file_size}</td>
          <td>${m.download_count}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteMaterial(${m.id})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  },

  // 2. Books Module
  async loadBooks(search = '') {
    const tbody = document.getElementById('booksTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading books...</td></tr>`;

    const res = await API.getBooks(search ? { search } : {});
    if (res.success && res.data) {
      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No books found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(b => `
        <tr>
          <td><img src="${b.cover_image}" style="width: 36px; height: 48px; border-radius: 4px; object-fit: cover;" alt="Cover"></td>
          <td style="font-weight: 600; color: #fff;">${b.title}</td>
          <td>${b.author}</td>
          <td>${b.publisher}</td>
          <td>${b.subject_name}</td>
          <td>⭐ ${b.rating}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteBook(${b.id})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  },

  // 3. Questions Module
  async loadQuestions(search = '') {
    const tbody = document.getElementById('questionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading question banks...</td></tr>`;

    const res = await API.getQuestionBanks(search ? { search } : {});
    if (res.success && res.data) {
      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No question papers found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(q => `
        <tr>
          <td>#${q.id}</td>
          <td><span class="badge-tag badge-emerald">${q.exam_season} ${q.exam_year}</span></td>
          <td style="font-weight: 600; color: #fff;">${q.title}</td>
          <td>${q.subject_name}</td>
          <td>${q.total_marks}M</td>
          <td>${q.questions_count} Qs</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteQuestion(${q.id})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  },

  // 4. Solutions Module
  async loadSolutions(search = '') {
    const tbody = document.getElementById('solutionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading solved guides...</td></tr>`;

    const res = await API.getSolutions(search ? { search } : {});
    if (res.success && res.data) {
      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">No solved guides found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(s => `
        <tr>
          <td>#${s.id}</td>
          <td style="font-weight: 600; color: #fff;">${s.title}</td>
          <td>${s.subject_name}</td>
          <td>${s.exam_year} (${s.paper_season || 'Winter'})</td>
          <td>${s.verified_by}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteSolution(${s.id})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  },

  // 5. Subjects Module
  async loadSubjects(search = '') {
    const tbody = document.getElementById('subjectsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading GTU subjects...</td></tr>`;

    const branchFilter = document.getElementById('adminSubjectBranchFilter')?.value || 'all';
    const semFilter = document.getElementById('adminSubjectSemFilter')?.value || 'all';
    const schemeFilter = document.getElementById('adminSubjectSchemeFilter')?.value || 'all';
    const searchVal = typeof search === 'string' ? search : (document.getElementById('adminSubjectSearchInput')?.value || '');

    const params = {};
    if (branchFilter && branchFilter !== 'all') params.branch = branchFilter;
    if (semFilter && semFilter !== 'all') params.sem = semFilter;
    if (schemeFilter && schemeFilter !== 'all') params.scheme = schemeFilter;
    if (searchVal.trim()) params.search = searchVal.trim();

    const res = await API.getSubjects(params);
    if (res.success && res.data) {
      const countBadge = document.getElementById('adminSubjectTotalCount');
      if (countBadge) {
        countBadge.textContent = semFilter !== 'all' 
          ? `Semester ${semFilter}: ${res.data.length} Subjects` 
          : `Total: ${res.data.length} Subjects`;
      }

      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2rem;">No subjects match the selected filters.</td></tr>`;
        return;
      }
      tbody.innerHTML = res.data.map(s => {
        const isOld = s.scheme === 'old' || s.subject_code.startsWith('33');
        const schemeBadge = isOld 
          ? `<span class="badge-tag badge-amber" title="GTU Old Teaching Scheme (33-Series)">📜 Old (33)</span>` 
          : `<span class="badge-tag badge-emerald" title="GTU New Teaching Scheme (43-Series)">🌟 New (43)</span>`;

        return `
          <tr>
            <td><span class="badge-tag badge-purple">${s.subject_code}</span></td>
            <td>${schemeBadge}</td>
            <td style="font-weight: 600; color: #fff;">${s.subject_name}</td>
            <td>${s.branch_name}</td>
            <td><span class="badge-tag badge-blue">Sem ${s.sem_number}</span></td>
            <td>${s.credits} Cr</td>
            <td><span style="font-size: 0.8rem; color: #94a3b8;">${s.category}</span></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteSubject('${s.id}')">🗑️ Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  },

  // 6. Registered Students Module
  async loadStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading students list...</td></tr>`;

    try {
      const res = await (await fetch('/api/admin/students')).json();
      if (res.success && res.data) {
        tbody.innerHTML = res.data.map(st => `
          <tr>
            <td><strong style="color: #fff;">${st.name}</strong></td>
            <td><span class="badge-tag badge-amber">${st.enrollment_no}</span></td>
            <td>${st.email}</td>
            <td>${st.branch_name || 'Computer Engg'} (Sem ${st.semester})</td>
            <td><span class="badge-tag badge-emerald">${st.completed_topics} Topics Mastered</span></td>
            <td>${new Date(st.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      }
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: #ef4444; text-align: center;">Failed to load students.</td></tr>`;
    }
  },

  // 7. AI Query Monitor Module
  async loadAiLogs() {
    const tbody = document.getElementById('aiLogsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading AI doubt query logs...</td></tr>`;

    try {
      const res = await (await fetch('/api/admin/ai-logs')).json();
      if (res.success && res.data) {
        if (res.data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 2rem;">No student doubts logged yet.</td></tr>`;
          return;
        }

        tbody.innerHTML = res.data.map(log => `
          <tr>
            <td>#${log.id}</td>
            <td><span class="badge-tag badge-blue">${log.subject_name || 'General'}</span></td>
            <td style="font-weight: 600; color: #fff; max-width: 300px;">${log.query}</td>
            <td><span class="badge-tag badge-emerald">${log.category || 'Concept'}</span></td>
            <td>${new Date(log.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="color: #ef4444; text-align: center;">Failed to load AI logs.</td></tr>`;
    }
  },

  // 8. Announcements Module
  async loadAnnouncements() {
    const tbody = document.getElementById('announcementsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #38bdf8; padding: 2rem;">Loading circulars...</td></tr>`;

    const res = await API.getAnnouncements();
    if (res.success && res.data) {
      tbody.innerHTML = res.data.map(a => `
        <tr>
          <td><span class="badge-tag badge-amber">${a.category}</span></td>
          <td style="font-weight: 600; color: #fff;">${a.title}</td>
          <td>${a.is_pinned ? '📌 Pinned on Top' : 'Normal'}</td>
          <td>${new Date(a.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteAnnouncement(${a.id})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    }
  },

  // Modals
  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      m.classList.add('active');
      if (modalId === 'materialModal') this.filterModalSubjects('material');
      if (modalId === 'bookModal') this.filterModalSubjects('book');
      if (modalId === 'questionModal') this.filterModalSubjects('question');
      if (modalId === 'solutionModal') this.filterModalSubjects('solution');
    }
  },

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  },

  // File Selection Helper
  handleFileSelect(event, textElemId, sizeElemId) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const textElem = document.getElementById(textElemId);
      const sizeElem = sizeElemId ? document.getElementById(sizeElemId) : null;
      
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      if (textElem) {
        textElem.innerHTML = `✅ <strong style="color: #34d399;">${file.name}</strong> <span style="color: #38bdf8; font-size: 0.8rem;">(${sizeMb})</span>`;
      }
      if (sizeElem) {
        sizeElem.value = sizeMb;
      }

      const dropzone = event.target.closest('.file-upload-dropzone');
      if (dropzone) dropzone.classList.add('has-file');
    }
  },

  // CRUD Submissions
  async handleCreateMaterial(e) {
    e.preventDefault();
    const btn = document.getElementById('modalMaterialSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Uploading Document & Saving...';
    }

    try {
      let fileUrl = 'https://vidyasetu.gtu.ac.in/docs/sample.pdf';
      let fileSize = document.getElementById('modalMaterialSize').value || '3.5 MB';
      let fileType = 'PDF';

      const fileInput = document.getElementById('modalMaterialFile');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        if (uploadRes.success && uploadRes.data) {
          fileUrl = uploadRes.data.file_url;
          fileSize = uploadRes.data.file_size;
          fileType = uploadRes.data.file_type;
        } else {
          throw new Error(uploadRes.error || 'Failed to upload document file');
        }
      }

      const data = {
        subject_id: document.getElementById('modalMaterialSubject').value,
        title: document.getElementById('modalMaterialTitle').value,
        chapter_no: parseInt(document.getElementById('modalMaterialChapterNo').value, 10) || 1,
        chapter_name: document.getElementById('modalMaterialChapterName').value,
        file_size: fileSize,
        file_type: fileType,
        author: document.getElementById('modalMaterialAuthor').value,
        description: document.getElementById('modalMaterialDesc').value,
        file_url: fileUrl
      };

      const res = await API.createMaterial(data);
      if (res.success) {
        if (window.App) App.showToast('Study Material & Document saved to database!', 'success');
        this.closeModal('materialModal');
        await this.loadStats();
        await this.loadMaterials();
      } else {
        if (window.App) App.showToast(res.error || 'Failed to add material', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Upload Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Upload & Save to Database';
      }
    }
  },

  async handleCreateBook(e) {
    e.preventDefault();
    const btn = document.getElementById('modalBookSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Uploading Textbook...';
    }

    try {
      let fileUrl = 'https://vidyasetu.gtu.ac.in/books/sample.pdf';
      let fileSize = '12.5 MB';

      const fileInput = document.getElementById('modalBookFile');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        if (uploadRes.success && uploadRes.data) {
          fileUrl = uploadRes.data.file_url;
          fileSize = uploadRes.data.file_size;
        }
      }

      const data = {
        subject_id: document.getElementById('modalBookSubject').value,
        title: document.getElementById('modalBookTitle').value,
        author: document.getElementById('modalBookAuthor').value,
        publisher: document.getElementById('modalBookPublisher').value,
        edition: document.getElementById('modalBookEdition').value,
        cover_image: document.getElementById('modalBookCover').value,
        file_size: fileSize,
        file_url: fileUrl
      };

      const res = await API.createBook(data);
      if (res.success) {
        if (window.App) App.showToast('Textbook uploaded and saved to database!', 'success');
        this.closeModal('bookModal');
        await this.loadStats();
        await this.loadBooks();
      } else {
        if (window.App) App.showToast(res.error || 'Failed to add book', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Book upload failed: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '📚 Save Book to Catalog';
      }
    }
  },

  async handleCreateQuestion(e) {
    e.preventDefault();
    const btn = document.getElementById('modalQuestionSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Uploading Paper...';
    }

    try {
      let fileUrl = 'https://vidyasetu.gtu.ac.in/papers/sample.pdf';

      const fileInput = document.getElementById('modalQuestionFile');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        if (uploadRes.success && uploadRes.data) {
          fileUrl = uploadRes.data.file_url;
        }
      }

      const data = {
        subject_id: document.getElementById('modalQuestionSubject').value,
        title: document.getElementById('modalQuestionTitle').value,
        exam_year: document.getElementById('modalQuestionYear').value,
        exam_season: document.getElementById('modalQuestionSeason').value,
        total_marks: parseInt(document.getElementById('modalQuestionMarks').value, 10) || 70,
        questions_count: parseInt(document.getElementById('modalQuestionCount').value, 10) || 14,
        description: document.getElementById('modalQuestionDesc').value,
        file_url: fileUrl
      };

      const res = await API.createQuestionBank(data);
      if (res.success) {
        if (window.App) App.showToast('Question Paper uploaded & saved to database!', 'success');
        this.closeModal('questionModal');
        await this.loadStats();
        await this.loadQuestions();
      } else {
        if (window.App) App.showToast(res.error || 'Failed to add question paper', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Question upload failed: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '❓ Upload & Save Question Paper';
      }
    }
  },

  async handleCreateSolution(e) {
    e.preventDefault();
    const btn = document.getElementById('modalSolutionSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Saving Solution...';
    }

    try {
      let fileUrl = null;
      const fileInput = document.getElementById('modalSolutionFile');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        if (uploadRes.success && uploadRes.data) {
          fileUrl = uploadRes.data.file_url;
        }
      }

      const data = {
        subject_id: document.getElementById('modalSolutionSubject').value,
        title: document.getElementById('modalSolutionTitle').value,
        exam_year: document.getElementById('modalSolutionYear').value,
        paper_season: document.getElementById('modalSolutionSeason').value,
        solution_content: document.getElementById('modalSolutionContent').value || 'Detailed step-by-step solution attached in digital reading format.',
        key_formulas: document.getElementById('modalSolutionFormulas').value,
        verified_by: document.getElementById('modalSolutionVerified').value,
        file_url: fileUrl
      };

      const res = await API.createSolution(data);
      if (res.success) {
        if (window.App) App.showToast('Solved Paper Guide saved to database!', 'success');
        this.closeModal('solutionModal');
        await this.loadStats();
        await this.loadSolutions();
      } else {
        if (window.App) App.showToast(res.error || 'Failed to publish solution', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Solution publish failed: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💡 Publish Solution to Database';
      }
    }
  },

  async handleCreateSubject(e) {
    e.preventDefault();
    const branchId = document.getElementById('modalSubjectBranch').value;
    const semNum = parseInt(document.getElementById('modalSubjectSem').value, 10);
    const scheme = document.getElementById('modalSubjectScheme').value;
    const subCode = document.getElementById('modalSubjectCode').value.trim();
    const subName = document.getElementById('modalSubjectName').value.trim();

    const data = {
      branch_id: branchId,
      sem_number: semNum,
      scheme: scheme,
      subject_code: subCode,
      subject_name: subName,
      credits: parseInt(document.getElementById('modalSubjectCredits').value, 10) || 4,
      category: document.getElementById('modalSubjectCategory').value,
      description: document.getElementById('modalSubjectDesc').value
    };

    const res = await API.createSubject(data);
    if (res.success) {
      if (window.App) App.showToast(`GTU Subject (${subCode}) created for Semester ${semNum}!`, 'success');
      this.closeModal('subjectModal');
      await this.loadStats();
      await this.loadDependencies();
      await this.loadSubjects();

      // If opened from an upload modal, re-filter and auto-select the newly created subject!
      if (this.pendingCallerSelectId) {
        const callerId = this.pendingCallerSelectId;
        const modalTypeMap = {
          modalMaterialSubject: 'material',
          modalBookSubject: 'book',
          modalQuestionSubject: 'question',
          modalSolutionSubject: 'solution'
        };
        const modalType = modalTypeMap[callerId];
        if (modalType) {
          // Adjust modal filters to match the new subject so it is immediately visible in the dropdown
          const branchFilterEl = document.getElementById(`filter${modalType.charAt(0).toUpperCase() + modalType.slice(1)}Branch`);
          const semFilterEl = document.getElementById(`filter${modalType.charAt(0).toUpperCase() + modalType.slice(1)}Sem`);
          if (branchFilterEl) branchFilterEl.value = branchId;
          if (semFilterEl) semFilterEl.value = String(semNum);

          this.filterModalSubjects(modalType);
        } else {
          this.populateModalSelects();
        }

        const callerEl = document.getElementById(callerId);
        if (callerEl && res.id) {
          callerEl.value = res.id;
        }
        this.pendingCallerSelectId = null;
      }
    } else {
      if (window.App) App.showToast(res.error || 'Failed to add subject', 'error');
    }
  },

  async handleCreateAnnouncement(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById('modalAnnounceTitle').value,
      category: document.getElementById('modalAnnounceCategory').value,
      content: document.getElementById('modalAnnounceContent').value,
      is_pinned: document.getElementById('modalAnnouncePinned').checked
    };

    const res = await API.createAnnouncement(data);
    if (res.success) {
      if (window.App) App.showToast('Notice published to all students!', 'success');
      this.closeModal('announcementModal');
      await this.loadAnnouncements();
    } else {
      if (window.App) App.showToast(res.error || 'Failed to publish circular', 'error');
    }
  },

  // Delete Methods
  async deleteMaterial(id) {
    if (confirm('Delete this study material?')) {
      const res = await API.deleteMaterial(id);
      if (res.success) {
        if (window.App) App.showToast('Material deleted', 'success');
        this.loadStats();
        this.loadMaterials();
      }
    }
  },

  async deleteBook(id) {
    if (confirm('Delete this book?')) {
      const res = await API.deleteBook(id);
      if (res.success) {
        if (window.App) App.showToast('Book deleted', 'success');
        this.loadStats();
        this.loadBooks();
      }
    }
  },

  async deleteQuestion(id) {
    if (confirm('Delete this question paper?')) {
      const res = await API.deleteQuestionBank(id);
      if (res.success) {
        if (window.App) App.showToast('Question Bank deleted', 'success');
        this.loadStats();
        this.loadQuestions();
      }
    }
  },

  async deleteSolution(id) {
    if (confirm('Delete this solution?')) {
      const res = await API.deleteSolution(id);
      if (res.success) {
        if (window.App) App.showToast('Solution deleted', 'success');
        this.loadStats();
        this.loadSolutions();
      }
    }
  },

  async deleteSubject(id) {
    if (confirm('Delete this subject and all its related materials?')) {
      const res = await API.deleteSubject(id);
      if (res.success) {
        if (window.App) App.showToast('Subject deleted', 'success');
        this.loadStats();
        this.loadDependencies();
        this.loadSubjects();
      }
    }
  },

  async deleteAnnouncement(id) {
    if (confirm('Delete this notice?')) {
      const res = await API.deleteAnnouncement(id);
      if (res.success) {
        if (window.App) App.showToast('Notice deleted', 'success');
        this.loadAnnouncements();
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});
