import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config/api';
import {
  Bell,
  Check,
  CheckCheck,
  Briefcase,
  GitBranch,
  IndianRupee,
  ShieldAlert,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function NotificationCenter({ onSelectProject }) {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/notifications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user || !user._id) return;

    // Connect to Socket.IO for real-time notifications
    const socketUrl = apiUrl('').replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.emit('joinUser', user._id);

    socket.on('new_notification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Trigger Web Push Notification if granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/vite.svg',
          });
        } catch (e) {
          // ignore
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id, projectId) => {
    try {
      await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (projectId && onSelectProject) {
        setIsOpen(false);
        onSelectProject(projectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(apiUrl('/api/notifications/mark-all-read'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Desktop Push Notifications are not supported by this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setPushEnabled(true);
      new Notification('SkillDesk Alerts Enabled', {
        body: 'You will now receive instant push alerts for bids, hires, payment protection updates and deliveries!',
      });
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'bid_received':
        return <Briefcase size={16} color="#4f46e5" />;
      case 'hire_accepted':
        return <Award size={16} color="#059669" />;
      case 'deliverable_submitted':
      case 'milestone_submitted':
        return <GitBranch size={16} color="#0284c7" />;
      case 'payment_funded':
      case 'payment_released':
      case 'milestone_approved':
        return <IndianRupee size={16} color="#16a34a" />;
      case 'dispute_raised':
      case 'dispute_resolved':
        return <ShieldAlert size={16} color="#dc2626" />;
      default:
        return <Sparkles size={16} color="#6366f1" />;
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="btn btn-secondary btn-sm"
        style={{
          position: 'relative',
          padding: '0.45rem 0.6rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 5px rgba(239,68,68,0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '480px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#4338ca',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Banner if disabled */}
          {!pushEnabled && typeof Notification !== 'undefined' && (
            <div
              style={{
                padding: '0.5rem 0.85rem',
                background: '#eef2ff',
                borderBottom: '1px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#3730a3',
              }}
            >
              <span>Enable desktop push alerts?</span>
              <button
                onClick={requestPushPermission}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.86rem',
                }}
              >
                <Bell size={28} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => markAsRead(n._id, n.projectId)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f8fafc',
                    background: n.isRead ? '#ffffff' : '#f0f7ff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = n.isRead ? '#ffffff' : '#f0f7ff')
                  }
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getIconForType(n.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: n.isRead ? 600 : 800,
                          fontSize: '0.84rem',
                          color: '#0f172a',
                        }}
                      >
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: '0.2rem 0 0',
                        fontSize: '0.78rem',
                        color: '#475569',
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </p>
                  </div>

                  {!n.isRead && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        flexShrink: 0,
                        marginTop: '6px',
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
