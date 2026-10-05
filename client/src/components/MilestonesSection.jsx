import React, { useState } from 'react';
import { apiUrl } from '../config/api';
import {
  Layers,
  CheckCircle2,
  Clock,
  IndianRupee,
  Lock,
  GitBranch,
  PlusCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CodeQualityReportCard from './CodeQualityReportCard';

export default function MilestonesSection({
  project,
  isOwner,
  isAwardedFreelancer,
  onOpenDepositEscrow,
  onMilestoneUpdated,
}) {
  const { token } = useAuth();
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvingMilestoneId, setApprovingMilestoneId] = useState(null);

  // Add Milestone Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  const milestones = project?.milestones || [];
  const completedCount = milestones.filter((m) => m.status === 'approved').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;
    setAddingMilestone(true);

    try {
      const res = await fetch(apiUrl(`/api/projects/${project._id}/milestones`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          amount: Number(newAmount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setNewTitle('');
        setNewDesc('');
        setNewAmount('');
        if (onMilestoneUpdated) onMilestoneUpdated();
      }
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleSubmitMilestoneDeliverable = async (mId) => {
    if (!githubUrl.includes('github.com')) {
      alert('Please provide a valid GitHub repository URL');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(apiUrl(`/api/projects/${project._id}/milestones/${mId}/submit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          githubUrl: githubUrl.trim(),
          liveDemoUrl: liveDemoUrl.trim(),
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittingMilestoneId(null);
        setGithubUrl('');
        setLiveDemoUrl('');
        setNotes('');
        if (onMilestoneUpdated) onMilestoneUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveMilestone = async (mId) => {
    if (!confirm('Are you sure you want to approve this milestone and release protected payment?')) return;
    setApprovingMilestoneId(mId);

    try {
      const res = await fetch(apiUrl(`/api/projects/${project._id}/milestones/${mId}/approve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        if (onMilestoneUpdated) onMilestoneUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingMilestoneId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={12} /> Approved & Paid
          </span>
        );
      case 'submitted':
        return (
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <GitBranch size={12} /> Under Review
          </span>
        );
      case 'funded':
        return (
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Lock size={12} /> Payment Protected
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={12} /> Pending Funding
          </span>
        );
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.75rem',
        marginTop: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Milestone-Based Contract
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Split large deliverables into paid checkpoints with independent Payment Protection releases.
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <PlusCircle size={15} /> Add Milestone
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#475569',
              marginBottom: '0.4rem',
            }}
          >
            <span>Progress: {completedCount} of {milestones.length} milestones approved</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4f46e5 0%, #10b981 100%)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Add Milestone Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddMilestone}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem', fontWeight: 800 }}>
            Create New Milestone
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Milestone Title *</label>
              <input
                type="text"
                placeholder="e.g. Milestone 1: Frontend Components"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Amount (₹ INR) *</label>
              <input
                type="number"
                placeholder="15000"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
                min={100}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Description / Deliverable Scope</label>
            <input
              type="text"
              placeholder="Key specifications to deliver before milestone payment is released"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={addingMilestone}>
              {addingMilestone ? 'Adding...' : 'Add Milestone to Contract'}
            </button>
          </div>
        </form>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.88rem' }}>
          No milestones defined for this contract. The full project budget is protected in a single contract.
          {isOwner && (
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(true)}>
                <PlusCircle size={14} /> Split Project into Milestones
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {milestones.map((m, idx) => {
            const isExpanded = expandedMilestoneId === m._id;
            const isSubmittingThis = submittingMilestoneId === m._id;

            return (
              <div
                key={m._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: m.status === 'approved' ? '#f0fdf4' : '#ffffff',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                {/* Milestone Summary Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: m.status === 'approved' ? '#10b981' : '#4f46e5',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {m.title}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1px' }}>
                          {m.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                        ₹{Number(m.amount).toLocaleString('en-IN')}
                      </div>
                      <div>{getStatusBadge(m.status)}</div>
                    </div>

                    <button
                      onClick={() => setExpandedMilestoneId(isExpanded ? null : m._id)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.4rem',
                        cursor: 'pointer',
                        color: '#64748b',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Milestone Detail & Actions Body */}
                {isExpanded && (
                  <div style={{ padding: '1.25rem', background: '#f8fafc' }}>
                    {/* Action buttons bar */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {/* Client Action: Deposit Payment Protection */}
                      {isOwner && m.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onOpenDepositEscrow(m)}
                        >
                          <Lock size={14} /> Protect Payment (₹{Number(m.amount).toLocaleString('en-IN')})
                        </button>
                      )}

                      {/* Freelancer Action: Submit Deliverable */}
                      {isAwardedFreelancer && (m.status === 'funded' || m.status === 'in_progress') && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSubmittingMilestoneId(isSubmittingThis ? null : m._id)}
                        >
                          <GitBranch size={14} /> Submit Milestone Deliverable
                        </button>
                      )}

                      {/* Client Action: Approve Milestone & Release Protected Payment */}
                      {isOwner && m.status === 'submitted' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveMilestone(m._id)}
                          disabled={approvingMilestoneId === m._id}
                          style={{ background: '#10b981', color: '#fff', border: 'none' }}
                        >
                          <CheckCircle2 size={14} /> Approve & Release ₹{Number(m.amount).toLocaleString('en-IN')}
                        </button>
                      )}
                    </div>

                    {/* Freelancer Deliverable Submission Form */}
                    {isSubmittingThis && (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '1rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <h5 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', fontWeight: 800 }}>
                          Submit Deliverable for "{m.title}"
                        </h5>
                        <div style={{ marginBottom: '0.6rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            GitHub Repository URL *
                          </label>
                          <input
                            type="url"
                            placeholder="https://github.com/username/project-branch"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                          />
                        </div>
                        <div style={{ marginBottom: '0.6rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            Live Demo / Deployment URL (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://demo.vercel.app"
                            value={liveDemoUrl}
                            onChange={(e) => setLiveDemoUrl(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                          />
                        </div>
                        <div style={{ marginBottom: '0.8rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            Release & Implementation Notes
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Describe what was built in this milestone..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSubmittingMilestoneId(null)}>
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSubmitMilestoneDeliverable(m._id)}
                            disabled={submitting}
                          >
                            {submitting ? 'Running Automated Checks...' : 'Submit with Code Quality Scan'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submitted Deliverable Info */}
                    {m.submission && m.submission.githubUrl && (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                            Submitted Deliverable:
                          </span>
                          <a
                            href={m.submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600 }}
                          >
                            <GitBranch size={14} /> Open Repository <ExternalLink size={12} />
                          </a>
                        </div>
                        {m.submission.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                            "{m.submission.notes}"
                          </div>
                        )}

                        {/* Automated Code Check on Milestone */}
                        {m.submission.codeQualityReport && (
                          <CodeQualityReportCard
                            projectId={project._id}
                            report={m.submission.codeQualityReport}
                            githubUrl={m.submission.githubUrl}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
