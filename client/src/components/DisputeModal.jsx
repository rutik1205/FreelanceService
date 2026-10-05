import React, { useState } from 'react';
import { apiUrl } from '../config/api';
import {
  ShieldAlert,
  AlertCircle,
  X,
  Send,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DisputeModal({
  isOpen,
  onClose,
  project,
  milestone = null,
  onDisputeRaised,
}) {
  const { token } = useAuth();
  const [reason, setReason] = useState('Deliverable not according to requirements');
  const [explanation, setExplanation] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setError('Please provide a detailed explanation of the issue.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/disputes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project._id,
          milestoneId: milestone ? milestone._id : null,
          reason,
          explanation: explanation.trim(),
          evidenceUrls: evidenceUrl.trim() ? [{ name: 'Evidence Reference', url: evidenceUrl.trim() }] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit dispute');
      }

      if (onDisputeRaised) {
        onDisputeRaised(data.dispute);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1150,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: '#ffffff',
            padding: '1.5rem',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <ShieldAlert size={26} color="#fca5a5" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              SkillDesk Dispute Mediation
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#fecaca', lineHeight: 1.4 }}>
            Case for: "{project?.title}"
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: '#92400e',
              lineHeight: 1.4,
            }}
          >
            <strong>Note:</strong> Raising a formal dispute pauses protected payments associated with this project. A SkillDesk administrator will review GitHub repository code commits, specifications, and chat transcripts to arbitrate.
          </div>

          {/* Reason Category */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Dispute Category
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                background: '#ffffff',
              }}
            >
              <option value="Deliverable not according to requirements">Deliverable not according to requirements</option>
              <option value="Repository incomplete or missing documentation">Repository incomplete or missing documentation</option>
              <option value="Missed deadline without communication">Missed deadline without communication</option>
              <option value="Refusal to release protected payment">Refusal to release protected payment</option>
              <option value="Code quality or plagiarized work">Code quality or plagiarized work</option>
              <option value="Other dispute">Other dispute</option>
            </select>
          </div>

          {/* Detailed Explanation */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Detailed Explanation of the Issue *
            </label>
            <textarea
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe specifically what requirements were unfulfilled, code defects, or payment issues..."
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Evidence URL */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Evidence Link (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/... or Google Drive / screenshot link"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
              <LinkIcon
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
            >
              {submitting ? 'Submitting Dispute...' : 'Submit Formal Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
