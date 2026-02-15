'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, Users, Info } from 'lucide-react';

export default function EventChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatUnavailableMessage, setChatUnavailableMessage] = useState('');
  const [participantsCount, setParticipantsCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const logFirestoreError = (message, error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(message, error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id || authLoading || !user || !auth?.currentUser?.uid) return undefined;

    let unsubscribeChat = () => {};
    let unsubscribeMessages = () => {};
    let unsubscribeParticipants = () => {};

    const setupChatListeners = async () => {
      try {
        // Fetch event
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (!eventDoc.exists()) {
          toast.error('Événement non trouvé');
          router.push('/');
          setLoading(false);
          return;
        }
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
        setChatUnavailableMessage('');

        // Ensure current user is a participant before opening chat listeners
        const participantDocId = `${id}_${user.uid}`;
        const participantDoc = await getDoc(doc(db, 'eventParticipants', participantDocId));
        if (!participantDoc.exists()) {
          toast.error("Vous devez rejoindre l'événement pour accéder au chat");
          router.push(`/events/${id}`);
          setLoading(false);
          return;
        }

        // Resolve event chat id using eventId linkage
        const chatQuery = query(
          collection(db, 'chats'),
          where('eventId', '==', id),
          limit(1)
        );

        const chatResult = await getDocs(chatQuery);
        if (chatResult.empty) {
          setChat(null);
          setMessages([]);
          setChatUnavailableMessage('Aucun chat disponible pour cet événement pour le moment.');
          setLoading(false);
          return;
        }

        const chatId = chatResult.docs[0].id;

        const participantsQuery = query(
          collection(db, 'eventParticipants'),
          where('eventId', '==', id)
        );

        unsubscribeParticipants = onSnapshot(
          participantsQuery,
          (participantsSnapshot) => {
            setParticipantsCount(participantsSnapshot.size);
          },
          (error) => {
            logFirestoreError('Error subscribing to participants:', error);
            setParticipantsCount(0);
          }
        );

        unsubscribeChat = onSnapshot(
          doc(db, 'chats', chatId),
          (chatSnapshot) => {
            if (chatSnapshot.exists()) {
              const chatData = { id: chatSnapshot.id, ...chatSnapshot.data() };
            setChat(chatData);

            unsubscribeMessages();

            // Subscribe to messages
            const messagesQuery = query(
              collection(db, 'messages'),
              where('chatId', '==', chatData.id),
              orderBy('createdAt', 'asc'),
              limit(100)
            );

              unsubscribeMessages = onSnapshot(
                messagesQuery,
                (msgSnapshot) => {
                  const messagesData = msgSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  setMessages(messagesData);
                  setLoading(false);
                },
                (error) => {
                  if (error?.code === 'permission-denied') {
                    setChatUnavailableMessage('Accès refusé au chat');
                    setMessages([]);
                    setChat(null);
                    toast.error('Accès refusé au chat');
                  } else if (error?.code === 'failed-precondition') {
                    setChatUnavailableMessage('Configuration Firestore incomplète (index requis).');
                    setMessages([]);
                    toast.error('Index Firestore requis pour charger les messages');
                  } else {
                    logFirestoreError('Error subscribing to messages:', error);
                    toast.error('Erreur lors du chargement des messages');
                  }
                  setLoading(false);
                }
              );
            } else {
              setChat(null);
              setMessages([]);
              setChatUnavailableMessage('Aucun chat disponible pour cet événement pour le moment.');
              setLoading(false);
            }
          },
          (error) => {
            if (error?.code === 'permission-denied') {
              setChatUnavailableMessage('Accès refusé au chat');
              setChat(null);
              setMessages([]);
              toast.error('Accès refusé au chat');
            } else {
              logFirestoreError('Error subscribing to event chat:', error);
              toast.error('Erreur lors du chargement du chat');
            }
            setLoading(false);
          }
        );
      } catch (error) {
        logFirestoreError('Error fetching chat:', error);
        toast.error('Erreur lors du chargement');
        setLoading(false);
      }
    };

    setupChatListeners();

    return () => {
      unsubscribeMessages();
      unsubscribeChat();
      unsubscribeParticipants();
    };
  }, [id, user, authLoading, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Add message
      await addDoc(collection(db, 'messages'), {
        chatId: chat.id,
        senderId: user.uid,
        senderName: userProfile?.displayName || user.displayName,
        senderPhoto: userProfile?.photoURL || user.photoURL,
        text: messageText,
        createdAt: serverTimestamp(),
      });

      // Update chat last message
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        lastMessageSender: userProfile?.displayName || user.displayName,
      });

      inputRef.current?.focus();
    } catch (error) {
      logFirestoreError('Error sending message:', error);
      if (error?.code === 'permission-denied') {
        toast.error('Vous n\'avez pas accès à ce chat');
      } else if (error?.code === 'failed-precondition') {
        toast.error('Configuration Firestore incomplète pour envoyer ce message');
      } else {
        toast.error('Erreur lors de l\'envoi');
      }
      setNewMessage(messageText);
    }
    setSending(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const shouldShowDate = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = currentMsg.createdAt?.toDate?.() || new Date();
    const prevDate = prevMsg.createdAt?.toDate?.() || new Date();
    return currentDate.toDateString() !== prevDate.toDateString();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/events/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{event?.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participantsCount} participants
            </p>
          </div>
          <Link href={`/events/${id}`}>
            <Button variant="ghost" size="icon">
              <Info className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chatUnavailableMessage ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>{chatUnavailableMessage}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Aucun message encore</p>
              <p className="text-sm">Soyez le premier à écrire !</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === user.uid;
              const showDate = shouldShowDate(message, messages[index - 1]);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    {!isOwnMessage && (
                      <Link href={`/profile/${message.senderId}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={message.senderPhoto} />
                          <AvatarFallback>{message.senderName?.[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-white rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {message.senderName}
                        </p>
                      )}
                      <p className="break-words">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            maxLength={1000}
            disabled={!chat || !!chatUnavailableMessage}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending || !chat || !!chatUnavailableMessage}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
