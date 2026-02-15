'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HotelAutocomplete from '@/components/HotelAutocomplete';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Plus,
  Hotel,
  Coffee,
  Utensils,
  Laptop,
  Dumbbell,
  MessageSquare,
  LogIn,
  ChevronRight,
  Sparkles,
  Clock,
  Building2,
} from 'lucide-react';

const THEMATIQUES = [
  { id: 'apero', label: 'Apéro', icon: Coffee, color: 'bg-orange-100 text-orange-700' },
  { id: 'diner', label: 'Dîner', icon: Utensils, color: 'bg-red-100 text-red-700' },
  { id: 'coworking', label: 'Coworking', icon: Laptop, color: 'bg-blue-100 text-blue-700' },
  { id: 'petit-dej', label: 'Petit-déj', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: 'bg-green-100 text-green-700' },
  { id: 'talk-business', label: 'Talk Business', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
];

export default function HomePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [searchCity, setSearchCity] = useState('');
  const [searchHotel, setSearchHotel] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    fetchEvents();
  }, [activeTab, selectedTheme]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setEventsError('');
    try {
      const now = new Date();
      let startDate = now;
      let endDate = new Date();

      if (activeTab === 'today') {
        endDate.setHours(23, 59, 59, 999);
      } else if (activeTab === 'week') {
        endDate.setDate(now.getDate() + 7);
      } else {
        endDate.setMonth(now.getMonth() + 1);
      }

      let q = query(
        collection(db, 'events'),
        where('visibility', '==', 'public'),
        where('eventDate', '>=', Timestamp.fromDate(startDate)),
        where('eventDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('eventDate', 'asc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      let eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter by theme if selected
      if (selectedTheme) {
        eventsData = eventsData.filter((e) => e.thematique === selectedTheme);
      }

      // Filter by selected hotel or city
      if (selectedHotel) {
        eventsData = eventsData.filter(
          (e) =>
            e.hotelCity?.toLowerCase().includes(selectedHotel.city?.toLowerCase() || '') ||
            e.hotelName?.toLowerCase().includes(selectedHotel.name?.toLowerCase() || '')
        );
      } else if (searchCity) {
        eventsData = eventsData.filter(
          (e) =>
            e.hotelCity?.toLowerCase().includes(searchCity.toLowerCase()) ||
            e.hotelName?.toLowerCase().includes(searchCity.toLowerCase())
        );
      }

      setEvents(eventsData);
    } catch (error) {
      setEvents([]);
      setEventsError("Impossible de charger les événements pour le moment. Réessayez dans quelques instants.");
    }
    setLoadingEvents(false);
  };

  const handleLandingSearch = (e) => {
    e.preventDefault();

    const query = searchHotel.trim();
    if (!query) {
      setSearchError("Veuillez saisir un hôtel avant de lancer la recherche.");
      return;
    }

    setSearchError('');
    router.push(`/events?hotel=${encodeURIComponent(query)}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getThemeInfo = (themeId) => {
    return THEMATIQUES.find((t) => t.id === themeId) || THEMATIQUES[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl hidden sm:block">HotelNetwork</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/messages">
                  <Button variant="ghost" size="icon">
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href={`/profile/${user.uid}`}>
                  <Avatar className="w-9 h-9 cursor-pointer border-2 border-primary/20">
                    <AvatarImage src={userProfile?.photoURL || user.photoURL} />
                    <AvatarFallback>
                      {(userProfile?.displayName || user.displayName || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <Link href="/auth">
                <Button className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Networking Hôtelier
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Transformez vos séjours en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              opportunités
            </span>
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Rencontrez des professionnels qui séjournent dans le même hôtel que vous.
            Organisez ou rejoignez des événements de networking.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleLandingSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="flex-1">
              <HotelAutocomplete
                value={searchHotel}
                onChange={(value) => {
                  setSearchHotel(value);
                  if (searchError) {
                    setSearchError('');
                  }
                  if (!value) {
                    setSelectedHotel(null);
                  }
                }}
                onSelect={(hotel) => {
                  setSelectedHotel(hotel);
                  if (hotel) {
                    setSearchHotel(hotel.name);
                    setSearchCity(hotel.city);
                    setSearchError('');
                  }
                }}
                placeholder="Rechercher un hôtel..."
                inputClassName="h-12"
              />
            </div>
            <Button type="submit" className="h-12 px-6 gap-2">
              <Search className="w-4 h-4" />
              Rechercher
            </Button>
          </form>
          {searchError && <p className="text-sm text-destructive mt-2">{searchError}</p>}
          {selectedHotel && (
            <p className="text-sm text-muted-foreground mt-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              {selectedHotel.city}{selectedHotel.country ? `, ${selectedHotel.country}` : ''}
            </p>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <Card
            className="flex-1 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            onClick={() => (user ? router.push('/events/new') : router.push('/auth'))}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Créer un événement</h3>
                <p className="text-sm text-muted-foreground">Organisez une rencontre</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>

          <Link href="/events" className="flex-1">
            <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Search className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Trouver un event</h3>
                  <p className="text-sm text-muted-foreground">Dans votre hôtel</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Thématiques Filter */}
      <section className="container mx-auto px-4 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedTheme === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme(null)}
            className="whitespace-nowrap"
          >
            Tous
          </Button>
          {THEMATIQUES.map((theme) => {
            const Icon = theme.icon;
            return (
              <Button
                key={theme.id}
                variant={selectedTheme === theme.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTheme(theme.id)}
                className="whitespace-nowrap gap-1"
              >
                <Icon className="w-4 h-4" />
                {theme.label}
              </Button>
            );
          })}
        </div>
      </section>

      {/* Events List */}
      <section className="container mx-auto px-4 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="week">Cette semaine</TabsTrigger>
            <TabsTrigger value="month">Ce mois</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loadingEvents ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : eventsError ? (
              <Card className="max-w-md mx-auto border-destructive/40">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-destructive" />
                  <h3 className="font-semibold mb-2">Chargement indisponible</h3>
                  <p className="text-sm text-muted-foreground mb-4">{eventsError}</p>
                  <Button variant="outline" onClick={fetchEvents}>Réessayer</Button>
                </CardContent>
              </Card>
            ) : events.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Aucun événement trouvé</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Soyez le premier à créer un événement dans votre hôtel !
                  </p>
                  <Button onClick={() => (user ? router.push('/events/new') : router.push('/auth'))}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un événement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const theme = getThemeInfo(event.thematique);
                  const ThemeIcon = theme.icon;
                  return (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge className={`${theme.color} border-0`}>
                              <ThemeIcon className="w-3 h-3 mr-1" />
                              {theme.label}
                            </Badge>
                            {event.maxParticipants && (
                              <span className="text-xs text-muted-foreground">
                                <Users className="w-3 h-3 inline mr-1" />
                                {event.participantsCount || 0}/{event.maxParticipants}
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-lg mt-2">{event.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {event.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="w-4 h-4" />
                              <span className="truncate">{event.hotelName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{event.hotelCity}</span>
                            </div>
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
                              <span className="text-sm text-muted-foreground">
                                par {event.organizerName}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Hotel className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">HotelNetwork</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 HotelNetwork. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground">
                Mentions légales
              </Link>
              <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
                Paramètres
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
