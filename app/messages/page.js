'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Users, User, Hotel } from 'lucide-react';
import { toast } from 'sonner';

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [eventChats, setEventChats] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');
  const [indexMessage, setIndexMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      const sortChatsByLastMessage = (chats) => chats.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
        const bTime = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
        return bTime - aTime;
      });

      const subscribeToChats = ({ type, setChats }) => {
        const indexedQuery = query(
          collection(db, 'chats'),
          where('type', '==', type),
          where('members', 'array-contains', user.uid),
          orderBy('lastMessageAt', 'desc')
        );

        const fallbackQuery = query(
          collection(db, 'chats'),
          where('type', '==', type),
          where('members', 'array-contains', user.uid)
        );

        let fallbackUnsubscribe = null;

        const indexedUnsubscribe = onSnapshot(
          indexedQuery,
          (snapshot) => {
            const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setChats(sortChatsByLastMessage(chats));
            setLoading(false);
          },
          (error) => {
            if (error?.code === 'failed-precondition') {
              const message = 'Index Firestore en cours de création. Réessayez dans quelques minutes.';
              setIndexMessage(message);
              toast.warning(message);
              fallbackUnsubscribe = onSnapshot(
                fallbackQuery,
                (snapshot) => {
                  const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                  setChats(sortChatsByLastMessage(chats));
                  setLoading(false);
                },
                (fallbackError) => {
                  console.error(`Error loading fallback ${type} chats:`, fallbackError);
                  setLoading(false);
                }
              );
              return;
            }

            console.error(`Error loading ${type} chats:`, error);
            setLoading(false);
          }
        );

        return () => {
          indexedUnsubscribe();
          if (fallbackUnsubscribe) {
            fallbackUnsubscribe();
          }
        };
      };

      const unsubscribeEvents = subscribeToChats({ type: 'event', setChats: setEventChats });
      const unsubscribePrivate = subscribeToChats({ type: 'private', setChats: setPrivateChats });

      return () => {
        unsubscribeEvents();
        unsubscribePrivate();
      };
    }
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getOtherUser = (chat) => {
    if (chat.type !== 'private') return null;
    const otherUserId = chat.members?.find((m) => m !== user.uid);
    const otherUserData = chat.membersData?.[otherUserId];
    return otherUserData || { name: 'Utilisateur', photo: null };
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Messages</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {indexMessage && (
          <Card className="mb-4 border-amber-300 bg-amber-50">
            <CardContent className="p-3 text-sm text-amber-800">{indexMessage}</CardContent>
          </Card>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="events" className="gap-2">
              <Users className="w-4 h-4" />
              Événements
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-2">
              <User className="w-4 h-4" />
              Privés
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {eventChats.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Pas de conversations</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Rejoignez un événement pour accéder à son chat de groupe
                  </p>
                  <Link href="/">
                    <Button>Découvrir les événements</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {eventChats.map((chat) => (
                  <Link key={chat.id} href={`/events/${chat.eventId}/chat`}>
                    <Card className="hover:bg-slate-50 transition cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Hotel className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{chat.title}</h3>
                          {chat.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.lastMessageSender}: {chat.lastMessage}
                            </p>
                          )}
                        </div>
                        {chat.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chat.lastMessageAt)}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="private">
            {privateChats.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Pas de messages privés</h3>
                  <p className="text-sm text-muted-foreground">
                    Commencez une conversation depuis le profil d'un utilisateur
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {privateChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  return (
                    <Link key={chat.id} href={`/messages/${chat.id}`}>
                      <Card className="hover:bg-slate-50 transition cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={otherUser?.photo} />
                            <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{otherUser?.name}</h3>
                            {chat.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate">
                                {chat.lastMessage}
                              </p>
                            )}
                          </div>
                          {chat.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(chat.lastMessageAt)}
                            </span>
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
      </main>
    </div>
  );
}
