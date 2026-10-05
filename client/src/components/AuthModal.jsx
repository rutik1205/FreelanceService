import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Briefcase, Code, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear credentials whenever modal opens or initialMode changes
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setName('');
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    onClose();
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role });
      }
      // Never retain credentials in state after successful submission
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      onClose();
    } catch (err) {
      // Clear password field on failed attempt for security
      setPassword('');
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '2.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              {mode === 'login' ? 'Sign In to SkillDesk' : 'Create an Account'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {mode === 'login' ? 'Welcome back! Enter your credentials to continue.' : 'Join as a client or developer to get started.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '0.7rem 0',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              background: 'transparent',
              borderBottom: mode === 'login' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: mode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '0.7rem 0',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              background: 'transparent',
              borderBottom: mode === 'register' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: mode === 'register' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {mode === 'register' && (
            <>
              {/* Role Picker */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">I want to join as</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    style={{
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: role === 'client' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: role === 'client' ? 'var(--primary-light)' : '#ffffff',
                      color: role === 'client' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Briefcase size={20} />
                    <span>Client (Hire)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('freelancer')}
                    style={{
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: role === 'freelancer' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: role === 'freelancer' ? 'var(--primary-light)' : '#ffffff',
                      color: role === 'freelancer' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Code size={20} />
                    <span>Freelancer (Work)</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="user_fullname"
                  id="user_fullname"
                  required
                  autoComplete="name"
                  placeholder="e.g. Rahul Sharma"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="user_email"
              id="user_email"
              required
              autoComplete="off"
              placeholder="name@example.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="user_password"
              id="user_password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Minimum 6 characters"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create My Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
