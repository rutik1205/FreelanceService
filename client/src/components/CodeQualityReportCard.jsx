import React, { useState } from 'react';
import { apiUrl } from '../config/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  Star,
  GitFork,
  FileCode,
  RotateCw,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CodeQualityReportCard({
  projectId,
  report,
  githubUrl,
  onReportUpdated,
}) {
  const { token } = useAuth();
  const [reChecking, setReChecking] = useState(false);
  const [currentReport, setCurrentReport] = useState(report);

  if (!currentReport && !githubUrl) return null;

  const handleReRunCheck = async () => {
    if (!token) return;
    setReChecking(true);
    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}/code-check`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ githubUrl }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setCurrentReport(data.report);
        if (onReportUpdated) onReportUpdated(data.report);
      }
    } catch (err) {
      console.error('Failed to run code check:', err);
    } finally {
      setReChecking(false);
    }
  };

  const score = currentReport?.score ?? 50;
  const grade = currentReport?.grade ?? 'B';

  const getScoreColor = (s) => {
    if (s >= 85) return '#10b981'; // Green
    if (s >= 70) return '#3b82f6'; // Blue
    if (s >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getGradeBadgeBg = (g) => {
    if (g === 'A+' || g === 'A') return 'rgba(16, 185, 129, 0.15)';
    if (g === 'B') return 'rgba(59, 130, 246, 0.15)';
    if (g === 'C') return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginTop: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
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
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Automated Code Quality Report
              </h4>
              <span
                style={{
                  background: getGradeBadgeBg(grade),
                  color: getScoreColor(score),
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                Grade: {grade}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Automated repository validation, CI status & code-quality scoring
            </p>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleReRunCheck}
          disabled={reChecking}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RotateCw size={14} className={reChecking ? 'spin' : ''} />
          <span>{reChecking ? 'Analyzing Repo...' : 'Re-run Code Check'}</span>
        </button>
      </div>

      {/* Main Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Score KPI */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            QUALITY SCORE
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: getScoreColor(score),
              margin: '0.2rem 0',
            }}
          >
            {score}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/100</span>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
            Letter Grade: {grade}
          </div>
        </div>

        {/* CI Status KPI */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            CI / CD STATUS
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color:
                currentReport?.ciStatus === 'success' || currentReport?.ciStatus === 'workflows_detected'
                  ? '#10b981'
                  : '#f59e0b',
              margin: '0.6rem 0 0.3rem',
              textTransform: 'capitalize',
            }}
          >
            {currentReport?.ciStatus === 'success'
              ? 'Passed (CI/CD)'
              : currentReport?.ciStatus === 'workflows_detected'
              ? 'Configured'
              : 'Not Configured'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>GitHub Actions</div>
        </div>

        {/* Primary Language */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            PRIMARY TECH
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0.5rem 0 0.3rem',
            }}
          >
            {currentReport?.language || 'JavaScript'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Branch: {currentReport?.defaultBranch || 'main'}
          </div>
        </div>

        {/* Repo Signals */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            REPO COMMUNITY
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              margin: '0.5rem 0 0.3rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: '#334155',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Star size={14} color="#eab308" fill="#eab308" /> {currentReport?.stars ?? 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <GitFork size={14} color="#64748b" /> {currentReport?.forks ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>GitHub Public Stats</div>
        </div>
      </div>

      {/* Structural Quality Checklist */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
          Repository Structure & Standards Checklist
        </h5>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.6rem',
          }}
        >
          {(currentReport?.checks || []).map((check, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.65rem 0.85rem',
                background: check.passed ? '#f0fdf4' : '#fffbeb',
                border: check.passed ? '1px solid #bbf7d0' : '1px solid #fef3c7',
                borderRadius: '8px',
              }}
            >
              {check.passed ? (
                <CheckCircle2 size={17} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={17} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  {check.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                  {check.description}
                </div>
                {check.detail && (
                  <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
                    {check.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Recommendations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Strengths */}
        {currentReport?.strengths && currentReport.strengths.length > 0 && (
          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              border: '1px solid #dcfce7',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#166534', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} /> Key Strengths
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#14532d', lineHeight: 1.5 }}>
              {currentReport.strengths.map((str, i) => (
                <li key={i}>{str}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {currentReport?.recommendations && currentReport.recommendations.length > 0 && (
          <div
            style={{
              background: '#fffbeb',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              border: '1px solid #fef3c7',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#92400e', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={15} /> Suggested Improvements
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
              {currentReport.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
