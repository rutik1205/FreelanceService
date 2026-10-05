import React, { useState, useEffect } from 'react';
import { apiUrl } from '../config/api';
import {
  Layers,
  Briefcase,
  GitBranch,
  IndianRupee,
  Clock,
  Star,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({
  onSelectProject,
  onOpenPostProject,
  onOpenProfile,
  onNavigateToBrowse,
}) {
  const { user, token, isClient, isFreelancer } = useAuth();
  const [activeTab, setActiveTab] = useState(isClient ? 'posted' : 'bids');
  const [clientProjects, setClientProjects] = useState([]);
  const [freelancerProjects, setFreelancerProjects] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      // 1. Fetch Client Projects if client
      if (isClient) {
        const cpRes = await fetch(apiUrl('/api/projects/my/client'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const cpData = await cpRes.json();
        if (cpData.success) setClientProjects(cpData.projects || []);
      }

      // 2. Fetch Freelancer Awarded Projects
      const fpRes = await fetch(apiUrl('/api/projects/my/freelancer'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fpData = await fpRes.json();
      if (fpData.success) setFreelancerProjects(fpData.projects || []);

      // 3. Fetch Freelancer Bids
      const bRes = await fetch(apiUrl('/api/bids/my'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bData = await bRes.json();
      if (bData.success) setMyBids(bData.bids || []);

      // 4. Fetch Escrow & Financial Ledger
      const tRes = await fetch(apiUrl('/api/payments/my-transactions'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tData = await tRes.json();
      if (tData.success) {
        setTransactions(tData.transactions || []);
        setWalletBalance(tData.walletBalance || 0);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      setClientProjects([]);
      setFreelancerProjects([]);
      setMyBids([]);
      setLoading(false);
    } else {
      fetchDashboardData();
    }
  }, [user, token]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
          Please sign in to view your dashboard
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.5rem auto 1.5rem', maxWidth: '400px' }}>
          You must be logged in to view your posted projects, proposals, and deliverables.
        </p>
        <button className="btn btn-primary" onClick={onNavigateToBrowse}>
          Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 0 4rem' }}>
      {/* Dashboard Top Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img
            src={
              user?.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`
            }
            alt={user?.name}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary-border)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>{user?.name}</h1>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                {user?.role} Account
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {user?.headline || (isFreelancer ? 'Software Developer' : 'Project Client')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Wallet Balance Display */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <IndianRupee size={20} color="#16a34a" />
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                Wallet Balance
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#14532d', lineHeight: 1.1 }}>
                ₹{Number(walletBalance).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onOpenProfile}>
            Edit Profile
          </button>

          {/* Post Project is ONLY shown if user is a client */}
          {isClient && (
            <button className="btn btn-primary btn-sm" onClick={onOpenPostProject}>
              <PlusCircle size={16} /> Post Project
            </button>
          )}

          {/* If freelancer, show Explore Projects button */}
          {isFreelancer && !isClient && (
            <button className="btn btn-primary btn-sm" onClick={onNavigateToBrowse}>
              <Search size={16} /> Find Projects
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Only show "My Posted Projects" tab if user is a client */}
        {isClient && (
          <button
            onClick={() => setActiveTab('posted')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'transparent',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: activeTab === 'posted' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'posted' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Briefcase size={16} />
            <span>My Posted Projects ({clientProjects.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('awarded')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'awarded' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'awarded' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <GitBranch size={16} />
          <span>Awarded / Active Jobs ({freelancerProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bids')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'bids' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'bids' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Layers size={16} />
          <span>My Submitted Proposals ({myBids.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'transactions' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <IndianRupee size={16} />
          <span>Protected Payments & Transactions ({transactions.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading your records...
        </div>
      ) : (
        <div>
          {/* 1. Client Posted Projects Tab */}
          {activeTab === 'posted' && isClient && (
            <div>
              {clientProjects.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    textAlign: 'center',
                  }}
                >
                  <Briefcase size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    You haven't posted any projects yet
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Post a project to start receiving competitive proposals from developers.
                  </p>
                  <button className="btn btn-primary" onClick={onOpenPostProject}>
                    <PlusCircle size={16} /> Post Your First Project
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {clientProjects.map((p) => (
                    <div
                      key={p._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div style={{ minWidth: '280px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className="card-category">{p.category}</span>
                          <span className={`badge badge-${p.status}`}>
                            {p.status === 'in_progress' ? 'In Progress' : p.status.toUpperCase()}
                          </span>
                          {p.status === 'submitted' && (
                            <span className="badge badge-submitted" style={{ background: '#dbeafe', color: '#1e40af' }}>
                              ⚡ GitHub Deliverable Ready for Review!
                            </span>
                          )}
                        </div>

                        <h3
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            cursor: 'pointer',
                          }}
                          onClick={() => onSelectProject(p._id)}
                        >
                          {p.title}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>Budget: <strong>₹{Number(p.budget).toLocaleString('en-IN')}</strong></span>
                          <span>Proposals: <strong>{p.bidCount || 0}</strong></span>
                          {p.selectedFreelancer && (
                            <span>Hired: <strong>{p.selectedFreelancer.name}</strong></span>
                          )}
                        </div>
                      </div>

                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => onSelectProject(p._id)}
                      >
                        Manage & View Bids <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Awarded Projects Tab (Freelancer) */}
          {activeTab === 'awarded' && (
            <div>
              {freelancerProjects.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    textAlign: 'center',
                  }}
                >
                  <GitBranch size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    No active awarded projects yet
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Browse open marketplace projects and submit proposals to get hired!
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={onNavigateToBrowse}>
                    <Search size={15} /> Browse Open Projects
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {freelancerProjects.map((p) => (
                    <div
                      key={p._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={`badge badge-${p.status}`}>
                            {p.status === 'in_progress' ? 'Active Job' : p.status.toUpperCase()}
                          </span>
                          {p.submission?.githubUrl && (
                            <span className="card-github-pill" style={{ margin: 0, padding: '0.15rem 0.5rem' }}>
                              <GitBranch size={11} /> GitHub Repo Linked
                            </span>
                          )}
                        </div>

                        <h3
                          style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
                          onClick={() => onSelectProject(p._id)}
                        >
                          {p.title}
                        </h3>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                          Client: <strong>{p.client?.name}</strong> • Payout: <strong>₹{Number(p.budget).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <button
                        className="btn btn-github btn-sm"
                        onClick={() => onSelectProject(p._id)}
                      >
                        <GitBranch size={14} />
                        {p.status === 'in_progress' ? 'Submit GitHub Deliverable' : 'View Deliverable'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. My Submitted Proposals Tab */}
          {activeTab === 'bids' && (
            <div>
              {myBids.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    textAlign: 'center',
                  }}
                >
                  <Clock size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    You haven't submitted any proposals yet
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Find open projects in the marketplace and submit your proposals.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={onNavigateToBrowse}>
                    <Search size={15} /> Find Projects to Bid On
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {myBids.map((b) => (
                    <div
                      key={b._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={`badge badge-${b.status}`}>{b.status.toUpperCase()}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Submitted {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4
                          style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
                          onClick={() => b.project?._id && onSelectProject(b.project._id)}
                        >
                          {b.project?.title || 'Project'}
                        </h4>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          Your Bid: <strong style={{ color: 'var(--success)' }}>₹{Number(b.amount).toLocaleString('en-IN')}</strong> • Delivery in{' '}
                          <strong>{b.deliveryDays} days</strong>
                        </div>
                      </div>

                      {b.project?._id && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectProject(b.project._id)}
                        >
                          Open Project Details <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Escrow & Financial Ledger Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-xl)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                  }}
                >
                  <IndianRupee size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                    No Protected Transactions Yet
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    When you deposit or receive milestone and project protected payments, your ledger will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Project / Item</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Payer (Client)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Payee (Freelancer)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Amount (₹ INR)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Protection Status</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div
                              style={{ fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}
                              onClick={() => tx.project?._id && onSelectProject(tx.project._id)}
                            >
                              {tx.project?.title || 'Project'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tx.protectionNote || tx.escrowNote || 'SkillDesk Protected Payment'}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>{tx.payer?.name || 'Client'}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>{tx.payee?.name || 'Freelancer'}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#0f172a' }}>
                            ₹{Number(tx.amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge badge-${tx.status === 'released' ? 'success' : tx.status === 'held_in_escrow' ? 'primary' : 'secondary'}`}>
                              {tx.status === 'held_in_escrow' ? 'Protected' : tx.status === 'released' ? 'Released' : tx.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
