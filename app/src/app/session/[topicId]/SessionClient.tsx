'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type Material = { id: string; type: string; title: string; filename: string; original_name?: string; session_stage: number; slide_count?: number };
type SlideshowSlide = { id: string; filename: string; original_name: string; sort_order: number };
type Question = { id: string; stem: string; options: string[]; correct_index: number; explanation: string | null };
type Flashcard = { id: string; front_text: string; back_text: string };
type Progress = { current_stage: number; completed_stages: number[]; time_spent_secs: number };

interface Props {
  topic: any;
  materials: Material[];
  questions: Question[];
  flashcards: Flashcard[];
  initialProgress: Progress | null;
  latestRatings: Record<string, string>;
  userId: string;
  gateEnabled: boolean;
  gateMinScore: number;
}

export default function SessionClient({
  topic, materials, questions, flashcards,
  initialProgress, latestRatings, userId, gateEnabled, gateMinScore,
}: Props) {
  const [stage, setStage] = useState(initialProgress?.current_stage || 1);
  const [completedStages, setCompletedStages] = useState<number[]>(initialProgress?.completed_stages || []);
  const startTimeRef = useRef(Date.now());

  // Shuffle helper
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const saveProgress = useCallback(async (newStage: number, newCompleted: number[]) => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = Date.now();
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: topic.id,
        current_stage: newStage,
        completed_stages: newCompleted,
        time_delta_secs: elapsed,
      }),
    });
  }, [topic.id]);

  function completeStage(n: number) {
    const newCompleted = completedStages.includes(n) ? completedStages : [...completedStages, n];
    const nextStage = Math.min(n + 1, 5);
    setCompletedStages(newCompleted);
    setStage(nextStage);
    saveProgress(nextStage, newCompleted);
  }

  const stageMaterials = (n: number) => materials.filter(m => m.session_stage === n);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Minimal session nav */}
      <nav className="bg-surface text-paper px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href={`/topics/${topic.id}`} className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors">
          ✕ Exit
        </Link>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => n <= Math.max(stage, ...completedStages, 1) && setStage(n)}
              className={`w-8 h-8 rounded-full font-mono text-xs flex items-center justify-center transition-all ${
                completedStages.includes(n) ? 'bg-sage text-white' :
                n === stage ? 'bg-gold text-ink' :
                n <= Math.max(...completedStages, 1) ? 'bg-white/20 text-white' :
                'bg-white/10 text-white/30'
              }`}
            >
              {completedStages.includes(n) ? '✓' : n}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-white/40">{topic.title.length > 20 ? topic.title.slice(0, 20) + '…' : topic.title}</span>
      </nav>

      {/* Stage content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {stage === 1 && (
          <Stage1
            materials={stageMaterials(1)}
            onComplete={() => completeStage(1)}
            isDone={completedStages.includes(1)}
          />
        )}
        {stage === 2 && (
          <Stage2
            materials={stageMaterials(2)}
            onComplete={() => completeStage(2)}
            isDone={completedStages.includes(2)}
          />
        )}
        {stage === 3 && (
          <Stage3
            flashcards={flashcards}
            latestRatings={latestRatings}
            onComplete={() => completeStage(3)}
            isDone={completedStages.includes(3)}
            shuffle={shuffle}
          />
        )}
        {stage === 4 && (
          <Stage4
            questions={questions}
            topicId={topic.id}
            gateEnabled={gateEnabled}
            gateMinScore={gateMinScore}
            onComplete={() => completeStage(4)}
            isDone={completedStages.includes(4)}
            shuffle={shuffle}
          />
        )}
        {stage === 5 && (
          <Stage5
            topicId={topic.id}
            subjectId={topic.subject_id}
            completedStages={completedStages}
            materials={materials}
            questions={questions}
            flashcards={flashcards}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stage 1: Introduce (Slides + Audio + Video + Slideshows) ────────────────
function Stage1({ materials, onComplete, isDone }: { materials: Material[]; onComplete: () => void; isDone: boolean }) {
  const slides = materials.filter(m => m.type === 'slide');
  const audios = materials.filter(m => m.type === 'audio');
  const videos = materials.filter(m => m.type === 'video');
  const slideshows = materials.filter(m => m.type === 'slideshow');

  // IDs that must be reviewed before the button unlocks (PDFs excluded)
  const trackable = [...slideshows, ...videos, ...audios].map(m => m.id);

  // Pre-fill as reviewed if the stage is already complete
  const [reviewed, setReviewed] = useState<Set<string>>(
    () => new Set(isDone ? trackable : [])
  );
  const [openSlideshow, setOpenSlideshow] = useState<Material | null>(null);

  function markReviewed(id: string) {
    setReviewed(prev => new Set(Array.from(prev).concat(id)));
  }

  const allReviewed = trackable.length === 0 || trackable.every(id => reviewed.has(id));
  const hasContent = slides.length > 0 || audios.length > 0 || videos.length > 0 || slideshows.length > 0;

  return (
    <div>
      <StageHeader n={1} icon="🎬" label="Introduce" desc="Work through the slides, watch any videos, and listen to any audio before moving on." isDone={isDone} />

      {!hasContent ? (
        <EmptyState msg="No slides, videos, or audio uploaded yet for this stage." />
      ) : (
        <>
          {slideshows.map(m => (
            <SlideshowCard
              key={m.id}
              material={m}
              reviewed={reviewed.has(m.id)}
              onOpen={() => setOpenSlideshow(m)}
            />
          ))}
          {slides.map(m => (
            <MaterialCard key={m.id} material={m} />
          ))}
          {videos.map(m => (
            <MaterialCard key={m.id} material={m} onEnded={() => markReviewed(m.id)} />
          ))}
          {audios.map(m => (
            <MaterialCard key={m.id} material={m} onEnded={() => markReviewed(m.id)} />
          ))}
        </>
      )}

      <CompleteButton
        onComplete={onComplete}
        isDone={isDone}
        locked={!allReviewed}
        label="I've reviewed the slides, videos & audio →"
      />

      {openSlideshow && (
        <SlideshowViewer
          material={openSlideshow}
          onClose={() => setOpenSlideshow(null)}
          onFinish={() => markReviewed(openSlideshow.id)}
        />
      )}
    </div>
  );
}

// ─── Stage 2: Explore (Mind Map + Study Guide) ───────────────────────────────
function Stage2({ materials, onComplete, isDone }: { materials: Material[]; onComplete: () => void; isDone: boolean }) {
  const mindmaps = materials.filter(m => m.type === 'mindmap');
  const guides = materials.filter(m => m.type === 'guide');

  return (
    <div>
      <StageHeader n={2} icon="🗺️" label="Explore" desc="Study the mind map and work through the study guide." isDone={isDone} />

      {mindmaps.length === 0 && guides.length === 0 ? (
        <EmptyState msg="No mind maps or study guides uploaded yet." />
      ) : (
        <>
          {mindmaps.map(m => <MaterialCard key={m.id} material={m} />)}
          {guides.map(m => <MaterialCard key={m.id} material={m} />)}
        </>
      )}

      <CompleteButton onComplete={onComplete} isDone={isDone} label="I've explored the materials →" />
    </div>
  );
}

// ─── Stage 3: Flashcards ─────────────────────────────────────────────────────
function Stage3({ flashcards, latestRatings, onComplete, isDone, shuffle }: {
  flashcards: Flashcard[];
  latestRatings: Record<string, string>;
  onComplete: () => void;
  isDone: boolean;
  shuffle: <T>(a: T[]) => T[];
}) {
  const [deck, setDeck] = useState<Flashcard[]>(() => shuffle(flashcards));
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, string>>({ ...latestRatings });
  const [sessionRatings, setSessionRatings] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  if (flashcards.length === 0) return (
    <div>
      <StageHeader n={3} icon="🧠" label="Recall" desc="Flashcard practice" isDone={isDone} />
      <EmptyState msg="No flashcards created for this topic yet." />
      <CompleteButton onComplete={onComplete} isDone={isDone} label="Continue to Quiz →" />
    </div>
  );

  const card = deck[current];

  async function rate(rating: string) {
    await fetch('/api/flashcard-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcard_id: card.id, rating }),
    });
    const newSessionRatings = { ...sessionRatings, [card.id]: rating };
    setSessionRatings(newSessionRatings);
    setRatings(prev => ({ ...prev, [card.id]: rating }));
    setFlipped(false);

    // "Hard" cards get re-added to end of deck
    if (rating === 'hard') {
      setDeck(prev => [...prev, card]);
    }

    if (current + 1 >= deck.length && rating !== 'hard') {
      setDone(true);
    } else {
      setTimeout(() => setCurrent(c => c + 1), 100);
    }
  }

  const ratedCount = Object.keys(sessionRatings).length;

  return (
    <div>
      <StageHeader n={3} icon="🧠" label="Recall" desc="Flip each card and rate how well you knew it." isDone={isDone} />

      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-ink-4">{Math.min(current + 1, deck.length)}/{deck.length} cards</span>
        <div className="flex gap-1">
          {deck.slice(0, Math.min(20, deck.length)).map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < current ? 'bg-sage' : i === current ? 'bg-gold' : 'bg-paper-3'}`} />
          ))}
        </div>
      </div>

      {done ? (
        <div className="text-center py-12 bg-sage-light border border-sage/30 rounded-2xl">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-serif text-xl font-semibold text-ink mb-2">All cards reviewed!</h3>
          <p className="font-sans text-sm text-ink-3 mb-6">{ratedCount} cards rated this session</p>
          <CompleteButton onComplete={onComplete} isDone={isDone} label="Continue to Quiz →" />
        </div>
      ) : (
        <>
          {/* Flip card */}
          <div className="flip-card h-64 cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <div className={`flip-card-inner w-full h-full`} style={{ transform: flipped ? 'rotateY(180deg)' : 'none', transition: 'transform 0.4s', transformStyle: 'preserve-3d', position: 'relative' }}>
              <div className="flip-card-front absolute inset-0 bg-paper-2 border-2 border-rule rounded-2xl p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                <p className="font-mono text-xs text-ink-4 uppercase tracking-wider mb-4">Front</p>
                <p className="font-sans text-lg text-ink text-center leading-relaxed">{card.front_text}</p>
                <p className="font-mono text-xs text-ink-4 mt-6">Tap to reveal answer</p>
              </div>
              <div className="flip-card-back absolute inset-0 bg-cobalt-light border-2 border-cobalt/30 rounded-2xl p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className="font-mono text-xs text-cobalt uppercase tracking-wider mb-4">Answer</p>
                <p className="font-sans text-lg text-ink text-center leading-relaxed">{card.back_text}</p>
              </div>
            </div>
          </div>

          {flipped && (
            <div className="mt-6">
              <p className="font-mono text-xs text-ink-4 text-center mb-3 uppercase tracking-wider">How well did you know this?</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => rate('hard')}
                  className="py-3 rounded-xl bg-crimson-light text-crimson font-sans font-medium text-sm hover:bg-crimson hover:text-white transition-colors">
                  😓 Hard
                </button>
                <button onClick={() => rate('medium')}
                  className="py-3 rounded-xl bg-gold/10 text-gold font-sans font-medium text-sm hover:bg-gold hover:text-white transition-colors">
                  🤔 Medium
                </button>
                <button onClick={() => rate('easy')}
                  className="py-3 rounded-xl bg-sage-light text-sage font-sans font-medium text-sm hover:bg-sage hover:text-white transition-colors">
                  😊 Easy
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Stage 4: Quiz ────────────────────────────────────────────────────────────
function Stage4({ questions, topicId, gateEnabled, gateMinScore, onComplete, isDone, shuffle }: {
  questions: Question[];
  topicId: string;
  gateEnabled: boolean;
  gateMinScore: number;
  onComplete: () => void;
  isDone: boolean;
  shuffle: <T>(a: T[]) => T[];
}) {
  const [shuffled] = useState<Question[]>(() => shuffle(questions).slice(0, 20));
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ score_pct: number; correct: number; total: number } | null>(null);
  const startTime = useRef(Date.now());

  if (questions.length === 0) return (
    <div>
      <StageHeader n={4} icon="✅" label="Test" desc="Multiple choice quiz" isDone={isDone} />
      <EmptyState msg="No quiz questions added for this topic yet." />
      <CompleteButton onComplete={onComplete} isDone={isDone} label="Continue to Review →" />
    </div>
  );

  const q = shuffled[current];
  const answered = answers[q?.id] !== undefined;
  const allAnswered = shuffled.every(q => answers[q.id] !== undefined);

  async function submitQuiz() {
    const duration = Math.floor((Date.now() - startTime.current) / 1000);
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId, answers, duration_secs: duration }),
    });
    const data = await res.json();
    setScore(data);
    setSubmitted(true);
  }

  function selectAnswer(idx: number) {
    if (revealed[q.id]) return;
    setAnswers(prev => ({ ...prev, [q.id]: idx }));
    setRevealed(prev => ({ ...prev, [q.id]: true }));
  }

  const canProceed = !gateEnabled || !score || score.score_pct >= gateMinScore;

  if (submitted && score) {
    return (
      <div>
        <StageHeader n={4} icon="✅" label="Test" desc="Quiz results" isDone={isDone} />
        <div className={`rounded-2xl p-8 text-center mb-6 ${score.score_pct >= 60 ? 'bg-sage-light border border-sage/30' : 'bg-crimson-light border border-crimson/30'}`}>
          <div className="font-serif text-6xl font-bold mb-2" style={{ color: score.score_pct >= 60 ? '#3d6b45' : '#8b2635' }}>
            {score.score_pct}%
          </div>
          <p className="font-sans text-ink-2">{score.correct} / {score.total} correct</p>
          {gateEnabled && score.score_pct < gateMinScore && (
            <p className="font-sans text-sm text-crimson mt-3">Need {gateMinScore}% to unlock Stage 5. Try again!</p>
          )}
        </div>

        {/* Review answers */}
        <div className="space-y-4 mb-6">
          {shuffled.map((q, qi) => (
            <div key={q.id} className="bg-paper-2 border border-rule rounded-xl p-4">
              <p className="font-sans text-sm font-medium text-ink mb-3">{qi + 1}. {q.stem}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-2 text-sm font-sans px-3 py-2 rounded-lg ${
                    oi === q.correct_index ? 'bg-sage-light text-sage font-medium' :
                    answers[q.id] === oi && oi !== q.correct_index ? 'bg-crimson-light text-crimson' :
                    'text-ink-3'
                  }`}>
                    <span>{oi === q.correct_index ? '✓' : answers[q.id] === oi ? '✗' : '○'}</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
              {q.explanation && (
                <p className="font-sans text-xs text-ink-3 mt-3 pt-3 border-t border-rule">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {canProceed ? (
            <button onClick={onComplete} className="flex-1 bg-ink text-paper py-3 rounded-xl font-sans font-medium hover:bg-ink-2 transition-colors">
              Continue to Review →
            </button>
          ) : (
            <button onClick={() => { setSubmitted(false); setAnswers({}); setRevealed({}); setCurrent(0); }}
              className="flex-1 bg-gold text-ink py-3 rounded-xl font-sans font-medium hover:bg-gold/80 transition-colors">
              Retry Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <StageHeader n={4} icon="✅" label="Test" desc={`Question ${current + 1} of ${shuffled.length}`} isDone={isDone} />

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {shuffled.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${answers[shuffled[i].id] !== undefined ? 'bg-gold' : i === current ? 'bg-rule' : 'bg-paper-3'}`} />
        ))}
      </div>

      {/* Question */}
      <div className="bg-paper-2 border border-rule rounded-2xl p-6 mb-6">
        <p className="font-sans text-base text-ink leading-relaxed">{q.stem}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {q.options.map((opt, oi) => (
          <button
            key={oi}
            onClick={() => selectAnswer(oi)}
            disabled={!!revealed[q.id]}
            className={`w-full text-left px-5 py-4 rounded-xl border font-sans text-sm transition-all ${
              revealed[q.id] ?
                oi === q.correct_index ? 'bg-sage-light border-sage text-sage font-semibold' :
                answers[q.id] === oi ? 'bg-crimson-light border-crimson text-crimson' :
                'bg-paper-2 border-rule text-ink-3' :
              answers[q.id] === oi ? 'bg-cobalt-light border-cobalt text-cobalt' :
              'bg-paper-2 border-rule text-ink hover:border-ink hover:bg-paper-3'
            }`}
          >
            <span className="font-mono text-xs mr-3">{String.fromCharCode(65 + oi)}.</span>
            {opt}
          </button>
        ))}
      </div>

      {/* Explanation */}
      {revealed[q.id] && q.explanation && (
        <div className="bg-cobalt-light border-l-4 border-cobalt rounded-r-xl px-4 py-3 mb-6">
          <p className="font-sans text-sm text-cobalt">{q.explanation}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)} className="px-5 py-3 rounded-xl bg-paper-3 text-ink-2 font-sans text-sm hover:bg-rule transition-colors">
            ← Back
          </button>
        )}
        {current < shuffled.length - 1 ? (
          <button
            onClick={() => revealed[q.id] && setCurrent(c => c + 1)}
            disabled={!revealed[q.id]}
            className="flex-1 py-3 rounded-xl bg-ink text-paper font-sans text-sm hover:bg-ink-2 transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="flex-1 py-3 rounded-xl bg-gold text-ink font-sans font-medium hover:bg-gold/80 transition-colors disabled:opacity-40"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stage 5: Review ──────────────────────────────────────────────────────────
function Stage5({ topicId, subjectId, completedStages, materials, questions, flashcards }: {
  topicId: string;
  subjectId: string;
  completedStages: number[];
  materials: Material[];
  questions: Question[];
  flashcards: Flashcard[];
}) {
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/quiz?topicId=${topicId}`).then(r => r.json()).then(setQuizHistory);
  }, [topicId]);

  const bestScore = quizHistory.length > 0 ? Math.max(...quizHistory.map(a => a.score_pct)) : null;
  const stagesCompleted = completedStages.filter(s => s <= 4).length;
  const stars = completedStages.includes(5) || stagesCompleted >= 4 ? 3 : stagesCompleted >= 3 ? 2 : stagesCompleted >= 1 ? 1 : 0;

  return (
    <div>
      <StageHeader n={5} icon="📊" label="Review" desc="Session complete! Here's your summary." isDone={false} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-gold">{stagesCompleted + (completedStages.includes(5) ? 1 : 0)}/5</div>
          <div className="font-mono text-xs text-ink-4 mt-1">Stages Done</div>
        </div>
        <div className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-gold">{bestScore !== null ? `${bestScore}%` : '—'}</div>
          <div className="font-mono text-xs text-ink-4 mt-1">Best Quiz Score</div>
        </div>
        <div className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-gold">{flashcards.length}</div>
          <div className="font-mono text-xs text-ink-4 mt-1">Flashcards</div>
        </div>
        <div className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-gold">{quizHistory.length}</div>
          <div className="font-mono text-xs text-ink-4 mt-1">Quiz Attempts</div>
        </div>
      </div>

      {/* Stars */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1,2,3].map(s => (
            <span key={s} className={`text-4xl ${s <= stars ? 'text-gold' : 'text-rule'}`}>★</span>
          ))}
        </div>
        <p className="font-sans text-sm text-ink-3">
          {stars === 3 ? 'Outstanding! All stages complete.' :
           stars === 2 ? 'Great work! Quiz passed.' :
           stars === 1 ? 'Good start! Keep going.' : 'Keep studying!'}
        </p>
      </div>

      {/* Quiz history */}
      {quizHistory.length > 0 && (
        <div className="bg-paper-2 border border-rule rounded-xl p-5 mb-6">
          <h3 className="font-serif text-sm font-semibold text-ink mb-3">Quiz Attempts</h3>
          <div className="space-y-2">
            {quizHistory.slice(0, 5).map((a: any, i) => (
              <div key={a.id} className="flex items-center justify-between text-sm font-sans">
                <span className="text-ink-3">Attempt {quizHistory.length - i}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-4">{a.attempted_at.split('T')[0]}</span>
                  <span className={`font-mono font-medium ${a.score_pct >= 60 ? 'text-sage' : 'text-crimson'}`}>{a.score_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/session/${topicId}`} className="flex-1 text-center py-3 rounded-xl bg-paper-3 text-ink-2 font-sans text-sm hover:bg-rule transition-colors">
          Revisit Session
        </Link>
        <Link href={`/subjects/${subjectId}`} className="flex-1 text-center py-3 rounded-xl bg-ink text-paper font-sans text-sm hover:bg-ink-2 transition-colors">
          Next Topic →
        </Link>
      </div>
    </div>
  );
}

// ─── Slideshow ────────────────────────────────────────────────────────────────
function SlideshowCard({ material, reviewed, onOpen }: { material: Material; reviewed: boolean; onOpen: () => void }) {
  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${reviewed ? 'bg-sage-light/40 border-sage/30' : 'bg-paper-2 border-rule'}`}>
      <div className="px-4 py-3 border-b border-inherit flex items-center gap-2">
        <span className="text-base">{reviewed ? '✅' : '🖼️'}</span>
        <span className="font-sans text-sm font-medium text-ink">{material.title}</span>
        {reviewed && <span className="font-mono text-xs text-sage ml-1">Reviewed</span>}
        <span className="font-mono text-xs text-ink-4 ml-auto">{material.slide_count ?? 0} slides</span>
      </div>
      <div className="p-4 flex items-center justify-between">
        <p className="font-sans text-xs text-ink-4">Full-screen slideshow · 15 s timer per slide</p>
        <button
          onClick={onOpen}
          className="px-5 py-2 bg-ink text-paper rounded-lg font-sans text-sm hover:bg-ink-2 transition-colors"
        >
          {reviewed ? 'Rewatch →' : 'Open Slideshow →'}
        </button>
      </div>
    </div>
  );
}

function SlideshowViewer({
  material, onClose, onFinish,
}: {
  material: Material;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [slides, setSlides] = useState<SlideshowSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/slideshow/${material.id}`)
      .then(r => r.json())
      .then((data: SlideshowSlide[]) => { setSlides(data); setLoading(false); });
  }, [material.id]);

  // Reset and start countdown each time slide changes
  useEffect(() => {
    if (slides.length === 0) return;
    setTimeLeft(15);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, slides.length]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function goNext() {
    if (current < slides.length - 1) {
      setCurrent(c => c + 1);
    } else {
      onFinish();
      onClose();
    }
  }

  function goBack() {
    if (current > 0) setCurrent(c => c - 1);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <p className="text-white/60 font-mono text-sm">Loading slides…</p>
      </div>
    );
  }

  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const expired = timeLeft === 0;

  // Timer ring: stroke-dasharray 100, stroke-dashoffset = 100 - (timeLeft/30)*100
  const pct = (timeLeft / 15) * 100;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-sans text-sm font-medium text-white">{material.title}</span>
          <span className="font-mono text-xs text-white/40">{current + 1} / {slides.length}</span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
        >
          ✕ Close
        </button>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {slide && (
          <img
            key={slide.id}
            src={`/api/uploads/${slide.filename}`}
            alt={slide.original_name}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        )}

        {/* Countdown timer — lower-right corner */}
        <div className="absolute bottom-4 right-4 w-11 h-11">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={expired ? 'rgb(var(--gold))' : 'rgba(255,255,255,0.5)'}
              strokeWidth="3"
              strokeDasharray="94.25"
              strokeDashoffset={94.25 - (pct / 100) * 94.25}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center font-mono text-xs font-bold ${expired ? 'text-gold' : 'text-white/60'}`}>
            {expired ? '!' : timeLeft}
          </span>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-5 py-4 bg-black/80 backdrop-blur-sm border-t border-white/10 flex-shrink-0 gap-4">
        <button
          onClick={goBack}
          disabled={current === 0}
          className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-sans text-sm hover:bg-white/20 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        {/* Dot progress */}
        <div className="flex gap-1.5 flex-wrap justify-center flex-1 max-w-xs">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-150 ${
                i < current ? 'bg-white/50' : i === current ? 'bg-white scale-125' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={!expired}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all ${
            expired
              ? 'bg-gold text-ink shadow-lg shadow-gold/40 animate-pulse'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {isLast ? (expired ? '✓ Finish' : 'Finish') : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
function StageHeader({ n, icon, label, desc, isDone }: { n: number; icon: string; label: string; desc: string; isDone: boolean }) {
  return (
    <div className={`flex items-start gap-4 mb-6 p-5 rounded-2xl ${isDone ? 'bg-sage-light/50' : 'bg-paper-2'} border border-rule`}>
      <div className="text-3xl">{isDone ? '✅' : icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-4 uppercase tracking-wider">Stage {n}</span>
          {isDone && <span className="font-mono text-xs text-sage">Complete</span>}
        </div>
        <h2 className="font-serif text-xl font-semibold text-ink">{label}</h2>
        <p className="font-sans text-sm text-ink-3">{desc}</p>
      </div>
    </div>
  );
}

function MaterialCard({ material, onEnded }: { material: Material; onEnded?: () => void }) {
  const isPdf = material.filename.endsWith('.pdf');
  const isAudio = ['mp3', 'm4a', 'wav', 'ogg'].some(ext => material.filename.endsWith(ext));
  const isVideo = material.filename.endsWith('.mp4');
  const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].some(ext => material.filename.endsWith(ext));
  const fileUrl = `/api/uploads/${material.filename}`;

  const typeIcon: Record<string, string> = {
    slide: '🖥️', audio: '🎧', video: '🎬', guide: '📋', mindmap: '🗺️', infographic: '📊',
  };

  return (
    <div className="mb-4 bg-paper-2 border border-rule rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-rule flex items-center gap-2">
        <span className="text-base">{typeIcon[material.type] ?? '📄'}</span>
        <span className="font-sans text-sm font-medium text-ink">{material.title}</span>
        <span className="font-mono text-xs text-ink-4 ml-auto uppercase">{material.type}</span>
      </div>
      <div className="bg-paper">
        {isVideo && (
          <div className="p-4">
            <video controls className="w-full rounded-lg" src={fileUrl} onEnded={onEnded}>Your browser does not support video.</video>
          </div>
        )}
        {isAudio && (
          <div className="p-4">
            <audio controls className="w-full" src={fileUrl} onEnded={onEnded}>Your browser does not support audio.</audio>
          </div>
        )}
        {isPdf && (
          <iframe src={fileUrl} className="w-full h-[500px] border-0" title={material.title} />
        )}
        {isImage && (
          <img src={fileUrl} alt={material.title} className="w-full h-auto max-h-96 object-contain p-2" />
        )}
        {!isPdf && !isAudio && !isVideo && !isImage && (
          <div className="p-4 text-center">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="font-sans text-sm text-cobalt hover:underline">
              📥 Download {material.original_name || material.filename}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="text-center py-10 bg-paper-2 border border-rule rounded-xl mb-6">
      <p className="text-3xl mb-2">📭</p>
      <p className="font-sans text-sm text-ink-4">{msg}</p>
    </div>
  );
}

function CompleteButton({ onComplete, isDone, label, locked = false }: { onComplete: () => void; isDone: boolean; label: string; locked?: boolean }) {
  return (
    <div className="mt-6">
      {locked && (
        <p className="font-mono text-xs text-ink-4 text-center mb-2">
          Complete all slideshows, videos &amp; audio above to continue
        </p>
      )}
      <button
        onClick={onComplete}
        disabled={locked}
        className={`w-full py-4 rounded-xl font-sans font-medium text-sm transition-all ${
          isDone
            ? 'bg-sage-light text-sage border border-sage/30'
            : locked
              ? 'bg-paper-3 text-ink-4 cursor-not-allowed'
              : 'bg-ink text-paper hover:bg-ink-2'
        }`}
      >
        {isDone ? '✓ Already completed — ' + label : label}
      </button>
    </div>
  );
}

const startTime = { current: Date.now() };
