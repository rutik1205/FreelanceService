import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  PlusCircle,
  Users,
  HelpCircle,
  LogOut,
  User,
  ChevronDown,
  Layers,
  GitBranch,
  Search,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Navbar({
  currentView,
  setCurrentView,
  onOpenPostProject,
  onOpenAuth,
  onOpenHowItWorks,
  onOpenProfile,
  onSelectProject,
}) {
  const { user, logout, isClient, isFreelancer } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="container nav-container">
        {/* Brand */}
        <div className="nav-brand" onClick={() => setCurrentView('browse')}>
          <div className="brand-icon-box">
            <GitBranch size={22} strokeWidth={2.5} />
          </div>
          <div>
            <span>Skill<span className="text-gradient">Desk</span></span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="nav-links">
          <button
            className={`nav-link ${currentView === 'browse' ? 'active' : ''}`}
            onClick={() => setCurrentView('browse')}
          >
            <Briefcase size={16} /> Browse Projects
          </button>
          <button
            className={`nav-link ${currentView === 'freelancers' ? 'active' : ''}`}
            onClick={() => setCurrentView('freelancers')}
          >
            <Users size={16} /> Talent Directory
          </button>
          {user && (
            <button
              className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <Layers size={16} /> My Dashboard
            </button>
          )}
          {user && (
            <button
              className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
              style={{ color: currentView === 'admin' ? 'var(--primary)' : '#475569' }}
            >
              <Scale size={16} /> Admin Portal
            </button>
          )}
          <button className="nav-link" onClick={onOpenHowItWorks}>
            <HelpCircle size={16} /> How It Works
          </button>
        </nav>

        {/* Right Nav Actions */}
        <div className="nav-actions">
          {/* Post Project Button: ONLY shown for Clients or non-logged in visitors */}
          {(!user || isClient) && (
            <button className="btn btn-primary btn-sm" onClick={onOpenPostProject}>
              <PlusCircle size={16} /> Post a Project
            </button>
          )}

          {/* If user is a Freelancer, show "Find Work" button instead */}
          {user && isFreelancer && !isClient && (
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => setCurrentView('browse')}
            >
              <Search size={15} /> Find Projects
            </button>
          )}

          {/* Notifications Alert Center */}
          {user && (
            <NotificationCenter
              onSelectProject={(projectId) => {
                if (onSelectProject) onSelectProject(projectId);
                else setCurrentView('detail');
              }}
            />
          )}

          {/* User Account / Auth Buttons */}
          {user ? (
            <div style={{ position: 'relative' }} ref={userRef}>
              <div
                className="user-menu"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <img
                  src={
                    user.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`
                  }
                  alt={user.name}
                  className="user-avatar"
                />
                <div className="user-info">
                  <span className="user-name">{user.name.split(' ')[0]}</span>
                  <span className="user-role-tag">{user.role}</span>
                </div>
                <ChevronDown size={14} color="#64748b" />
              </div>

              {showUserDropdown && (
                <div
                  className="demo-dropdown"
                  style={{ right: 0, width: '220px', padding: '0.5rem' }}
                >
                  <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                        {user.role} Account
                      </span>
                    </div>
                  </div>

                  <button
                    className="demo-item"
                    style={{ marginTop: '0.3rem' }}
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenProfile();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={15} color="#4f46e5" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Profile & Settings</span>
                    </div>
                  </button>

                  <button
                    className="demo-item"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentView('dashboard');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={15} color="#059669" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>My Dashboard</span>
                    </div>
                  </button>

                  <button
                    className="demo-item"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentView('admin');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Scale size={15} color="#4f46e5" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Admin Portal</span>
                    </div>
                  </button>

                  <button
                    className="demo-item"
                    style={{ color: '#dc2626' }}
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                      setCurrentView('browse');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LogOut size={15} color="#dc2626" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sign Out</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => onOpenAuth('register')}
              >
                Join SkillDesk
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
