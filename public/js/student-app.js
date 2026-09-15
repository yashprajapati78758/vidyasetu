// VidyaSetu Dedicated Student Portal Application Controller (Course-Locked & Strict Read-Only Mode)
const StudentApp = {
  currentTab: 'home',
  activeBranch: 'ce',
  activeSem: 3,
  activeScheme: 'new',
  activeSubjectId: null,
  activeResourceTab: 'materials',
  branchesList: [],
  subjectsList: [],
  currentUser: JSON.parse(localStorage.getItem('vidyasetu_student_user') || 'null'),
  authToken: localStorage.getItem('vidyasetu_student_token') || null,

  // Resource Caches for robust modal opening without string escaping bugs
  materialsMap: {},
  booksMap: {},
  questionsMap: {},
  solutionsMap: {},

  async init() {
    this.bindEvents();
    await this.syncAuthState();
    await this.loadAnnouncements();
  },

  async syncAuthState() {
    const gatewaySection = document.getElementById('studentAuthGatewaySection');
    const mainWrapper = document.getElementById('studentAppMainWrapper');
    const navLinks = document.getElementById('studentNavLinks');
    const floatingAiBtn = document.getElementById('floatingAiBtn');

    if (this.currentUser && this.authToken) {
      // Authenticated Student View -> Show Full Dashboard
      if (gatewaySection) gatewaySection.style.display = 'none';
      if (mainWrapper) mainWrapper.style.display = 'block';
      if (navLinks) navLinks.style.display = 'flex';
      if (floatingAiBtn) floatingAiBtn.style.display = 'flex';

      if (this.currentUser.branch_id) this.activeBranch = this.currentUser.branch_id;
      if (this.currentUser.semester) this.activeSem = parseInt(this.currentUser.semester, 10);

      this.renderNavAuth();
      this.renderEnrolledBanner();
      this.updateSemesterTabUI(this.activeSem);

      await this.loadBranches();
      await this.loadSubjects();
      if (window.StudentProgress) await StudentProgress.init();
      if (window.AiTutor) AiTutor.init();
    } else {
      // Unauthenticated Guest View -> Show Dedicated Login & Register Gateway Screen First
      if (gatewaySection) gatewaySection.style.display = 'flex';
      if (mainWrapper) mainWrapper.style.display = 'none';
      if (navLinks) navLinks.style.display = 'none';
      if (floatingAiBtn) floatingAiBtn.style.display = 'none';

      this.renderNavAuth();
      this.switchGatewayTab('signin');
    }
  },

  renderNavAuth() {
    const navAuthContainer = document.getElementById('studentNavAuth');
    if (!navAuthContainer) return;

    if (this.currentUser) {
      const branchDisplay = (this.currentUser.branch_code || this.currentUser.branch_id || 'CE').toUpperCase();
      navAuthContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="student-profile-badge" onclick="StudentApp.openProfileDetails()" title="Click to view & manage course profile">
            <img src="${this.currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="Student">
            <div style="line-height: 1.2;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #fff;">${this.currentUser.name}</div>
              <div style="font-size: 0.68rem; color: #38bdf8;">${branchDisplay} • Sem ${this.currentUser.semester}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="StudentApp.logoutStudent()" title="Sign Out" style="padding: 6px 10px; font-size: 0.78rem;">
            🚪 Logout
          </button>
          <a href="/admin" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 6px 10px;">
            <span>⚙️</span> Admin
          </a>
        </div>
      `;
    } else {
      navAuthContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="btn btn-primary btn-sm" onclick="StudentApp.switchGatewayTab('signin')" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
            🔑 Sign In
          </button>
          <button class="btn btn-secondary btn-sm" onclick="StudentApp.switchGatewayTab('register')" style="font-size: 0.82rem; padding: 6px 12px; font-weight: 600;">
            📝 Register
          </button>
          <a href="/admin" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 6px 10px;">
            <span>⚙️</span> Admin
          </a>
        </div>
      `;
    }
  },

  renderEnrolledBanner() {
    const bannerContainer = document.getElementById('studentEnrolledBannerWrap');
    if (!bannerContainer || !this.currentUser) return;

    const u = this.currentUser;
    const univ = u.university || 'Gujarat Technological University (GTU)';
    const course = u.course_type || 'Diploma in Engineering';
    const branchName = u.branch_name || 'Computer Engineering';
    const branchCode = u.branch_code ? `(${u.branch_code})` : '';
    const sem = u.semester || 1;
    const nextSem = sem < 6 ? sem + 1 : null;

    bannerContainer.innerHTML = `
      <div class="enrolled-course-banner">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
            <span class="lock-badge">🔒 Enrolled Curriculum Active</span>
            <span style="font-size: 0.8rem; color: #94a3b8;">${univ}</span>
          </div>
          <h3 style="font-size: 1.25rem; color: #fff; margin: 0; font-weight: 800;">
            🎓 ${course} — <span style="color: #38bdf8;">${branchName} ${branchCode}</span>
          </h3>
          <div class="enrolled-info-meta">
            <span class="enrolled-chip active-sem">📍 Current: Semester ${sem}</span>
            <span class="enrolled-chip">👤 ${u.name} (Enrollment: ${u.enrollment_no || 'GTU'})</span>
            <span class="enrolled-chip" style="color: #a5b4fc;">📚 Scheme: 43-Series & 33-Series</span>
          </div>
        </div>
        <div class="enrolled-actions">
          ${nextSem ? `
            <button class="btn btn-primary btn-sm" onclick="StudentApp.quickPromoteSemester(${nextSem})" title="Promote to Semester ${nextSem}">
              ⚡ Promote to Sem ${nextSem}
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="StudentApp.openProfileDetails()">
            ⚙️ Manage Academic Course
          </button>
        </div>
      </div>
    `;
  },

  updateSemesterTabUI(semNum) {
    document.querySelectorAll('.sem-tab-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.sem, 10) === semNum);
    });
  },

  switchGatewayTab(tab) {
    const btnSignIn = document.getElementById('gatewayTabBtnSignIn');
    const btnRegister = document.getElementById('gatewayTabBtnRegister');
    const formSignIn = document.getElementById('formGatewaySignIn');
    const formRegister = document.getElementById('formGatewayRegister');

    if (tab === 'signin') {
      if (btnSignIn) btnSignIn.classList.add('active');
      if (btnRegister) btnRegister.classList.remove('active');
      if (formSignIn) formSignIn.style.display = 'flex';
      if (formRegister) formRegister.style.display = 'none';
    } else {
      if (btnSignIn) btnSignIn.classList.remove('active');
      if (btnRegister) btnRegister.classList.add('active');
      if (formSignIn) formSignIn.style.display = 'none';
      if (formRegister) formRegister.style.display = 'flex';
    }

    // If unauthenticated, smoothly scroll to auth card
    const gatewaySection = document.getElementById('studentAuthGatewaySection');
    if (gatewaySection && gatewaySection.style.display !== 'none') {
      const card = document.querySelector('.gateway-auth-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  fillGatewayDemoCredentials() {
    const identInput = document.getElementById('gatewayLoginIdentifier');
    const passInput = document.getElementById('gatewayLoginPassword');
    if (identInput) identInput.value = '226170307001';
    if (passInput) passInput.value = 'student123';
    if (window.App) App.showToast('Demo GTU student credentials filled!', 'info');
  },

  async handleGatewayLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnGatewayLoginSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Signing in...';
    }

    try {
      const identifier = document.getElementById('gatewayLoginIdentifier').value.trim();
      const password = document.getElementById('gatewayLoginPassword').value.trim();

      const res = await API.loginStudent({ identifier, password });
      if (res.success && res.user) {
        this.currentUser = res.user;
        this.authToken = res.token;
        localStorage.setItem('vidyasetu_student_user', JSON.stringify(res.user));
        localStorage.setItem('vidyasetu_student_token', res.token);

        await this.syncAuthState();
        if (window.App) App.showToast(`Welcome back, ${res.user.name}! Locked to ${res.user.branch_name} (Sem ${this.activeSem})`, 'success');
      } else {
        if (window.App) App.showToast(res.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Login Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Sign In & Unlock My Course';
      }
    }
  },

  async handleGatewayRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btnGatewayRegSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Registering course...';
    }

    try {
      const university = document.getElementById('gatewayRegUniversity').value;
      const course_type = document.getElementById('gatewayRegCourse').value;
      const branch_id = document.getElementById('gatewayRegBranch').value;
      const semester = parseInt(document.getElementById('gatewayRegSem').value, 10);
      const name = document.getElementById('gatewayRegName').value.trim();
      const enrollment_no = document.getElementById('gatewayRegEnrollment').value.trim();
      const email = document.getElementById('gatewayRegEmail').value.trim();
      const password = document.getElementById('gatewayRegPassword').value.trim();

      const res = await API.registerStudent({
        university,
        course_type,
        branch_id,
        semester,
        name,
        enrollment_no,
        email,
        password
      });

      if (res.success && res.user) {
        this.currentUser = res.user;
        this.authToken = res.token;
        localStorage.setItem('vidyasetu_student_user', JSON.stringify(res.user));
        localStorage.setItem('vidyasetu_student_token', res.token);

        await this.syncAuthState();
        if (window.App) App.showToast(`Account registered! Welcome to ${course_type} (${res.user.branch_name} Sem ${semester})`, 'success');
      } else {
        if (window.App) App.showToast(res.error || 'Registration failed', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Registration Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🎓 Register & Access My Course';
      }
    }
  },

  async logoutStudent() {
    this.currentUser = null;
    this.authToken = null;
    localStorage.removeItem('vidyasetu_student_user');
    localStorage.removeItem('vidyasetu_student_token');
    await this.syncAuthState();
    if (window.App) App.showToast('Logged out. Please sign in to access student portal.', 'info');
  },

  openProfileDetails() {
    if (!this.currentUser) {
      this.switchGatewayTab('signin');
      return;
    }

    const modal = document.getElementById('studentProfileModal');
    const view = document.getElementById('profileDetailsView');
    const semSelect = document.getElementById('profileEditSemester');

    if (view) {
      const u = this.currentUser;
      view.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; background: rgba(10,15,29,0.7); padding: 1rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.08);">
          <img src="${u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" alt="Avatar">
          <div>
            <h3 style="color: #fff; font-size: 1.1rem; margin: 0;">${u.name}</h3>
            <p style="color: #38bdf8; font-size: 0.8rem; margin: 2px 0 0 0;">GTU Enrollment: <strong>${u.enrollment_no}</strong></p>
            <p style="color: #94a3b8; font-size: 0.75rem; margin: 2px 0 0 0;">${u.email}</p>
          </div>
        </div>

        <div style="background: rgba(10,15,29,0.5); padding: 0.9rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.08); font-size: 0.85rem; line-height: 1.6;">
          <div>🏛️ <strong>University:</strong> <span style="color: #e2e8f0;">${u.university || 'Gujarat Technological University (GTU)'}</span></div>
          <div>📚 <strong>Course:</strong> <span style="color: #e2e8f0;">${u.course_type || 'Diploma in Engineering'}</span></div>
          <div>💻 <strong>Branch:</strong> <span style="color: #38bdf8;">${u.branch_name || 'Engineering'} (${u.branch_code || u.branch_id})</span></div>
          <div>📅 <strong>Active Semester:</strong> <span style="color: #34d399; font-weight: 700;">Semester ${u.semester}</span></div>
        </div>
      `;
    }

    if (semSelect) {
      semSelect.value = this.currentUser.semester || 1;
    }

    if (modal) modal.classList.add('active');
  },

  closeProfileModal() {
    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.classList.remove('active');
  },

  async handleProfileUpdate(e) {
    e.preventDefault();
    if (!this.currentUser) return;

    const btn = document.getElementById('btnProfileSaveSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Updating...';
    }

    try {
      const newSem = parseInt(document.getElementById('profileEditSemester').value, 10);
      const res = await API.updateStudentProfile({
        user_id: this.currentUser.id,
        semester: newSem
      });

      if (res.success && res.user) {
        this.currentUser = res.user;
        localStorage.setItem('vidyasetu_student_user', JSON.stringify(res.user));
        this.activeSem = newSem;

        this.closeProfileModal();
        this.renderNavAuth();
        this.renderEnrolledBanner();
        this.updateSemesterTabUI(this.activeSem);
        await this.loadSubjects();
        if (window.StudentProgress) await StudentProgress.loadProgress(this.activeSem);

        if (window.App) App.showToast(`Updated! You are now viewing Semester ${newSem} curriculum.`, 'success');
      } else {
        if (window.App) App.showToast(res.error || 'Failed to update semester', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Profile Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Update & Save Academic Progress';
      }
    }
  },

  async quickPromoteSemester(targetSem) {
    if (!this.currentUser) return;
    try {
      const res = await API.updateStudentProfile({
        user_id: this.currentUser.id,
        semester: targetSem
      });

      if (res.success && res.user) {
        this.currentUser = res.user;
        localStorage.setItem('vidyasetu_student_user', JSON.stringify(res.user));
        this.activeSem = targetSem;

        this.renderNavAuth();
        this.renderEnrolledBanner();
        this.updateSemesterTabUI(this.activeSem);
        await this.loadSubjects();
        if (window.StudentProgress) await StudentProgress.loadProgress(this.activeSem);

        if (window.App) App.showToast(`🎉 Promoted to Semester ${targetSem}! Loaded new subjects.`, 'success');
      }
    } catch (err) {
      if (window.App) App.showToast('Promotion Error: ' + err.message, 'error');
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('studentGlobalSearch');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.loadSubjects(e.target.value.trim());
        }, 300);
      });
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    const sections = ['homeSection', 'subjectHubSection', 'progressSection'];
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = 'none';
    });

    if (tabName === 'home') {
      const el = document.getElementById('homeSection');
      if (el) el.style.display = 'block';
    } else if (tabName === 'subject-hub') {
      const el = document.getElementById('subjectHubSection');
      if (el) el.style.display = 'block';
    } else if (tabName === 'progress') {
      const el = document.getElementById('progressSection');
      if (el) {
        el.style.display = 'block';
        if (window.StudentProgress) StudentProgress.loadProgress(this.activeSem);
      }
    } else if (tabName === 'ai-guru') {
      AiTutor.open();
    }
  },

  async loadBranches() {
    // Branches cache for profile dropdown
    const res = await API.getBranches();
    if (res.success && res.data) {
      this.branchesList = res.data;
    }
  },

  async selectBranch(branchId) {
    // Strictly preserve enrolled student branch
    if (this.currentUser && this.currentUser.branch_id) {
      this.activeBranch = this.currentUser.branch_id;
    } else {
      this.activeBranch = branchId;
    }
    await this.loadSubjects();
  },

  async selectSemester(semNum) {
    this.activeSem = semNum;
    this.updateSemesterTabUI(semNum);
    await this.loadSubjects();
    if (window.StudentProgress) StudentProgress.loadProgress(semNum);
  },

  async selectScheme(scheme) {
    this.activeScheme = scheme;

    document.querySelectorAll('.scheme-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scheme === scheme);
    });

    await this.loadSubjects();
  },

  async loadSubjects(search = '') {
    const container = document.getElementById('studentSubjectsGrid');
    if (container) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #38bdf8; padding: 2rem;">Loading subjects for your enrolled course...</div>`;
    }

    // Strictly lock branch to the authenticated student's enrolled branch
    if (this.currentUser && this.currentUser.branch_id) {
      this.activeBranch = this.currentUser.branch_id;
    }

    const branchName = (this.currentUser && this.currentUser.branch_name) 
      ? this.currentUser.branch_name 
      : (this.activeBranch === 'ce' ? 'Computer Engineering' : this.activeBranch.toUpperCase());

    const titleEl = document.getElementById('studentSubjectsHeaderTitle');
    const subEl = document.getElementById('studentSubjectsHeaderSub');
    if (titleEl) {
      titleEl.innerHTML = `<span>📚</span> ${branchName} • Semester ${this.activeSem} Subjects`;
    }
    if (subEl) {
      subEl.textContent = `Strictly showing verified syllabus & study materials for your enrolled course (${branchName}).`;
    }

    const semSubEl = document.getElementById('enrolledSemHeaderSub');
    if (semSubEl) {
      semSubEl.textContent = `Showing Semester ${this.activeSem} curriculum for ${branchName}`;
    }

    const params = {
      branch: this.activeBranch,
      sem: this.activeSem
    };
    if (this.activeScheme && this.activeScheme !== 'all') {
      params.scheme = this.activeScheme;
    }
    if (search) params.search = search;

    const res = await API.getSubjects(params);
    if (res.success && res.data) {
      this.subjectsList = res.data;
      this.renderSubjects();
    }
  },

  renderSubjects() {
    const container = document.getElementById('studentSubjectsGrid');
    if (!container) return;

    if (this.subjectsList.length === 0) {
      const schemeName = this.activeScheme === 'old' ? 'Old Scheme (33-Series)' : 'New Scheme (43-Series)';
      const branchName = (this.currentUser && this.currentUser.branch_name) || 'Enrolled Course';
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed rgba(255,255,255,0.15);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📚</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No subjects found for ${schemeName} in Semester ${this.activeSem} (${branchName})</h3>
          <p style="font-size: 0.95rem; color: #94a3b8; max-width: 500px; margin: 0 auto 1.5rem auto;">
            Try switching to <strong>All Schemes</strong> or browse another semester for your enrolled course.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="StudentApp.selectScheme('all')">View All Schemes</button>
            <button class="btn btn-secondary btn-sm" onclick="StudentApp.selectSemester(${this.currentUser ? this.currentUser.semester : 3})">Return to Enrolled Semester</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.subjectsList.map(sub => {
      const isOld = sub.scheme === 'old' || sub.subject_code.startsWith('33');
      const schemeBadge = isOld
        ? `<span class="badge-scheme old" title="GTU Old Teaching Scheme (33-Series)">📜 Old (33)</span>`
        : `<span class="badge-scheme new" title="GTU New Teaching Scheme (43-Series)">🌟 New (43)</span>`;

      return `
        <div class="subject-card">
          <div>
            <div class="subject-header">
              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                <span class="subject-code-badge">${sub.subject_code}</span>
                ${schemeBadge}
              </div>
              <span class="subject-credits">Sem ${sub.sem_number} • ${sub.credits} Cr</span>
            </div>
            <h3 class="subject-title">${sub.subject_name}</h3>
            <div style="font-size: 0.78rem; color: #38bdf8; margin-bottom: 0.5rem;">Category: ${sub.category || 'Core Engineering'}</div>
            <p class="subject-desc">${sub.description || 'GTU diploma official syllabus, chapter notes, textbooks, past papers & solved solutions.'}</p>
          </div>

          <div>
            <div class="subject-stats-bar">
              <div>
                <div class="sub-stat-num">${sub.materials_count || 0}</div>
                <div class="sub-stat-lbl">Notes</div>
              </div>
              <div>
                <div class="sub-stat-num">${sub.books_count || 0}</div>
                <div class="sub-stat-lbl">Books</div>
              </div>
              <div>
                <div class="sub-stat-num">${sub.questions_count || 0}</div>
                <div class="sub-stat-lbl">Papers</div>
              </div>
              <div>
                <div class="sub-stat-num">${sub.solutions_count || 0}</div>
                <div class="sub-stat-lbl">Solved</div>
              </div>
            </div>

            <div class="subject-actions">
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="StudentApp.openSubjectHub('${sub.id}')">
                📚 Open Subject Hub
              </button>
              <button class="btn btn-secondary btn-sm" onclick="StudentApp.askSubjectDoubt('${sub.id}')" title="Ask AI Doubt Guru">
                ✨ AI Doubt
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  askSubjectDoubt(subjectId) {
    const sub = this.subjectsList.find(s => s.id === subjectId);
    const subName = sub ? sub.subject_name : 'Diploma Engineering';
    AiTutor.open(subName);
  },

  async openSubjectHub(subjectId) {
    this.activeSubjectId = subjectId;
    const res = await API.getSubjectById(subjectId);
    if (!res.success || !res.data) {
      if (window.App) App.showToast('Failed to load subject details', 'error');
      return;
    }

    const sub = res.data;
    this.switchTab('subject-hub');

    const titleEl = document.getElementById('hubSubjectTitle');
    const codeEl = document.getElementById('hubSubjectCode');
    const branchEl = document.getElementById('hubSubjectBranch');
    const descEl = document.getElementById('hubSubjectDesc');

    const isOld = sub.scheme === 'old' || sub.subject_code.startsWith('33');
    const schemeText = isOld ? '📜 GTU Old Scheme (33-Series)' : '🌟 GTU New Scheme (43-Series)';

    if (titleEl) titleEl.textContent = sub.subject_name;
    if (codeEl) codeEl.innerHTML = `GTU Code: <strong>${sub.subject_code}</strong> <span style="margin-left: 0.5rem; font-size: 0.75rem; color: ${isOld ? '#fbbf24' : '#34d399'};">(${schemeText})</span>`;
    if (branchEl) branchEl.textContent = `${sub.branch_name} • Semester ${sub.sem_number} • ${sub.category || 'Core'}`;
    if (descEl) descEl.textContent = sub.description || '';

    await this.switchResourceTab(this.activeResourceTab);
  },

  async switchResourceTab(tab) {
    this.activeResourceTab = tab;

    document.querySelectorAll('.resource-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const container = document.getElementById('studentResourceGrid');
    if (!container) return;

    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #38bdf8; padding: 2rem;">Loading ${tab}...</div>`;

    if (tab === 'materials') {
      const res = await API.getMaterials({ subject_id: this.activeSubjectId });
      this.renderMaterials(res.data || []);
    } else if (tab === 'books') {
      const res = await API.getBooks({ subject_id: this.activeSubjectId });
      this.renderBooks(res.data || []);
    } else if (tab === 'questions') {
      const res = await API.getQuestionBanks({ subject_id: this.activeSubjectId });
      this.renderQuestions(res.data || []);
    } else if (tab === 'solutions') {
      const res = await API.getSolutions({ subject_id: this.activeSubjectId });
      this.renderSolutions(res.data || []);
    } else if (tab === 'cram') {
      this.renderCramKit();
    } else if (tab === 'quiz') {
      this.renderQuiz();
    }
  },

  renderMaterials(materials) {
    const container = document.getElementById('studentResourceGrid');
    this.materialsMap = {};

    if (materials.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No study materials uploaded for this subject yet.</p>`;
      return;
    }

    materials.forEach(m => { this.materialsMap[m.id] = m; });

    container.innerHTML = materials.map(m => `
      <div class="material-card">
        <div>
          <span class="mat-badge">Chapter ${m.chapter_no}: ${m.chapter_name || 'Notes'}</span>
          <h4 class="mat-title">${m.title}</h4>
          <p class="mat-desc">${m.description || 'Verified lecture notes and formula breakdown.'}</p>
        </div>
        <div>
          <div class="mat-meta">
            <span>✍️ ${m.author || 'GTU Faculty'}</span>
            <span>💾 ${m.file_size || '3.2 MB'} • 🔒 Read-Only</span>
          </div>
          <div class="mat-actions">
            <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="StudentApp.openMaterialViewer(${m.id})">
              👁️ Read Notes (In-Browser)
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openMaterialViewer(id) {
    const m = this.materialsMap[id];
    if (!m) return;
    DocViewer.open(m.title, 'notes_text', m.description, {
      author: m.author,
      file_size: m.file_size,
      file_url: m.file_url,
      description: `${m.title}\n\n${m.description || 'Detailed GTU Diploma lecture notes with core theoretical definitions, formulas, and examination oriented diagrams.'}`
    });
  },

  renderBooks(books) {
    const container = document.getElementById('studentResourceGrid');
    this.booksMap = {};

    if (books.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No textbooks listed for this subject yet.</p>`;
      return;
    }

    books.forEach(b => { this.booksMap[b.id] = b; });

    container.innerHTML = books.map(b => `
      <div class="book-card">
        <img src="${b.cover_image || 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=400&q=80'}" alt="${b.title}" class="book-cover">
        <div class="book-info">
          <div>
            <h4 class="book-title">${b.title}</h4>
            <p class="book-author">By ${b.author}</p>
            <p class="book-meta">${b.publisher} • ⭐ ${b.rating}</p>
          </div>
          <div style="margin-top: 0.75rem;">
            <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="StudentApp.openBookViewer(${b.id})">
              📖 Read Textbook (Read-Only Mode)
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openBookViewer(id) {
    const b = this.booksMap[id];
    if (!b) return;
    DocViewer.open(b.title, 'book', b.file_url, {
      publisher: b.publisher,
      author: b.author,
      file_size: b.file_size,
      description: `GTU Prescribed Reference Book (${b.edition || 'Latest Revised Edition'}) by ${b.author}. Published by ${b.publisher}. Contains complete syllabus units and chapter exercises in digital reading mode.`
    });
  },

  renderQuestions(questions) {
    const container = document.getElementById('studentResourceGrid');
    this.questionsMap = {};

    if (questions.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No question papers found for this subject.</p>`;
      return;
    }

    questions.forEach(q => { this.questionsMap[q.id] = q; });

    container.innerHTML = questions.map(q => `
      <div class="qb-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span class="qb-season-badge">${q.exam_season} ${q.exam_year}</span>
            <span class="qb-marks-badge">${q.total_marks} Marks</span>
          </div>
          <h4 class="mat-title">${q.title}</h4>
          <p class="mat-desc">${q.description || 'GTU Official End-Semester Examination Question Paper.'}</p>
        </div>
        <div>
          <div class="mat-meta">
            <span>📋 ${q.questions_count || 14} Questions</span>
            <span>📑 ${q.paper_type || 'GTU Paper'}</span>
          </div>
          <div class="mat-actions">
            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="StudentApp.openQuestionViewer(${q.id})">
              📄 Read Question Paper
            </button>
            <button class="btn btn-success btn-sm" onclick="StudentApp.switchResourceTab('solutions')">
              💡 Read Solutions
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openQuestionViewer(id) {
    const q = this.questionsMap[id];
    if (!q) return;
    DocViewer.open(q.title, 'paper', q.file_url, {
      description: q.description || `Official Gujarat Technological University (GTU) ${q.exam_season} ${q.exam_year} Examination Paper for semester assessment (Total: ${q.total_marks} Marks).`
    });
  },

  renderSolutions(solutions) {
    const container = document.getElementById('studentResourceGrid');
    this.solutionsMap = {};

    if (solutions.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No solved papers available for this subject yet.</p>`;
      return;
    }

    solutions.forEach(s => { this.solutionsMap[s.id] = s; });

    container.innerHTML = solutions.map(s => `
      <div class="material-card" style="border-color: rgba(16, 185, 129, 0.3);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span class="qb-season-badge">SOLVED: ${s.exam_year} ${s.paper_season || 'Winter'}</span>
            <span style="font-size: 0.75rem; color: #34d399; font-weight: 600;">⭐ Step-by-Step</span>
          </div>
          <h4 class="mat-title">${s.title}</h4>
          <p class="mat-desc">Verified by: ${s.verified_by || 'GTU Gold Medalist & Faculty'}</p>
        </div>
        <div>
          <div style="background: rgba(10,15,29,0.6); padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem;">
            Key Formula: <code style="color: #38bdf8;">${s.key_formulas || 'Standard formulas included'}</code>
          </div>
          <div class="mat-actions">
            <button class="btn btn-success btn-sm" style="flex: 1;" onclick="StudentApp.openSolutionViewer(${s.id})">
              📖 Read Solved Answers
            </button>
            <button class="btn btn-secondary btn-sm" onclick="StudentApp.askSolutionDoubt(${s.id})">
              ✨ AI Explain
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openSolutionViewer(id) {
    const s = this.solutionsMap[id];
    if (!s) return;
    DocViewer.open(s.title, 'solution', s.solution_content, {
      verified_by: s.verified_by,
      key_formulas: s.key_formulas,
      file_url: s.file_url
    });
  },

  askSolutionDoubt(id) {
    const s = this.solutionsMap[id];
    if (!s) return;
    AiTutor.open(s.subject_name || 'Engineering', `Explain step-by-step: ${s.title}`);
  },

  renderCramKit() {
    const container = document.getElementById('studentResourceGrid');
    if (!container) return;

    const sub = this.subjectsList.find(s => s.id === this.activeSubjectId) || {
      subject_name: document.getElementById('hubSubjectTitle') ? document.getElementById('hubSubjectTitle').textContent : 'Engineering Subject',
      subject_code: '4330701'
    };

    container.innerHTML = `
      <div class="cram-kit-wrapper">
        <div class="cram-hero-banner">
          <div>
            <h3 class="cram-hero-title">
              <span>⚡</span> GTU Last-Night Exam Survival Kit
            </h3>
            <p style="color: #cbd5e1; font-size: 0.92rem; margin: 0; max-width: 650px;">
              Curated high-yield 7-mark & 4-mark repeated questions, rapid formula sheets, and GTU examiner marking blueprints for <strong>${sub.subject_name}</strong>.
            </p>
          </div>
          <button class="btn btn-primary" onclick="AiTutor.open('${sub.subject_name}', 'Give me a 1-night cram strategy for GTU exam in ${sub.subject_name}')" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 700;">
            ✨ Ask AI Cram Strategy
          </button>
        </div>

        <div>
          <h4 class="cram-section-title">
            <span>🔥</span> Top 4 High-Probability GTU Repeated Questions (2020–2024)
          </h4>

          <div class="cram-question-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span class="gtu-freq-badge">🔥 Asked in Winter 2021, Summer 2022, Winter 2023, Summer 2024</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #fbbf24; background: rgba(245,158,11,0.15); padding: 2px 8px; border-radius: 4px;">7 MARKS</span>
            </div>
            <h4 style="color: #fff; font-size: 1.05rem; margin-bottom: 0.4rem;">
              1. Explain the fundamental working principle, circuit/system diagram, and step-by-step algorithms in ${sub.subject_name}.
            </h4>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.85rem;">
              Examiner Blueprint: Definition (1M) + Block Diagram (2M) + Step-by-Step Derivation (3M) + Practical Application (1M).
            </p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-success btn-sm" onclick="DocViewer.open('${sub.subject_name} - Q1 Model Answer', 'solution', '### GTU 7-Mark Model Solution\\n\\n**Question**: Explain fundamental principles, system diagram and step-by-step methodology.\\n\\n**1. Definition & Core Scope (1 Mark)**\\nState accurate technical definition conforming to GTU standard handbook.\\n\\n**2. System Block Diagram & Flowchart (2 Marks)**\\nInclude labelled schematics with standard pinouts and signal directions.\\n\\n**3. Detailed Working Operation (3 Marks)**\\nStep 1: Input initialization\\nStep 2: Core processing cycle\\nStep 3: Boundary state resolution\\n\\n**4. Real-World Engineering Example (1 Mark)**\\nIndustrial application in modern engineering systems.')">
                📖 View Step-by-Step Solution
              </button>
              <button class="btn btn-secondary btn-sm" onclick="AiTutor.open('${sub.subject_name}', 'Explain step-by-step how to write a 7-mark answer for fundamental principles in ${sub.subject_name}')">
                ✨ AI Explain in Gujlish
              </button>
            </div>
          </div>

          <div class="cram-question-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span class="gtu-freq-badge">🔥 Repeated 3x (Winter 2020, Winter 2022, Summer 2023)</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #fbbf24; background: rgba(245,158,11,0.15); padding: 2px 8px; border-radius: 4px;">7 MARKS</span>
            </div>
            <h4 style="color: #fff; font-size: 1.05rem; margin-bottom: 0.4rem;">
              2. Differentiate between core architectures and compare performance parameters with numerical proofs.
            </h4>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.85rem;">
              Examiner Blueprint: Minimum 7 distinct technical comparison points with tabular layout required for full 7 marks.
            </p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-success btn-sm" onclick="DocViewer.open('${sub.subject_name} - Q2 Comparison Table', 'solution', '### GTU 7-Mark Tabular Comparison\\n\\n| Parameter | System Type A | System Type B |\\n|---|---|---|\\n| Architecture | Monolithic / Direct | Distributed / Pipelined |\\n| Complexity | $O(N)$ Basic | $O(\\\\log N)$ Optimized |\\n| Power / Memory | Low consumption | High throughput |\\n| GTU Example | Standard baseline | Advanced application |')">
                📖 View Comparison Table
              </button>
              <button class="btn btn-secondary btn-sm" onclick="AiTutor.open('${sub.subject_name}', 'Generate 7 point comparison table with examples for ${sub.subject_name}')">
                ✨ AI Generate Table
              </button>
            </div>
          </div>
        </div>

        <!-- 2-Column Cheatsheets & Examiner Tips -->
        <div class="cram-grid-2col">
          <div class="cram-card-box">
            <div>
              <div style="font-size: 1.5rem; margin-bottom: 0.4rem;">📑</div>
              <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 0.35rem;">1-Page Rapid Formula Cheatsheet</h4>
              <p style="color: #94a3b8; font-size: 0.85rem;">
                All governing formulas, time complexities, equations, and conversion tables condensed into a clean 1-page quick revision sheet.
              </p>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="DocViewer.open('${sub.subject_name} - Formula Sheet', 'notes_text', '### 1-Page Rapid Formula Summary: ${sub.subject_name}\\n\\n- **Formula 1**: Standard governing theorem and units\\n- **Formula 2**: Boundary condition equations\\n- **Formula 3**: Performance efficiency equation: $\\\\eta = \\\\frac{P_{out}}{P_{in}} \\\\times 100\\\\%$\\n- **Formula 4**: Step-by-step conversion matrix')">
              📖 Open 1-Page Cheatsheet
            </button>
          </div>

          <div class="cram-card-box">
            <div>
              <div style="font-size: 1.5rem; margin-bottom: 0.4rem;">🧪</div>
              <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 0.35rem;">Lab Practical & External Viva Voce</h4>
              <p style="color: #94a3b8; font-size: 0.85rem;">
                Top 10 most common external examiner viva questions, standard circuit readings, code outputs, and oral test tips.
              </p>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="DocViewer.open('${sub.subject_name} - Viva Voce Guide', 'notes_text', '### Top 10 External Examiner Viva Questions\\n\\n1. **Q1**: What is the primary objective of this laboratory experiment?\\n2. **Q2**: Explain the significance of boundary tolerances.\\n3. **Q3**: Why do we select this specific hardware/software component over alternatives?\\n4. **Q4**: How would you troubleshoot output fluctuations during live execution?')">
              📖 Open Viva Voce Guide
            </button>
          </div>
        </div>
      </div>
    `;
  },

  quizState: {
    selectedAnswers: {},
    submitted: false,
    questions: []
  },

  renderQuiz() {
    const container = document.getElementById('studentResourceGrid');
    if (!container) return;

    const sub = this.subjectsList.find(s => s.id === this.activeSubjectId) || {
      subject_name: document.getElementById('hubSubjectTitle') ? document.getElementById('hubSubjectTitle').textContent : 'Engineering Subject'
    };

    // 5 Subject-aligned MCQ Questions
    this.quizState.questions = [
      {
        id: 1,
        question: `What is the standard GTU marking weightage for a full descriptive question with block diagram in ${sub.subject_name}?`,
        options: ['3 Marks', '4 Marks', '7 Marks', '14 Marks'],
        correct: 2,
        rationale: 'In GTU diploma examinations, descriptive questions with diagrams and derivations are typically assigned 7 marks.'
      },
      {
        id: 2,
        question: `Which of the following is considered the primary design objective when optimizing solutions in ${sub.subject_name}?`,
        options: ['Minimizing computational/hardware resource overhead', 'Maximizing code length', 'Ignoring boundary condition limits', 'Avoiding documentation'],
        correct: 0,
        rationale: 'Optimal engineering solutions always minimize hardware footprint, computational complexity, and power dissipation.'
      },
      {
        id: 3,
        question: `In standard GTU answer presentation, where should the labelled schematic/diagram be drawn?`,
        options: ['At the very end on rough page', 'Immediately after stating definition and core premise', 'Diagrams are optional and not graded', 'In pencil only without labels'],
        correct: 1,
        rationale: 'GTU examiners assign 2 marks for clear, centrally placed and labelled diagrams following the definition.'
      },
      {
        id: 4,
        question: `How are boundary conditions evaluated in practical implementations of ${sub.subject_name}?`,
        options: ['Through systematic asymptotic analysis & testing', 'By skipping numerical proofs', 'Only during theoretical discussions', 'Without unit validation'],
        correct: 0,
        rationale: 'Asymptotic testing and boundary limit verification ensure system stability and zero runtime crashes.'
      },
      {
        id: 5,
        question: `Which teaching scheme is currently active for GTU Diploma engineering students entering from 2023 onwards?`,
        options: ['33-Series (Old Scheme)', '43-Series (New Scheme)', '23-Series', '13-Series'],
        correct: 1,
        rationale: 'GTU 43-Series is the latest updated curriculum scheme featuring industry-aligned practical subjects.'
      }
    ];

    this.quizState.selectedAnswers = {};
    this.quizState.submitted = false;

    this.drawQuizContent(container, sub);
  },

  drawQuizContent(container, sub) {
    container.innerHTML = `
      <div class="quiz-wrapper">
        <div class="cram-hero-banner" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%); border-color: rgba(168, 85, 247, 0.35);">
          <div>
            <h3 class="cram-hero-title" style="color: #c084fc;">
              <span>🎯</span> 5-Minute GTU Exam Readiness MCQ Quiz
            </h3>
            <p style="color: #cbd5e1; font-size: 0.92rem; margin: 0;">
              Self-test your concept mastery for <strong>${sub.subject_name}</strong>. Answer all 5 questions to receive your instant GTU readiness grade.
            </p>
          </div>
          <span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 4px 12px; border-radius: var(--radius-full); font-weight: 700; font-size: 0.85rem;">
            5 Questions • 5 Minutes
          </span>
        </div>

        <form id="mcqQuizForm" onsubmit="StudentApp.submitQuiz(event)">
          ${this.quizState.questions.map((q, qIndex) => `
            <div class="quiz-card" id="quizCard_${q.id}">
              <div class="quiz-q-num">Question ${qIndex + 1} of 5</div>
              <div class="quiz-q-text">${q.question}</div>
              <div class="quiz-options-list">
                ${q.options.map((opt, optIndex) => `
                  <button type="button" 
                    class="quiz-option-btn ${this.quizState.selectedAnswers[q.id] === optIndex ? 'selected' : ''}" 
                    id="qOpt_${q.id}_${optIndex}" 
                    onclick="StudentApp.selectQuizOption(${q.id}, ${optIndex})">
                    <span style="font-weight: 700; color: #38bdf8;">${String.fromCharCode(65 + optIndex)}.</span>
                    <span>${opt}</span>
                  </button>
                `).join('')}
              </div>
              <div id="quizFeedback_${q.id}" style="margin-top: 0.75rem; font-size: 0.85rem; display: none;"></div>
            </div>
          `).join('')}

          <div style="display: flex; justify-content: center; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary" id="btnSubmitQuiz" style="padding: 0.9rem 2.5rem; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, #a855f7, #6366f1); border: none;">
              🚀 Submit Quiz & Calculate Exam Readiness Score
            </button>
          </div>
        </form>

        <div id="quizScoreSection" style="display: none;"></div>
      </div>
    `;
  },

  selectQuizOption(questionId, optionIndex) {
    if (this.quizState.submitted) return;
    this.quizState.selectedAnswers[questionId] = optionIndex;

    const card = document.getElementById(`quizCard_${questionId}`);
    if (card) {
      card.querySelectorAll('.quiz-option-btn').forEach((btn, idx) => {
        btn.classList.toggle('selected', idx === optionIndex);
      });
    }
  },

  submitQuiz(e) {
    e.preventDefault();
    const total = this.quizState.questions.length;
    const answeredCount = Object.keys(this.quizState.selectedAnswers).length;

    if (answeredCount < total) {
      if (window.App) App.showToast(`Please answer all ${total} questions before submitting!`, 'warning');
      return;
    }

    this.quizState.submitted = true;
    let score = 0;

    this.quizState.questions.forEach(q => {
      const selected = this.quizState.selectedAnswers[q.id];
      const isCorrect = selected === q.correct;
      if (isCorrect) score++;

      const selectedBtn = document.getElementById(`qOpt_${q.id}_${selected}`);
      const correctBtn = document.getElementById(`qOpt_${q.id}_${q.correct}`);
      const feedbackEl = document.getElementById(`quizFeedback_${q.id}`);

      if (selectedBtn) {
        selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
      if (correctBtn && !isCorrect) {
        correctBtn.classList.add('correct');
      }

      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.innerHTML = `
          <div style="padding: 0.6rem; border-radius: 6px; background: ${isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${isCorrect ? '#34d399' : '#f87171'}; border: 1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};">
            <strong>${isCorrect ? '✅ Correct Answer!' : '❌ Incorrect.'}</strong> ${q.rationale}
          </div>
        `;
      }
    });

    const pct = Math.round((score / total) * 100);
    const scoreSection = document.getElementById('quizScoreSection');
    const submitBtn = document.getElementById('btnSubmitQuiz');
    if (submitBtn) submitBtn.style.display = 'none';

    if (scoreSection) {
      scoreSection.style.display = 'block';
      scoreSection.innerHTML = `
        <div class="quiz-score-banner">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">${pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚'}</div>
          <h2 style="color: #fff; font-size: 2rem; margin-bottom: 0.35rem;">
            You Scored ${score} / ${total} (${pct}%)
          </h2>
          <p style="color: #cbd5e1; font-size: 1rem; max-width: 500px; margin: 0 auto 1.5rem auto;">
            ${pct >= 80 ? '🎉 Excellent! You have strong conceptual clarity for this GTU subject.' : pct >= 60 ? '👍 Good progress! Review repeated 7-markers in the Cram Kit to reach 90%+.' : '⚠️ Focus on Unit 1 & Unit 2 lecture notes and formula cheatsheets before exams.'}
          </p>
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="StudentApp.renderQuiz()">
              🔄 Retake Quiz
            </button>
            <button class="btn btn-secondary" onclick="StudentApp.switchResourceTab('cram')">
              ⚡ Open Exam Cram Kit
            </button>
          </div>
        </div>
      `;
      scoreSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (window.App) App.showToast(`Quiz completed! Score: ${score}/${total} (${pct}%)`, 'success');
  },

  async loadAnnouncements() {
    const res = await API.getAnnouncements();
    if (res.success && res.data && res.data.length > 0) {
      const tickerElem = document.getElementById('studentNoticeTicker');
      if (tickerElem) {
        tickerElem.innerHTML = res.data.map(a => `
          <span class="ticker-item">
            <strong style="color: #38bdf8;">[${a.category}]</strong> ${a.title}
          </span>
        `).join(' &nbsp; • &nbsp; ');
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  StudentApp.init();
});
