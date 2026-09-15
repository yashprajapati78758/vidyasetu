// VidyaSetu API Client Wrapper
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      return { success: false, error: err.message };
    }
  },

  // Branches & Semesters
  getBranches() {
    return this.request('/branches');
  },
  getBranchById(id) {
    return this.request(`/branches/${id}`);
  },
  createBranch(data) {
    return this.request('/branches', { method: 'POST', body: JSON.stringify(data) });
  },

  // Subjects
  getSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/subjects?${query}`);
  },
  getSubjectById(id) {
    return this.request(`/subjects/${id}`);
  },
  createSubject(data) {
    return this.request('/subjects', { method: 'POST', body: JSON.stringify(data) });
  },
  updateSubject(id, data) {
    return this.request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteSubject(id) {
    return this.request(`/subjects/${id}`, { method: 'DELETE' });
  },

  // Study Materials
  getMaterials(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/materials?${query}`);
  },
  getMaterialById(id) {
    return this.request(`/materials/${id}`);
  },
  createMaterial(data) {
    return this.request('/materials', { method: 'POST', body: JSON.stringify(data) });
  },
  updateMaterial(id, data) {
    return this.request(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteMaterial(id) {
    return this.request(`/materials/${id}`, { method: 'DELETE' });
  },
  recordMaterialDownload(id) {
    return this.request(`/materials/${id}/download`, { method: 'POST' });
  },

  // Study Books
  getBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/books?${query}`);
  },
  getBookById(id) {
    return this.request(`/books/${id}`);
  },
  createBook(data) {
    return this.request('/books', { method: 'POST', body: JSON.stringify(data) });
  },
  updateBook(id, data) {
    return this.request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteBook(id) {
    return this.request(`/books/${id}`, { method: 'DELETE' });
  },

  // Question Banks
  getQuestionBanks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/question-banks?${query}`);
  },
  getQuestionBankById(id) {
    return this.request(`/question-banks/${id}`);
  },
  createQuestionBank(data) {
    return this.request('/question-banks', { method: 'POST', body: JSON.stringify(data) });
  },
  updateQuestionBank(id, data) {
    return this.request(`/question-banks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteQuestionBank(id) {
    return this.request(`/question-banks/${id}`, { method: 'DELETE' });
  },

  // Solutions
  getSolutions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/solutions?${query}`);
  },
  getSolutionById(id) {
    return this.request(`/solutions/${id}`);
  },
  createSolution(data) {
    return this.request('/solutions', { method: 'POST', body: JSON.stringify(data) });
  },
  updateSolution(id, data) {
    return this.request(`/solutions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteSolution(id) {
    return this.request(`/solutions/${id}`, { method: 'DELETE' });
  },

  // Student Progress & Bookmarks
  getStudentProgress(userId, sem) {
    const q = sem ? `?sem=${sem}` : '';
    return this.request(`/progress/${userId}${q}`);
  },
  toggleProgress(data) {
    return this.request('/progress/toggle', { method: 'POST', body: JSON.stringify(data) });
  },
  getBookmarks(userId) {
    return this.request(`/progress/bookmarks/${userId}`);
  },
  toggleBookmark(data) {
    return this.request('/progress/bookmarks/toggle', { method: 'POST', body: JSON.stringify(data) });
  },

  // Student Authentication
  registerStudent(data) {
    return this.request('/students/register', { method: 'POST', body: JSON.stringify(data) });
  },
  loginStudent(data) {
    return this.request('/students/login', { method: 'POST', body: JSON.stringify(data) });
  },
  getStudentProfile(userId) {
    return this.request(`/students/me?userId=${userId}`);
  },
  updateStudentProfile(data) {
    return this.request('/students/profile', { method: 'PUT', body: JSON.stringify(data) });
  },

  // AI Doubt Solver
  askAi(query, subject, language = 'en', userId = 'student_demo') {
    return this.request('/ai/solve', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, query, subject, language })
    });
  },
  getAiHistory(userId = 'student_demo') {
    return this.request(`/ai/history/${userId}`);
  },

  // Admin & Announcements
  getAdminStats() {
    return this.request('/admin/stats');
  },
  getAnnouncements() {
    return this.request('/admin/announcements');
  },
  createAnnouncement(data) {
    return this.request('/admin/announcements', { method: 'POST', body: JSON.stringify(data) });
  },
  deleteAnnouncement(id) {
    return this.request(`/admin/announcements/${id}`, { method: 'DELETE' });
  },

  // Document File Upload (PDF, Word doc/docx, PPT, Images)
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData
      });
      return await res.json();
    } catch (err) {
      console.error('File Upload Error:', err);
      return { success: false, error: err.message };
    }
  }
};
