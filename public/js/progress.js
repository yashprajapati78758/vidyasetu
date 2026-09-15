// VidyaSetu Student Progress & Checklist Tracker Module
const StudentProgress = {
  currentData: null,
  activeUserId: 'student_demo',
  currentSemester: 3,

  async init() {
    const sem = (window.StudentApp && StudentApp.currentUser && StudentApp.currentUser.semester) ? parseInt(StudentApp.currentUser.semester, 10) : this.currentSemester;
    await this.loadProgress(sem);
  },

  async loadProgress(semester = 3) {
    this.currentSemester = semester;
    const userId = (window.StudentApp && StudentApp.currentUser && StudentApp.currentUser.id) ? StudentApp.currentUser.id : this.activeUserId;
    const res = await API.getStudentProgress(userId, semester);
    if (res.success && res.data) {
      this.currentData = res.data;
      this.renderDashboard();
    }
  },

  renderDashboard() {
    const data = this.currentData;
    if (!data) return;

    // 1. Overall Percentage & Progress Meter
    const pctElem = document.getElementById('overallProgressPct');
    const circleFill = document.getElementById('progressCircleFill');
    const completedText = document.getElementById('progressCompletedCount');

    if (pctElem) pctElem.textContent = `${data.overall_percentage}%`;
    if (completedText) completedText.textContent = `${data.total_completed} of ${data.total_topics} Topics Mastered`;

    if (circleFill) {
      // 2 * PI * r = 2 * 3.14159 * 70 = 439.8
      const circumference = 440;
      const offset = circumference - (data.overall_percentage / 100) * circumference;
      circleFill.style.strokeDasharray = `${circumference}`;
      circleFill.style.strokeDashoffset = `${offset}`;
    }

    // 2. Render Subject-wise checklists
    const checklistContainer = document.getElementById('subjectChecklistContainer');
    if (!checklistContainer) return;

    if (!data.subject_progress || data.subject_progress.length === 0) {
      checklistContainer.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; text-align: center; color: #94a3b8;">
          <p>No subjects found for Semester ${this.currentSemester}. Select another semester or branch.</p>
        </div>
      `;
      return;
    }

    checklistContainer.innerHTML = data.subject_progress.map(sub => {
      // 6 core topic milestones for syllabus tracking
      const sampleTopics = [
        { id: `t_${sub.id}_1`, title: `Unit 1: Fundamentals & Core Theoretical Definitions` },
        { id: `t_${sub.id}_2`, title: `Unit 2: Standard Algorithms, Proofs & Equations` },
        { id: `t_${sub.id}_3`, title: `Unit 3: Numerical Problems & Step-by-Step Tracing` },
        { id: `t_${sub.id}_4`, title: `Unit 4: Advanced Systems, Schematics & Circuit Diagrams` },
        { id: `t_${sub.id}_5`, title: `Unit 5: GTU Previous 5-Years Repeated 7-Mark Questions` },
        { id: `t_${sub.id}_6`, title: `Unit 6: Formula Revision & Final Mock Exam Checklist` }
      ];

      const completedIds = new Set((sub.records || []).filter(r => r.status === 'completed').map(r => r.topic_id));

      return `
        <div class="glass-panel" style="padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span class="subject-code-badge">${sub.subject_code}</span>
              <h3 style="font-size: 1.15rem; color: #fff; margin-top: 0.25rem;">${sub.subject_name}</h3>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.2rem; font-weight: 800; color: #38bdf8;">${sub.percentage}%</span>
              <p style="font-size: 0.75rem; color: #94a3b8;">${sub.completed_topics} / 6 Completed</p>
            </div>
          </div>

          <div class="checklist-container">
            ${sampleTopics.map(topic => {
              const isDone = completedIds.has(topic.id);
              return `
                <div class="topic-item">
                  <div class="topic-left">
                    <div class="topic-checkbox ${isDone ? 'completed' : ''}" onclick="StudentProgress.toggleTopic('${sub.id}', '${topic.id}', '${topic.title.replace(/'/g, "\\'")}', ${isDone})">
                      ${isDone ? '✓' : ''}
                    </div>
                    <span class="topic-title ${isDone ? 'completed' : ''}">
                      ${topic.title}
                    </span>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="AiTutor.open('${sub.subject_name.replace(/'/g, "\\'")}', 'Explain ${topic.title.replace(/'/g, "\\'")}')">
                    ✨ Ask AI
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  async toggleTopic(subjectId, topicId, topicTitle, currentIsDone) {
    const newStatus = currentIsDone ? 'in_progress' : 'completed';
    const res = await API.toggleProgress({
      user_id: this.activeUserId,
      subject_id: subjectId,
      topic_id: topicId,
      topic_title: topicTitle,
      status: newStatus
    });

    if (res.success) {
      if (window.App) App.showToast(newStatus === 'completed' ? '🎉 Topic marked as Completed!' : 'Topic marked for revision.', 'success');
      await this.loadProgress(this.currentSemester);
    }
  }
};
