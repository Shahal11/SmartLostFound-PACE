import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthStatus } from '../../utils/authHooks';
import ChatBox from '../../components/chat/ChatBox';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user, loading: authLoading } = useAuthStatus();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const unsubscribeRef = useRef(null);

  // Debug: Monitor Auth and Params
  useEffect(() => {
    console.log(`[ChatDebug] Component Rendered. ChatId: ${chatId}`);
    if (authLoading) console.log('[ChatDebug] Auth is loading...');
    if (!authLoading && user) console.log(`[ChatDebug] User is logged in: ${user.uid} (${user.email})`);
    if (!authLoading && !user) console.warn('[ChatDebug] NO USER FOUND. Chat will not initialize.');
  }, [authLoading, user, chatId]);

  useEffect(() => {
    // 1. Guard Clause Logging
    if (authLoading || !user || !chatId) {
      console.log('[ChatDebug] Waiting for Auth or ChatId to be ready...');
      return;
    }

    const setupChat = async () => {
      console.log('[ChatDebug] --- Starting Chat Setup ---');
      setLoading(true);
      
      try {
        // 2. Room Check Logic
        if (chatId !== 'global') {
          console.log(`[ChatDebug] Checking existence of private room: ${chatId}`);
          const chatDocRef = doc(db, 'chats', chatId);
          
          try {
            const chatDocSnap = await getDoc(chatDocRef);
            if (chatDocSnap.exists()) {
                console.log('[ChatDebug] Room exists in Firestore.');
            } else {
              console.log('[ChatDebug] Room does NOT exist. creating new room...');
              const participants = chatId.split('_');
              await setDoc(chatDocRef, {
                participants: participants,
                createdAt: serverTimestamp(),
                type: 'private'
              });
              console.log('[ChatDebug] New room created successfully.');
            }
          } catch (docError) {
            console.warn("[ChatDebug] Room check warning (Permissions?):", docError);
          }
        } else {
            console.log('[ChatDebug] Global chat selected. Skipping room check.');
        }

        // 3. Listener Logic
        console.log('[ChatDebug] Setting up message listener...');
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

        if (unsubscribeRef.current) {
            console.log('[ChatDebug] Cleaning up previous listener.');
            unsubscribeRef.current();
        }

        const unsub = onSnapshot(messagesQuery, (snapshot) => {
            console.log(`[ChatDebug] Snapshot received! Docs count: ${snapshot.docs.length}`);
            
            const formatted = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                sender: data.senderName || 'Unknown',
                senderUid: data.senderUid,
                content: data.content || '',
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
                isOwn: data.senderUid === user.uid,
              };
            });
            
            setMessages(formatted);
            setLoading(false);
          },
          (error) => {
            console.error("[ChatDebug] Listener Error:", error);
            setLoading(false);
          }
        );
        
        unsubscribeRef.current = unsub;

      } catch (error) {
        console.error("[ChatDebug] Critical Setup Error:", error);
        setLoading(false);
      }
    };

    setupChat();

    return () => {
      console.log('[ChatDebug] Component unmounting, cleaning up listener.');
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [authLoading, user, chatId]);

  const handleSend = async (text) => {
    console.log(`[ChatDebug] Attempting to send: "${text}"`);
    if (!user || !text.trim()) {
        console.warn('[ChatDebug] Send aborted: User missing or text empty.');
        return;
    }

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const payload = {
        senderUid: user.uid,
        senderName: user.email?.split('@')[0] || 'User',
        content: text.trim(),
        timestamp: serverTimestamp(),
      };

      console.log('[ChatDebug] Payload prepared:', payload);
      await addDoc(messagesRef, payload);
      console.log('[ChatDebug] Message write successful!');
      
    } catch (err) {
      console.error('[ChatDebug] Failed to send message:', err);
      alert("Could not send message. Check console for details.");
    }
  };

  if (loading || authLoading) {
      console.log('[ChatDebug] Render: Showing Spinner');
      return <LoadingSpinner message="Connecting..." />;
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {chatId === 'global' ? 'Campus Global Chat' : 'Private Conversation'}
          </h2>
          <span className="text-xs text-gray-400 font-mono">DEBUG MODE: {chatId}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden max-w-4xl w-full mx-auto">
        <ChatBox messages={messages} onSend={handleSend} />
      </div>
    </div>
  );
}