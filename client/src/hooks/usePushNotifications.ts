import { useEffect, useState, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, getMessagingInstance } from '@/lib/firebase';

// VAPID key from Firebase console → Project settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function usePushNotifications(userId: string | null | undefined) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let unsubscribeMessages: (() => void) | null = null;

    const init = async () => {
      // Check if FCM is supported in this browser
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      setIsSupported(true);

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      try {
        // Register (or get existing) the FCM service worker
        const swRegistration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );

        // Get FCM token (requires VAPID key for web push)
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY || undefined,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token) return;
        if (registeredTokenRef.current === token) return; // already registered
        registeredTokenRef.current = token;
        setFcmToken(token);

        // Store token in Firestore so the backend can send push notifications
        await setDoc(
          doc(db, 'profiles', userId, 'fcmTokens', token),
          { token, createdAt: serverTimestamp(), userAgent: navigator.userAgent }
        );
      } catch {
        // FCM token acquisition failed silently (e.g. no VAPID key configured)
      }

      // Handle foreground messages (app is open)
      unsubscribeMessages = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (!title) return;
        // Show browser notification even when app is in foreground
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body: body || '',
              icon: '/icon-192.png',
              tag: payload.data?.tripId || 'flyisa-alert',
            });
          } catch {
            // Notification not available in this context
          }
        }
      });
    };

    init();

    return () => {
      unsubscribeMessages?.();
    };
  }, [userId]);

  // Remove token from Firestore on logout/unmount for this session
  const removeToken = async () => {
    if (!userId || !registeredTokenRef.current) return;
    try {
      await deleteDoc(doc(db, 'profiles', userId, 'fcmTokens', registeredTokenRef.current));
    } catch {
      // Ignore
    }
    registeredTokenRef.current = null;
    setFcmToken(null);
  };

  return { fcmToken, isSupported, removeToken };
}
