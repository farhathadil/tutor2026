import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(params.id);
  if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(subject);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, code, color, bg_color, icon, sort_order } = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE subjects SET name=?, code=?, color=?, bg_color=?, icon=?, sort_order=? WHERE id=?'
  ).run(name, code, color, bg_color, icon, sort_order, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  db.prepare('DELETE FROM subjects WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
