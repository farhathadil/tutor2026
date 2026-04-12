import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(params.id);
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(topic);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { title, description, is_published, gate_enabled, gate_min_score, sort_order } = await req.json();
  const db = getDb();
  db.prepare(
    `UPDATE topics SET title=?, description=?, is_published=?, gate_enabled=?, gate_min_score=?, sort_order=? WHERE id=?`
  ).run(title, description, is_published ? 1 : 0, gate_enabled ? 1 : 0, gate_min_score, sort_order, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  db.prepare('DELETE FROM topics WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
