'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    organization_id?: string;
    organization_name?: string;
    plan_name?: string;
  };
  read: boolean;
  createdAt: string;
}

export default function WebmasterNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/webmaster/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/webmaster/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-zinc-900 border border-zinc-800 shadow-xl z-50">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Notifications</h3>
            <button onClick={() => setShowPanel(false)} className="text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${
                    !notification.read ? 'bg-zinc-800/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{notification.title}</p>
                      <p className="text-zinc-400 text-xs mt-1">{notification.message}</p>
                      <p className="text-zinc-600 text-xs mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {notification.data?.organization_id && (
                      <Link
                        href={`/webmaster/organizations/${notification.data.organization_id}`}
                        onClick={() => markAsRead([notification.id])}
                        className="text-orange-500 hover:text-orange-400"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    )}
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead([notification.id])}
                      className="mt-2 text-xs text-zinc-500 hover:text-white"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className="p-3 border-t border-zinc-800">
              <button
                onClick={() => markAsRead(notifications.filter(n => !n.read).map(n => n.id))}
                className="w-full text-center text-xs text-orange-500 hover:text-orange-400 font-bold uppercase tracking-widest"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}