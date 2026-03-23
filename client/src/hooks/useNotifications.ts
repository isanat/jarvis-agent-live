import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FlyisaNotification {
  id: string;
  userId: string;
  tripId?: string;
  flightNumber?: string;
  type: string;
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | null;
}

export function useNotifications(userId: string | null | undefined) {
  const [notifications, setNotifications] = useState<FlyisaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FlyisaNotification, 'id'>),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      })) as FlyisaNotification[];

      setNotifications(docs);
      setUnreadCount(docs.filter((n) => !n.read).length);

      // Fire browser notifications for new urgent/critical ones
      const newDocs = snapshot.docChanges()
        .filter((change) => change.type === 'added')
        .map((change) => ({
          id: change.doc.id,
          ...(change.doc.data() as Omit<FlyisaNotification, 'id'>),
        }));

      for (const n of newDocs) {
        if ((n.severity === 'critical' || n.severity === 'urgent') && !n.read) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(n.title, {
                body: n.message,
                icon: '/favicon.ico',
                tag: n.id,
              });
            } catch {
              // Notification API not available in this context
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    for (const n of unread) {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [notifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
