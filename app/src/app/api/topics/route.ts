import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';
  const isTest = session?.user?.role === 'test';

  const db = getDb();
  let sql = 'SELECT * FROM topics WHERE 1=1';
  const params: any[] = [];
  if (subjectId) { sql += ' AND subject_id = ?'; params.push(subjectId); }
  if (!isAdmin && !isTest) { sql += ' AND is_published = 1'; }
  sql += ' ORDER BY sort_order';

  const topics = db.prepare(sql).all(...params);
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { subject_id, title, description, is_published, gate_enabled, gate_min_score, sort_order } = await req.json();
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO topics (id, subject_id, title, description, is_published, sort_order, gate_enabled, gate_min_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, subject_id, title, description || '', is_published ? 1 : 0, sort_order ?? 0, gate_enabled ? 1 : 0, gate_min_score ?? 60);
  return NextResponse.json({ id });
}
