'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Share2,
  Hotel,
  Loader2,
  UserPlus,
  UserMinus,
  ExternalLink,
  Coffee,
  Utensils,
  Laptop,
  Dumbbell,
  Building2,
} from 'lucide-react';

const THEMATIQUES = {
  apero: { label: 'Apéro', icon: Coffee, color: 'bg-orange-100 text-orange-700' },
  diner: { label: 'Dîner', icon: Utensils, color: 'bg-red-100 text-red-700' },
  coworking: { label: 'Coworking', icon: Laptop, color: 'bg-blue-100 text-blue-700' },
  'petit-dej': { label: 'Petit-déj', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  sport: { label: 'Sport', icon: Dumbbell, color: 'bg-green-100 text-green-700' },
  'talk-business': { label: 'Talk Business', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
};

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [myParticipation, setMyParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id, user]);

  const fetchEventData = async () => {
    try {
      // Fetch event
      const eventDoc = await getDoc(doc(db, 'events', id));
      if (!eventDoc.exists()) {
        toast.error('Événement non trouvé');
        router.push('/');
        return;
      }
      setEvent({ id: eventDoc.id, ...eventDoc.data() });

      // Fetch participants
      const participantsQuery = query(
        collection(db, 'eventParticipants'),
        where('eventId', '==', id)
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantsData = participantsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setParticipants(participantsData);

      // Check if current user is participant
      if (user) {
        const myPart = participantsData.find((p) => p.userId === user.uid);
        setIsParticipant(!!myPart);
        setMyParticipation(myPart);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Check if max participants reached
    if (event.maxParticipants && participants.length >= event.maxParticipants) {
      toast.error('Cet événement est complet');
      return;
    }

    setJoining(true);
    try {
      // Add as participant
      await addDoc(collection(db, 'eventParticipants'), {
        eventId: id,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName,
        userPhoto: userProfile?.photoURL || user.photoURL,
        userCompany: userProfile?.company || '',
        userJobTitle: userProfile?.jobTitle || '',
        joinedAt: serverTimestamp(),
        role: 'participant',
      });

      // Update participants count
      await updateDoc(doc(db, 'events', id), {
        participantsCount: increment(1),
      });

      // Add user to event chat
      const chatQuery = query(
        collection(db, 'chats'),
        where('eventId', '==', id),
        where('type', '==', 'event')
      );
      const chatSnapshot = await getDocs(chatQuery);
      if (!chatSnapshot.empty) {
        await updateDoc(doc(db, 'chats', chatSnapshot.docs[0].id), {
          members: arrayUnion(user.uid),
        });
      }

      toast.success('Vous avez rejoint l\'événement !');
      fetchEventData();
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Erreur lors de l\'inscription');
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!myParticipation) return;

    // Prevent organizer from leaving
    if (myParticipation.role === 'organizer') {
      toast.error('L\'organisateur ne peut pas quitter l\'événement');
      return;
    }

    setJoining(true);
    try {
      // Remove participant
      await deleteDoc(doc(db, 'eventParticipants', myParticipation.id));

      // Update participants count
      await updateDoc(doc(db, 'events', id), {
        participantsCount: increment(-1),
      });

      toast.success('Vous avez quitté l\'événement');
      fetchEventData();
    } catch (error) {
      console.error('Error leaving event:', error);
      toast.error('Erreur lors de la désinscription');
    }
    setJoining(false);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: event.title,
        text: `Rejoins-moi à ${event.title} au ${event.hotelName}`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) return null;

  const theme = THEMATIQUES[event.thematique] || THEMATIQUES.apero;
  const ThemeIcon = theme.icon;
  const isPast = event.eventDate?.toDate() < new Date();
  const isFull = event.maxParticipants && participants.length >= event.maxParticipants;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold truncate max-w-[200px]">{event.title}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <Badge className={`${theme.color} border-0`}>
                <ThemeIcon className="w-3 h-3 mr-1" />
                {theme.label}
              </Badge>
              {isPast && <Badge variant="secondary">Terminé</Badge>}
              {isFull && !isPast && <Badge variant="destructive">Complet</Badge>}
            </div>
            <CardTitle className="text-2xl mt-3">{event.title}</CardTitle>
            {event.description && (
              <CardDescription className="text-base">{event.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hotel Info */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Hotel className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{event.hotelName}</p>
                {event.hotelAddress && (
                  <p className="text-sm text-muted-foreground">{event.hotelAddress}</p>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  {event.hotelCity}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span>{formatDate(event.eventDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span>{formatTime(event.eventDate)}</span>
              </div>
            </div>

            {/* Participants Count */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span>
                {participants.length}
                {event.maxParticipants ? ` / ${event.maxParticipants}` : ''} participants
              </span>
            </div>

            <Separator />

            {/* Organizer */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={event.organizerPhoto} />
                <AvatarFallback>{event.organizerName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Organisé par</p>
                <Link href={`/profile/${event.organizerId}`} className="font-medium hover:underline">
                  {event.organizerName}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!isPast && (
          <div className="flex gap-3 mb-6">
            {isParticipant ? (
              <>
                <Link href={`/events/${id}/chat`} className="flex-1">
                  <Button className="w-full gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Chat de l'événement
                  </Button>
                </Link>
                {myParticipation?.role !== 'organizer' && (
                  <Button variant="outline" onClick={handleLeave} disabled={joining}>
                    {joining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={handleJoin}
                disabled={joining || isFull}
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isFull ? 'Complet' : 'Rejoindre l\'événement'}
              </Button>
            )}
          </div>
        )}

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Soyez le premier à rejoindre !
              </p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <Link
                    key={participant.id}
                    href={`/profile/${participant.userId}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                  >
                    <Avatar>
                      <AvatarImage src={participant.userPhoto} />
                      <AvatarFallback>{participant.userName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{participant.userName}</p>
                        {participant.role === 'organizer' && (
                          <Badge variant="secondary" className="text-xs">
                            Organisateur
                          </Badge>
                        )}
                      </div>
                      {(participant.userJobTitle || participant.userCompany) && (
                        <p className="text-sm text-muted-foreground truncate">
                          {participant.userJobTitle}
                          {participant.userJobTitle && participant.userCompany && ' • '}
                          {participant.userCompany}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
