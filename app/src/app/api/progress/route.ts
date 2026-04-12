import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const userId = searchParams.get('userId');
  const db = getDb();

  // Admin can view all progress; students can only view their own
  const targetUserId = (session.user.role === 'admin' && userId) ? userId : session.user.id;

  if (topicId) {
    const row = db.prepare(
      'SELECT * FROM session_progress WHERE user_id = ? AND topic_id = ?'
    ).get(targetUserId, topicId) as any;
    if (!row) return NextResponse.json(null);
    return NextResponse.json({ ...row, completed_stages: JSON.parse(row.completed_stages) });
  }

  // Return all progress for user (or all users for admin overview)
  let rows: any[];
  if (session.user.role === 'admin' && !userId) {
    rows = db.prepare('SELECT * FROM session_progress').all() as any[];
  } else {
    rows = db.prepare('SELECT * FROM session_progress WHERE user_id = ?').all(targetUserId) as any[];
  }
  return NextResponse.json(rows.map(r => ({ ...r, completed_stages: JSON.parse(r.completed_stages) })));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic_id, current_stage, completed_stages, time_delta_secs } = await req.json();
  const userId = session.user.role === 'test' ? session.user.id : session.user.id;
  const db = getDb();

  const existing = db.prepare(
    'SELECT * FROM session_progress WHERE user_id = ? AND topic_id = ?'
  ).get(userId, topic_id) as any;

  if (existing) {
    const newCompleted = JSON.stringify(completed_stages || JSON.parse(existing.completed_stages));
    db.prepare(
      `UPDATE session_progress SET current_stage=?, completed_stages=?, last_active_at=datetime('now'),
       time_spent_secs=time_spent_secs+? WHERE user_id=? AND topic_id=?`
    ).run(current_stage, newCompleted, time_delta_secs || 0, userId, topic_id);
  } else {
    db.prepare(
      `INSERT INTO session_progress (id, user_id, topic_id, current_stage, completed_stages, time_spent_secs)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuid(), userId, topic_id, current_stage, JSON.stringify(completed_stages || []), time_delta_secs || 0);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const userId = searchParams.get('userId');
  const db = getDb();

  const canReset =
    session.user.role === 'admin' ||
    (session.user.role === 'test' && userId === session.user.id) ||
    userId === session.user.id;

  if (!canReset) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (topicId) {
    db.prepare('DELETE FROM session_progress WHERE user_id=? AND topic_id=?').run(userId || session.user.id, topicId);
    db.prepare('DELETE FROM quiz_attempts WHERE user_id=? AND topic_id=?').run(userId || session.user.id, topicId);
  } else {
    db.prepare('DELETE FROM session_progress WHERE user_id=?').run(userId || session.user.id);
    db.prepare('DELETE FROM quiz_attempts WHERE user_id=?').run(userId || session.user.id);
    db.prepare(`DELETE FROM flashcard_ratings WHERE user_id=?`).run(userId || session.user.id);
  }
  return NextResponse.json({ ok: true });
}
