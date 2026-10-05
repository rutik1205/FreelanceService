const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Bid = require('../models/Bid');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const { protect, optionalAuth } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');
const { analyzeRepository } = require('../services/codeQualityService');

// @route   GET /api/projects
// @desc    Get all projects with filtering, search, and pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, minBudget, maxBudget, status, sort, limit = 20, page = 1 } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    } else if (!status) {
      // By default show open and in_progress if not explicitly specified
      filter.status = { $in: ['open', 'in_progress', 'submitted', 'completed'] };
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skillsRequired: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'budget_high') sortOption = { budget: -1 };
    if (sort === 'budget_low') sortOption = { budget: 1 };
    if (sort === 'bids') sortOption = { bidCount: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .populate('client', 'name avatar headline ratingsAverage')
      .populate('selectedFreelancer', 'name avatar headline githubUrl')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const requesterId = req.user?._id ? req.user._id.toString() : null;
    const isAdmin = req.user?.role === 'admin';

    const sanitizedProjects = projects.map((p) => {
      const pObj = p.toObject();
      const clientId = p.client?._id ? p.client._id.toString() : p.client?.toString();
      const freelancerId = p.selectedFreelancer?._id ? p.selectedFreelancer._id.toString() : p.selectedFreelancer?.toString();
      const isClient = requesterId && clientId && requesterId === clientId;
      const isFreelancer = requesterId && freelancerId && requesterId === freelancerId;

      if (!isClient && !isFreelancer && !isAdmin && pObj.submission) {
        pObj.submission = {
          hasSubmission: Boolean(pObj.submission.githubUrl || pObj.submission.submittedAt),
          submittedAt: pObj.submission.submittedAt,
          isRestricted: true,
        };
      }
      return pObj;
    });

    res.json({
      success: true,
      count: sanitizedProjects.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      projects: sanitizedProjects,
    });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching projects',
      error: error.message,
      dbReadyState: require('mongoose').connection.readyState
    });
  }
});

// @route   GET /api/projects/my/client
// @desc    Get all projects posted by logged-in client
router.get('/my/client', protect, async (req, res) => {
  try {
    const projects = await Project.find({ client: req.user._id })
      .populate('selectedFreelancer', 'name avatar headline githubUrl')
      .populate('selectedBid')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving your projects' });
  }
});

// @route   GET /api/projects/my/freelancer
// @desc    Get all projects assigned to or won by logged-in freelancer
router.get('/my/freelancer', protect, async (req, res) => {
  try {
    const projects = await Project.find({ selectedFreelancer: req.user._id })
      .populate('client', 'name avatar headline')
      .populate('selectedBid')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving awarded projects' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name avatar headline ratingsAverage postedProjectsCount createdAt')
      .populate('selectedFreelancer', 'name avatar headline githubUrl ratingsAverage')
      .populate('selectedBid');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const projectObj = project.toObject();
    const requesterId = req.user?._id ? req.user._id.toString() : null;
    const clientId = project.client?._id ? project.client._id.toString() : project.client?.toString();
    const freelancerId = project.selectedFreelancer?._id ? project.selectedFreelancer._id.toString() : project.selectedFreelancer?.toString();
    const isClient = requesterId && clientId && requesterId === clientId;
    const isFreelancer = requesterId && freelancerId && requesterId === freelancerId;
    const isAdmin = req.user?.role === 'admin';

    if (!isClient && !isFreelancer && !isAdmin && projectObj.submission) {
      const hasSubmission = Boolean(projectObj.submission.githubUrl || projectObj.submission.submittedAt);
      projectObj.submission = {
        hasSubmission,
        submittedAt: projectObj.submission.submittedAt,
        isRestricted: true,
      };
    }

    res.json({
      success: true,
      project: projectObj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving project details' });
  }
});

// @route   GET /api/projects/:id/bids
// @desc    Get all proposals/bids for this project
router.get('/:id/bids', optionalAuth, async (req, res) => {
  try {
    const bids = await Bid.find({ project: req.params.id })
      .populate('freelancer', 'name email avatar headline bio skills hourlyRate ratingsAverage ratingsCount completedProjectsCount githubUrl')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bids.length,
      bids,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving proposals' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project (Client)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      budget,
      budgetType,
      deadline,
      skillsRequired,
      attachments,
      isMilestoneBased,
      milestones,
    } = req.body;

    if (!title || !description || !budget) {
      return res.status(400).json({ success: false, message: 'Please provide title, description, and budget' });
    }

    const skills = Array.isArray(skillsRequired)
      ? skillsRequired
      : (skillsRequired || '').split(',').map((s) => s.trim()).filter(Boolean);

    const formattedMilestones = Array.isArray(milestones)
      ? milestones.map((m) => ({
          title: m.title || 'Milestone',
          description: m.description || '',
          amount: Number(m.amount) || 0,
          dueDate: m.dueDate || null,
          status: 'pending',
        }))
      : [];

    const project = await Project.create({
      title,
      description,
      category: category || 'Full Stack Development',
      budget: Number(budget),
      budgetType: budgetType || 'fixed',
      deadline: deadline || null,
      skillsRequired: skills,
      attachments: attachments || [],
      client: req.user._id,
      status: 'open',
      isMilestoneBased: Boolean(isMilestoneBased || (formattedMilestones.length > 0)),
      milestones: formattedMilestones,
    });

    // Update user posted projects count
    await User.findByIdAndUpdate(req.user._id, { $inc: { postedProjectsCount: 1 } });

    const populatedProject = await Project.findById(project._id).populate('client', 'name avatar headline');

    res.status(201).json({
      success: true,
      project: populatedProject,
      message: 'Project posted successfully!',
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error posting project' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
router.put('/:id', protect, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only project client can edit
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
    }

    const { title, description, category, budget, budgetType, deadline, skillsRequired, attachments, status } = req.body;

    if (title) project.title = title;
    if (description) project.description = description;
    if (category) project.category = category;
    if (budget) project.budget = Number(budget);
    if (budgetType) project.budgetType = budgetType;
    if (deadline !== undefined) project.deadline = deadline;
    if (status && ['open', 'cancelled'].includes(status)) project.status = status;
    if (skillsRequired) {
      project.skillsRequired = Array.isArray(skillsRequired)
        ? skillsRequired
        : skillsRequired.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (attachments) project.attachments = attachments;

    await project.save();

    res.json({
      success: true,
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error updating project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
    }

    // Clean up bids associated with this project
    await Bid.deleteMany({ project: project._id });
    await project.deleteOne();

    await User.findByIdAndUpdate(req.user._id, { $inc: { postedProjectsCount: -1 } });

    res.json({
      success: true,
      message: 'Project and associated proposals removed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting project' });
  }
});

// @route   POST /api/projects/:id/hire/:bidId
// @desc    Client accepts a proposal / hires a freelancer
router.post('/:id/hire/:bidId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only project owner can hire
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project owner can hire a freelancer' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This project is already awarded or completed' });
    }

    const bid = await Bid.findById(req.params.bidId);
    if (!bid || bid.project.toString() !== project._id.toString()) {
      return res.status(404).json({ success: false, message: 'Proposal not found for this project' });
    }

    // Accept selected bid
    bid.status = 'accepted';
    await bid.save();

    // Reject other bids for this project
    await Bid.updateMany(
      { project: project._id, _id: { $ne: bid._id } },
      { $set: { status: 'rejected' } }
    );

    // Update project state
    project.selectedFreelancer = bid.freelancer;
    project.selectedBid = bid._id;
    project.status = 'in_progress';
    project.awardedAt = new Date();
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name avatar')
      .populate('selectedFreelancer', 'name avatar headline githubUrl')
      .populate('selectedBid');

    // Send hire notification to freelancer
    const io = req.app.get('io');
    await sendNotification({
      recipient: bid.freelancer,
      sender: req.user._id,
      type: 'hire_accepted',
      title: 'Congratulations! You are Hired 🎉',
      message: `${req.user.name} accepted your proposal for "${project.title}". You can now start collaborating!`,
      link: `/project/${project._id}`,
      projectId: project._id,
      meta: { bidId: bid._id, amount: bid.amount },
      io,
    });

    res.json({
      success: true,
      project: updatedProject,
      message: 'Freelancer successfully hired! Project is now In Progress.',
    });
  } catch (error) {
    console.error('Hire error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error hiring freelancer' });
  }
});

// @route   POST /api/projects/:id/submit-work
// @desc    Freelancer submits project deliverable via GitHub Link + Automated Code Quality Check
router.post('/:id/submit-work', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only awarded freelancer can submit work
    if (!project.selectedFreelancer || project.selectedFreelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned freelancer can submit work for this project' });
    }

    const { githubUrl, liveDemoUrl, notes, attachments } = req.body;

    if (!githubUrl) {
      return res.status(400).json({ success: false, message: 'GitHub repository URL is required for project delivery' });
    }

    // Basic GitHub link format check
    if (!githubUrl.toLowerCase().includes('github.com')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid GitHub repository link (e.g. https://github.com/username/repo)' });
    }

    // Run Automated Code Quality Analysis
    let qualityReport = null;
    try {
      qualityReport = await analyzeRepository(githubUrl.trim());
    } catch (analysisErr) {
      console.warn('Automated code check warning:', analysisErr.message);
    }

    project.submission = {
      githubUrl: githubUrl.trim(),
      liveDemoUrl: (liveDemoUrl || '').trim(),
      notes: notes || '',
      submittedAt: new Date(),
      codeQualityReport: qualityReport,
      attachments: attachments || [],
    };
    project.status = 'submitted';

    await project.save();

    // Notify client of submission with code quality score
    const io = req.app.get('io');
    const scoreStr = qualityReport ? ` (Quality Score: ${qualityReport.score}/100, Grade: ${qualityReport.grade})` : '';
    await sendNotification({
      recipient: project.client,
      sender: req.user._id,
      type: 'deliverable_submitted',
      title: 'GitHub Deliverable Submitted 🚀',
      message: `${req.user.name} submitted code for "${project.title}"${scoreStr}. Review the repository and automated checks!`,
      link: `/project/${project._id}`,
      projectId: project._id,
      meta: { codeQualityReport: qualityReport },
      io,
    });

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name avatar')
      .populate('selectedFreelancer', 'name avatar headline githubUrl');

    res.json({
      success: true,
      project: updatedProject,
      codeQualityReport: qualityReport,
      message: 'Work successfully submitted with GitHub link! Automated code analysis completed.',
    });
  } catch (error) {
    console.error('Submit work error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error submitting project deliverable' });
  }
});

// @route   POST /api/projects/:id/code-check
// @desc    Run automated code quality checks on-demand for a project or GitHub URL
router.post('/:id/code-check', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const targetUrl = req.body.githubUrl || project.submission?.githubUrl;
    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'No GitHub repository URL provided or submitted' });
    }

    const report = await analyzeRepository(targetUrl.trim());

    // If project already had a submission, update the report
    if (project.submission && project.submission.githubUrl) {
      project.submission.codeQualityReport = report;
      await project.save();
    }

    res.json({
      success: true,
      report,
      message: 'Automated code check completed successfully',
    });
  } catch (error) {
    console.error('Code check error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error executing automated code check' });
  }
});

// @route   POST /api/projects/:id/approve
// @desc    Client approves GitHub deliverable, completes project, releases Escrow funds
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can approve deliverables' });
    }

    const { rating = 5, feedback = '' } = req.body;

    project.status = 'completed';
    project.review = {
      rating: Number(rating),
      feedback: feedback ? feedback.trim() : '',
      reviewedAt: new Date(),
    };

    // If escrow payment is held, auto-release to freelancer wallet!
    const heldPayment = await Payment.findOne({
      project: project._id,
      status: 'held_in_escrow',
      milestoneId: null,
    });

    let releasedAmount = 0;
    if (heldPayment) {
      heldPayment.status = 'released';
      heldPayment.releasedAt = new Date();
      await heldPayment.save();
      project.escrowStatus = 'released';
      releasedAmount = heldPayment.amount;

      if (heldPayment.payee) {
        await User.findByIdAndUpdate(heldPayment.payee, {
          $inc: { walletBalance: heldPayment.amount },
        });
      }
    }

    await project.save();

    // Update freelancer's statistics & rating
    if (project.selectedFreelancer) {
      if (feedback && feedback.trim()) {
        await Review.create({
          freelancer: project.selectedFreelancer,
          client: req.user._id,
          project: project._id,
          projectTitle: project.title,
          rating: Number(rating),
          feedback: feedback.trim(),
        });
      }

      const allReviews = await Review.find({ freelancer: project.selectedFreelancer });
      const freelancer = await User.findById(project.selectedFreelancer);
      if (freelancer) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        freelancer.ratingsCount = allReviews.length;
        freelancer.ratingsAverage = allReviews.length > 0 ? Number((totalRating / allReviews.length).toFixed(1)) : Number(rating);
        freelancer.completedProjectsCount += 1;
        await freelancer.save();
      }

      // Notify freelancer
      const io = req.app.get('io');
      const releaseMsg = releasedAmount > 0
        ? ` ₹${releasedAmount.toLocaleString('en-IN')} protected funds released to your wallet!`
        : '';
      await sendNotification({
        recipient: project.selectedFreelancer,
        sender: req.user._id,
        type: 'payment_released',
        title: 'Project Approved & Completed! ⭐',
        message: `${req.user.name} approved your deliverable for "${project.title}" with a ${rating}-star review.${releaseMsg}`,
        link: `/project/${project._id}`,
        projectId: project._id,
        meta: { rating, feedback, releasedAmount },
        io,
      });
    }

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name avatar')
      .populate('selectedFreelancer', 'name avatar headline');

    res.json({
      success: true,
      project: updatedProject,
      releasedAmount,
      message: 'Project approved and completed! Rating submitted and protected funds released.',
    });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error approving project' });
  }
});

// @route   POST /api/projects/:id/milestones
// @desc    Add a milestone to an existing project (Client)
router.post('/:id/milestones', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can add milestones' });
    }

    const { title, description, amount, dueDate } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide milestone title and amount' });
    }

    project.isMilestoneBased = true;
    project.milestones.push({
      title,
      description: description || '',
      amount: Number(amount),
      dueDate: dueDate || null,
      status: 'pending',
    });

    await project.save();

    res.status(201).json({
      success: true,
      milestones: project.milestones,
      message: 'Milestone added successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error adding milestone' });
  }
});

// @route   POST /api/projects/:id/milestones/:mId/submit
// @desc    Freelancer submits deliverable for a specific milestone
router.post('/:id/milestones/:mId/submit', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (!project.selectedFreelancer || project.selectedFreelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only assigned freelancer can submit milestone deliverables' });
    }

    const milestone = project.milestones.id(req.params.mId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    const { githubUrl, liveDemoUrl, notes } = req.body;
    if (!githubUrl || !githubUrl.includes('github.com')) {
      return res.status(400).json({ success: false, message: 'Valid GitHub repository URL is required' });
    }

    let qualityReport = null;
    try {
      qualityReport = await analyzeRepository(githubUrl.trim());
    } catch (e) {
      console.warn('Milestone code check warning:', e.message);
    }

    milestone.submission = {
      githubUrl: githubUrl.trim(),
      liveDemoUrl: (liveDemoUrl || '').trim(),
      notes: notes || '',
      submittedAt: new Date(),
      codeQualityReport: qualityReport,
    };
    milestone.status = 'submitted';

    await project.save();

    const io = req.app.get('io');
    await sendNotification({
      recipient: project.client,
      sender: req.user._id,
      type: 'milestone_submitted',
      title: 'Milestone Deliverable Submitted 📦',
      message: `${req.user.name} submitted deliverable for milestone "${milestone.title}". Quality Score: ${qualityReport ? qualityReport.score : 'N/A'}/100.`,
      link: `/project/${project._id}`,
      projectId: project._id,
      meta: { milestoneId: milestone._id },
      io,
    });

    res.json({
      success: true,
      milestone,
      qualityReport,
      message: 'Milestone deliverable submitted with automated code check!',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error submitting milestone work' });
  }
});

// @route   POST /api/projects/:id/milestones/:mId/approve
// @desc    Client approves milestone deliverable and releases milestone escrow funds
router.post('/:id/milestones/:mId/approve', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can approve milestones' });
    }

    const milestone = project.milestones.id(req.params.mId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    milestone.status = 'approved';
    milestone.approvedAt = new Date();

    // Release escrow for this milestone if held
    const escrowPayment = await Payment.findOne({
      project: project._id,
      milestoneId: milestone._id,
      status: 'held_in_escrow',
    });

    let releasedAmount = 0;
    if (escrowPayment) {
      escrowPayment.status = 'released';
      escrowPayment.releasedAt = new Date();
      await escrowPayment.save();
      releasedAmount = escrowPayment.amount;

      if (escrowPayment.payee) {
        await User.findByIdAndUpdate(escrowPayment.payee, {
          $inc: { walletBalance: escrowPayment.amount },
        });
      }
    }

    // Check if all milestones are approved -> mark whole project completed
    const allApproved = project.milestones.every((m) => m.status === 'approved');
    if (allApproved && project.milestones.length > 0) {
      project.status = 'completed';
    }

    await project.save();

    const io = req.app.get('io');
    if (project.selectedFreelancer) {
      await sendNotification({
        recipient: project.selectedFreelancer,
        sender: req.user._id,
        type: 'milestone_approved',
        title: 'Milestone Approved! 💰',
        message: `${req.user.name} approved milestone "${milestone.title}". ₹${milestone.amount.toLocaleString('en-IN')} released!`,
        link: `/project/${project._id}`,
        projectId: project._id,
        meta: { milestoneId: milestone._id, amount: milestone.amount },
        io,
      });
    }

    res.json({
      success: true,
      milestone,
      releasedAmount,
      isProjectCompleted: allApproved,
      message: `Milestone "${milestone.title}" approved and funds released!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error approving milestone' });
  }
});

// @route   POST /api/projects/:id/request-revision
// @desc    Client requests revisions on submitted GitHub repo
router.post('/:id/request-revision', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can request revisions' });
    }

    const { revisionNotes } = req.body;
    project.status = 'in_progress';
    if (project.submission) {
      project.submission.notes = (project.submission.notes ? project.submission.notes + '\n\n' : '') +
        `[Revision Requested]: ${revisionNotes || 'Please adjust the code and resubmit.'}`;
    }

    await project.save();

    res.json({
      success: true,
      project,
      message: 'Revision requested. Status reverted to In Progress for freelancer to update.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error requesting revision' });
  }
});

module.exports = router;
