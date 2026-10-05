import React, { useState, useEffect } from 'react';
import { apiUrl } from '../config/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  GitBranch,
  ExternalLink,
  Send,
  UserCheck,
  Star,
  FileText,
  AlertCircle,
  Paperclip,
  Check,
  Award,
  IndianRupee,
  MessageSquare,
  Lock,
  Shield,
  LogIn,
  ShieldAlert,
  Scale,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import ImageKitUpload from './ImageKitUpload';
import ProjectChat from './ProjectChat';
import PaymentProtectionModal from './PaymentProtectionModal';
import DisputeModal from './DisputeModal';
import MilestonesSection from './MilestonesSection';
import CodeQualityReportCard from './CodeQualityReportCard';

export default function ProjectDetail({
  projectId,
  onBack,
  onOpenAuth,
  onProjectUpdated,
}) {
  const { user, token } = useAuth();
  const [project, setProject] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'chat', 'proposals'
  const [submittingBid, setSubmittingBid] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Payment Protection Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [targetPaymentMilestone, setTargetPaymentMilestone] = useState(null);
  const [targetPaymentAmount, setTargetPaymentAmount] = useState(0);

  // Dispute Modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [activeDisputeData, setActiveDisputeData] = useState(null);

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [proposalPitch, setProposalPitch] = useState('');
  const [githubPortfolio, setGithubPortfolio] = useState(user?.githubUrl || '');
  const [bidAttachment, setBidAttachment] = useState(null);

  // Deliverable submission state (GitHub URL)
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Approval review state
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Load project details and bids
  const loadProjectData = async () => {
    setLoading(true);
    setError('');
    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const pRes = await fetch(apiUrl(`/api/projects/${projectId}`), { headers: authHeaders });
      const pData = await pRes.json();
      if (!pRes.ok || !pData.success) {
        throw new Error(pData.message || 'Failed to load project');
      }
      setProject(pData.project);

      // Pre-fill bid amount with budget
      if (pData.project?.budget && !bidAmount) {
        setBidAmount(pData.project.budget.toString());
      }

      // Load bids with multi-route fallback
      let loadedBids = [];
      try {
        const bRes = await fetch(apiUrl(`/api/bids/projects/${projectId}/bids`), { headers: authHeaders });
        const bData = await bRes.json();
        if (bData.success && Array.isArray(bData.bids)) {
          loadedBids = bData.bids;
        } else {
          const altRes = await fetch(apiUrl(`/api/projects/${projectId}/bids`), { headers: authHeaders });
          const altData = await altRes.json();
          if (altData.success && Array.isArray(altData.bids)) {
            loadedBids = altData.bids;
          }
        }
      } catch (bidErr) {
        console.error('Bid load error:', bidErr);
      }
      setBids(loadedBids);

      // Load active dispute if any
      try {
        const dRes = await fetch(apiUrl(`/api/disputes/project/${projectId}`), { headers: authHeaders });
        const dData = await dRes.json();
        if (dData.success && dData.hasDispute) {
          setActiveDisputeData(dData.dispute);
        } else {
          setActiveDisputeData(null);
        }
      } catch (dErr) {
        // non-blocking
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId, token]);

  // Reset form states when user changes or logs out
  useEffect(() => {
    if (!user) {
      setProposalPitch('');
      setGithubPortfolio('');
      setBidAttachment(null);
      setGithubUrl('');
      setLiveDemoUrl('');
      setDeliveryNotes('');
      setSuccessMessage('');
      setError('');
    } else {
      setGithubPortfolio(user.githubUrl || '');
    }
  }, [user]);

  // Check relationship roles safely with String comparison
  const isOwner = Boolean(
    user && project?.client && String(user._id) === String(project.client._id || project.client)
  );
  const isAwardedFreelancer = Boolean(
    user && project?.selectedFreelancer && String(user._id) === String(project.selectedFreelancer._id || project.selectedFreelancer)
  );
  const canViewDeliverables = Boolean(
    isOwner || isAwardedFreelancer || (user && user.role === 'admin')
  );
  const myExistingBid = bids.find(
    (b) => user && String(b.freelancer?._id || b.freelancer) === String(user._id)
  );

  // Freelancer submits proposal
  const handleSubmitBid = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth('login');
      return;
    }
    if (!token) return;

    setError('');
    setSubmittingBid(true);

    try {
      const res = await fetch(apiUrl(`/api/bids/projects/${projectId}/bids`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(bidAmount),
          deliveryDays: Number(deliveryDays),
          proposal: proposalPitch,
          githubPortfolio,
          attachment: bidAttachment ? { url: bidAttachment.url, name: bidAttachment.name } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit proposal');
      }

      setSuccessMessage('Your proposal was submitted successfully!');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      if (data.bid) {
        setBids((prev) => [data.bid, ...prev.filter((x) => String(x._id) !== String(data.bid._id))]);
      }
      await loadProjectData();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  // Client hires a freelancer / chooses a bid
  const handleHireBid = async (bidId, freelancerName) => {
    if (!confirm(`Are you sure you want to hire ${freelancerName} for this project?`)) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}/hire/${bidId}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Hiring failed');
      }

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setSuccessMessage(`Congratulations! ${freelancerName} has been hired. The project is now In Progress.`);
      await loadProjectData();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  // Freelancer submits deliverable via GitHub Link
  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    if (!githubUrl.includes('github.com')) {
      setError('Please provide a valid GitHub repository URL (e.g., https://github.com/username/project)');
      return;
    }

    setSubmittingWork(true);
    setError('');

    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}/submit-work`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          githubUrl: githubUrl.trim(),
          liveDemoUrl: liveDemoUrl.trim(),
          notes: deliveryNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Delivery submission failed');
      }

      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
      setSuccessMessage('Deliverable submitted successfully! Client has been notified for code review.');
      await loadProjectData();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };

  // Client approves deliverable and marks completed
  const handleApproveWork = async () => {
    setApproving(true);
    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}/approve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          feedback,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Approval failed');
      }

      setShowApproveModal(false);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
      setSuccessMessage('Project approved and completed! Rating submitted to freelancer.');
      await loadProjectData();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Project not found</h2>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="container detail-container">
      {/* Back Link */}
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Browse
      </button>

      {/* Success / Error Banners */}
      {successMessage && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--success)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--danger)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Status Stepper Progression */}
      <div className="detail-card" style={{ marginBottom: '1.75rem', padding: '1.25rem 2rem' }}>
        <div className="status-stepper">
          <div className="step-node">
            <div className={`step-circle ${project.status === 'open' ? 'active' : 'completed'}`}>
              <Check size={14} />
            </div>
            <span className="step-label">1. Open for Bids</span>
          </div>

          <div className="step-node">
            <div
              className={`step-circle ${
                project.status === 'in_progress'
                  ? 'active'
                  : ['submitted', 'completed'].includes(project.status)
                  ? 'completed'
                  : ''
              }`}
            >
              {['submitted', 'completed'].includes(project.status) ? <Check size={14} /> : '2'}
            </div>
            <span className="step-label">2. Freelancer Hired</span>
          </div>

          <div className="step-node">
            <div
              className={`step-circle ${
                project.status === 'submitted'
                  ? 'active'
                  : project.status === 'completed'
                  ? 'completed'
                  : ''
              }`}
            >
              {project.status === 'completed' ? <Check size={14} /> : '3'}
            </div>
            <span className="step-label">3. GitHub Deliverable</span>
          </div>

          <div className="step-node">
            <div className={`step-circle ${project.status === 'completed' ? 'completed' : ''}`}>
              {project.status === 'completed' ? <Award size={14} /> : '4'}
            </div>
            <span className="step-label">4. Approved & Done</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Overview, Discussion & Chat, Proposals */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.25rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            background: activeTab === 'overview' ? '#ffffff' : 'transparent',
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'overview' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <FileText size={17} />
          <span>Project Overview & Deliverables</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            background: activeTab === 'chat' ? '#ffffff' : 'transparent',
            color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'chat' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <MessageSquare size={17} />
          <span>Discussion & Negotiation</span>
          <span
            style={{
              background: activeTab === 'chat' ? 'var(--primary)' : '#e2e8f0',
              color: activeTab === 'chat' ? '#ffffff' : '#475569',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
            }}
          >
            Live Chat
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proposals')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            background: activeTab === 'proposals' ? '#ffffff' : 'transparent',
            color: activeTab === 'proposals' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'proposals' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <UserCheck size={17} />
          <span>Proposals & Bids ({bids.length})</span>
        </button>
      </div>

      <div className="detail-layout">
        {/* Main Left Content */}
        <div className="detail-main">
          {/* TAB 1: OVERVIEW & DELIVERABLES */}
          {activeTab === 'overview' && (
            <>
              {/* ESCROW PROTECTION VAULT CARD */}
              <div
                style={{
                  background: project.hasDispute
                    ? '#fef2f2'
                    : project.escrowStatus === 'funded'
                    ? '#f0fdf4'
                    : project.escrowStatus === 'released'
                    ? '#f8fafc'
                    : '#f0f7ff',
                  border: `1px solid ${
                    project.hasDispute
                      ? '#fecaca'
                      : project.escrowStatus === 'funded'
                      ? '#bbf7d0'
                      : project.escrowStatus === 'released'
                      ? '#cbd5e1'
                      : '#bfdbfe'
                  }`,
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: project.hasDispute ? '#fee2e2' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {project.hasDispute ? (
                      <ShieldAlert size={24} color="#dc2626" />
                    ) : (
                      <Lock size={24} color={project.escrowStatus === 'funded' ? '#16a34a' : '#2563eb'} />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        SkillDesk Payment Protection
                      </h4>
                      <span
                        className={`badge badge-${
                          project.hasDispute
                            ? 'danger'
                            : project.escrowStatus === 'funded'
                            ? 'success'
                            : project.escrowStatus === 'released'
                            ? 'completed'
                            : 'primary'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {project.hasDispute
                          ? 'Dispute Mediation Active'
                          : project.escrowStatus === 'funded'
                          ? '₹ Protected Payment Held'
                          : project.escrowStatus === 'released'
                          ? 'Protected Payment Released'
                          : 'Payment Not Yet Protected'}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                      {project.hasDispute
                        ? 'Protected funds paused. Administrator mediation is reviewing submitted code and requirements.'
                        : project.escrowStatus === 'funded'
                        ? 'Your payment is protected until the project is completed and approved. Funds are released only upon client approval of GitHub code.'
                        : project.escrowStatus === 'released'
                        ? "Protected funds have been verified and released to developer's SkillDesk wallet."
                        : 'Deposit contract funds into Payment Protection to guarantee safety for both parties until deliverable is approved.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* Deposit Payment Protection button for client */}
                  {isOwner && project.escrowStatus !== 'funded' && project.escrowStatus !== 'released' && !project.hasDispute && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setTargetPaymentMilestone(null);
                        setTargetPaymentAmount(project.budget);
                        setShowPaymentModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#16a34a', borderColor: '#16a34a' }}
                    >
                      <Zap size={14} /> Protect Payment (₹{Number(project.budget).toLocaleString('en-IN')})
                    </button>
                  )}

                  {/* Approve & Release button if submitted */}
                  {isOwner && project.status === 'submitted' && !project.hasDispute && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => setShowApproveModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', color: '#fff', border: 'none' }}
                    >
                      <CheckCircle2 size={14} /> Approve & Release Funds
                    </button>
                  )}

                  {/* Raise Dispute button if awarded */}
                  {(isOwner || isAwardedFreelancer) && project.status !== 'open' && !project.hasDispute && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowDisputeModal(true)}
                      style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Scale size={14} /> Dispute Mediation
                    </button>
                  )}
                </div>
              </div>

              {/* Project Header & Description Card */}
              <div className="detail-card">
                <div className="detail-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span className="card-category">{project.category}</span>
                    <span className={`badge badge-${project.status}`}>
                      {project.status === 'in_progress' ? 'In Progress' : project.status.toUpperCase()}
                    </span>
                  </div>
                  <h1 className="detail-title">{project.title}</h1>
                </div>

                <div style={{ margin: '1.5rem 0' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a' }}>
                    Project Overview & Requirements
                  </h3>
                  <p
                    style={{
                      fontSize: '0.96rem',
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {project.description}
                  </p>
                </div>

                {/* Skills Tags */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    REQUIRED SKILLS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {project.skillsRequired?.map((skill, i) => (
                      <span key={i} className="skill-tag" style={{ fontSize: '0.82rem', padding: '0.3rem 0.75rem' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ImageKit Attachments if any */}
                {project.attachments?.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                      ATTACHMENTS (IMAGEKIT CDN)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {project.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          <Paperclip size={14} />
                          <span>{att.name || `Attachment ${idx + 1}`}</span>
                          <ExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DELIVERABLE WORKFLOW SECTION */}
              {/* 1. If Deliverable is submitted (In Review or Completed) */}
              {(project.submission?.githubUrl || project.submission?.hasSubmission || project.submission?.isRestricted || project.status === 'submitted' || project.status === 'completed') && (
                canViewDeliverables && project.submission?.githubUrl ? (
                  <div className="github-delivery-box">
                    <div className="delivery-box-header">
                      <div className="delivery-title">
                        <GitBranch size={22} color="#0f172a" />
                        <span>Project Deliverable (GitHub Repository)</span>
                      </div>
                      {project.status === 'completed' ? (
                        <span className="badge badge-completed">
                          <CheckCircle2 size={13} /> Verified & Completed
                        </span>
                      ) : (
                        <span className="badge badge-submitted">Awaiting Client Approval</span>
                      )}
                    </div>

                    <div className="repo-link-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <GitBranch size={18} color="#24292f" />
                        <span className="repo-url-text">{project.submission.githubUrl}</span>
                      </div>
                      <a
                        href={project.submission.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-github btn-sm"
                      >
                        <ExternalLink size={14} /> View on GitHub
                      </a>
                    </div>

                    {project.submission.liveDemoUrl && (
                      <div style={{ fontSize: '0.88rem', margin: '0.5rem 0', color: '#334155' }}>
                        <strong>Live Demo:</strong>{' '}
                        <a
                          href={project.submission.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                        >
                          {project.submission.liveDemoUrl}
                        </a>
                      </div>
                    )}

                    {project.submission.notes && (
                      <div
                        style={{
                          background: '#ffffff',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.88rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.75rem',
                        }}
                      >
                        <strong>Developer Notes:</strong> {project.submission.notes}
                      </div>
                    )}

                    {/* Client Action: Approve & Review Deliverable */}
                    {isOwner && project.status === 'submitted' && (
                      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                        <button
                          className="btn btn-success"
                          onClick={() => setShowApproveModal(true)}
                        >
                          <CheckCircle2 size={16} /> Approve GitHub Code & Complete Project
                        </button>
                      </div>
                    )}

                    {/* Display Review if completed */}
                    {project.review?.rating && (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex' }}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                fill={i < project.review.rating ? '#f59e0b' : '#cbd5e1'}
                                color={i < project.review.rating ? '#f59e0b' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                            Client Feedback & Review
                          </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#166534', fontStyle: 'italic' }}>
                          "{project.review.feedback}"
                        </p>
                      </div>
                    )}

                    {/* Automated Code Checks Card */}
                    {project.submission?.githubUrl && (
                      <CodeQualityReportCard
                        projectId={project._id}
                        report={project.submission.codeQualityReport}
                        githubUrl={project.submission.githubUrl}
                        onReportUpdated={loadProjectData}
                      />
                    )}
                  </div>
                ) : (
                  <div className="github-delivery-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div className="delivery-box-header">
                      <div className="delivery-title" style={{ color: '#334155' }}>
                        <Lock size={20} color="#64748b" />
                        <span>Project Deliverable (Protected)</span>
                      </div>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Shield size={12} /> Confidential
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '1.1rem',
                        background: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed #cbd5e1',
                        marginTop: '0.65rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                        {user
                          ? 'This project deliverable (GitHub repository & live demo) is private and accessible only by the client and the assigned freelancer.'
                          : 'This project deliverable (GitHub repository & live demo) is private. Please sign in as the project client or assigned freelancer to view the code.'}
                      </p>
                      {!user && (
                        <div>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => onOpenAuth('login')}
                          >
                            <LogIn size={14} /> Sign In to Access Deliverable
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Display Review publicly if completed so freelancer rating is visible */}
                    {project.review?.rating && (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex' }}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                fill={i < project.review.rating ? '#f59e0b' : '#cbd5e1'}
                                color={i < project.review.rating ? '#f59e0b' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                            Client Feedback & Review
                          </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#166534', fontStyle: 'italic' }}>
                          "{project.review.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Milestone-Based Contracts Section */}
              <MilestonesSection
                project={project}
                isOwner={isOwner}
                isAwardedFreelancer={isAwardedFreelancer}
                onOpenDepositEscrow={(m) => {
                  setTargetPaymentMilestone(m);
                  setTargetPaymentAmount(m.amount);
                  setShowPaymentModal(true);
                }}
                onMilestoneUpdated={loadProjectData}
              />

              {/* 2. If Project is In Progress & User is the Chosen Freelancer -> Deliverable Submission Form */}
              {isAwardedFreelancer && project.status === 'in_progress' && (
                <div className="detail-card" style={{ border: '2px solid var(--primary)', background: '#fcfdff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                    <GitBranch size={22} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      Submit Your Project Work (GitHub Delivery)
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Provide the link to the completed GitHub repository. The client will inspect your code, documentation,
                    and approve the deliverable.
                  </p>

                  <form onSubmit={handleSubmitDeliverable}>
                    <div className="form-group">
                      <label className="form-label">
                        GitHub Repository URL <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://github.com/your-username/repository-name"
                        className="form-input"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                      />
                      <span className="form-hint">Must be a valid GitHub repository URL</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Live Preview / Demo URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://your-demo-url.vercel.app"
                        className="form-input"
                        value={liveDemoUrl}
                        onChange={(e) => setLiveDemoUrl(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Submission Notes & Instructions</label>
                      <textarea
                        rows={3}
                        placeholder="Briefly describe what you built, instructions to run locally, and key modules completed..."
                        className="form-textarea"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-github btn-lg"
                      disabled={submittingWork}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <GitBranch size={18} />
                      {submittingWork ? 'Submitting Code...' : 'Submit Deliverable via GitHub'}
                    </button>
                  </form>
                </div>
              )}

              {/* Action Banner for Discussion Room & Proposals */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                  marginTop: '1.5rem',
                }}
              >
                <div
                  className="detail-card"
                  style={{
                    border: '1px solid var(--primary-border)',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <MessageSquare size={18} color="var(--primary)" />
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                        Live Discussion & Negotiation
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      Need to negotiate pricing, resolve an issue, or ask a technical question? Chat directly in real-time.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveTab('chat')}
                    style={{ width: 'fit-content' }}
                  >
                    <MessageSquare size={15} /> Open Discussion Room
                  </button>
                </div>

                <div
                  className="detail-card"
                  style={{
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <UserCheck size={18} color="#0f172a" />
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        Freelancer Proposals ({bids.length})
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      {project.status === 'open'
                        ? 'Review incoming developer bids, compare proposals, and hire your developer.'
                        : 'Inspect the submitted proposals and milestones for this project.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('proposals')}
                    style={{ width: 'fit-content' }}
                  >
                    <UserCheck size={15} /> View Proposals ({bids.length})
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LIVE DISCUSSION & CHAT */}
          {activeTab === 'chat' && (
            <div>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={20} color="var(--primary)" />
                    <span>Project Discussion & Negotiation Room</span>
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Discuss project scope, negotiate ₹ INR terms, share ImageKit screenshots, and resolve any roadblocks.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    Socket.IO Active
                  </span>
                </div>
              </div>

              <ProjectChat
                projectId={projectId}
                projectTitle={project.title}
                projectClient={project.client}
                onOpenAuth={onOpenAuth}
              />
            </div>
          )}

          {/* TAB 3: PROPOSALS & BIDS */}
          {activeTab === 'proposals' && (
            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Proposals & Bids ({bids.length})
                </h3>
                {project.status === 'open' && (
                  <span className="badge badge-open">Accepting Bids</span>
                )}
              </div>

              {/* Client Owner Notice */}
              {isOwner && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                >
                  <UserCheck size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#166534' }}>
                    You are the Project Owner. Review incoming proposals below, discuss or negotiate terms, and click "Choose & Hire" to award your project.
                  </span>
                </div>
              )}

              {/* Freelancer Bid Form: If Open and user is not owner and haven't bid */}
              {project.status === 'open' && !isOwner && !myExistingBid && (
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Send size={18} color="var(--primary)" />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      Submit Your Proposal
                    </h4>
                  </div>

                  {!user ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Sign in as a freelancer to submit a proposal for this project.
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={() => onOpenAuth('login')}>
                        Sign In to Bid
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitBid}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Bid Amount (₹ INR)</label>
                          <div style={{ position: 'relative' }}>
                            <span
                              style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontWeight: 700,
                                color: '#64748b',
                              }}
                            >
                              ₹
                            </span>
                            <input
                              type="number"
                              required
                              min={100}
                              placeholder="e.g. 20000"
                              className="form-input"
                              style={{ paddingLeft: '28px' }}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Delivery Timeline (Days)</label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={180}
                            placeholder="e.g. 7"
                            className="form-input"
                            value={deliveryDays}
                            onChange={(e) => setDeliveryDays(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cover Proposal & Technical Approach</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Explain why you are the best fit, your approach to solving their requirements, and your relevant experience..."
                          className="form-textarea"
                          value={proposalPitch}
                          onChange={(e) => setProposalPitch(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">GitHub Profile or Past Repo Link</label>
                        <input
                          type="url"
                          placeholder="https://github.com/your-username"
                          className="form-input"
                          value={githubPortfolio}
                          onChange={(e) => setGithubPortfolio(e.target.value)}
                        />
                      </div>

                      {/* ImageKit Attachment upload */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <ImageKitUpload
                          label="Proposal Attachment / Resume (ImageKit CDN)"
                          folder="/skilldesk/proposals"
                          onUploadSuccess={(url, fileData) => setBidAttachment(fileData)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingBid}
                        style={{ width: '100%' }}
                      >
                        <Send size={16} />
                        {submittingBid ? 'Submitting...' : 'Submit Proposal'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* If user already bid, show banner */}
              {myExistingBid && (
                <div
                  style={{
                    background: 'var(--primary-light)',
                    border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      You have submitted a proposal (₹{Number(myExistingBid.amount).toLocaleString('en-IN')} • {myExistingBid.deliveryDays} days)
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Status: <strong style={{ textTransform: 'capitalize' }}>{myExistingBid.status}</strong>
                    </div>
                  </div>
                  <span className={`badge badge-${myExistingBid.status}`}>
                    {myExistingBid.status.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Proposal List */}
              {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                  No proposals yet. Be the first developer to bid!
                </div>
              ) : (
                bids.map((b) => {
                  const freelancer = b.freelancer;
                  const isThisAccepted = b.status === 'accepted';

                  return (
                    <div
                      key={b._id}
                      className={`proposal-item ${isThisAccepted ? 'accepted' : ''}`}
                    >
                      <div className="proposal-top">
                        <div className="proposal-freelancer">
                          <img
                            src={
                              freelancer?.avatar ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                freelancer?.name || 'Dev'
                              )}`
                            }
                            alt={freelancer?.name}
                            className="freelancer-avatar"
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                              {freelancer?.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {freelancer?.headline || 'Full Stack Engineer'}
                            </div>
                            {freelancer?.ratingsAverage && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  {freelancer.ratingsAverage} ({freelancer.ratingsCount || 0} reviews)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="proposal-financials">
                          <div className="proposal-amount">₹{Number(b.amount).toLocaleString('en-IN')}</div>
                          <div className="proposal-time">in {b.deliveryDays} days</div>
                          <div style={{ marginTop: '0.35rem' }}>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Proposal Pitch Text */}
                      <div className="proposal-body">{b.proposal}</div>

                      {/* Links & Attachments */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {b.githubPortfolio && (
                          <a
                            href={b.githubPortfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: 'var(--github-dark)',
                              fontWeight: 600,
                            }}
                          >
                            <GitBranch size={13} />
                            <span>GitHub Portfolio</span>
                            <ExternalLink size={11} />
                          </a>
                        )}

                        {b.attachment?.url && (
                          <a
                            href={b.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: 'var(--primary)',
                              fontWeight: 600,
                            }}
                          >
                            <Paperclip size={13} />
                            <span>Attachment (ImageKit)</span>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      {/* Action buttons: Discuss & Hire */}
                      <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveTab('chat')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <MessageSquare size={14} />
                          <span>Discuss & Negotiate</span>
                        </button>

                        {isOwner && project.status === 'open' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleHireBid(b._id, freelancer?.name)}
                          >
                            <UserCheck size={16} /> Choose & Hire {freelancer?.name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Chat Shortcut Widget */}
          <div className="detail-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <MessageSquare size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  Live Discussion
                </h4>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Negotiation & Roadblocks
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Have questions regarding deliverables or budget? Direct real-time chat with Socket.IO.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('chat')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <MessageSquare size={15} />
              <span>Open Chat Room</span>
            </button>
          </div>

          {/* Budget & Timeline Card in INR */}
          <div className="detail-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Project Budget & Terms
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--success-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>₹</span>
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1.1 }}>
                  ₹{Number(project.budget || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {project.budgetType} Price (INR)
                </div>
              </div>
            </div>

            {project.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <Calendar size={16} color="var(--text-muted)" />
                <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Client Info Card */}
          <div className="detail-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              About the Client
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <img
                src={
                  project.client?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    project.client?.name || 'Client'
                  )}`
                }
                alt={project.client?.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  {project.client?.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {project.client?.headline || 'Hiring Client'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong>Projects Posted:</strong> {project.client?.postedProjectsCount || 1}
              </div>
              <div>
                <strong>Member Since:</strong> {new Date(project.client?.createdAt || Date.now()).getFullYear()}
              </div>
            </div>
          </div>

          {/* Assigned Freelancer Card if Hired */}
          {project.selectedFreelancer && (
            <div className="detail-card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Assigned Developer
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                <img
                  src={
                    project.selectedFreelancer?.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      project.selectedFreelancer?.name || 'Dev'
                    )}`
                  }
                  alt={project.selectedFreelancer?.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {project.selectedFreelancer?.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {project.selectedFreelancer?.headline}
                  </div>
                </div>
              </div>

              {project.selectedFreelancer?.githubUrl && (
                <a
                  href={project.selectedFreelancer.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-github btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <GitBranch size={14} /> View GitHub Profile
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* APPROVE DELIVERABLE MODAL */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Approve GitHub Deliverable & Complete Project
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Confirm that you have reviewed the code deliverable on GitHub. Leave a rating and testimonial for the freelancer.
            </p>

            <div className="form-group">
              <label className="form-label">Rating (1 to 5 Stars)</label>
              <div className="star-rating" style={{ margin: '0.5rem 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={28}
                    className={`star ${star <= rating ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                    fill={star <= rating ? '#f59e0b' : 'none'}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Review Feedback</label>
              <textarea
                rows={3}
                className="form-textarea"
                placeholder="Leave an honest review for the freelancer's deliverable..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                style={{ flex: 2 }}
                disabled={approving}
                onClick={handleApproveWork}
              >
                {approving ? 'Finalizing...' : 'Confirm Approval & Finish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKILLDESK PAYMENT PROTECTION MODAL */}
      <PaymentProtectionModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setTargetPaymentMilestone(null);
        }}
        project={project}
        milestone={targetPaymentMilestone}
        amount={targetPaymentAmount}
        onPaymentSuccess={() => {
          setSuccessMessage('Payment is now protected! Funds are held until work is approved.');
          loadProjectData();
          if (onProjectUpdated) onProjectUpdated();
        }}
      />

      {/* DISPUTE MEDIATION MODAL */}
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        project={project}
        onDisputeRaised={(newDispute) => {
          setActiveDisputeData(newDispute);
          setSuccessMessage('Dispute opened. Protected payment paused for administrator mediation.');
          loadProjectData();
          if (onProjectUpdated) onProjectUpdated();
        }}
      />
    </div>
  );
}
