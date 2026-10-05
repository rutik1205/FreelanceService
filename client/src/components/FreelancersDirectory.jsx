import React, { useState, useEffect } from 'react';
import { apiUrl } from '../config/api';
import {
  Users,
  Search,
  Star,
  GitBranch,
  ExternalLink,
  IndianRupee,
  CheckCircle,
  Briefcase,
  UserPlus,
  MessageSquare,
  X,
  Send,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FreelancersDirectory({ onOpenAuth }) {
  const { user, token } = useAuth();
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');

  // Reviews Modal State
  const [activeFreelancer, setActiveFreelancer] = useState(null);
  const [devReviews, setDevReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newFeedback, setNewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const skillsList = ['All', 'React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'Docker', 'UI/UX Design'];

  const fetchFreelancers = async () => {
    setLoading(true);
    try {
      let url = '/api/auth/freelancers';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSkill && selectedSkill !== 'All') params.append('skill', selectedSkill);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(apiUrl(url));
      const data = await res.json();
      if (data.success) {
        setFreelancers(data.freelancers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancers();
  }, [selectedSkill]);

  const openReviewsModal = async (dev) => {
    setActiveFreelancer(dev);
    setNewFeedback('');
    setNewRating(5);
    setReviewError('');
    setReviewSuccess('');
    setLoadingReviews(true);

    try {
      const res = await fetch(apiUrl(`/api/reviews/freelancer/${dev._id}`));
      const data = await res.json();
      if (data.success) {
        setDevReviews(data.reviews || []);
      } else {
        setDevReviews(dev.reviews || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setDevReviews(dev.reviews || []);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    if (!newFeedback.trim()) {
      setReviewError('Please write your review feedback');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          freelancerId: activeFreelancer._id,
          rating: newRating,
          feedback: newFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Review published successfully!');
        setNewFeedback('');
        setNewRating(5);
        if (data.review) {
          setDevReviews((prev) => {
            const exists = prev.some((r) => r._id === data.review._id);
            return exists ? prev : [data.review, ...prev];
          });
        }
        // Update local freelancer state so the card reflects the updated count & average
        setFreelancers((prev) =>
          prev.map((f) => {
            if (f._id === activeFreelancer._id) {
              const currentReviews = f.reviews || [];
              const exists = currentReviews.some((r) => r._id === data.review._id);
              const updatedReviews = exists ? currentReviews : [data.review, ...currentReviews];
              return {
                ...f,
                reviews: updatedReviews,
                ratingsCount: data.ratingsCount,
                ratingsAverage: data.ratingsAverage,
              };
            }
            return f;
          })
        );
      } else {
        setReviewError(data.message || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError(err.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 0 4rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Discover Vetted <span className="text-gradient">Developers</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Hire senior MERN stack engineers, frontend specialists, and backend developers ready to deliver on GitHub.
        </p>
      </div>

      {/* Search & Skills Filter */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFreelancers();
          }}
          style={{
            flex: 1,
            minWidth: '280px',
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.85rem',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search developers by name or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              paddingLeft: '0.65rem',
              fontSize: '0.92rem',
            }}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.2rem 0' }}>
          {skillsList.map((skill) => (
            <button
              key={skill}
              className={`category-pill ${
                (selectedSkill === skill || (skill === 'All' && !selectedSkill)) ? 'active' : ''
              }`}
              onClick={() => setSelectedSkill(skill === 'All' ? '' : skill)}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading developer directory...
        </div>
      ) : freelancers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 'var(--radius-xl)',
            padding: '4rem 2rem',
            textAlign: 'center',
            margin: '1.5rem 0',
          }}
        >
          <Users size={44} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            No Developers Registered Yet
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.5rem auto 1.5rem', maxWidth: '440px' }}>
            Be the first developer to register a profile on SkillDesk, showcase your GitHub portfolio, and bid on upcoming projects!
          </p>
          {!user && (
            <button className="btn btn-primary" onClick={() => onOpenAuth && onOpenAuth('register')}>
              <UserPlus size={16} /> Register as Freelancer
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {freelancers.map((dev) => {
            const hasReviews = dev.reviews && dev.reviews.length > 0;
            const latestReview = hasReviews ? dev.reviews[0] : null;

            return (
              <div
                key={dev._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all var(--transition-normal)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <img
                      src={
                        dev.avatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dev.name)}`
                      }
                      alt={dev.name}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--primary-border)',
                      }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {dev.name}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {dev.headline || 'Full Stack Engineer'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                        {dev.ratingsCount > 0 ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={13} fill="#f59e0b" color="#f59e0b" />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                {Number(dev.ratingsAverage || 0).toFixed(1)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              ({dev.ratingsCount} {dev.ratingsCount === 1 ? 'review' : 'reviews'} • {dev.completedProjectsCount || 0} completed)
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            No reviews yet ({dev.completedProjectsCount || 0} completed)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      marginBottom: '1.15rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {dev.bio || 'Experienced developer specialized in building modern web applications.'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    {dev.skills?.map((s, i) => (
                      <span key={i} className="skill-tag">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Dynamic Unique Review Section (Strictly per-freelancer) */}
                  {hasReviews && latestReview ? (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 0.95rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ display: 'flex' }}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={i < latestReview.rating ? '#f59e0b' : '#cbd5e1'}
                                color={i < latestReview.rating ? '#f59e0b' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                            {latestReview.client?.name || 'Client Feedback'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReviewsModal(dev)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {dev.reviews.length > 1 ? `+${dev.reviews.length - 1} more` : 'Details'}
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: '0.81rem',
                          color: '#475569',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{latestReview.feedback}"
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        <MessageSquare size={13} color="#94a3b8" />
                        <span>No reviews yet</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openReviewsModal(dev)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Leave Review
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Rate & Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(dev.hourlyRate || 1200).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> / hour</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => openReviewsModal(dev)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                      title="View all unique reviews"
                    >
                      <Star size={13} fill="#f59e0b" color="#f59e0b" /> Reviews
                    </button>

                    {dev.githubUrl && (
                      <a
                        href={dev.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-github btn-sm"
                        title="GitHub Profile"
                      >
                        <GitBranch size={14} /> GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviews Modal for Selected Talent */}
      {activeFreelancer && (
        <div className="modal-overlay" onClick={() => setActiveFreelancer(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={
                    activeFreelancer.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeFreelancer.name)}`
                  }
                  alt={activeFreelancer.name}
                  style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {activeFreelancer.name}'s Reviews
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {devReviews.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                            {(devReviews.reduce((sum, r) => sum + r.rating, 0) / devReviews.length).toFixed(1)}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          ({devReviews.length} {devReviews.length === 1 ? 'verified review' : 'verified reviews'})
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        No reviews yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveFreelancer(null)}
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

            {/* Write a Review Section (if authenticated and not self) */}
            {user && user._id !== activeFreelancer._id && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Leave a Verified Review for {activeFreelancer.name}
                </h4>

                {reviewError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                    {reviewError}
                  </div>
                )}
                {reviewSuccess && (
                  <div style={{ color: '#16a34a', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                    {reviewSuccess}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginRight: '0.25rem' }}>
                      Rating:
                    </span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        style={{ cursor: 'pointer' }}
                        fill={star <= newRating ? '#f59e0b' : '#cbd5e1'}
                        color={star <= newRating ? '#f59e0b' : '#cbd5e1'}
                        onClick={() => setNewRating(star)}
                      />
                    ))}
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginLeft: '0.4rem' }}>
                      {newRating} / 5
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder={`Describe your experience working with ${activeFreelancer.name}...`}
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    style={{ fontSize: '0.86rem', marginBottom: '0.75rem' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Send size={14} /> {submittingReview ? 'Posting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!user && (
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Sign in as a client to leave a review for this developer.</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setActiveFreelancer(null);
                    if (onOpenAuth) onOpenAuth('login');
                  }}
                  style={{ fontSize: '0.76rem', padding: '0.25rem 0.6rem' }}
                >
                  Sign In
                </button>
              </div>
            )}

            {/* List of Reviews */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Client Testimonials & Feedback
            </h3>

            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Loading reviews...
              </div>
            ) : devReviews.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <MessageSquare size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No reviews yet</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  {activeFreelancer.name} does not have any reviews yet. Be the first client to collaborate and rate their work!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {devReviews.map((rev) => (
                  <div
                    key={rev._id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.15rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img
                          src={
                            rev.client?.avatar ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.client?.name || 'Client')}`
                          }
                          alt={rev.client?.name || 'Client'}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                          {rev.client?.name || 'Verified Client'}
                        </span>
                        {rev.projectTitle && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {rev.projectTitle}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            fill={i < rev.rating ? '#f59e0b' : '#cbd5e1'}
                            color={i < rev.rating ? '#f59e0b' : '#cbd5e1'}
                          />
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      "{rev.feedback}"
                    </p>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
