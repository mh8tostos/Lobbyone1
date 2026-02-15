'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  endAt,
  Timestamp,
  updateDoc,
  where,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getEventHotelName, getHotelNameLower, normalizeHotelName } from '@/lib/hotel-search';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Calendar, Clock, Building2, MapPin, Users, ArrowLeft, AlertCircle } from 'lucide-react';

const THEMATIQUES = [
  { id: 'apero', label: 'Apéro', color: 'bg-orange-100 text-orange-700' },
  { id: 'diner', label: 'Dîner', color: 'bg-red-100 text-red-700' },
  { id: 'coworking', label: 'Coworking', color: 'bg-blue-100 text-blue-700' },
  { id: 'petit-dej', label: 'Petit-déj', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'sport', label: 'Sport', color: 'bg-green-100 text-green-700' },
  { id: 'talk-business', label: 'Talk Business', color: 'bg-purple-100 text-purple-700' },
];

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDev = process.env.NODE_ENV !== 'production';

  const hotelParam = searchParams.get('hotel') || '';
  const [searchInput, setSearchInput] = useState(hotelParam);
  const [searchError, setSearchError] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [events, setEvents] = useState([]);

  const normalizedHotelQuery = useMemo(() => normalizeHotelName(hotelParam), [hotelParam]);

  useEffect(() => {
    setSearchInput(hotelParam);
  }, [hotelParam]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      setEventsError('');

      try {
        let eventsQuery;
        if (normalizedHotelQuery) {
          eventsQuery = query(
            collection(db, 'events'),
            orderBy('hotelNameLower'),
            startAt(normalizedHotelQuery),
            endAt(`${normalizedHotelQuery}\uf8ff`),
            limit(50)
          );
        } else {
          const now = Timestamp.fromDate(new Date());
          eventsQuery = query(
            collection(db, 'events'),
            where('visibility', '==', 'public'),
            where('eventDate', '>=', now),
            orderBy('eventDate', 'asc'),
            limit(50)
          );
        }

        const snapshot = await getDocs(eventsQuery);
        const items = snapshot.docs
          .map((eventDoc) => {
            const data = eventDoc.data();
            return {
              id: eventDoc.id,
              ...data,
              hotelName: getEventHotelName(data),
              hotelNameLower: getHotelNameLower(data),
            };
          })
          .filter((event) => event.visibility !== 'private');

        setEvents(items);

        const docsMissingLower = snapshot.docs.filter((eventDoc) => {
          const data = eventDoc.data();
          return !normalizeHotelName(data.hotelNameLower) && normalizeHotelName(getEventHotelName(data));
        });

        if (docsMissingLower.length > 0) {
          await Promise.all(
            docsMissingLower.map((eventDoc) => {
              const eventData = eventDoc.data();
              return updateDoc(doc(db, 'events', eventDoc.id), {
                hotelNameLower: normalizeHotelName(getEventHotelName(eventData)),
              });
            })
          );
        }
      } catch (error) {
        if (isDev) {
          console.error('Error loading events list:', error);
        }
        setEvents([]);
        setEventsError(
          "Impossible de charger les événements pour le moment. Vérifiez votre connexion puis réessayez."
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [isDev, normalizedHotelQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const queryValue = searchInput.trim();
    if (!queryValue) {
      setSearchError('Veuillez saisir un hôtel pour lancer la recherche.');
      return;
    }

    setSearchError('');
    router.push(`/events?hotel=${encodeURIComponent(queryValue)}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getThemeInfo = (themeId) => {
    return THEMATIQUES.find((theme) => theme.id === themeId) || THEMATIQUES[0];
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold mt-3">Événements</h1>
          <p className="text-muted-foreground mt-1">Recherchez des événements par hôtel.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              if (searchError) {
                setSearchError('');
              }
            }}
            placeholder="Ex: Okko La Défense"
            className="h-11"
          />
          <Button type="submit" className="h-11 gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </Button>
        </form>
        {searchError && <p className="mt-2 text-sm text-destructive">{searchError}</p>}
      </section>

      <section className="container mx-auto px-4 pb-16">
        {loadingEvents ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Chargement des événements...</p>
            </CardContent>
          </Card>
        ) : eventsError ? (
          <Card className="max-w-md mx-auto border-destructive/40">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="font-medium mb-2">Une erreur est survenue</p>
              <p className="text-sm text-muted-foreground mb-4">{eventsError}</p>
              <Button variant="outline" onClick={() => router.refresh()}>Réessayer</Button>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-2">Aucun événement trouvé</p>
              <p className="text-sm text-muted-foreground">
                {normalizedHotelQuery
                  ? "Aucun événement ne correspond à cet hôtel pour l'instant."
                  : 'Aucun événement public à venir pour le moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const theme = getThemeInfo(event.thematique);

              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Badge className={`${theme.color} border-0`}>{theme.label}</Badge>
                        {event.maxParticipants && (
                          <span className="text-xs text-muted-foreground">
                            <Users className="w-3 h-3 inline mr-1" />
                            {event.participantsCount || 0}/{event.maxParticipants}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2">{event.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span className="truncate">{event.hotelName || 'Hôtel non renseigné'}</span>
                        </div>
                        {event.hotelCity && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{event.hotelCity}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.eventDate)}</span>
                          <Clock className="w-4 h-4 ml-2" />
                          <span>{formatTime(event.eventDate)}</span>
                        </div>
                      </div>
                      {event.organizerName && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={event.organizerPhoto} />
                            <AvatarFallback>{event.organizerName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">par {event.organizerName}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
