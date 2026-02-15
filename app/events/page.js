import { Suspense } from 'react';
import EventsPageClient from './EventsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Chargement des événements...</p>
            </div>
          </section>
        </main>
      }
    >
      <EventsPageClient />
    </Suspense>
  );
}
