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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  MapPin,
  Linkedin,
  MessageSquare,
  Calendar,
  Settings,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function ProfilePage({ params }) {
  const { uid } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    if (uid) {
      fetchProfile();
    }
  }, [uid]);

  const fetchProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        toast.error('Profil non trouvé');
        router.push('/');
        return;
      }
      setProfile({ id: userDoc.id, ...userDoc.data() });

      // Fetch user's events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizerId', '==', uid),
        where('visibility', '==', 'public')
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  };

  const startPrivateChat = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    setStartingChat(true);
    try {
      // Check if chat already exists
      const existingChatQuery = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('members', 'array-contains', user.uid)
      );
      const existingChats = await getDocs(existingChatQuery);
      const existingChat = existingChats.docs.find((doc) =>
        doc.data().members.includes(uid)
      );

      if (existingChat) {
        router.push(`/messages/${existingChat.id}`);
        return;
      }

      // Create new chat
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'private',
        members: [user.uid, uid],
        membersData: {
          [user.uid]: {
            name: user.displayName,
            photo: user.photoURL,
          },
          [uid]: {
            name: profile.displayName,
            photo: profile.photoURL,
          },
        },
        lastMessage: null,
        lastMessageAt: null,
        createdAt: serverTimestamp(),
      });

      router.push(`/messages/${chatRef.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
    setStartingChat(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold">Profil</h1>
          </div>
          {isOwnProfile && (
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20">
                <AvatarImage src={profile.photoURL} />
                <AvatarFallback className="text-2xl">
                  {profile.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{profile.displayName}</h2>
              {(profile.jobTitle || profile.company) && (
                <p className="text-muted-foreground mt-1">
                  {profile.jobTitle}
                  {profile.jobTitle && profile.company && ' • '}
                  {profile.company}
                </p>
              )}
              {profile.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="w-4 h-4" />
                  {profile.city}
                </p>
              )}

              {/* Interests */}
              {profile.interests?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm mt-4 text-muted-foreground max-w-md">
                  {profile.bio}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6 w-full max-w-xs">
                {!isOwnProfile && user && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={startPrivateChat}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    Message
                  </Button>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Organized */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Événements organisés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.hotelName} • {formatDate(event.eventDate)}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
