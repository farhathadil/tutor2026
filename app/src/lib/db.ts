import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || '/home/faa/tutor/data/tutor.db';

// ensure directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
    seedData(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','student','test')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      color TEXT NOT NULL,
      bg_color TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      gate_enabled INTEGER NOT NULL DEFAULT 0,
      gate_min_score INTEGER NOT NULL DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('slide','audio','guide','mindmap','infographic')),
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      session_stage INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      stem TEXT NOT NULL,
      image_filename TEXT,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      front_text TEXT NOT NULL,
      back_text TEXT NOT NULL,
      front_image_filename TEXT,
      back_image_filename TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS session_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      current_stage INTEGER NOT NULL DEFAULT 1,
      completed_stages TEXT NOT NULL DEFAULT '[]',
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      time_spent_secs INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      score_pct INTEGER NOT NULL,
      answers TEXT NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_secs INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flashcard_ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK(rating IN ('easy','medium','hard')),
      rated_at TEXT NOT NULL DEFAULT (datetime('now')),
      next_due_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seed_done (
      id INTEGER PRIMARY KEY DEFAULT 1
    );
  `);
}

function seedData(db: Database.Database) {
  const already = db.prepare('SELECT id FROM seed_done WHERE id = 1').get();
  if (already) return;

  // Create users
  const users = [
    { id: uuid(), email: 'admin@tutor.local', name: 'Admin', role: 'admin', pw: 'admin123' },
    { id: uuid(), email: 'student1@tutor.local', name: 'Liam', role: 'student', pw: 'student123' },
    { id: uuid(), email: 'student2@tutor.local', name: 'Aisha', role: 'student', pw: 'student123' },
    { id: uuid(), email: 'test@tutor.local', name: 'Test Account', role: 'test', pw: 'test123' },
  ];
  const insertUser = db.prepare(
    `INSERT INTO users (id, email, display_name, role, password_hash) VALUES (?, ?, ?, ?, ?)`
  );
  for (const u of users) {
    insertUser.run(u.id, u.email, u.name, u.role, bcrypt.hashSync(u.pw, 10));
  }

  // Create subjects
  const subjects = [
    { code: 'BIZ', name: 'Business Studies', icon: '📊', color: '#bf6f00', bg_color: '#fff3e0' },
    { code: 'ECO', name: 'Economics',         icon: '📈', color: '#2e7d32', bg_color: '#e8f5e9' },
    { code: 'SOC', name: 'Social Studies',    icon: '🌍', color: '#1565c0', bg_color: '#e3f2fd' },
    { code: 'MAT', name: 'Mathematics',       icon: '∑',  color: '#7b1fa2', bg_color: '#f3e5f5' },
    { code: 'BIO', name: 'Biology',           icon: '🧬', color: '#1b5e20', bg_color: '#e8f5e9' },
    { code: 'PHY', name: 'Physics',           icon: '⚛',  color: '#283593', bg_color: '#e8eaf6' },
    { code: 'CHE', name: 'Chemistry',         icon: '⚗',  color: '#880e4f', bg_color: '#fce4ec' },
    { code: 'ENG', name: 'English',           icon: '📖', color: '#f57f17', bg_color: '#fff8e1' },
    { code: 'ACC', name: 'Accounting',        icon: '💰', color: '#006064', bg_color: '#e0f7fa' },
    { code: 'HPE', name: 'Health & PE',       icon: '🏃', color: '#33691e', bg_color: '#f1f8e9' },
  ];
  const insertSubject = db.prepare(
    `INSERT INTO subjects (id, name, code, color, bg_color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  subjects.forEach((s, i) => {
    insertSubject.run(uuid(), s.name, s.code, s.color, s.bg_color, s.icon, i);
  });

  db.prepare('INSERT INTO seed_done (id) VALUES (1)').run();
}
