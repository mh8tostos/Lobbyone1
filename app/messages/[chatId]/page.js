'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  doc,
  getDoc,
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
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

export default function PrivateChatPage() {
  const { chatId } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [chat, setChat] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (chatId && user) {
      fetchChat();
    }
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChat = async () => {
    try {
      // Subscribe to chat
      const unsubscribeChat = onSnapshot(doc(db, 'chats', chatId), async (docSnap) => {
        if (!docSnap.exists()) {
          toast.error('Conversation non trouvée');
          router.push('/messages');
          return;
        }

        const chatData = { id: docSnap.id, ...docSnap.data() };

        // Check if user is member
        if (!chatData.members?.includes(user.uid)) {
          toast.error('Accès non autorisé');
          router.push('/messages');
          return;
        }

        setChat(chatData);

        // Get other user info
        const otherUserId = chatData.members.find((m) => m !== user.uid);
        if (chatData.membersData?.[otherUserId]) {
          setOtherUser(chatData.membersData[otherUserId]);
        } else {
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            setOtherUser(otherUserDoc.data());
          }
        }
      });

      // Subscribe to messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        orderBy('createdAt', 'asc'),
        limit(100)
      );

      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(messagesData);
        setLoading(false);
      });

      return () => {
        unsubscribeChat();
        unsubscribeMessages();
      };
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

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
      });

      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi");
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
          <Link href="/messages">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          {otherUser && (
            <Link href={`/profile/${chat?.members?.find((m) => m !== user.uid)}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherUser.photoURL} />
                <AvatarFallback>{otherUser.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">{otherUser.displayName}</h1>
                {otherUser.jobTitle && (
                  <p className="text-xs text-muted-foreground">{otherUser.jobTitle}</p>
                )}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Démarrez la conversation</p>
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
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-white rounded-tl-sm shadow-sm'
                      }`}
                    >
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
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
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
