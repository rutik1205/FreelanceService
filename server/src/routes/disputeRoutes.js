const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

// @route   POST /api/disputes
// @desc    Raise a dispute for a project or milestone
router.post('/', protect, async (req, res) => {
  try {
    const { projectId, milestoneId, reason, explanation, evidenceUrls } = req.body;

    if (!projectId || !explanation) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and dispute explanation' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isClient = project.client.toString() === req.user._id.toString();
    const isFreelancer = project.selectedFreelancer && project.selectedFreelancer.toString() === req.user._id.toString();

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ success: false, message: 'Only project client or assigned freelancer can raise a dispute' });
    }

    const respondentId = isClient ? project.selectedFreelancer : project.client;
    if (!respondentId) {
      return res.status(400).json({ success: false, message: 'Cannot file dispute before a freelancer is awarded' });
    }

    // Check for existing open dispute
    const existing = await Dispute.findOne({ project: project._id, status: { $in: ['open', 'under_review'] } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An active dispute is already open for this project' });
    }

    // Find active escrow payment if any
    let payment = null;
    if (milestoneId) {
      payment = await Payment.findOne({ project: project._id, milestoneId, status: 'held_in_escrow' });
    } else {
      payment = await Payment.findOne({ project: project._id, status: 'held_in_escrow' });
    }

    const dispute = await Dispute.create({
      project: project._id,
      milestoneId: milestoneId || null,
      payment: payment ? payment._id : null,
      raisedBy: req.user._id,
      respondent: respondentId,
      reason: reason || 'Deliverable not according to requirements',
      explanation,
      evidenceUrls: evidenceUrls || [],
      status: 'open',
    });

    // Mark project and payment as disputed
    project.hasDispute = true;
    project.activeDispute = dispute._id;
    await project.save();

    if (payment) {
      payment.status = 'disputed';
      payment.disputedAt = new Date();
      await payment.save();
    }

    const io = req.app.get('io');
    await sendNotification({
      recipient: respondentId,
      sender: req.user._id,
      type: 'dispute_raised',
      title: 'Dispute Raised on Project ⚖️',
      message: `${req.user.name} filed a dispute on "${project.title}". SkillDesk mediation will review the case.`,
      link: `/project/${project._id}`,
      projectId: project._id,
      meta: { disputeId: dispute._id },
      io,
    });

    const populated = await Dispute.findById(dispute._id)
      .populate('raisedBy', 'name email avatar')
      .populate('respondent', 'name email avatar')
      .populate('project', 'title budget status');

    res.status(201).json({
      success: true,
      dispute: populated,
      message: 'Dispute submitted. SkillDesk moderators have been notified for review.',
    });
  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error raising dispute' });
  }
});

// @route   GET /api/disputes/project/:projectId
// @desc    Get dispute status for a specific project
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const dispute = await Dispute.findOne({ project: req.params.projectId })
      .populate('raisedBy', 'name email avatar')
      .populate('respondent', 'name email avatar')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      hasDispute: Boolean(dispute),
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving dispute details' });
  }
});

module.exports = router;
