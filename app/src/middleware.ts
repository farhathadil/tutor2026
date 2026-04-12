export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/subjects/:path*',
    '/topics/:path*',
    '/session/:path*',
    '/admin/:path*',
    '/api/subjects/:path*',
    '/api/topics/:path*',
    '/api/materials/:path*',
    '/api/questions/:path*',
    '/api/flashcards/:path*',
    '/api/progress/:path*',
    '/api/quiz/:path*',
    '/api/flashcard-rating/:path*',
    '/api/users/:path*',
  ],
};
