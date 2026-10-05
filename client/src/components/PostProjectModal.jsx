import React, { useState } from 'react';
import { apiUrl } from '../config/api';
import { X, PlusCircle, AlertCircle, IndianRupee, Sparkles, UserX, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import ImageKitUpload from './ImageKitUpload';

export default function PostProjectModal({ isOpen, onClose, onProjectCreated, onOpenProfile }) {
  const { user, token, isFreelancer, isClient } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Full Stack Development');
  const [budget, setBudget] = useState('25000');
  const [budgetType, setBudgetType] = useState('fixed');
  const [deadline, setDeadline] = useState('');
  const [skillsString, setSkillsString] = useState('React, Node.js, MongoDB');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isMilestoneBased, setIsMilestoneBased] = useState(false);
  const [milestonesList, setMilestonesList] = useState([
    { title: 'Milestone 1: Backend APIs & Auth', amount: '10000' },
    { title: 'Milestone 2: Frontend & Deployment', amount: '15000' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Full Stack Development',
    'Web Frontend',
    'Backend & APIs',
    'Mobile App Development',
    'DevOps & Cloud',
    'UI/UX Design',
    'Database & Systems',
    'AI & Machine Learning',
  ];

  const popularSkills = [
    'React',
    'Node.js',
    'MongoDB',
    'Express',
    'TypeScript',
    'Next.js',
    'Docker',
    'AWS',
    'TailwindCSS',
    'REST APIs',
  ];

  const quickBudgets = [
    { label: '₹10,000', value: 10000 },
    { label: '₹25,000', value: 25000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 },
  ];

  const handleAddSkill = (skill) => {
    const current = skillsString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!current.includes(skill)) {
      setSkillsString([...current, skill].join(', '));
    }
  };

  const isFreelancerOnly = user && user.role === 'freelancer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in to post a project');
      return;
    }

    if (isFreelancerOnly) {
      setError('Freelancer accounts cannot publish projects. Please switch your role to Client.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const skillsArray = skillsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const attachments = attachment ? [attachment] : [];

      const res = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          budget: Number(budget),
          budgetType,
          deadline: deadline || undefined,
          skillsRequired: skillsArray,
          description: description.trim(),
          attachments,
          isMilestoneBased,
          milestones: isMilestoneBased ? milestonesList : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to post project');
      }

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onProjectCreated(data.project);
      onClose();
    } catch (err) {
      setError(err.message || 'Error posting project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', padding: '2.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Post a New Project</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Publish project requirements. Developers will bid and deliver source code via GitHub.
            </p>
          </div>
          <button
            onClick={onClose}
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

        {/* Warning if logged in as a freelancer */}
        {isFreelancerOnly && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <UserX size={20} color="#d97706" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
                You are currently signed in as a Freelancer
              </div>
              <p style={{ fontSize: '0.82rem', color: '#b45309', margin: '0.25rem 0 0.5rem' }}>
                Only Client accounts can post and manage projects. You can easily switch your account role in your Profile settings.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  if (onOpenProfile) onOpenProfile();
                }}
              >
                Switch Role to Client <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

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
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">
              Project Title <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isFreelancerOnly}
              placeholder="e.g. Build an E-Commerce Backend API with Express & MongoDB"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category & Budget in INR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                disabled={isFreelancerOnly}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Budget (₹ INR) <span style={{ color: '#dc2626' }}>*</span>
              </label>
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
                  min={500}
                  disabled={isFreelancerOnly}
                  placeholder="25000"
                  className="form-input"
                  style={{ paddingLeft: '28px' }}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick INR Budget Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Budget (INR):</span>
            {quickBudgets.map((b) => (
              <button
                type="button"
                key={b.value}
                disabled={isFreelancerOnly}
                onClick={() => setBudget(b.value.toString())}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: budget === b.value.toString() ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                  background: budget === b.value.toString() ? 'var(--primary-light)' : '#ffffff',
                  color: budget === b.value.toString() ? 'var(--primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Deadline */}
          <div className="form-group">
            <label className="form-label">Estimated Deadline (Optional)</label>
            <input
              type="date"
              disabled={isFreelancerOnly}
              className="form-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Skills Required */}
          <div className="form-group">
            <label className="form-label">Skills Required (Comma-separated)</label>
            <input
              type="text"
              disabled={isFreelancerOnly}
              placeholder="React, Node.js, Express, MongoDB, Docker..."
              className="form-input"
              value={skillsString}
              onChange={(e) => setSkillsString(e.target.value)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '0.25rem', alignSelf: 'center' }}>
                Suggestions:
              </span>
              {popularSkills.slice(0, 6).map((skill) => (
                <button
                  type="button"
                  key={skill}
                  disabled={isFreelancerOnly}
                  onClick={() => handleAddSkill(skill)}
                  className="skill-tag"
                  style={{ cursor: 'pointer', background: '#f8fafc' }}
                >
                  +{skill}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              Detailed Description & Deliverables <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              required
              rows={4}
              disabled={isFreelancerOnly}
              placeholder="Describe user requirements, database schema needs, and deliverables (e.g. deliverable will be submitted as a clean GitHub repository link with setup documentation)..."
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Milestone-Based Contract Toggle */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  Milestone-Based Contract
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Split this project into multiple paid deliverables with independent Payment Protection releases
                </div>
              </div>
              <input
                type="checkbox"
                checked={isMilestoneBased}
                onChange={(e) => setIsMilestoneBased(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {isMilestoneBased && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {milestonesList.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...milestonesList];
                          updated[idx].title = e.target.value;
                          setMilestonesList(updated);
                        }}
                        placeholder={`Milestone ${idx + 1} Title`}
                        style={{
                          flex: 2,
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                        }}
                      />
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.8rem',
                            color: '#64748b',
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="number"
                          value={m.amount}
                          onChange={(e) => {
                            const updated = [...milestonesList];
                            updated[idx].amount = e.target.value;
                            setMilestonesList(updated);
                          }}
                          placeholder="Amount"
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem 0.45rem 1.4rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      {milestonesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMilestonesList(milestonesList.filter((_, i) => i !== idx))}
                          style={{
                            background: '#fee2e2',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMilestonesList([
                      ...milestonesList,
                      { title: `Milestone ${milestonesList.length + 1}`, amount: '5000' },
                    ])
                  }
                  style={{
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Another Milestone
                </button>
              </div>
            )}
          </div>

          {/* ImageKit Attachment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <ImageKitUpload
              label="Attach Specs / Designs / Architecture (ImageKit CDN)"
              folder="/skilldesk/projects"
              onUploadSuccess={(url, fileData) => setAttachment(fileData)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || isFreelancerOnly}
            >
              <PlusCircle size={16} />
              {submitting ? 'Publishing...' : 'Publish Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
