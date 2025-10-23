import { useState, useCallback } from 'react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  duration: number;
}

export const useToast = () => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (
      type: ToastNotification['type'],
      title: string,
      description?: string,
      duration: number = 5000
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      const notification: ToastNotification = {
        id,
        type,
        title,
        description,
        duration,
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-remove after duration
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );
  }, []);

  const success = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast('success', title, description, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast('error', title, description, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast('info', title, description, duration);
    },
    [addToast]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addToast,
    removeToast,
    success,
    error,
    info,
    clearAll,
  };
};
