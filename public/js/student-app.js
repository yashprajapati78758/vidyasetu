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
      // Authenticated Student View
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
      // Unauthenticated Guest View (Gateway Screen)
      if (gatewaySection) gatewaySection.style.display = 'flex';
      if (mainWrapper) mainWrapper.style.display = 'none';
      if (navLinks) navLinks.style.display = 'none';
      if (floatingAiBtn) floatingAiBtn.style.display = 'none';

      this.renderNavAuth();
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
            <img src="${this.currentUser.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="Student">
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
          <button class="btn btn-secondary btn-sm" onclick="StudentApp.switchGatewayTab('register')" style="font-size: 0.82rem; padding: 6px 12px;">
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

    const gatewaySection = document.getElementById('studentAuthGatewaySection');
    if (gatewaySection && gatewaySection.style.display === 'none') {
      this.openAuthModal(tab);
    }
  },

  fillGatewayDemoCredentials() {
    const identInput = document.getElementById('gatewayLoginIdentifier');
    const passInput = document.getElementById('gatewayLoginPassword');
    if (identInput) identInput.value = '226170307001';
    if (passInput) passInput.value = 'student123';
    if (window.App) App.showToast('Demo GTU student credentials filled!', 'info');
  },

  fillDemoStudentCredentials() {
    const identInput = document.getElementById('authLoginIdentifier');
    const passInput = document.getElementById('authLoginPassword');
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
        if (window.App) App.showToast(res.error || 'Authentication failed', 'error');
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

  openAuthModal(tab = 'signin') {
    const modal = document.getElementById('studentAuthModal');
    if (modal) modal.classList.add('active');
    this.switchAuthTab(tab);
  },

  closeAuthModal() {
    const modal = document.getElementById('studentAuthModal');
    if (modal) modal.classList.remove('active');
  },

  switchAuthTab(tab) {
    const btnSignIn = document.getElementById('tabBtnSignIn');
    const btnRegister = document.getElementById('tabBtnRegister');
    const formSignIn = document.getElementById('formStudentSignIn');
    const formRegister = document.getElementById('formStudentRegister');

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
  },

  async handleStudentLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnStudentLoginSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Signing in...';
    }

    try {
      const identifier = document.getElementById('authLoginIdentifier').value.trim();
      const password = document.getElementById('authLoginPassword').value.trim();

      const res = await API.loginStudent({ identifier, password });
      if (res.success && res.user) {
        this.currentUser = res.user;
        this.authToken = res.token;
        localStorage.setItem('vidyasetu_student_user', JSON.stringify(res.user));
        localStorage.setItem('vidyasetu_student_token', res.token);

        this.closeAuthModal();
        await this.syncAuthState();
        if (window.App) App.showToast(`Welcome back, ${res.user.name}! (Sem ${this.activeSem})`, 'success');
      } else {
        if (window.App) App.showToast(res.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      if (window.App) App.showToast('Login Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Sign In to VidyaSetu';
      }
    }
  },

  async handleStudentRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btnStudentRegSubmit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Registering...';
    }

    try {
      const university = document.getElementById('authRegUniversity').value;
      const course_type = document.getElementById('authRegCourse').value;
      const branch_id = document.getElementById('authRegBranch').value;
      const semester = parseInt(document.getElementById('authRegSem').value, 10);
      const name = document.getElementById('authRegName').value.trim();
      const enrollment_no = document.getElementById('authRegEnrollment').value.trim();
      const email = document.getElementById('authRegEmail').value.trim();
      const password = document.getElementById('authRegPassword').value.trim();

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

        this.closeAuthModal();
        await this.syncAuthState();
        if (window.App) App.showToast(`Account registered! Welcome to ${res.user.branch_name} Sem ${semester}`, 'success');
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
          <img src="${u.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" alt="Avatar">
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
    const res = await API.getBranches();
    if (res.success && res.data) {
      this.branchesList = res.data;
      this.renderBranches();
    }
  },

  renderBranches() {
    const container = document.getElementById('studentBranchGrid');
    if (!container) return;

    container.innerHTML = this.branchesList.map(b => `
      <div class="branch-card ${b.id === this.activeBranch ? 'active' : ''}" onclick="StudentApp.selectBranch('${b.id}')">
        <div class="branch-icon">${b.icon}</div>
        <div class="branch-name">${b.name}</div>
        <span class="branch-code">Code: ${b.code}</span>
      </div>
    `).join('');
  },

  async selectBranch(branchId) {
    this.activeBranch = branchId;
    this.renderBranches();
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
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #38bdf8; padding: 2rem;">Loading GTU subjects...</div>`;
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
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed rgba(255,255,255,0.15);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📚</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No subjects found for ${schemeName} in Semester ${this.activeSem}</h3>
          <p style="font-size: 0.95rem; color: #94a3b8; max-width: 500px; margin: 0 auto 1.5rem auto;">
            Try switching to <strong>All Schemes</strong> or browse another semester for this branch.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="StudentApp.selectScheme('all')">View All Schemes</button>
            <button class="btn btn-secondary btn-sm" onclick="StudentApp.selectSemester(3)">View Sem 3 Core</button>
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
