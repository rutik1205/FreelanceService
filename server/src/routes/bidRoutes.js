const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Project = require('../models/Project');
const { protect, optionalAuth } = require('../middleware/auth');

// @route   GET /api/bids/my
// @desc    Get all bids submitted by the logged-in freelancer (MUST BE FIRST)
router.get(['/my', '/bids/my'], protect, async (req, res) => {
  try {
    const bids = await Bid.find({ freelancer: req.user._id })
      .populate({
        path: 'project',
        select: 'title budget category status client deadline submission review',
        populate: { path: 'client', select: 'name avatar' },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bids.length,
      bids,
    });
  } catch (error) {
    console.error('Error retrieving my bids:', error);
    res.status(500).json({ success: false, message: 'Error retrieving your bids' });
  }
});

// @route   POST /api/bids/projects/:projectId, /api/bids/projects/:projectId/bids
// @desc    Freelancer submits a bid/proposal on a project
router.post(['/projects/:projectId/bids', '/projects/:projectId'], protect, async (req, res) => {
  try {
    const { amount, deliveryDays, proposal, githubPortfolio, attachment } = req.body;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This project is no longer accepting proposals' });
    }

    // Client cannot bid on their own project
    if (project.client.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot place a bid on your own project' });
    }

    // Check if already bid
    const existingBid = await Bid.findOne({ project: projectId, freelancer: req.user._id });
    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a proposal for this project',
      });
    }

    if (!amount || !deliveryDays || !proposal) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bid amount, delivery timeline (days), and proposal description',
      });
    }

    const bid = await Bid.create({
      project: projectId,
      freelancer: req.user._id,
      amount: Number(amount),
      deliveryDays: Number(deliveryDays),
      proposal,
      githubPortfolio: githubPortfolio || req.user.githubUrl || '',
      attachment: attachment || { url: '', name: '', fileId: '' },
      status: 'pending',
    });

    // Update bidCount on project
    await Project.findByIdAndUpdate(projectId, { $inc: { bidCount: 1 } });

    const populatedBid = await Bid.findById(bid._id).populate('freelancer', 'name email avatar headline ratingsAverage githubUrl');

    // Notify project client
    const { sendNotification } = require('../services/notificationService');
    const io = req.app.get('io');
    await sendNotification({
      recipient: project.client,
      sender: req.user._id,
      type: 'bid_received',
      title: 'New Bid Received 🎯',
      message: `${req.user.name} submitted a bid of ₹${Number(amount).toLocaleString('en-IN')} on "${project.title}".`,
      link: `/project/${project._id}`,
      projectId: project._id,
      meta: { bidId: bid._id, amount: Number(amount) },
      io,
    });

    res.status(201).json({
      success: true,
      bid: populatedBid,
      message: 'Your proposal was submitted successfully!',
    });
  } catch (error) {
    console.error('Submit bid error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already submitted a proposal for this project' });
    }
    res.status(500).json({ success: false, message: error.message || 'Error submitting proposal' });
  }
});

// @route   GET /api/bids/projects/:projectId, /api/bids/projects/:projectId/bids
// @desc    Get all bids for a given project
router.get(['/projects/:projectId/bids', '/projects/:projectId'], optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const bids = await Bid.find({ project: projectId })
      .populate('freelancer', 'name email avatar headline bio skills hourlyRate ratingsAverage ratingsCount completedProjectsCount githubUrl')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bids.length,
      bids,
    });
  } catch (error) {
    console.error('Fetch bids error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving proposals' });
  }
});

// @route   DELETE /api/bids/:id
// @desc    Withdraw a pending bid
router.delete('/:id', protect, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (bid.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to withdraw this proposal' });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot withdraw an accepted or rejected proposal' });
    }

    const projectId = bid.project;
    await bid.deleteOne();
    await Project.findByIdAndUpdate(projectId, { $inc: { bidCount: -1 } });

    res.json({
      success: true,
      message: 'Proposal withdrawn successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error withdrawing proposal' });
  }
});

module.exports = router;
