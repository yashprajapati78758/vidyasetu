const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.join(__dirname, '..', 'vidyasetu.db');

// In Vercel Serverless environment, copy db to writable /tmp directory
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/vidyasetu.db';
  if (!fs.existsSync(tmpDbPath)) {
    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, tmpDbPath);
      }
    } catch (e) {
      console.warn('Vercel /tmp db copy warning:', e.message);
    }
  }
  if (fs.existsSync(tmpDbPath)) {
    dbPath = tmpDbPath;
  }
}

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // WAL mode fallback for certain serverless configurations
}

function initDatabase() {
  console.log('Initializing VidyaSetu SQLite Database...');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id TEXT NOT NULL,
      sem_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      sem_number INTEGER NOT NULL,
      scheme TEXT DEFAULT 'new',
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      credits INTEGER DEFAULT 4,
      category TEXT DEFAULT 'Core',
      syllabus_url TEXT,
      description TEXT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      sem_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      chapter_no INTEGER DEFAULT 1,
      chapter_name TEXT,
      file_type TEXT DEFAULT 'PDF',
      file_url TEXT,
      file_size TEXT DEFAULT '2.4 MB',
      download_count INTEGER DEFAULT 0,
      description TEXT,
      author TEXT DEFAULT 'GTU Faculty Council',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      sem_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT DEFAULT 'Atul / Technical Publications',
      edition TEXT DEFAULT 'Latest Revised 2024-25',
      cover_image TEXT,
      file_url TEXT,
      pages INTEGER DEFAULT 320,
      file_size TEXT DEFAULT '14.5 MB',
      rating REAL DEFAULT 4.8,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      sem_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      exam_year TEXT NOT NULL,
      exam_season TEXT NOT NULL,
      total_marks INTEGER DEFAULT 70,
      paper_type TEXT DEFAULT 'GTU End-Sem Exam',
      file_url TEXT,
      questions_count INTEGER DEFAULT 15,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS solutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_bank_id INTEGER,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      exam_year TEXT,
      paper_season TEXT,
      solution_content TEXT NOT NULL,
      key_formulas TEXT,
      diagram_guide TEXT,
      verified_by TEXT DEFAULT 'GTU Senior Lecturer & Gold Medalist',
      file_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (question_bank_id) REFERENCES question_banks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enrollment_no TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      branch_id TEXT,
      semester INTEGER DEFAULT 1,
      role TEXT DEFAULT 'student',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, subject_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS ai_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'student_demo',
      subject_name TEXT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      category TEXT DEFAULT 'Conceptual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Circular',
      badge TEXT DEFAULT 'NEW',
      content TEXT NOT NULL,
      link TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: ensure scheme column exists in subjects table
  try {
    db.exec("ALTER TABLE subjects ADD COLUMN scheme TEXT DEFAULT 'new'");
  } catch (e) {
    // column already exists
  }

  // Migration: ensure password column exists in users table
  try {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT");
    db.exec("UPDATE users SET password = 'student123' WHERE password IS NULL");
  } catch (e) {
    // column already exists
  }

  seedInitialData();
  console.log('VidyaSetu Database ready.');
}

function seedInitialData() {
  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get().count;
  const oldSchemeCount = db.prepare("SELECT COUNT(*) as count FROM subjects WHERE scheme = 'old'").get().count;
  const totalSubjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;

  if (branchCount === 7 && oldSchemeCount >= 20 && totalSubjectCount >= 100) {
    console.log(`Database already populated with ${totalSubjectCount} subjects (${oldSchemeCount} Old Scheme). Skipping seed.`);
    return;
  }

  console.log('Seeding rich GTU Diploma educational curriculum across all 7 branches & 6 semesters (New 43-Series & Old 33-Series)...');

  // Clear existing to cleanly populate all 7 branches & semesters
  db.exec(`
    DELETE FROM solutions;
    DELETE FROM question_banks;
    DELETE FROM books;
    DELETE FROM materials;
    DELETE FROM subjects;
    DELETE FROM semesters;
    DELETE FROM branches;
  `);

  // 1. Branches
  const insertBranch = db.prepare(`
    INSERT INTO branches (id, name, code, icon, color, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const branches = [
    ['ce', 'Computer Engineering', '07', '💻', '#3b82f6', 'Algorithms, Web Dev, Python, DBMS, OS & Cloud Computing'],
    ['it', 'Information Technology', '16', '🌐', '#06b6d4', 'Network Security, Software Engineering, Mobile App & Full-Stack'],
    ['me', 'Mechanical Engineering', '19', '⚙️', '#f59e0b', 'Thermodynamics, Fluid Power, CAD/CAM, Automobile & Manufacturing'],
    ['cl', 'Civil Engineering', '06', '🏗️', '#10b981', 'Structural Analysis, Surveying, Concrete Tech & Geotechnical Engg'],
    ['ee', 'Electrical Engineering', '09', '⚡', '#eab308', 'Circuits, Power Systems, Electrical Machines, Microcontrollers & Solar'],
    ['ec', 'Electronics & Communication', '11', '📡', '#ec4899', 'Digital Electronics, Signal Processing, Embedded Systems & IoT'],
    ['ae', 'Automobile Engineering', '02', '🚗', '#ef4444', 'Automotive Engines, Vehicle Dynamics, Transmission & EV Technology']
  ];

  branches.forEach(b => insertBranch.run(...b));

  // 2. Semesters (1 to 6 for each branch)
  const insertSemester = db.prepare(`
    INSERT INTO semesters (branch_id, sem_number, name)
    VALUES (?, ?, ?)
  `);

  branches.forEach(b => {
    for (let sem = 1; sem <= 6; sem++) {
      insertSemester.run(b[0], sem, `Semester ${sem}`);
    }
  });

  // 3. Complete GTU Diploma Curriculum Subjects (New 43-Series & Old 33-Series Schemes)
  const insertSubject = db.prepare(`
    INSERT INTO subjects (id, branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const allSubjects = [
    // =========================================================================
    // 🌟 GTU NEW TEACHING SCHEME (43-SERIES / 2021+ SYLLABUS) - SEMESTERS 1 TO 6
    // =========================================================================

    // 1. COMPUTER ENGINEERING (CE) - New Scheme
    ['sub_ce_1_4300001', 'ce', 1, 'new', '4300001', 'Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Matrices, Determinants, Trigonometry, Coordinate Geometry & Vectors for Engineering'],
    ['sub_ce_1_4300002', 'ce', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Units, Measurements, Elasticity, Optics, Wave Motion, Acoustics & Modern Physics'],
    ['sub_ce_1_4300003', 'ce', 1, 'new', '4300003', 'Communication Skills in English', 2, 'Humanities', 'https://gtu.ac.in/syllabus/4300003', 'Grammar, Technical Report Writing, Email Etiquettes & Presentation Skills'],
    ['sub_ce_1_4310701', 'ce', 1, 'new', '4310701', 'Computer Programming (C Language)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310701', 'Variables, Control Structures, Arrays, Functions, Pointers, Structures & File I/O'],
    ['sub_ce_1_4310702', 'ce', 1, 'new', '4310702', 'Basic Electronics & Logic Design', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310702', 'Diodes, Transistors, Logic Gates, Boolean Algebra, Multiplexers & Flip Flops'],

    ['sub_ce_2_4300011', 'ce', 2, 'new', '4300011', 'Mathematics - II (Advanced Calculus)', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Differential Calculus, Integral Calculus, Differential Equations & Applications'],
    ['sub_ce_2_4320701', 'ce', 2, 'new', '4320701', 'Object Oriented Programming with C++', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320701', 'Classes, Objects, Inheritance, Polymorphism, Operator Overloading, Templates & STL'],
    ['sub_ce_2_4320702', 'ce', 2, 'new', '4320702', 'Database Management Systems (DBMS)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320702', 'ER Diagrams, Relational Algebra, SQL Queries, Normalization (1NF-BCNF), Indexing & Transactions'],
    ['sub_ce_2_4320703', 'ce', 2, 'new', '4320703', 'Digital Computer Fundamentals', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320703', 'Number Systems, Combinational & Sequential Circuits, Counters, Registers & Memory Units'],

    ['sub_ce_3_4330701', 'ce', 3, 'new', '4330701', 'Data Structures & Algorithms', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330701', 'Arrays, Stacks, Queues, Linked Lists, Trees (BST, AVL), Graphs, Sorting & Searching Analysis'],
    ['sub_ce_3_4330702', 'ce', 3, 'new', '4330702', 'Computer Operating Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330702', 'Process Management, CPU Scheduling Algorithms, Memory Management, Paging, Deadlocks & Virtual Memory'],
    ['sub_ce_3_4330703', 'ce', 3, 'new', '4330703', 'Computer Networks', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330703', 'OSI Model, TCP/IP, IP Addressing (IPv4/IPv6), Routing Protocols, Switching, DNS, HTTP & Network Security'],
    ['sub_ce_3_4330704', 'ce', 3, 'new', '4330704', 'Microprocessor & Interfacing (8085/8086)', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330704', 'Pin Architectures, Assembly Programming, Addressing Modes, Interrupts, Timers & Memory Interfacing'],

    ['sub_ce_4_4340701', 'ce', 4, 'new', '4340701', 'Python Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340701', 'Python Syntax, Data Structures, OOP, NumPy, Pandas, GUI with Tkinter & SQLite Database Access'],
    ['sub_ce_4_4340702', 'ce', 4, 'new', '4340702', 'Web Development with HTML5, CSS3 & JS', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340702', 'Responsive Web Design, CSS Flexbox/Grid, ES6 Javascript, DOM Manipulation & Fetch API'],
    ['sub_ce_4_4340703', 'ce', 4, 'new', '4340703', 'Software Engineering & UML', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340703', 'SDLC Models, Agile Scrum, SRS Document, UML Diagrams, Testing Strategies & Quality Assurance'],
    ['sub_ce_4_4340704', 'ce', 4, 'new', '4340704', 'Computer Organization & Architecture', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340704', 'Instruction Cycles, ALU Design, Pipelining, Cache Memory & I/O Subsystems'],

    ['sub_ce_5_4350701', 'ce', 5, 'new', '4350701', 'Java Programming (Core & Advanced)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350701', 'Core Java, Multithreading, Exception Handling, Collections, JDBC, Servlets & JSP'],
    ['sub_ce_5_4350702', 'ce', 5, 'new', '4350702', 'Cyber Security & Cryptography', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350702', 'Ethical Hacking, Symmetric/Asymmetric Encryption, DES, AES, RSA, Hash Functions & Firewalls'],
    ['sub_ce_5_4350703', 'ce', 5, 'new', '4350703', 'Mobile Application Development (Android)', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4350703', 'Android Architecture, Activity Lifecycle, Layouts, Intents, SQLite, Room DB & REST API Integration'],

    ['sub_ce_6_4360701', 'ce', 6, 'new', '4360701', 'Cloud Computing & DevOps', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4360701', 'AWS, Azure, Docker Containers, Kubernetes, CI/CD Pipelines & Serverless Architecture'],
    ['sub_ce_6_4360702', 'ce', 6, 'new', '4360702', 'Artificial Intelligence & Machine Learning', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4360702', 'Supervised/Unsupervised Learning, Regression, Classification, Neural Networks & Computer Vision'],
    ['sub_ce_6_4360703', 'ce', 6, 'new', '4360703', 'Major Capstone Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4360703', 'Full-cycle Software Development Project, Deployment, Viva Preparation & Report Generation'],

    // ==========================================
    // 2. INFORMATION TECHNOLOGY (IT) - Sem 1 to 6
    // ==========================================
    ['sub_it_1_4300001', 'it', 1, 'new', '4300001', 'Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Matrices, Determinants, Coordinate Geometry & Mathematical Foundations'],
    ['sub_it_1_4300002', 'it', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Physical Measurements, Optics, Acoustics & Semiconductor Physics'],
    ['sub_it_1_4311601', 'it', 1, 'new', '4311601', 'Fundamentals of IT & C Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311601', 'Computer Hardware Architecture, Operating Environment & Structured C Programming'],
    ['sub_it_1_4311602', 'it', 1, 'new', '4311602', 'Logic Design & Digital Circuits', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311602', 'Boolean Algebra, Logic Gates, Multiplexers, Decoders & Flip Flop Circuits'],

    ['sub_it_2_4300011', 'it', 2, 'new', '4300011', 'Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Advanced Calculus, Differential Equations & Vector Calculus'],
    ['sub_it_2_4321601', 'it', 2, 'new', '4321601', 'Object Oriented Programming with C++', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321601', 'Classes, Polymorphism, Inheritance, Exception Handling & Templates'],
    ['sub_it_2_4321602', 'it', 2, 'new', '4321602', 'Relational Database Management Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321602', 'Relational Models, SQL, Normalization, Query Processing & Transactions'],
    ['sub_it_2_4321603', 'it', 2, 'new', '4321603', 'Web Design Fundamentals', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321603', 'HTML5 Elements, CSS3 Styling, Flexbox, Grid Layouts & Responsive UI'],

    ['sub_it_3_4331601', 'it', 3, 'new', '4331601', 'Data Structures in C/C++', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331601', 'Linear & Non-linear Data Structures, Trees, Graphs, Sorting & Searching Algorithms'],
    ['sub_it_3_4331602', 'it', 3, 'new', '4331602', 'Operating Systems Principles', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331602', 'CPU Scheduling, Process Synchronization, Memory Virtualization & File Systems'],
    ['sub_it_3_4331603', 'it', 3, 'new', '4331603', 'Data Communication & Networking', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331603', 'Data Transmission Modes, OSI Layers, TCP/IP Suite, Routing & Subnetting'],
    ['sub_it_3_4331604', 'it', 3, 'new', '4331604', 'Discrete Mathematics for IT', 3, 'Applied Science', 'https://gtu.ac.in/syllabus/4331604', 'Set Theory, Relations, Graph Theory, Combinatorics & Propositional Logic'],

    ['sub_it_4_4341601', 'it', 4, 'new', '4341601', 'Core & Advanced Python Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341601', 'Python OOP, File Handling, Web Scraping, NumPy, Pandas & GUI Development'],
    ['sub_it_4_4341602', 'it', 4, 'new', '4341602', 'Advanced Web Technologies (PHP & MySQL)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341602', 'Server-side Scripting, Session Management, RESTful APIs & Database Integration'],
    ['sub_it_4_4341603', 'it', 4, 'new', '4341603', 'Software Engineering Methods & Agile', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341603', 'Agile Scrum, UML Modeling, Automated Software Testing & Quality Assurance'],

    ['sub_it_5_4351601', 'it', 5, 'new', '4351601', 'Java Enterprise Technologies', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351601', 'Advanced Java, Spring Boot Basics, Hibernate ORM, JDBC & Enterprise Web Apps'],
    ['sub_it_5_4351602', 'it', 5, 'new', '4351602', 'Mobile Application Development (Flutter/Android)', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4351602', 'Cross-platform Mobile Architecture, State Management, APIs & UI Components'],
    ['sub_it_5_4351603', 'it', 5, 'new', '4351603', 'Information & Network Security', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351603', 'Public Key Cryptography, SSL/TLS, Vulnerability Scanning & Cyber Forensics'],

    ['sub_it_6_4361601', 'it', 6, 'new', '4361601', 'Cloud Computing & Serverless Architectures', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361601', 'AWS EC2, S3, Docker, Kubernetes Containerization & Microservices'],
    ['sub_it_6_4361602', 'it', 6, 'new', '4361602', 'Machine Learning & Data Mining', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361602', 'Decision Trees, Clustering, Neural Networks & Predictive Analytics'],
    ['sub_it_6_4361603', 'it', 6, 'new', '4361603', 'Major IT Industry Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4361603', 'Full Stack Project Development, Testing, Cloud Deployment & Viva'],

    // ==========================================
    // 3. MECHANICAL ENGINEERING (ME) - Sem 1 to 6
    // ==========================================
    ['sub_me_1_4300001', 'me', 1, 'new', '4300001', 'Engineering Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Applied Mathematics for Mechanical Engineers, Calculus & Vectors'],
    ['sub_me_1_4300002', 'me', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Mechanics, Heat, Sound, Properties of Matter & Thermodynamics Basics'],
    ['sub_me_1_4311901', 'me', 1, 'new', '4311901', 'Engineering Graphics & CAD Drafting', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311901', 'Orthographic & Isometric Projections, Section of Solids & 2D/3D AutoCAD'],
    ['sub_me_1_4311902', 'me', 1, 'new', '4311902', 'Workshop Technology & Practice', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311902', 'Fitting, Carpentry, Welding, Sheet Metal & Safety Engineering Practices'],

    ['sub_me_2_4300011', 'me', 2, 'new', '4300011', 'Engineering Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Differential Equations, Definite Integrals & Numerical Methods'],
    ['sub_me_2_4321901', 'me', 2, 'new', '4321901', 'Engineering Mechanics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321901', 'Force Systems, Friction, Centroid, Moment of Inertia, Kinematics & Kinetics'],
    ['sub_me_2_4321902', 'me', 2, 'new', '4321902', 'Material Science & Metallurgy', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321902', 'Crystal Structures, Phase Diagrams, Iron-Carbon Diagram & Heat Treatment Processes'],
    ['sub_me_2_4321903', 'me', 2, 'new', '4321903', 'Manufacturing Engineering - I', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321903', 'Metal Casting Processes, Pattern Making, Moulding & Forming Technologies'],

    ['sub_me_3_4331901', 'me', 3, 'new', '4331901', 'Thermodynamics & Heat Transfer', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331901', 'Laws of Thermodynamics, Steam Tables, Carnot Cycle, Heat Exchangers & Radiation'],
    ['sub_me_3_4331902', 'me', 3, 'new', '4331902', 'Fluid Mechanics & Hydraulic Machinery', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331902', 'Fluid Properties, Bernoulli Theorem, Pelton Wheel, Francis Turbine & Centrifugal Pumps'],
    ['sub_me_3_4331903', 'me', 3, 'new', '4331903', 'Strength of Materials', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331903', 'Stress-Strain, Shear Force & Bending Moment Diagrams (SFD/BMD), Torsion & Deflection'],
    ['sub_me_3_4331904', 'me', 3, 'new', '4331904', 'Machine Drawing & Solid Modeling', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331904', 'Assembly Drawings, Limits, Fits, Tolerances & SolidWorks/Creo 3D Modeling'],

    ['sub_me_4_4341901', 'me', 4, 'new', '4341901', 'Manufacturing Engineering - II', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341901', 'Lathe, Milling, Shaper, Grinding Machines, CNC Programming & Non-Traditional Machining'],
    ['sub_me_4_4341902', 'me', 4, 'new', '4341902', 'Theory of Machines & Mechanisms', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341902', 'Kinematic Links, Cams, Gear Trains, Flywheels, Governors & Balancing of Masses'],
    ['sub_me_4_4341903', 'me', 4, 'new', '4341903', 'Thermal Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341903', 'Steam Boilers, Condensers, Nozzles, Gas Turbines & IC Engine Testing'],

    ['sub_me_5_4351901', 'me', 5, 'new', '4351901', 'Design of Machine Elements', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351901', 'Design of Shafts, Keys, Couplings, Screws, Fasteners, Springs & Welded Joints'],
    ['sub_me_5_4351902', 'me', 5, 'new', '4351902', 'Power Plant Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351902', 'Thermal, Hydroelectric, Nuclear & Renewable Power Generation Technologies'],
    ['sub_me_5_4351903', 'me', 5, 'new', '4351903', 'Industrial Engineering & Operations Research', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351903', 'Work Study, Ergonomics, Production Planning, Inventory Control & Linear Programming'],

    ['sub_me_6_4361901', 'me', 6, 'new', '4361901', 'Refrigeration & Air Conditioning (RAC)', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361901', 'Vapour Compression & Absorption Systems, Psychrometry & Cooling Load Calculations'],
    ['sub_me_6_4361902', 'me', 6, 'new', '4361902', 'Automobile Engineering Systems', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4361902', 'IC Engine Overhauling, Transmission, Steering, Braking & Hybrid Electric Vehicles'],
    ['sub_me_6_4361903', 'me', 6, 'new', '4361903', 'Mechatronics & Industrial Robotics', 3, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361903', 'Sensors, Actuators, PLC Programming, Electro-Pneumatics & Robot Kinematics'],
    ['sub_me_6_4361904', 'me', 6, 'new', '4361904', 'Major Mechanical Design Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4361904', 'Machine Fabrication, Stress Analysis, Performance Testing & Final Viva'],

    // ==========================================
    // 4. CIVIL ENGINEERING (CL) - Sem 1 to 6
    // ==========================================
    ['sub_cl_1_4300001', 'cl', 1, 'new', '4300001', 'Applied Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Civil Mathematical Foundations, Trigonometry, Coordinate Geometry & Matrices'],
    ['sub_cl_1_4300006', 'cl', 1, 'new', '4300006', 'Applied Chemistry for Civil', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300006', 'Water Treatment, Cement Chemistry, Corrosion, Polymers & Environmental Analysis'],
    ['sub_cl_1_4310601', 'cl', 1, 'new', '4310601', 'Basic Civil Engineering & Materials', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310601', 'Bricks, Cement, Mortar, Concrete, Foundations, Masonry & Building Construction'],
    ['sub_cl_1_4310602', 'cl', 1, 'new', '4310602', 'Civil Engineering Drawing', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310602', 'Building Plans, Elevations, Sections, Municipal By-Laws & CAD Drafting'],

    ['sub_cl_2_4300011', 'cl', 2, 'new', '4300011', 'Applied Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Differential Calculus, Integral Calculus & Civil Numerical Applications'],
    ['sub_cl_2_4320601', 'cl', 2, 'new', '4320601', 'Applied Mechanics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320601', 'Statics, Law of Coplanar Forces, Truss Analysis, Friction, Centroid & Moment of Inertia'],
    ['sub_cl_2_4320602', 'cl', 2, 'new', '4320602', 'Building Construction Technology', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320602', 'Substructure, Superstructure, Scaffolding, Doors, Windows, Stairs & Waterproofing'],
    ['sub_cl_2_4320603', 'cl', 2, 'new', '4320603', 'Construction Materials Testing', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320603', 'Compressive Strength, Slump Test, Sieve Analysis, Bitumen & Aggregate Tests'],

    ['sub_cl_3_4330601', 'cl', 3, 'new', '4330601', 'Surveying & Levelling', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330601', 'Chain Survey, Compass Survey, Plane Table, Leveling, Theodolite & Total Station'],
    ['sub_cl_3_4330602', 'cl', 3, 'new', '4330602', 'Mechanics of Structures', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330602', 'Stress-Strain, Shear Force & Bending Moment Diagrams (SFD/BMD), Torsion & Deflection'],
    ['sub_cl_3_4330603', 'cl', 3, 'new', '4330603', 'Building Planning & Architecture', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330603', 'Residential & Public Building Planning, Vaastu Basics, Ventilation & Green Buildings'],
    ['sub_cl_3_4330604', 'cl', 3, 'new', '4330604', 'Concrete Technology', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330604', 'Cement Grades, Admixtures, Mix Design (IS 10262), Workability & Durability of Concrete'],

    ['sub_cl_4_4340601', 'cl', 4, 'new', '4340601', 'Advanced Surveying & Geomatics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340601', 'Tacheometry, Curve Setting, GPS, GIS Mapping, Remote Sensing & Drone Surveying'],
    ['sub_cl_4_4340602', 'cl', 4, 'new', '4340602', 'Hydraulics & Water Resources Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340602', 'Hydrostatics, Flow through Pipes & Open Channels, Weirs, Notches & Hydraulic Pumps'],
    ['sub_cl_4_4340603', 'cl', 4, 'new', '4340603', 'Structural Analysis', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340603', 'Fixed & Continuous Beams, Moment Distribution Method, Slope Deflection & Moving Loads'],
    ['sub_cl_4_4340604', 'cl', 4, 'new', '4340604', 'Transportation & Highway Engineering', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340604', 'Highway Geometric Design, Pavement Materials, Traffic Engineering & Road Maintenance'],

    ['sub_cl_5_4350601', 'cl', 5, 'new', '4350601', 'Design of Reinforced Concrete Structures (RCC)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350601', 'Limit State Method (IS 456:2000), Singly/Doubly Beams, Flanged Beams, Slabs & Columns'],
    ['sub_cl_5_4350602', 'cl', 5, 'new', '4350602', 'Soil Mechanics & Geotechnical Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350602', 'Soil Index Properties, Permeability, Shear Strength, Bearing Capacity & Earth Pressure'],
    ['sub_cl_5_4350603', 'cl', 5, 'new', '4350603', 'Water Supply & Sanitary Engineering', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350603', 'Water Treatment Plants, Distribution Networks, Sewage Treatment & Solid Waste Mgmt'],
    ['sub_cl_5_4350604', 'cl', 5, 'new', '4350604', 'Estimating, Costing & Valuation', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350604', 'Rate Analysis, Detailed Building Estimates, BOQ Preparation & Property Valuation'],

    ['sub_cl_6_4360601', 'cl', 6, 'new', '4360601', 'Design of Steel Structures (IS 800:2007)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4360601', 'Bolted/Welded Connections, Tension Members, Compression Members, Roof Trusses & Girders'],
    ['sub_cl_6_4360602', 'cl', 6, 'new', '4360602', 'Construction Management & Safety', 3, 'Applied Tech', 'https://gtu.ac.in/syllabus/4360602', 'CPM/PERT Networks, Site Management, Safety Regulations & Construction Contracts'],
    ['sub_cl_6_4360603', 'cl', 6, 'new', '4360603', 'Major Civil Engineering Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4360603', 'Comprehensive Structural Design / Highway Planning Project, Report & Viva'],

    // ==========================================
    // 5. ELECTRICAL ENGINEERING (EE) - Sem 1 to 6
    // ==========================================
    ['sub_ee_1_4300001', 'ee', 1, 'new', '4300001', 'Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Electrical Mathematical Tools, Matrices, Determinants, Vectors & Complex Numbers'],
    ['sub_ee_1_4300002', 'ee', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Electromagnetism, Magnetic Induction, Optics, Laser & Semiconductor Basics'],
    ['sub_ee_1_4310901', 'ee', 1, 'new', '4310901', 'Fundamental of Electrical Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310901', 'Ohm Law, Kirchhoff Laws, DC Circuits, Magnetic Circuits, AC Fundamentals & Phasors'],
    ['sub_ee_1_4310902', 'ee', 1, 'new', '4310902', 'Electrical Materials & Wiring Practice', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310902', 'Conductors, Insulators, Magnetic Materials, Domestic Wiring & Earthing Systems'],

    ['sub_ee_2_4300011', 'ee', 2, 'new', '4300011', 'Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Calculus, Differential Equations, Fourier Series & Laplace Transforms'],
    ['sub_ee_2_4320901', 'ee', 2, 'new', '4320901', 'DC Machines & Single Phase Transformers', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320901', 'DC Generator & Motor Principles, Characteristics, Speed Control, Transformer OC/SC Tests'],
    ['sub_ee_2_4320902', 'ee', 2, 'new', '4320902', 'Electronic Devices & Circuits', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320902', 'PN Junction Diodes, Zener, BJT Transistors, Rectifiers, Filters & Power Supplies'],
    ['sub_ee_2_4320903', 'ee', 2, 'new', '4320903', 'Electrical Circuit Analysis', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320903', 'Mesh/Nodal Analysis, Thevenin, Norton, Superposition, Maximum Power Transfer & RLC Resonance'],

    ['sub_ee_3_4330901', 'ee', 3, 'new', '4330901', 'AC Machines & Transformers', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330901', '3-Phase Induction Motors, Synchronous Generators, Alternator Regulation & Special Motors'],
    ['sub_ee_3_4330902', 'ee', 3, 'new', '4330902', 'Electrical Power Generation & Transmission', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330902', 'Thermal, Hydro, Nuclear, Solar & Wind Power Plants, Transmission Lines & Grid Systems'],
    ['sub_ee_3_4330903', 'ee', 3, 'new', '4330903', 'Analog Electronics & Linear ICs', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330903', 'Op-Amp 741, Inverting/Non-inverting Amplifiers, 555 Timers, Voltage Regulators & Oscillators'],
    ['sub_ee_3_4330904', 'ee', 3, 'new', '4330904', 'Electrical Measurements & Instrumentation', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330904', 'PMMC, MI Meters, Wattmeters, Energy Meters, CT/PT, Bridges & Digital Multimeters'],

    ['sub_ee_4_4340901', 'ee', 4, 'new', '4340901', 'Transmission & Distribution of Electrical Power', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340901', 'Overhead Line Constants, Corona Effect, Insulators, Sag Calculation & Underground Cables'],
    ['sub_ee_4_4340902', 'ee', 4, 'new', '4340902', 'Digital Electronics & Microcontroller 8051', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340902', 'Number Systems, Logic Gates, 8051 Architecture, Instruction Set & Assembly Coding'],
    ['sub_ee_4_4340903', 'ee', 4, 'new', '4340903', 'Power Electronics & Converters', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340903', 'SCR, TRIAC, MOSFET, IGBT, Controlled Rectifiers, Choppers, Inverters & Cycloconverters'],

    ['sub_ee_5_4350901', 'ee', 5, 'new', '4350901', 'Switchgear & Power System Protection', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350901', 'Circuit Breakers (SF6, Vacuum), Electromagnetic & Numerical Relays, Feeder & Transformer Protection'],
    ['sub_ee_5_4350902', 'ee', 5, 'new', '4350902', 'Electrical Installation, Estimating & Costing', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350902', 'Residential, Commercial & Industrial Wiring Estimation, Tender Notices & IE Rules'],
    ['sub_ee_5_4350903', 'ee', 5, 'new', '4350903', 'Industrial Drives & Control Systems', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4350903', 'AC/DC Motor Speed Control Drives, VFDs, PLC Automation & SCADA Monitoring'],

    ['sub_ee_6_4360901', 'ee', 6, 'new', '4360901', 'Power System Operation & Control', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4360901', 'Load Flow Studies, Automatic Voltage Regulators (AVR), Economic Load Dispatch & Smart Grids'],
    ['sub_ee_6_4360902', 'ee', 6, 'new', '4360902', 'Electrical Traction & EV Technology', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4360902', 'Electric Locomotive Systems, Speed-Time Curves, EV Motors, Battery Management (BMS) & Charging'],
    ['sub_ee_6_4360903', 'ee', 6, 'new', '4360903', 'Major Electrical Engineering Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4360903', 'Power System Hardware / Solar PV / Motor Drive Fabrication Project & Final Viva'],

    // ==========================================
    // 6. ELECTRONICS & COMMUNICATION (EC) - Sem 1 to 6
    // ==========================================
    ['sub_ec_1_4300001', 'ec', 1, 'new', '4300001', 'Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Calculus, Trigonometry & Matrices for Electronic Engineering'],
    ['sub_ec_1_4300002', 'ec', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Semiconductors, Quantum Physics, Laser & Optical Devices'],
    ['sub_ec_1_4311101', 'ec', 1, 'new', '4311101', 'Basic Electronics & Components', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311101', 'Resistors, Capacitors, Inductors, PN Junctions, Diodes & Transistors'],
    ['sub_ec_1_4311102', 'ec', 1, 'new', '4311102', 'Electronic Workshop & PCB Design', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4311102', 'Soldering, De-soldering, PCB Layout Drawing, Etching & Component Testing'],

    ['sub_ec_2_4300011', 'ec', 2, 'new', '4300011', 'Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Differential Equations, Laplace Transforms & Complex Variables'],
    ['sub_ec_2_4321101', 'ec', 2, 'new', '4321101', 'Electronic Devices & Circuits', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321101', 'BJT, JFET, MOSFET Biasing, Small Signal Amplifiers & Frequency Response'],
    ['sub_ec_2_4321102', 'ec', 2, 'new', '4321102', 'Digital Logic Design', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4321102', 'K-Maps, Combinational & Sequential Circuits, Counters, Shift Registers & Memory'],

    ['sub_ec_3_4331101', 'ec', 3, 'new', '4331101', 'Principles of Electronic Communication', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331101', 'Amplitude Modulation (AM), Frequency Modulation (FM), Receivers & Noise Analysis'],
    ['sub_ec_3_4331102', 'ec', 3, 'new', '4331102', 'Linear Integrated Circuits & Op-Amps', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331102', 'Op-Amp 741 Applications, Active Filters, Comparators, 555 Timers & PLL'],
    ['sub_ec_3_4331103', 'ec', 3, 'new', '4331103', 'Digital Electronics & HDL Basics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331103', 'Logic Families (TTL, CMOS), VHDL/Verilog Syntax & FPGA Architecture'],
    ['sub_ec_3_4331104', 'ec', 3, 'new', '4331104', 'Electronic Instruments & Measurements', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4331104', 'CRO, DSO, Function Generators, Spectrum Analyzers & Signal Generators'],

    ['sub_ec_4_4341101', 'ec', 4, 'new', '4341101', 'Microcontroller & Embedded C Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341101', '8051 & ARM Cortex Architectures, Timers, Interrupts, ADC/DAC & UART Interfacing'],
    ['sub_ec_4_4341102', 'ec', 4, 'new', '4341102', 'Signals & Linear Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341102', 'Continuous & Discrete Signals, Convolution, Fourier Transform & Z-Transforms'],
    ['sub_ec_4_4341103', 'ec', 4, 'new', '4341103', 'Digital Communication & Coding', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4341103', 'PCM, DPCM, ASK, FSK, PSK, QAM, Information Theory & Error Correction Codes'],

    ['sub_ec_5_4351101', 'ec', 5, 'new', '4351101', 'VLSI Design & CMOS Technologies', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351101', 'MOS Transistor Theory, CMOS Inverter, Layout Stick Diagrams & ASIC Flow'],
    ['sub_ec_5_4351102', 'ec', 5, 'new', '4351102', 'Optical Fiber Communication', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351102', 'Fiber Modes, Attenuation, Dispersion, LASER/LED Sources, Photodetectors & WDM'],
    ['sub_ec_5_4351103', 'ec', 5, 'new', '4351103', 'Wireless & Mobile Communication (4G/5G)', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4351103', 'Cellular Concepts, Handover, GSM Architecture, CDMA, LTE & 5G NR Standards'],

    ['sub_ec_6_4361101', 'ec', 6, 'new', '4361101', 'Embedded IoT Systems Design', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361101', 'ESP32, Raspberry Pi, MQTT, CoAP, Node-RED & Cloud IoT Dashboards'],
    ['sub_ec_6_4361102', 'ec', 6, 'new', '4361102', 'Satellite & Radar Engineering', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4361102', 'Orbital Mechanics, Link Budget, Radar Range Equation, MTI Radar & Transponders'],
    ['sub_ec_6_4361103', 'ec', 6, 'new', '4361103', 'Major EC Capstone Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4361103', 'Hardware & Firmware Circuit Development, Testing, Prototype & Viva'],

    // ==========================================
    // 7. AUTOMOBILE ENGINEERING (AE) - Sem 1 to 6
    // ==========================================
    ['sub_ae_1_4300001', 'ae', 1, 'new', '4300001', 'Mathematics - I', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300001', 'Mathematical Foundations for Automotive Engineers'],
    ['sub_ae_1_4300002', 'ae', 1, 'new', '4300002', 'Applied Physics', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/4300002', 'Mechanics, Friction, Thermal Expansion & Fluids in Automotive Systems'],
    ['sub_ae_1_4310201', 'ae', 1, 'new', '4310201', 'Basic Automobile Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310201', 'Vehicle Classification, Chassis Layouts, Engine Construction & Powertrain Overview'],
    ['sub_ae_1_4310202', 'ae', 1, 'new', '4310202', 'Engineering Graphics for Automotive', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4310202', 'AutoCAD 2D Drafting, Isometric Views & Automotive Component Drawings'],

    ['sub_ae_2_4300011', 'ae', 2, 'new', '4300011', 'Mathematics - II', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/4300011', 'Calculus, Differential Equations & Vehicle Numerical Methods'],
    ['sub_ae_2_4320201', 'ae', 2, 'new', '4320201', 'Automotive Materials & Metallurgy', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320201', 'Alloy Steels, Aluminium, Composites, Ceramics & Heat Treatments in Vehicles'],
    ['sub_ae_2_4320202', 'ae', 2, 'new', '4320202', 'Automobile Engines - I', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320202', '2-Stroke & 4-Stroke SI/CI Engines, Valve Timing, Carburetors & Fuel Pumps'],
    ['sub_ae_2_4320203', 'ae', 2, 'new', '4320203', 'Mechanics of Vehicles', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4320203', 'Force Systems, Torsion, Bending Stresses, Vehicle Equilibrium & Dynamic Stability'],

    ['sub_ae_3_4330201', 'ae', 3, 'new', '4330201', 'Automobile Engines - II', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330201', 'CRDI, MPFI Fuel Injection, Turbochargers, Superchargers & Engine Performance Testing'],
    ['sub_ae_3_4330202', 'ae', 3, 'new', '4330202', 'Automobile Transmission Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330202', 'Clutches, Manual Gearboxes, Synchromesh, Propeller Shafts, Differentials & Axles'],
    ['sub_ae_3_4330203', 'ae', 3, 'new', '4330203', 'Automotive Electrical & Electronic Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330203', 'Starting Motors, Alternators, Ignition Systems, ECU Sensors & Wiring Harnesses'],
    ['sub_ae_3_4330204', 'ae', 3, 'new', '4330204', 'Strength of Vehicle Components', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/4330204', 'Stress Analysis in Chassis, Axles, Drive Shafts & Suspension Leaves'],

    ['sub_ae_4_4340201', 'ae', 4, 'new', '4340201', 'Automobile Chassis, Body & Suspension', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340201', 'Chassis Frames, McPherson Struts, Air Suspensions, Steering Geometry & Power Steering'],
    ['sub_ae_4_4340202', 'ae', 4, 'new', '4340202', 'Vehicle Dynamics & Braking Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340202', 'Hydraulic/Pneumatic Brakes, ABS, EBD, Vehicle Roll, Cornering Force & Aerodynamics'],
    ['sub_ae_4_4340203', 'ae', 4, 'new', '4340203', 'Heat Power Engineering for Auto', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340203', 'Air Standard Cycles (Otto, Diesel, Dual), Air Compressors & Heat Exchangers'],

    ['sub_ae_5_4350201', 'ae', 5, 'new', '4350201', 'Electric & Hybrid Vehicles (EV Technology)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350201', 'BEV, PHEV, HEV Powertrains, BLDC/PMSM Motors, Lithium Battery Packs, BMS & Fast Charging'],
    ['sub_ae_5_4350202', 'ae', 5, 'new', '4350202', 'Automotive Electronic & Safety Systems', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4350202', 'CAN Bus, OBD-II Diagnostics, Airbags, Traction Control (TCS), ESP & TPMS'],
    ['sub_ae_5_4350203', 'ae', 5, 'new', '4350203', 'Vehicle Testing & Diagnostics', 3, 'Applied Tech', 'https://gtu.ac.in/syllabus/4350203', 'Dynamometer Testing, Wheel Alignment, Emission Testing (BS-VI Standards) & Noise/Vibration'],

    ['sub_ae_6_4360201', 'ae', 6, 'new', '4360201', 'Modern Vehicle Technology & ADAS', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/4360201', 'Autonomous Driving Levels, Radar/LiDAR Sensors, Lane Assist, Cruise Control & Telematics'],
    ['sub_ae_6_4360202', 'ae', 6, 'new', '4360202', 'Automobile Maintenance & Workshop Practice', 4, 'Applied Tech', 'https://gtu.ac.in/syllabus/4360202', 'Engine Overhauling, Wheel Balancing, Brake Bleeding, Garage Management & MV Act'],
    ['sub_ae_6_4360203', 'ae', 6, 'new', '4360203', 'Major Automobile Engineering Project', 6, 'Project', 'https://gtu.ac.in/syllabus/4360203', 'Vehicle Subsystem Prototyping, Go-Kart/EV Conversion, Testing & Final Report'],

    // =========================================================================
    // 📜 GTU OLD TEACHING SCHEME (33-SERIES / LEGACY SYLLABUS) - SEMESTERS 1 TO 6
    // =========================================================================

    // 1. COMPUTER ENGINEERING (CE) - Old Scheme
    ['sub_ce_1_3300001', 'ce', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Logarithms, Determinants, Matrices, Trigonometry, Vectors & Mensuration'],
    ['sub_ce_1_3300002', 'ce', 1, 'old', '3300002', 'English & Communication', 3, 'Humanities', 'https://gtu.ac.in/syllabus/3300002', 'English Grammar, Vocabulary, Reading & Technical Letter Writing'],
    ['sub_ce_1_3300004', 'ce', 1, 'old', '3300004', 'Engineering Physics (Group-1)', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300004', 'SI Units, Motion, Nanotechnology, Fiber Optics, Acoustics & Radioactivity'],
    ['sub_ce_1_3310701', 'ce', 1, 'old', '3310701', 'Computer Programming (C)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3310701', 'C Fundamentals, Operators, Control Statements, Arrays, Functions & Pointers'],

    ['sub_ce_2_3300007', 'ce', 2, 'old', '3300007', 'Basic Engineering Drawing', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3300007', 'Engineering Curves, Orthographic & Isometric Projections'],
    ['sub_ce_2_3320701', 'ce', 2, 'old', '3320701', 'Advanced C Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320701', 'Structures, Unions, Pointers to Functions, Dynamic Memory Allocation & File Handling'],
    ['sub_ce_2_3320702', 'ce', 2, 'old', '3320702', 'Basic Electronics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320702', 'Diodes, Transistors, FET, Amplifiers & Regulated Power Supplies'],
    ['sub_ce_2_3300003', 'ce', 2, 'old', '3300003', 'Environment Conservation & Hazard Management', 3, 'Basic Science', 'https://gtu.ac.in/syllabus/3300003', 'Ecosystems, Pollution Control, Disaster Management & Environmental Laws'],

    ['sub_ce_3_3330701', 'ce', 3, 'old', '3330701', 'Operating System', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330701', 'Processes, CPU Scheduling, Memory Management & UNIX Commands'],
    ['sub_ce_3_3330702', 'ce', 3, 'old', '3330702', 'Programming in C++', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330702', 'OOP Principles, Classes, Constructors, Operator Overloading, Inheritance & Virtual Functions'],
    ['sub_ce_3_3330703', 'ce', 3, 'old', '3330703', 'Database Management System', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330703', 'Data Models, SQL, Relational Algebra, Functional Dependencies & Normalization'],
    ['sub_ce_3_3330704', 'ce', 3, 'old', '3330704', 'Data Structure', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330704', 'Stacks, Queues, Linked Lists, Trees, Sorting Techniques & Graph Traversals'],
    ['sub_ce_3_3330705', 'ce', 3, 'old', '3330705', 'Microprocessor & Assembly Language', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330705', '8085 Architecture, Instruction Set, Addressing Modes & Peripheral Interfacing'],

    ['sub_ce_4_3340701', 'ce', 4, 'old', '3340701', 'Advanced Database Management System', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340701', 'PL/SQL, Triggers, Cursors, Transaction Control & Distributed Databases'],
    ['sub_ce_4_3340702', 'ce', 4, 'old', '3340702', 'Computer Networks', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/4340702', 'Network Topologies, OSI Layers, TCP/IP, IP Subnetting & Network Devices'],
    ['sub_ce_4_3340703', 'ce', 4, 'old', '3340703', 'Software Engineering', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340703', 'Software Life Cycle Models, SRS, Software Design, Testing & Maintenance'],
    ['sub_ce_4_3340704', 'ce', 4, 'old', '3340704', 'Computer Organization & Architecture', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340704', 'Register Transfer, Micro-operations, CPU Architecture & Memory Organization'],
    ['sub_ce_4_3340705', 'ce', 4, 'old', '3340705', '.NET Programming with C#', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340705', '.NET Framework, C# Syntax, Windows Forms, ADO.NET & Database Controls'],

    ['sub_ce_5_3350701', 'ce', 5, 'old', '3350701', 'Computer Maintenance & Troubleshooting', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350701', 'Motherboards, SMPS, Hard Disks, BIOS Setup, Diagnostics & Hardware Troubleshooting'],
    ['sub_ce_5_3350702', 'ce', 5, 'old', '3350702', 'Dynamic Web Page Development (PHP)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350702', 'PHP Scripting, Form Handling, Cookie/Session Management & MySQL Connectivity'],
    ['sub_ce_5_3350703', 'ce', 5, 'old', '3350703', 'Java Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350703', 'Java OOP, Packages, Interfaces, Exception Handling, Applets & AWT GUI'],
    ['sub_ce_5_3350704', 'ce', 5, 'old', '3350704', 'Computer Graphics', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350704', 'Line/Circle Drawing Algorithms, 2D Transformations, Clipping & Windowing'],

    ['sub_ce_6_3360701', 'ce', 6, 'old', '3360701', 'Advance Java Programming', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360701', 'JDBC, Servlets, JSP, JavaBeans, RMI & Network Sockets in Java'],
    ['sub_ce_6_3360702', 'ce', 6, 'old', '3360702', 'Network Management & Information Security', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360702', 'Network Administration, Firewalls, Cryptography, VPN & Cyber Law'],
    ['sub_ce_6_3360703', 'ce', 6, 'old', '3360703', 'Mobile Computing & Wireless Communication', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360703', 'Wireless LAN, GSM, GPRS, Mobile IP & Android App Basics'],
    ['sub_ce_6_3360704', 'ce', 6, 'old', '3360704', 'Project - II', 6, 'Project', 'https://gtu.ac.in/syllabus/3360704', 'Software Development, System Testing, Deployment, Report & Viva'],

    // 2. INFORMATION TECHNOLOGY (IT) - Old Scheme
    ['sub_it_1_3300001', 'it', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Mathematics for Information Technology'],
    ['sub_it_1_3310701', 'it', 1, 'old', '3310701', 'Computer Programming (C)', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3310701', 'Structured Programming & Algorithms in C'],
    ['sub_it_2_3320701', 'it', 2, 'old', '3320701', 'Advanced C Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320701', 'Pointers, Dynamic Structures & File Operations'],
    ['sub_it_3_3330703', 'it', 3, 'old', '3330703', 'Database Management System', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330703', 'Relational Databases & SQL Queries'],
    ['sub_it_3_3330704', 'it', 3, 'old', '3330704', 'Data Structure', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330704', 'Stack, Queue, Tree & Searching Algorithms'],
    ['sub_it_4_3340702', 'it', 4, 'old', '3340702', 'Computer Networks', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340702', 'Network Protocols & Routing Technologies'],
    ['sub_it_5_3350703', 'it', 5, 'old', '3350703', 'Java Programming', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350703', 'Java Architecture, OOP & Multithreading'],
    ['sub_it_6_3360701', 'it', 6, 'old', '3360701', 'Advance Java Programming', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360701', 'Enterprise Web Applications in Java'],

    // 3. MECHANICAL ENGINEERING (ME) - Old Scheme
    ['sub_me_1_3300001', 'me', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Mechanical Mathematics Fundamentals'],
    ['sub_me_1_3300007', 'me', 1, 'old', '3300007', 'Basic Engineering Drawing', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3300007', 'Engineering Curves & Drafting Rules'],
    ['sub_me_2_3321901', 'me', 2, 'old', '3321901', 'Applied Mechanics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3321901', 'Laws of Mechanics, Statics & Friction'],
    ['sub_me_3_3331901', 'me', 3, 'old', '3331901', 'Fluid Mechanics & Hydraulic Machines', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3331901', 'Fluid Flow, Pressure & Turbines'],
    ['sub_me_3_3331902', 'me', 3, 'old', '3331902', 'Manufacturing Engineering - I', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3331902', 'Lathe, Shaper & Drilling Operations'],
    ['sub_me_4_3341901', 'me', 4, 'old', '3341901', 'Manufacturing Engineering - II', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3341901', 'Milling, Grinding & CNC Machining'],
    ['sub_me_4_3341902', 'me', 4, 'old', '3341902', 'Theory of Machines', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3341902', 'Kinematics, Cams & Gear Trains'],
    ['sub_me_5_3351901', 'me', 5, 'old', '3351901', 'Design of Machine Elements', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3351901', 'Machine Design Standards & Calculations'],
    ['sub_me_6_3361901', 'me', 6, 'old', '3361901', 'Computer Aided Manufacturing', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3361901', 'CAM, CNC Programming & Automation'],

    // 4. CIVIL ENGINEERING (CL) - Old Scheme
    ['sub_cl_1_3300001', 'cl', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Civil Mathematics Foundations'],
    ['sub_cl_2_3320601', 'cl', 2, 'old', '3320601', 'Applied Mechanics', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320601', 'Forces, Trusses & Structural Equilibrium'],
    ['sub_cl_3_3330601', 'cl', 3, 'old', '3330601', 'Surveying', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330601', 'Chain, Compass & Leveling Survey'],
    ['sub_cl_4_3340602', 'cl', 4, 'old', '3340602', 'Concrete Technology', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340602', 'Concrete Mix Design & Testing'],
    ['sub_cl_5_3350601', 'cl', 5, 'old', '3350601', 'Design of Steel Structures', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350601', 'Steel Design & Welded Connections'],
    ['sub_cl_6_3360601', 'cl', 6, 'old', '3360601', 'Design of Reinforced Concrete Structures', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360601', 'RCC Slabs, Beams & Columns'],

    // 5. ELECTRICAL ENGINEERING (EE) - Old Scheme
    ['sub_ee_1_3300001', 'ee', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Electrical Mathematical Foundations'],
    ['sub_ee_2_3320901', 'ee', 2, 'old', '3320901', 'Electrical Circuits', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320901', 'Circuit Laws & Theorems'],
    ['sub_ee_3_3330901', 'ee', 3, 'old', '3330901', 'AC Circuits', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330901', 'Single & 3-Phase AC Circuits'],
    ['sub_ee_4_3340901', 'ee', 4, 'old', '3340901', 'Induction & Synchronous Machines', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340901', 'AC Motor Operations & Control'],
    ['sub_ee_5_3350901', 'ee', 5, 'old', '3350901', 'Switchgear & Protection', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350901', 'Power Protection & Breakers'],
    ['sub_ee_6_3360901', 'ee', 6, 'old', '3360901', 'Industrial Automation & PLC', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360901', 'PLC Ladder Programming & Drives'],

    // 6. ELECTRONICS & COMMUNICATION (EC) - Old Scheme
    ['sub_ec_1_3300001', 'ec', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'EC Mathematics'],
    ['sub_ec_2_3321101', 'ec', 2, 'old', '3321101', 'Electronic Devices & Circuits', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3321101', 'Semiconductors & Amplifiers'],
    ['sub_ec_3_3331101', 'ec', 3, 'old', '3331101', 'Electronic Circuits', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3331101', 'Analog & Active Filters'],
    ['sub_ec_4_3341102', 'ec', 4, 'old', '3341102', 'Microprocessor & Microcontroller', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3341102', '8085 & 8051 Architecture'],
    ['sub_ec_5_3351101', 'ec', 5, 'old', '3351101', 'Optical Fiber Communication', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3351101', 'Fiber Optics & Light Transmission'],
    ['sub_ec_6_3361101', 'ec', 6, 'old', '3361101', 'Wireless & Mobile Communication', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3361101', 'Cellular Technology & Antennas'],

    // 7. AUTOMOBILE ENGINEERING (AE) - Old Scheme
    ['sub_ae_1_3300001', 'ae', 1, 'old', '3300001', 'Basic Mathematics', 4, 'Basic Science', 'https://gtu.ac.in/syllabus/3300001', 'Automotive Mathematics'],
    ['sub_ae_2_3320201', 'ae', 2, 'old', '3320201', 'Automotive Materials', 3, 'Core Engineering', 'https://gtu.ac.in/syllabus/3320201', 'Steels & Alloys in Vehicles'],
    ['sub_ae_3_3330201', 'ae', 3, 'old', '3330201', 'Automobile Engines', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3330201', '2-Stroke/4-Stroke Engine Principles'],
    ['sub_ae_4_3340201', 'ae', 4, 'old', '3340201', 'Automobile Component Design', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3340201', 'Design of Vehicle Chassis & Axles'],
    ['sub_ae_5_3350201', 'ae', 5, 'old', '3350201', 'Hybrid & Electric Vehicles', 4, 'Core Engineering', 'https://gtu.ac.in/syllabus/3350201', 'Early Electric & Hybrid Powertrains'],
    ['sub_ae_6_3360201', 'ae', 6, 'old', '3360201', 'Automobile Air Conditioning', 4, 'Advanced Tech', 'https://gtu.ac.in/syllabus/3360201', 'Automotive HVAC Systems']
  ];

  allSubjects.forEach(s => {
    let id, branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description;
    if (s.length === 10) {
      [id, branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description] = s;
    } else {
      [id, branch_id, sem_number, subject_code, subject_name, credits, category, syllabus_url, description] = s;
      scheme = subject_code.startsWith('33') ? 'old' : 'new';
    }
    insertSubject.run(id, branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description);
  });

  console.log(`Inserted ${allSubjects.length} GTU diploma curriculum subjects (New 43-Series & Old 33-Series) across all 7 branches & 6 semesters.`);

  // 4. Study Materials (Notes, Cheatsheets, Chapter notes across branches)
  const insertMaterial = db.prepare(`
    INSERT INTO materials (subject_id, branch_id, sem_number, title, chapter_no, chapter_name, file_type, file_url, file_size, download_count, description, author)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materials = [
    // CE Sem 3
    ['sub_ce_3_4330701', 'ce', 3, 'Complete Linear Data Structures (Stack & Queue Implementation Guide)', 1, 'Linear Data Structures', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-ds-ch1-stack-queue.pdf', '3.8 MB', 1420, 'Comprehensive GTU lecture notes covering stack operations (PUSH, POP, PEEP, CHANGE), Infix to Postfix conversion algorithms, Circular Queues, Priority Queues with fully tested C code and dry runs.', 'Prof. H. R. Patel (GTU Subject Expert)'],
    ['sub_ce_3_4330701', 'ce', 3, 'Singly & Doubly Linked List Handwritten Notes & Viva Cheatsheet', 2, 'Linked Lists', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-ds-ch2-linked-list.pdf', '2.5 MB', 980, 'Step-by-step pointer manipulation diagrams, node insertion at start/end/middle, deletion algorithms, circular linked list with memory allocation explanation.', 'Er. Neha Shah'],
    ['sub_ce_3_4330701', 'ce', 3, 'Non-Linear Data Structures: Binary Search Trees & AVL Rotations', 3, 'Trees and Graphs', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-ds-ch3-trees.pdf', '4.2 MB', 1210, 'Tree traversals (Inorder, Preorder, Postorder), AVL Tree LL/RR/LR/RL balance rotations with solved numerical examples and GTU 7-mark question templates.', 'Prof. H. R. Patel'],
    ['sub_ce_3_4330701', 'ce', 3, 'Graph Algorithms (BFS, DFS, Dijkstra, Kruskal & Prim)', 4, 'Graphs & Shortest Path', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-ds-ch4-graphs.pdf', '3.1 MB', 850, 'Graph representation (Adjacency Matrix & List), BFS/DFS tracing, Minimum Spanning Tree algorithms step-by-step with GTU previous year solved problems.', 'Prof. D. K. Joshi'],
    ['sub_ce_3_4330702', 'ce', 3, 'CPU Scheduling & Process Synchronization Master Notes', 2, 'Process Management', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-os-ch2-cpu-scheduling.pdf', '3.4 MB', 1650, 'Detailed Gantt charts for FCFS, SJF (Preemptive/Non-preemptive), Round Robin, Priority Scheduling. Critical Section problem, Semaphores and Dining Philosophers problem.', 'Prof. J. M. Mehta'],
    ['sub_ce_3_4330702', 'ce', 3, 'Memory Management, Paging & Virtual Memory with Solved Numericals', 3, 'Memory Management', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-os-ch3-paging.pdf', '2.9 MB', 1120, 'Page Replacement algorithms (FIFO, LRU, Optimal), Page Fault calculations, Belady Anomaly, Segmentation vs Paging comparative table.', 'Prof. J. M. Mehta'],
    ['sub_ce_3_4330703', 'ce', 3, 'OSI 7 Layers & TCP/IP Protocol Suite Master Architecture', 1, 'Network Layer Models', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem3-cn-osi-layers.pdf', '3.7 MB', 1340, 'Complete breakdown of all 7 layers of OSI Model with protocol mnemonics, IP addressing (IPv4 Classes, Subnetting), and packet header diagrams.', 'Prof. R. S. Modi'],
    
    // CE Sem 1, 2, 4, 5, 6
    ['sub_ce_1_4310701', 'ce', 1, 'C Language Fundamentals & Logic Building Complete Workbook', 1, 'Basics of C & Control Structures', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem1-c-prog-ch1.pdf', '4.5 MB', 2890, 'From basic syntax to nested loops, pattern printing programs, switch cases and operator precedence charts specifically structured for first-year GTU students.', 'Dr. V. B. Trivedi'],
    ['sub_ce_1_4310701', 'ce', 1, 'Pointers, Dynamic Memory & File Handling in C (With 50+ Solved Programs)', 4, 'Pointers and File Handling', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem1-c-prog-pointers.pdf', '3.2 MB', 2140, 'Pointer arithmetic, passing pointers to functions, malloc, calloc, realloc, free, file pointers (fopen, fprintf, fscanf, fseek) with GTU exam questions.', 'Dr. V. B. Trivedi'],
    ['sub_ce_2_4320702', 'ce', 2, 'Database Normalization Guide (1NF, 2NF, 3NF, BCNF with Real-World Examples)', 3, 'Normalization & Relational Design', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem2-dbms-normalization.pdf', '2.7 MB', 1840, 'Functional dependencies, finding candidate keys, step-by-step decomposition to 3NF/BCNF with zero ambiguity and GTU model solutions.', 'Prof. S. R. Desai'],
    ['sub_ce_2_4320702', 'ce', 2, 'Top 100 GTU SQL Queries Cheat Sheet & Transaction Isolation Levels', 4, 'SQL and Transactions', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem2-dbms-sql-cheatsheet.pdf', '2.1 MB', 2560, 'DDL, DML, DCL, TCL commands, complex JOINs, Aggregate functions, Subqueries, ACID properties and Concurrency Control methods.', 'Prof. S. R. Desai'],
    ['sub_ce_4_4340701', 'ce', 4, 'Python for Engineers: Complete Lecture Notes with Practical Lab Manual', 1, 'Core Python & Data Analysis', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem4-python-notes.pdf', '5.1 MB', 1780, 'Python data types, list comprehensions, lambda functions, OOP in Python, exception handling, and hands-on data manipulation using Pandas and NumPy.', 'Er. Rahul Soni'],
    ['sub_ce_5_4350701', 'ce', 5, 'Java Collections Framework & JDBC Integration Quick Handbook', 3, 'Collections and JDBC', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem5-java-collections.pdf', '3.6 MB', 1430, 'ArrayList, HashMap, HashSet, Iterators, Database connectivity (JDBC Driver, Connection, PreparedStatement, ResultSet) with complete sample CRUD application.', 'Prof. P. K. Shah'],
    ['sub_ce_6_4360701', 'ce', 6, 'Cloud Computing & DevOps: Docker, Kubernetes & AWS Essentials', 1, 'Cloud & Containers', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ce-sem6-cloud-devops.pdf', '4.4 MB', 1190, 'Containerization concepts, Dockerfiles, Kubernetes Pods/Deployments, CI/CD with GitHub Actions and AWS EC2/S3 cloud deployment guides.', 'Prof. K. L. Dave'],

    // IT Sem 3 & 4
    ['sub_it_3_4331601', 'it', 3, 'Data Structures in C++ Master Reference Notes', 1, 'Core Data Structures', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/it-sem3-ds-cpp.pdf', '3.9 MB', 1150, 'Template classes in C++, Stacks, Queues, Binary Search Trees, Graph Traversals and algorithm time complexities.', 'Prof. A. N. Varma'],
    ['sub_it_4_4341602', 'it', 4, 'PHP & MySQL Web Development Complete Laboratory Manual', 2, 'Server-side Scripting', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/it-sem4-php-mysql.pdf', '4.2 MB', 980, 'PHP syntax, GET/POST handling, Session & Cookies, MySQL PDO connections, and secure login/registration system implementation.', 'Er. Priya Rathod'],

    // ME Sem 1, 2, 3, 4
    ['sub_me_1_4311901', 'me', 1, 'Engineering Graphics: Orthographic & Isometric Projection Master Guide', 1, 'Projections of Solids', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/me-sem1-engg-graphics.pdf', '6.2 MB', 2200, 'First angle vs Third angle projections, step-by-step drafting of machine components, sectional views, and AutoCAD 2D command shortcuts.', 'Prof. V. K. Solanki'],
    ['sub_me_2_4321901', 'me', 2, 'Engineering Mechanics: Statics, Friction & Centroid Solved Numericals', 1, 'Force Systems & Friction', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/me-sem2-engg-mechanics.pdf', '4.5 MB', 1890, 'Lami Theorem, Varignon Theorem, Free Body Diagrams, Coefficient of Friction, and Centroid calculation of composite sections.', 'Prof. B. M. Patel'],
    ['sub_me_3_4331901', 'me', 3, 'Applied Thermodynamics: Steam Properties, Cycles & Solved Numericals', 1, 'Thermal Cycles & Laws', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/me-sem3-thermo-notes.pdf', '4.8 MB', 1290, 'Rankine cycle, Otto cycle, Diesel cycle calculations with Mollier chart and steam table usage guides for GTU exams.', 'Prof. K. N. Dave'],
    ['sub_me_3_4331902', 'me', 3, 'Fluid Mechanics & Turbines Complete Theory and Formula Sheet', 2, 'Hydraulic Machines', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/me-sem3-fluid-mechanics.pdf', '4.1 MB', 1040, 'Continuity equation, Bernoulli theorem, Venturimeter derivation, Pelton Wheel velocity triangles, and Centrifugal pump characteristics.', 'Prof. K. N. Dave'],

    // CL Sem 1, 2, 3, 5
    ['sub_cl_1_4310601', 'cl', 1, 'Basic Civil Engineering Materials: Cement, Brick & Concrete Tests', 1, 'Building Materials', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/cl-sem1-building-materials.pdf', '3.8 MB', 1450, 'Grades of Cement, manufacturing of bricks, IS testing methods, workability slump test, and foundation types.', 'Prof. A. S. Solanki'],
    ['sub_cl_3_4330601', 'cl', 3, 'Surveying Fieldwork & Leveling Book Calculation Methods', 1, 'Leveling and Contouring', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/cl-sem3-survey-notes.pdf', '3.9 MB', 1140, 'Height of Instrument (HI) method, Rise and Fall method, contour characteristics, Curvature and Refraction corrections.', 'Prof. A. S. Solanki'],
    ['sub_cl_5_4350601', 'cl', 5, 'Design of Reinforced Concrete Structures (IS 456:2000 Complete Formula Sheet)', 1, 'Limit State Design of Beams', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/cl-sem5-rcc-design.pdf', '5.2 MB', 1620, 'Singly and doubly reinforced beam design, shear reinforcement, one-way and two-way slabs, short column axial load capacity formulas.', 'Dr. M. K. Prajapati'],

    // EE Sem 1, 2, 3, 4
    ['sub_ee_1_4310901', 'ee', 1, 'DC Circuit Theorems & AC Fundamentals Formula Pocketbook', 1, 'Circuit Analysis', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ee-sem1-dc-circuits.pdf', '3.5 MB', 1980, 'Kirchhoff Laws, Thevenin and Norton step-by-step procedures, Star-Delta conversion, RLC series resonance, and power factor correction.', 'Prof. R. M. Parmar'],
    ['sub_ee_3_4330901', 'ee', 3, 'AC Machines & Transformers: Equivalent Circuit & Phasor Diagrams', 1, 'Transformers', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ee-sem3-ac-machines.pdf', '4.1 MB', 1310, 'Open Circuit (OC) and Short Circuit (SC) tests, efficiency calculations, voltage regulation and parallel operation of transformers.', 'Prof. R. M. Parmar'],
    ['sub_ee_4_4340903', 'ee', 4, 'Power Electronics: SCR, Choppers & Inverters Master Guide', 2, 'Power Semiconductor Devices', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ee-sem4-power-electronics.pdf', '3.9 MB', 980, 'Two-transistor model of SCR, gate triggering circuits, Buck-Boost choppers, single-phase full bridge inverters with waveform analysis.', 'Prof. T. J. Shah'],

    // EC Sem 1, 3, 4
    ['sub_ec_1_4311101', 'ec', 1, 'Electronic Components & Semiconductor Diodes Handbook', 1, 'Semiconductor Basics', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ec-sem1-basic-electronics.pdf', '3.4 MB', 1120, 'PN junction diode V-I characteristics, Zener voltage regulator, BJT transistor configurations (CB, CE, CC) and load line analysis.', 'Prof. S. N. Joshi'],
    ['sub_ec_3_4331101', 'ec', 3, 'Analog Communication: AM, FM & Receiver Circuits Master Notes', 1, 'Modulation Techniques', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ec-sem3-analog-comm.pdf', '4.0 MB', 940, 'Mathematical expression for AM/FM, modulation index, bandwidth requirements, Superheterodyne receiver block diagram and tracing.', 'Prof. S. N. Joshi'],

    // AE Sem 1, 3, 5
    ['sub_ae_1_4310201', 'ae', 1, 'Automobile Chassis & Powertrain Architecture Overview', 1, 'Vehicle Construction', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ae-sem1-auto-intro.pdf', '4.3 MB', 960, 'Front engine front wheel drive vs rear wheel drive, monocoque vs ladder frame chassis, major vehicle systems breakdown.', 'Prof. G. D. Vaghela'],
    ['sub_ae_3_4330201', 'ae', 3, 'Automobile Engines: CRDI, MPFI & Turbocharging Systems', 2, 'Fuel Injection Systems', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ae-sem3-engines-crdi.pdf', '4.6 MB', 890, 'Common Rail Direct Injection (CRDI) working, electronic fuel injectors, variable geometry turbochargers (VGT) and engine cooling circuits.', 'Prof. G. D. Vaghela'],
    ['sub_ae_5_4350201', 'ae', 5, 'Electric & Hybrid Vehicles (EV Powertrains, Motors & BMS Master Guide)', 1, 'EV Architecture & Batteries', 'PDF', 'https://vidyasetu.gtu.ac.in/docs/ae-sem5-ev-technology.pdf', '5.5 MB', 1450, 'BLDC motor torque-speed curves, regenerative braking, Lithium Iron Phosphate (LFP) vs NMC cells, Battery Thermal Management & Bharat DC Fast Charging.', 'Dr. R. K. Zala']
  ];

  materials.forEach(m => insertMaterial.run(...m));

  // 5. Textbooks & Reference Books across branches
  const insertBook = db.prepare(`
    INSERT INTO books (subject_id, branch_id, sem_number, title, author, publisher, edition, cover_image, file_url, pages, file_size, rating, download_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const books = [
    // CE / IT Books
    ['sub_ce_3_4330701', 'ce', 3, 'Data Structures Using C (GTU Reference Edition)', 'Reema Thareja / Oxford Univ Press', 'Oxford Higher Education', '3rd Edition 2024', 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/ds-reema-thareja.pdf', 540, '18.2 MB', 4.9, 3420],
    ['sub_ce_3_4330701', 'ce', 3, 'Fundamentals of Data Structures in C (Standard Text)', 'Ellis Horowitz, Sartaj Sahni', 'Universities Press', '2nd Edition', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/horowitz-sahni-ds.pdf', 620, '22.4 MB', 4.8, 2890],
    ['sub_ce_3_4330702', 'ce', 3, 'Operating System Concepts (The Dinosaur Book)', 'Silberschatz, Galvin & Gagne', 'Wiley Publications', '10th Edition 2023', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/silberschatz-os.pdf', 840, '28.5 MB', 4.9, 4120],
    ['sub_ce_3_4330703', 'ce', 3, 'Computer Networks & Internet Protocols', 'Andrew S. Tanenbaum & David J. Wetherall', 'Pearson Education', '6th Edition', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/tanenbaum-networks.pdf', 920, '31.0 MB', 4.9, 3150],
    ['sub_ce_1_4310701', 'ce', 1, 'Programming in ANSI C (GTU Prescribed Syllabus Text)', 'E. Balagurusamy', 'McGraw Hill Education', '8th Edition 2024', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/balagurusamy-ansi-c.pdf', 560, '16.8 MB', 4.9, 6200],
    ['sub_ce_1_4300001', 'ce', 1, 'Higher Engineering Mathematics for Diploma', 'Dr. B. S. Grewal', 'Khanna Publishers', '44th Edition', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/grewal-higher-maths.pdf', 1200, '45.0 MB', 4.9, 5800],
    ['sub_ce_2_4320702', 'ce', 2, 'Database System Concepts (Silberschatz Korth)', 'Abraham Silberschatz, Henry Korth, S. Sudarshan', 'McGraw Hill', '7th Edition 2023', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/korth-dbms.pdf', 880, '34.2 MB', 4.8, 3880],
    ['sub_ce_4_4340701', 'ce', 4, 'Python Crash Course: Hands-on Project-Based Intro', 'Eric Matthes', 'No Starch Press', '3rd Edition', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/python-crash-course.pdf', 550, '19.5 MB', 4.9, 2900],

    // ME Books
    ['sub_me_3_4331901', 'me', 3, 'Engineering Thermodynamics (Standard GTU Text)', 'P. K. Nag', 'McGraw Hill', '6th Edition', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/pk-nag-thermo.pdf', 800, '26.8 MB', 4.8, 1950],
    ['sub_me_2_4321901', 'me', 2, 'Vector Mechanics for Engineers: Statics & Dynamics', 'Beer, Johnston & Mazurek', 'McGraw Hill', '12th Edition', 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/beer-johnston-mechanics.pdf', 950, '32.0 MB', 4.8, 1820],

    // CL Books
    ['sub_cl_3_4330601', 'cl', 3, 'Surveying (Vol I & II) with Fieldwork Tables', 'Dr. B. C. Punmia, Ashok Jain', 'Laxmi Publications', '17th Edition', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/punmia-surveying.pdf', 720, '24.1 MB', 4.8, 1620],
    ['sub_cl_5_4350601', 'cl', 5, 'Reinforced Concrete Design: Principles & Practice', 'S. Unnikrishna Pillai, Devdas Menon', 'Tata McGraw Hill', '3rd Edition', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/pillai-menon-rcc.pdf', 820, '29.5 MB', 4.9, 2140],

    // EE Books
    ['sub_ee_1_4310901', 'ee', 1, 'Electrical Technology (Vol I & II)', 'B. L. Theraja & A. K. Theraja', 'S. Chand Technical', 'Revised Multicolour Edition', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/theraja-electrical.pdf', 1100, '38.0 MB', 4.9, 3950],
    ['sub_ee_3_4330901', 'ee', 3, 'Electric Machinery & Transformers (GTU Standard Text)', 'P. S. Bimbhra', 'Khanna Publishers', '7th Edition', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', 'https://vidyasetu.gtu.ac.in/books/bimbhra-electrical-machines.pdf', 980, '33.4 MB', 4.9, 2870]
  ];

  books.forEach(b => insertBook.run(...b));

  // 6. GTU Question Banks
  const insertQuestionBank = db.prepare(`
    INSERT INTO question_banks (subject_id, branch_id, sem_number, title, exam_year, exam_season, total_marks, paper_type, file_url, questions_count, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const questionBanks = [
    // CE Papers
    ['sub_ce_3_4330701', 'ce', 3, 'GTU Winter 2024 Official Exam Question Paper (Code: 4330701)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem3-ds-w2024.pdf', 14, 'Official Gujarat Technological University Winter 2024 regular examination paper with 2-mark, 3-mark, 4-mark and 7-mark questions.'],
    ['sub_ce_3_4330701', 'ce', 3, 'GTU Summer 2024 Official Exam Question Paper (Code: 4330701)', '2024', 'Summer', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem3-ds-s2024.pdf', 14, 'GTU Summer 2024 examination paper with full question sets on Linked Lists, Binary Trees and Sorting Complexities.'],
    ['sub_ce_3_4330701', 'ce', 3, 'Data Structures Unit-Wise GTU Most Imp 50 Question Bank (2020-2024)', '2024', 'All Sessions', 70, 'Imp Question Bank', 'https://vidyasetu.gtu.ac.in/papers/ce-sem3-ds-imp-bank.pdf', 50, 'Curated list of repeated 7-mark and 4-mark questions from the past 5 years with high probability for upcoming exams.'],
    ['sub_ce_3_4330702', 'ce', 3, 'GTU Winter 2024 Operating Systems Exam Paper (Code: 4330702)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem3-os-w2024.pdf', 14, 'Official GTU Winter 2024 examination paper covering Process Management, Deadlock prevention, and Virtual Memory paging.'],
    ['sub_ce_1_4310701', 'ce', 1, 'GTU Winter 2024 Computer Programming in C (Code: 4310701)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem1-c-w2024.pdf', 14, 'Complete 1st year question paper featuring pointer programs, structure vs union, and recursive functions.'],
    ['sub_ce_1_4300001', 'ce', 1, 'GTU Mathematics - I Official Paper Winter 2024 (Code: 4300001)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/common-sem1-maths-w2024.pdf', 14, 'Full questions on Matrix Rank, Inverse, De Moivre Theorem, Coordinate Geometry of Straight Lines & Circles.'],
    ['sub_ce_2_4320702', 'ce', 2, 'GTU Summer 2024 DBMS Exam Paper (Code: 4320702)', '2024', 'Summer', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem2-dbms-s2024.pdf', 14, 'Questions on 3-tier architecture, ER modeling, SQL queries with aggregate joins and BCNF normalization proofs.'],
    ['sub_ce_4_4340701', 'ce', 4, 'GTU Python Programming Winter 2024 Exam Paper (Code: 4340701)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ce-sem4-python-w2024.pdf', 14, 'Official questions on List comprehension, Dictionary manipulation, File handling, and Tkinter GUI events.'],

    // ME, CL, EE, EC, AE Papers
    ['sub_me_3_4331901', 'me', 3, 'GTU Winter 2024 Thermodynamics Exam Paper (Code: 4331901)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/me-sem3-thermo-w2024.pdf', 14, 'Numerical questions on Rankine Cycle efficiency, Carnot engine work output, and Steam condenser performance.'],
    ['sub_cl_3_4330601', 'cl', 3, 'GTU Winter 2024 Surveying & Leveling Exam Paper (Code: 4330601)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/cl-sem3-survey-w2024.pdf', 14, 'Leveling field book computation questions with checks, Theodolite traverse calculations and contour plotting.'],
    ['sub_ee_3_4330901', 'ee', 3, 'GTU Winter 2024 AC Machines & Transformers (Code: 4330901)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ee-sem3-ac-machines-w2024.pdf', 14, 'Official GTU examination questions on transformer phasor diagrams, induction motor equivalent circuits and speed regulation.'],
    ['sub_ae_5_4350201', 'ae', 5, 'GTU Winter 2024 EV Technology & Hybrid Vehicles (Code: 4350201)', '2024', 'Winter', 70, 'GTU End-Sem Exam', 'https://vidyasetu.gtu.ac.in/papers/ae-sem5-ev-w2024.pdf', 14, 'Exam questions on BLDC motor controls, regenerative braking, Battery Management System topologies and EV charging protocols.']
  ];

  questionBanks.forEach(qb => insertQuestionBank.run(...qb));

  // 7. Question Bank Solutions (Step-by-Step Solved Guides)
  const insertSolution = db.prepare(`
    INSERT INTO solutions (question_bank_id, subject_id, title, exam_year, paper_season, solution_content, key_formulas, diagram_guide, verified_by, file_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const solutions = [
    [
      null,
      'sub_ce_3_4330701',
      'GTU Winter 2024 Complete Solved Paper: Data Structures (4330701)',
      '2024',
      'Winter',
      `### Question 1(a) [3 Marks]: Define Data Structure. Differentiate between Linear and Non-Linear Data Structure with examples.
**Answer:**
A **Data Structure** is a specialized format for organizing, processing, retrieving, and storing data in computer memory efficiently.

| Feature | Linear Data Structure | Non-Linear Data Structure |
|---|---|---|
| **Element Arrangement** | Sequential (one after another in single level) | Hierarchical / Interconnected (multi-level) |
| **Traversal** | Single run can visit all elements | Multiple runs/special algorithms (BFS/DFS) needed |
| **Memory Utilization** | Often contiguous or sequential pointers | Dynamic non-contiguous linked nodes |
| **Examples** | Array, Stack, Queue, Singly Linked List | Tree, Binary Search Tree (BST), Graph |

---

### Question 1(b) [4 Marks]: Write an algorithm / C function for PUSH and POP operations on a Stack.
\`\`\`c
#define MAX 100
int stack[MAX];
int top = -1;

void push(int value) {
    if (top >= MAX - 1) {
        printf("Stack Overflow! Cannot insert %d\\n", value);
        return;
    }
    top++;
    stack[top] = value;
    printf("Pushed %d to stack at index %d\\n", value, top);
}

int pop() {
    if (top < 0) {
        printf("Stack Underflow! Stack is empty\\n");
        return -1;
    }
    int val = stack[top];
    top--;
    return val;
}
\`\`\`

---

### Question 2(c) [7 Marks]: Explain Infix to Postfix conversion using Stack with step-by-step table for: (A + B * C) / (D - E ^ F)
**Step-by-step Evaluation Table:**

| Symbol Read | Stack Content | Postfix Expression Output | Notes |
|---|---|---|---|
| \`(\` | \`(\` | *(empty)* | Push '(' to stack |
| \`A\` | \`(\` | \`A\` | Operand goes directly to output |
| \`+\` | \`( +\` | \`A\` | Push '+' (lowest priority inside) |
| \`B\` | \`( +\` | \`A B\` | Operand to output |
| \`*\` | \`( + *\` | \`A B\` | '*' has higher precedence than '+', push |
| \`C\` | \`( + *\` | \`A B C\` | Operand to output |
| \`)\` | *(empty)* | \`A B C * +\` | Pop until '(', discard '(' |
| \`/\` | \`/\` | \`A B C * +\` | Push '/' |
| \`(\` | \`/ (\` | \`A B C * +\` | Push '(' |
| \`D\` | \`/ (\` | \`A B C * + D\` | Operand to output |
| \`-\` | \`/ ( -\` | \`A B C * + D\` | Push '-' |
| \`E\` | \`/ ( -\` | \`A B C * + D E\` | Operand to output |
| \`^\` | \`/ ( - ^\` | \`A B C * + D E\` | '^' has highest precedence, push |
| \`F\` | \`/ ( - ^\` | \`A B C * + D E F\` | Operand to output |
| \`)\` | \`/\` | \`A B C * + D E F ^ -\` | Pop until '(', discard '(' |
| **End** | *(empty)* | \`A B C * + D E F ^ - /\` | Pop remaining operators |

**Final Postfix Result:** \`A B C * + D E F ^ - /\`

---

### Question 3 [7 Marks]: What is AVL Tree? Explain 4 types of rotations (LL, RR, LR, RL) with diagrams.
**Answer:**
An **AVL Tree** is a self-balancing Binary Search Tree where the Balance Factor ($BF = \\text{Height}(Left) - \\text{Height}(Right)$) of every node must be either **-1, 0, or +1**.

1. **LL Rotation (Left of Left):** When an insertion is made into the left subtree of the left child. Solved by a single **Right Rotation** at node A.
2. **RR Rotation (Right of Right):** When an insertion is made into the right subtree of the right child. Solved by a single **Left Rotation** at node A.
3. **LR Rotation (Right of Left):** Solved by Left rotate on child B, then Right rotate on root A.
4. **RL Rotation (Left of Right):** Solved by Right rotate on child B, then Left rotate on root A.`,
      'Balance Factor = Height(Left Subtree) - Height(Right Subtree) in {-1, 0, 1}',
      'Visual diagram included for single right/left rotation and double LR/RL zig-zag realignment',
      'Prof. H. R. Patel (GTU Paper Setter)',
      'https://vidyasetu.gtu.ac.in/solutions/ce-sem3-ds-w2024-solved.pdf'
    ],
    [
      null,
      'sub_ce_3_4330702',
      'GTU Winter 2024 Operating Systems Solved Paper with Gantt Charts (4330702)',
      '2024',
      'Winter',
      `### Question 1 [7 Marks]: Consider the following 4 processes. Calculate Average Waiting Time and Average Turnaround Time using Round Robin (Time Quantum = 2ms) and Preemptive Shortest Job First (SJF).

| Process | Arrival Time (ms) | Burst Time (ms) |
|---|---|---|
| P1 | 0 | 5 |
| P2 | 1 | 3 |
| P3 | 2 | 8 |
| P4 | 3 | 6 |

**Round Robin (Time Quantum = 2ms) Solution:**
- Time 0-2: P1 executes (rem: 3)
- Time 2-4: P2 executes (rem: 1)
- Time 4-6: P3 executes (rem: 6)
- Time 6-8: P4 executes (rem: 4)
- Time 8-10: P1 executes (rem: 1)
- Time 10-11: P2 executes (P2 finishes at 11ms)
- Time 11-13: P3 executes (rem: 4)
- Time 13-15: P4 executes (rem: 2)
- Time 15-16: P1 executes (P1 finishes at 16ms)
- Time 16-18: P3 executes (rem: 2)
- Time 18-20: P4 executes (P4 finishes at 20ms)
- Time 20-22: P3 executes (P3 finishes at 22ms)

**Calculations:**
- Turnaround Time ($TAT = \\text{Completion Time} - \\text{Arrival Time}$):
  - P1: 16 - 0 = 16ms
  - P2: 11 - 1 = 10ms
  - P3: 22 - 2 = 20ms
  - P4: 20 - 3 = 17ms
  - **Average TAT** = (16 + 10 + 20 + 17) / 4 = **15.75 ms**

- Waiting Time ($WT = TAT - \\text{Burst Time}$):
  - P1: 16 - 5 = 11ms
  - P2: 10 - 3 = 7ms
  - P3: 20 - 8 = 12ms
  - P4: 17 - 6 = 11ms
  - **Average WT** = (11 + 7 + 12 + 11) / 4 = **10.25 ms**`,
      'TAT = Completion - Arrival, WT = TAT - Burst, Need = Max - Allocation',
      'Gantt Chart timeline step breakdown with ready queue states',
      'Prof. J. M. Mehta (GTU Senior Examiner)',
      'https://vidyasetu.gtu.ac.in/solutions/ce-sem3-os-w2024-solved.pdf'
    ],
    [
      null,
      'sub_ce_1_4310701',
      'GTU Winter 2024 Solved Model Paper: Programming in C (4310701)',
      '2024',
      'Winter',
      `### Question 1 [7 Marks]: Write a complete C program to check whether a given string is Palindrome or not without using string library functions.

\`\`\`c
#include <stdio.h>

int main() {
    char str[100];
    int length = 0, i, isPalindrome = 1;

    printf("Enter a string: ");
    scanf("%s", str);

    while (str[length] != '\\0') {
        length++;
    }

    for (i = 0; i < length / 2; i++) {
        if (str[i] != str[length - 1 - i]) {
            isPalindrome = 0;
            break;
        }
    }

    if (isPalindrome) {
        printf("The string '%s' is a PALINDROME.\\n", str);
    } else {
        printf("The string '%s' is NOT a Palindrome.\\n", str);
    }

    return 0;
}
\`\`\``,
      'Palindrome string comparison condition: str[i] == str[len - 1 - i]',
      'Memory stack frame diagram showing variable copy vs pointer address passing',
      'Dr. V. B. Trivedi',
      'https://vidyasetu.gtu.ac.in/solutions/ce-sem1-c-w2024-solved.pdf'
    ],
    [
      null,
      'sub_ce_1_4300001',
      'GTU Winter 2024 Mathematics - I Step-by-Step Numerical Solutions (4300001)',
      '2024',
      'Winter',
      `### Question 1 [7 Marks]: Find the Inverse of Matrix A using Gauss-Jordan Elimination method:
$$A = \\begin{bmatrix} 1 & 2 & 3 \\\\ 2 & 5 & 3 \\\\ 1 & 0 & 8 \\end{bmatrix}$$

**Step-by-Step Gauss-Jordan Solution:**
Set up Augmented Matrix $[A | I]$:
$$\\begin{bmatrix} 1 & 2 & 3 & | & 1 & 0 & 0 \\\\ 2 & 5 & 3 & | & 0 & 1 & 0 \\\\ 1 & 0 & 8 & | & 0 & 0 & 1 \\end{bmatrix}$$

1. Apply Row Operation $R_2 \\leftarrow R_2 - 2R_1$ and $R_3 \\leftarrow R_3 - R_1$:
$$\\begin{bmatrix} 1 & 2 & 3 & | & 1 & 0 & 0 \\\\ 0 & 1 & -3 & | & -2 & 1 & 0 \\\\ 0 & -2 & 5 & | & -1 & 0 & 1 \\end{bmatrix}$$

2. Apply Row Operation $R_1 \\leftarrow R_1 - 2R_2$ and $R_3 \\leftarrow R_3 + 2R_2$:
$$\\begin{bmatrix} 1 & 0 & 9 & | & 5 & -2 & 0 \\\\ 0 & 1 & -3 & | & -2 & 1 & 0 \\\\ 0 & 0 & -1 & | & -5 & 2 & 1 \\end{bmatrix}$$

3. Multiply $R_3$ by $-1$:
$$\\begin{bmatrix} 1 & 0 & 9 & | & 5 & -2 & 0 \\\\ 0 & 1 & -3 & | & -2 & 1 & 0 \\\\ 0 & 0 & 1 & | & 5 & -2 & -1 \\end{bmatrix}$$

4. Eliminate column 3 from $R_1$ and $R_2$ ($R_1 \\leftarrow R_1 - 9R_3$, $R_2 \\leftarrow R_2 + 3R_3$):
$$\\begin{bmatrix} 1 & 0 & 0 & | & -40 & 16 & 9 \\\\ 0 & 1 & 0 & | & 13 & -5 & -3 \\\\ 0 & 0 & 1 & | & 5 & -2 & -1 \\end{bmatrix}$$

**Final Inverse Matrix $A^{-1}$:**
$$A^{-1} = \\begin{bmatrix} -40 & 16 & 9 \\\\ 13 & -5 & -3 \\\\ 5 & -2 & -1 \\end{bmatrix}$$`,
      '[A | I] -> [I | A^-1], Det(A) != 0 for inverse to exist',
      'Augmented matrix elementary row operations transformation flowchart',
      'Prof. S. M. Choksi (GTU Maths Chair)',
      'https://vidyasetu.gtu.ac.in/solutions/common-sem1-maths-w2024-solved.pdf'
    ]
  ];

  solutions.forEach(s => insertSolution.run(...s));

  // 8. Users (Admin + Student Demo)
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, enrollment_no, email, password, branch_id, semester, role, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('usr_admin', 'GTU Admin Portal', 'ADMIN001', 'admin@vidyasetu.gtu.ac.in', 'admin123', 'ce', 6, 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80');
  insertUser.run('student_demo', 'Yash Patel', '226170307001', 'yash.patel@student.gtu.ac.in', 'student123', 'ce', 3, 'student', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80');

  // 9. Initial Student Progress for Demo User
  const insertProgress = db.prepare(`
    INSERT OR IGNORE INTO student_progress (user_id, subject_id, topic_id, topic_title, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const demoProgress = [
    ['student_demo', 'sub_ce_3_4330701', 't_sub_ce_3_4330701_1', 'Unit 1: Fundamentals & Core Theoretical Definitions', 'completed', 'Mastered array and pointer implementations'],
    ['student_demo', 'sub_ce_3_4330701', 't_sub_ce_3_4330701_2', 'Unit 2: Standard Algorithms, Proofs & Equations', 'completed', 'Practiced with 5 GTU previous year expressions'],
    ['student_demo', 'sub_ce_3_4330701', 't_sub_ce_3_4330701_3', 'Unit 3: Numerical Problems & Step-by-Step Tracing', 'completed', 'Memorized front and rear index conditions'],
    ['student_demo', 'sub_ce_3_4330701', 't_sub_ce_3_4330701_4', 'Unit 4: Advanced Systems, Schematics & Circuit Diagrams', 'in_progress', 'Need more practice with node deletion at mid'],
    ['student_demo', 'sub_ce_3_4330702', 't_sub_ce_3_4330702_1', 'Unit 1: Fundamentals & Core Theoretical Definitions', 'completed', 'Ready for 7-mark question in GTU exam'],
    ['student_demo', 'sub_ce_3_4330702', 't_sub_ce_3_4330702_2', 'Unit 2: Standard Algorithms, Proofs & Equations', 'completed', 'Solved Gantt chart numericals accurately'],
    ['student_demo', 'sub_ce_3_4330703', 't_sub_ce_3_4330703_1', 'Unit 1: Fundamentals & Core Theoretical Definitions', 'completed', 'Learned mnemonic: All People Seem To Need Data Processing']
  ];

  demoProgress.forEach(p => insertProgress.run(...p));

  // 10. Announcements
  const insertAnnouncement = db.prepare(`
    INSERT OR IGNORE INTO announcements (title, category, badge, content, link, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const announcements = [
    ['GTU Diploma Winter 2024 Exam Timetable Released', 'Exam Circular', 'HOT', 'Gujarat Technological University has officially declared the Winter 2024 examination timetable for Diploma Semesters 1 through 6. Students can verify exam dates and hall tickets online.', 'https://gtu.ac.in/circulars/winter2024-timetable', 1],
    ['VidyaSetu AI Doubt Guru is Now Live for All Subjects', 'Feature Update', 'AI NEW', 'Instant step-by-step problem solver and 7-mark GTU answer generator with math formula rendering and code preview is now accessible directly in the student dashboard.', '#ai-tutor-section', 1],
    ['New 2024 Solved Papers Added for Data Structures & OS', 'Study Materials', 'NEW', 'Latest GTU Winter 2024 examination papers with verified gold-medalist step-by-step solutions and diagrams are now available for free in-browser reading.', '#resources-section', 0]
  ];

  announcements.forEach(a => insertAnnouncement.run(...a));

  console.log('Complete GTU diploma dataset successfully populated in SQLite.');
}

module.exports = {
  db,
  initDatabase
};
