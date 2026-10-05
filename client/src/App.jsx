import React, { useState, useEffect } from 'react';
import { apiUrl } from './config/api';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProjectCard from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import PostProjectModal from './components/PostProjectModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import HowItWorksModal from './components/HowItWorksModal';
import Dashboard from './components/Dashboard';
import FreelancersDirectory from './components/FreelancersDirectory';
import AdminDashboard from './components/AdminDashboard';
import { useAuth } from './context/AuthContext';
import {
  Briefcase,
  Filter,
  PlusCircle,
  Search,
  Sparkles,
  GitBranch,
  Layers,
  Users,
  Code,
  ArrowRight,
} from 'lucide-react';
import './App.css';

export default function App() {
  const { user, isClient, isFreelancer } = useAuth();
  const [currentView, setCurrentView] = useState('browse'); // 'browse', 'detail', 'dashboard', 'freelancers'
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Filter & Search states
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isPostProjectOpen, setIsPostProjectOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const categories = [
    'All',
    'Full Stack Development',
    'Web Frontend',
    'Backend & APIs',
    'Mobile App Development',
    'DevOps & Cloud',
    'UI/UX Design',
    'AI & Machine Learning',
  ];

  // Fetch projects from backend
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(apiUrl(`/api/projects?${params.toString()}`));
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedCategory, selectedStatus, sortBy]);

  // When user logs out, redirect from dashboard to browse
  useEffect(() => {
    if (!user && currentView === 'dashboard') {
      setCurrentView('browse');
    }
  }, [user, currentView]);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPostProject={() => {
          if (!user) {
            handleOpenAuth('register');
          } else {
            setIsPostProjectOpen(true);
          }
        }}
        onOpenAuth={handleOpenAuth}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onSelectProject={handleSelectProject}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {/* VIEW 1: Browse Projects */}
        {currentView === 'browse' && (
          <div>
            {/* Hero Section */}
            <HeroSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onSearchSubmit={fetchProjects}
            />

            <div className="container">
              {/* Category Pills Bar */}
              <div className="category-filter-bar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Status and Sort Toolbar */}
              <div className="projects-toolbar">
                <div className="toolbar-status-tabs">
                  <button
                    className={`status-tab ${selectedStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('all')}
                  >
                    All Projects
                  </button>
                  <button
                    className={`status-tab ${selectedStatus === 'open' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('open')}
                  >
                    Open for Bids
                  </button>
                  <button
                    className={`status-tab ${selectedStatus === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('in_progress')}
                  >
                    In Progress
                  </button>
                  <button
                    className={`status-tab ${selectedStatus === 'submitted' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('submitted')}
                  >
                    GitHub Submitted
                  </button>
                  <button
                    className={`status-tab ${selectedStatus === 'completed' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('completed')}
                  >
                    Completed
                  </button>
                </div>

                <div className="toolbar-sort">
                  <span>Sort by:</span>
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Latest Posted</option>
                    <option value="budget_high">Highest Budget (INR)</option>
                    <option value="budget_low">Lowest Budget (INR)</option>
                    <option value="bids">Most Proposals</option>
                  </select>
                </div>
              </div>

              {/* Projects Grid or Clean Empty State */}
              {loadingProjects ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                  Loading marketplace projects...
                </div>
              ) : projects.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    margin: '1.5rem 0 4rem',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                    }}
                  >
                    <GitBranch size={32} color="var(--primary)" />
                  </div>

                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                    SkillDesk Marketplace is Ready
                  </h3>

                  <p
                    style={{
                      fontSize: '0.96rem',
                      color: 'var(--text-secondary)',
                      margin: '0.5rem auto 1.75rem',
                      maxWidth: '520px',
                      lineHeight: 1.6,
                    }}
                  >
                    No projects found with the current filters. Clients can post software requirements with INR budget,
                    and developers can bid and deliver source code via verified GitHub repositories.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {(!user || isClient) && (
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={() => {
                          if (!user) handleOpenAuth('register');
                          else setIsPostProjectOpen(true);
                        }}
                      >
                        <PlusCircle size={18} /> Post the First Project
                      </button>
                    )}

                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={() => setCurrentView('freelancers')}
                    >
                      <Users size={18} /> Explore Talent Directory
                    </button>
                  </div>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map((proj) => (
                    <ProjectCard
                      key={proj._id}
                      project={proj}
                      onClick={() => handleSelectProject(proj._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Project Details */}
        {currentView === 'detail' && selectedProjectId && (
          <ProjectDetail
            projectId={selectedProjectId}
            onBack={() => setCurrentView('browse')}
            onOpenAuth={handleOpenAuth}
            onProjectUpdated={fetchProjects}
          />
        )}

        {/* VIEW 3: Dashboard */}
        {currentView === 'dashboard' && (
          <Dashboard
            onSelectProject={handleSelectProject}
            onOpenPostProject={() => setIsPostProjectOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onNavigateToBrowse={() => setCurrentView('browse')}
          />
        )}

        {/* VIEW 4: Talent Directory */}
        {currentView === 'freelancers' && (
          <FreelancersDirectory onOpenAuth={handleOpenAuth} />
        )}

        {/* VIEW 5: Admin Dashboard & Dispute Resolution */}
        {currentView === 'admin' && (
          <AdminDashboard onSelectProject={handleSelectProject} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--card-border)',
          padding: '2.5rem 0',
          marginTop: 'auto',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.15rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitBranch size={16} />
            </div>
            <span>Skill<span className="text-gradient">Desk</span></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              • Built with MERN Stack, INR (₹) & ImageKit CDN
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setIsHowItWorksOpen(true)}>
              How It Works
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => setCurrentView('freelancers')}>
              Talent Directory
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => setCurrentView('browse')}>
              Browse Projects
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PostProjectModal
        isOpen={isPostProjectOpen}
        onClose={() => setIsPostProjectOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onProjectCreated={(newProject) => {
          fetchProjects();
          handleSelectProject(newProject._id);
        }}
      />

      <AuthModal
        key={isAuthOpen ? `auth-modal-${authMode}-${Date.now()}` : 'auth-modal-closed'}
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
