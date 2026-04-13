import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { topic_id, flashcards = [], questions = [] } = body;

  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id is required' }, { status: 400 });
  }

  const db = getDb();

  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topic_id);
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const errors: string[] = [];
  let importedFlashcards = 0;
  let importedQuestions = 0;

  const fcBase = (db.prepare('SELECT COUNT(*) as c FROM flashcards WHERE topic_id = ?').get(topic_id) as any).c;
  const qBase = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE topic_id = ?').get(topic_id) as any).c;

  const insertFlashcard = db.prepare(
    `INSERT INTO flashcards (id, topic_id, front_text, back_text, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (id, topic_id, stem, options, correct_index, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    for (let i = 0; i < flashcards.length; i++) {
      const fc = flashcards[i];
      if (!fc.front_text || !fc.back_text) {
        errors.push(`Flashcard ${i + 1}: missing front_text or back_text`);
        continue;
      }
      insertFlashcard.run(uuid(), topic_id, fc.front_text, fc.back_text, fcBase + importedFlashcards);
      importedFlashcards++;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.stem) {
        errors.push(`Question ${i + 1}: missing stem`);
        continue;
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1}: options must be an array of exactly 4 items`);
        continue;
      }
      if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3) {
        errors.push(`Question ${i + 1}: correct_index must be 0–3`);
        continue;
      }
      insertQuestion.run(
        uuid(), topic_id, q.stem, JSON.stringify(q.options),
        q.correct_index, q.explanation || null, qBase + importedQuestions
      );
      importedQuestions++;
    }
  })();

  return NextResponse.json({
    imported: { flashcards: importedFlashcards, questions: importedQuestions },
    errors,
  });
}
