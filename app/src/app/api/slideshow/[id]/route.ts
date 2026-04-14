import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const slides = db.prepare(
    `SELECT id, filename, original_name, sort_order
     FROM slideshow_slides
     WHERE material_id = ?
     ORDER BY original_name ASC`
  ).all(params.id);

  return NextResponse.json(slides);
}
