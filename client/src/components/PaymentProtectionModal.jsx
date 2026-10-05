import React, { useState } from 'react';
import { apiUrl } from '../config/api';
import {
  ShieldCheck,
  Lock,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export default function PaymentProtectionModal({
  isOpen,
  onClose,
  project,
  milestone = null,
  amount,
  onPaymentSuccess,
}) {
  const { user, token } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const targetAmount = amount || (milestone ? milestone.amount : project?.budget) || 0;

  const handleDepositProtection = async () => {
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/payments/deposit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project._id,
          milestoneId: milestone ? milestone._id : null,
          amount: targetAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to deposit into Payment Protection');
      }

      // Celebrate with confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(data.payment);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error processing payment protection');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '2rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} color="#16a34a" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Payment Protection
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                Your payment is protected until the project is completed and approved.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Deposit Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              {milestone ? 'Milestone Protection' : 'Project Contract'}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                background: '#eff6ff',
                color: '#2563eb',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              100% Protected
            </span>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {milestone ? milestone.title : project?.title}
          </h3>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.25rem',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #cbd5e1',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Protected Amount:</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginLeft: 'auto' }}>
              ₹{Number(targetAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Protection Terms Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#16a34a" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              <strong>Protected Deposit:</strong> Funds are locked safely in Payment Protection and will not be transferred to the developer yet.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#16a34a" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              <strong>Release on Approval:</strong> You inspect the deliverable repository and only release funds when you are satisfied with the code.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#16a34a" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              <strong>Mediation Protection:</strong> If work does not meet the agreed requirements, free arbitration is available to protect your funds.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={processing}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDepositProtection}
            disabled={processing}
            style={{
              flex: 2,
              background: '#16a34a',
              borderColor: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            {processing ? (
              <span>Protecting Funds...</span>
            ) : (
              <>
                <Zap size={16} />
                <span>Confirm Protected Deposit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
