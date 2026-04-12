import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const users = db.prepare('SELECT id, email, display_name, role, created_at, is_active FROM users ORDER BY created_at').all();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { email, display_name, role, password } = await req.json();
  const db = getDb();
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(
      'INSERT INTO users (id, email, display_name, role, password_hash) VALUES (?, ?, ?, ?, ?)'
    ).run(id, email, display_name, role, hash);
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, display_name, is_active, password } = await req.json();
  const db = getDb();
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET display_name=?, is_active=?, password_hash=? WHERE id=?').run(display_name, is_active ? 1 : 0, hash, id);
  } else {
    db.prepare('UPDATE users SET display_name=?, is_active=? WHERE id=?').run(display_name, is_active ? 1 : 0, id);
  }
  return NextResponse.json({ ok: true });
}
