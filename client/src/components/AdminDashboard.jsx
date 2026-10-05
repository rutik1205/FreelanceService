import React, { useState, useEffect } from 'react';
import { apiUrl } from '../config/api';
import {
  ShieldAlert,
  Users,
  Activity,
  IndianRupee,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  UserX,
  UserCheck,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard({ onSelectProject }) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'disputes'
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [disputesList, setDisputesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(true); // Demo mode allows viewing and testing admin tools

  // Moderation state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [banModalUser, setBanModalUser] = useState(null);
  const [banReason, setBanReason] = useState('Terms of service violation');

  // Dispute resolution state
  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState('');

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'x-admin-demo': demoMode ? 'true' : 'false',
    'Content-Type': 'application/json',
  });

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/analytics'), { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const res = await fetch(apiUrl(`/api/admin/users?${params.toString()}`), {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Users load error:', err);
    }
  };

  const fetchDisputes = async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/disputes'), { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setDisputesList(data.disputes || []);
      }
    } catch (err) {
      console.error('Disputes load error:', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchAnalytics(), fetchUsers(), fetchDisputes()]).finally(() => {
      setLoading(false);
    });
  }, [token, demoMode]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [userSearch, roleFilter]);

  // Moderate user
  const handleModerateUser = async (userId, isBanned, reason = '', newRole = null) => {
    try {
      const body = { isBanned, banReason: reason };
      if (newRole) body.role = newRole;

      const res = await fetch(apiUrl(`/api/admin/users/${userId}/moderate`), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setBanModalUser(null);
        fetchUsers();
      }
    } catch (err) {
      console.error('User moderation error:', err);
    }
  };

  // Resolve dispute
  const handleResolveDispute = async (disputeId, decision) => {
    if (!confirm(`Are you sure you want to resolve this dispute with decision: ${decision}?`)) return;
    setResolvingDisputeId(disputeId);

    try {
      const res = await fetch(apiUrl(`/api/admin/disputes/${disputeId}/resolve`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          decision,
          adminNotes: adminResolutionNotes || `Dispute formally arbitrated with resolution: ${decision}.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminResolutionNotes('');
        fetchDisputes();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Resolve dispute error:', err);
    } finally {
      setResolvingDisputeId(null);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 0 4rem' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Scale size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                SkillDesk Admin & Moderation Portal
              </h1>
              <span
                style={{
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#a5b4fc',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: '1px solid rgba(165, 180, 252, 0.3)',
                }}
              >
                ADMIN SUITE
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Platform analytics, user moderation, dispute resolution & payment protection monitoring
            </p>
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.82rem',
          }}
        >
          <Sparkles size={16} color="#fbbf24" />
          <span>Demo Admin Mode:</span>
          <button
            onClick={() => setDemoMode(!demoMode)}
            style={{
              background: demoMode ? '#10b981' : '#64748b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {demoMode ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.75rem' }}>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <TrendingUp size={16} /> Platform Analytics & Revenue
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Users size={16} /> User Moderation ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'disputes' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'disputes' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Scale size={16} /> Dispute Resolution Center ({disputesList.length})
        </button>
      </div>

      {/* TAB 1: Analytics */}
      {activeTab === 'analytics' && (
        <div>
          {/* KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            {/* Escrow Volume */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>PAYMENT PROTECTION IN VAULT</span>
                <Lock size={16} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0' }}>
                ₹{Number(analytics?.escrow?.heldInEscrowINR || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                Total Transacted: ₹{Number(analytics?.escrow?.totalVolumeINR || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Released to Freelancers */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>PAID TO FREELANCERS</span>
                <IndianRupee size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', margin: '0.4rem 0' }}>
                ₹{Number(analytics?.escrow?.releasedINR || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Platform Fee Est.: ₹{Number(analytics?.escrow?.estimatedPlatformFeeINR || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Total Projects */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>MARKETPLACE PROJECTS</span>
                <Briefcase size={16} color="#4f46e5" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0' }}>
                {analytics?.projects?.total || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {analytics?.projects?.inProgress || 0} In Progress • {analytics?.projects?.completed || 0} Completed
              </div>
            </div>

            {/* Total Users */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>REGISTERED TALENT & CLIENTS</span>
                <Users size={16} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0' }}>
                {analytics?.users?.total || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {analytics?.users?.freelancers || 0} Developers • {analytics?.users?.clients || 0} Clients
              </div>
            </div>

            {/* Active Disputes */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>DISPUTE ARBITRATION</span>
                <Scale size={16} color="#ef4444" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', margin: '0.4rem 0' }}>
                {analytics?.disputes?.open || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {analytics?.disputes?.resolved || 0} Cases Successfully Settled
              </div>
            </div>
          </div>

          {/* Recent Projects & Payments Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>Recent Marketplace Projects</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(analytics?.recentProjects || []).map((p) => (
                  <div
                    key={p._id}
                    onClick={() => onSelectProject(p._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Client: {p.client?.name || 'Client'} • Status: {p.status}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#4f46e5' }}>
                      ₹{Number(p.budget).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>Recent Protected Payments</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(analytics?.recentPayments || []).length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No protected payment transactions recorded yet.</div>
                ) : (
                  (analytics?.recentPayments || []).map((pay) => (
                    <div
                      key={pay._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                          ₹{Number(pay.amount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {pay.payer?.name} → {pay.payee?.name || 'Freelancer'}
                        </div>
                      </div>
                      <span className={`badge badge-${pay.status === 'released' ? 'success' : 'primary'}`}>
                        {pay.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: User Moderation */}
      {activeTab === 'users' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.5rem',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                <option value="all">All Roles</option>
                <option value="freelancer">Freelancer</option>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Wallet Balance</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                          }
                          alt={u.name}
                          style={{ width: '34px', height: '34px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleModerateUser(u._id, u.isBanned, u.banReason, e.target.value)}
                        style={{
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        <option value="freelancer">Freelancer</option>
                        <option value="client">Client</option>
                        <option value="both">Both</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      ₹{Number(u.walletBalance || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u.isBanned ? (
                        <span className="badge badge-danger">Suspended / Banned</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {u.isBanned ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleModerateUser(u._id, false)}
                          style={{ color: '#10b981' }}
                        >
                          <UserCheck size={14} /> Unban User
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setBanModalUser(u)}
                          style={{ color: '#ef4444' }}
                        >
                          <UserX size={14} /> Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Dispute Resolution Center */}
      {activeTab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {disputesList.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '3rem 1rem',
                textAlign: 'center',
                color: '#94a3b8',
              }}
            >
              <Scale size={42} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: '0 0 0.4rem' }}>
                No Active Disputes Found
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                SkillDesk contracts are executing smoothly. When a client or freelancer files for arbitration, disputes will appear here.
              </p>
            </div>
          ) : (
            disputesList.map((d) => (
              <div
                key={d._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={20} color="#dc2626" />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                      {d.reason}
                    </span>
                  </div>

                  <span
                    className={`badge badge-${
                      d.status.startsWith('resolved_') ? 'success' : 'danger'
                    }`}
                  >
                    {d.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginBottom: '1rem', fontSize: '0.88rem' }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <strong>Project:</strong>{' '}
                    <span
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => onSelectProject(d.project?._id)}
                    >
                      {d.project?.title || 'Project'} (₹{Number(d.project?.budget || 0).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <strong>Claimant:</strong> {d.raisedBy?.name} ({d.raisedBy?.email})
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <strong>Respondent:</strong> {d.respondent?.name} ({d.respondent?.email})
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', marginTop: '0.6rem' }}>
                    <strong>Case Statement:</strong> "{d.explanation}"
                  </div>
                </div>

                {/* Resolution controls if open */}
                {!d.status.startsWith('resolved_') && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginTop: '1rem',
                    }}
                  >
                    <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 800, color: '#92400e' }}>
                      Admin Arbitration Decision
                    </h5>
                    <input
                      type="text"
                      placeholder="Enter administrative ruling notes and rationale..."
                      value={adminResolutionNotes}
                      onChange={(e) => setAdminResolutionNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        marginBottom: '0.75rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleResolveDispute(d._id, 'release_freelancer')}
                        disabled={resolvingDisputeId === d._id}
                        style={{ background: '#10b981', borderColor: '#10b981' }}
                      >
                        <CheckCircle2 size={15} /> Rule in Favor of Freelancer (Release Protected Payment)
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResolveDispute(d._id, 'refund_client')}
                        disabled={resolvingDisputeId === d._id}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <XCircle size={15} /> Rule in Favor of Client (Refund Protected Payment)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Ban User Modal */}
      {banModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '440px',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
              Suspend User: {banModalUser.name}
            </h4>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Suspending this account will block login and remove their active proposals.
            </p>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              Suspension Reason:
            </label>
            <textarea
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setBanModalUser(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleModerateUser(banModalUser._id, true, banReason)}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
