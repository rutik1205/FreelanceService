const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

// @route   GET /api/payments/config
// @desc    Get Payment Protection configuration status
router.get('/config', (req, res) => {
  res.json({
    success: true,
    provider: 'SkillDesk Payment Protection',
    currency: 'INR',
    protectionGuaranteed: true,
  });
});

// @route   POST /api/payments/deposit
// @desc    Deposit funds into SkillDesk Payment Protection
router.post('/deposit', protect, async (req, res) => {
  try {
    const { projectId, milestoneId, amount } = req.body;

    if (!projectId || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and amount' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only project client can deposit protected funds
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can fund Payment Protection' });
    }

    let milestone = null;
    if (milestoneId) {
      milestone = project.milestones.id(milestoneId);
      if (!milestone) {
        return res.status(404).json({ success: false, message: 'Milestone not found' });
      }
    }

    // Create payment record in Payment Protection status
    const payment = await Payment.create({
      project: project._id,
      milestoneId: milestone ? milestone._id : null,
      payer: req.user._id,
      payee: project.selectedFreelancer || null,
      amount: Number(amount),
      currency: 'INR',
      type: milestone ? 'milestone' : 'full_project',
      status: 'held_in_escrow',
      escrowNote: milestone
        ? `Protected Payment for Milestone: ${milestone.title}`
        : `Protected Payment for Project: ${project.title}`,
      fundedAt: new Date(),
    });

    // Update project state
    if (milestone) {
      milestone.status = 'funded';
      milestone.escrowPayment = payment._id;
    } else {
      project.escrowPayment = payment._id;
      project.escrowStatus = 'funded';
    }
    await project.save();

    // Dispatch notification to Freelancer if assigned
    const io = req.app.get('io');
    if (project.selectedFreelancer) {
      await sendNotification({
        recipient: project.selectedFreelancer,
        sender: req.user._id,
        type: 'payment_funded',
        title: 'Payment Protection Funded (₹ INR)',
        message: `Client deposited ₹${payment.amount.toLocaleString('en-IN')} into Payment Protection for "${project.title}". Your payment is protected until the project is completed and approved!`,
        link: `/project/${project._id}`,
        projectId: project._id,
        meta: { amount: payment.amount },
        io,
      });
    }

    res.json({
      success: true,
      payment,
      message: `₹${payment.amount.toLocaleString('en-IN')} deposited safely under SkillDesk Payment Protection!`,
    });
  } catch (error) {
    console.error('Deposit payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error depositing funds' });
  }
});

// @route   POST /api/payments/create-order
// @desc    Compatibility alias for Payment Protection deposit
router.post('/create-order', protect, async (req, res) => {
  try {
    const { projectId, milestoneId, amount } = req.body;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const payment = await Payment.create({
      project: project._id,
      milestoneId: milestoneId || null,
      payer: req.user._id,
      payee: project.selectedFreelancer || null,
      amount: Number(amount),
      currency: 'INR',
      type: milestoneId ? 'milestone' : 'full_project',
      status: 'created',
      escrowNote: `Protected Payment for ${project.title}`,
    });

    res.json({
      success: true,
      order: {
        id: `order_${Date.now()}`,
        amount: Number(amount) * 100,
        currency: 'INR',
        isDirect: true,
      },
      paymentId: payment._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/payments/verify
// @desc    Compatibility alias for confirming payment protection
router.post('/verify', protect, async (req, res) => {
  try {
    const { paymentId, projectId, milestoneId, amount } = req.body;
    let payment = paymentId ? await Payment.findById(paymentId) : null;

    if (!payment && projectId) {
      const project = await Project.findById(projectId);
      payment = await Payment.create({
        project: project._id,
        milestoneId: milestoneId || null,
        payer: req.user._id,
        payee: project.selectedFreelancer || null,
        amount: Number(amount || project.budget),
        currency: 'INR',
        type: milestoneId ? 'milestone' : 'full_project',
        status: 'created',
      });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    payment.status = 'held_in_escrow';
    payment.fundedAt = new Date();
    await payment.save();

    const project = await Project.findById(payment.project);
    if (project) {
      if (payment.milestoneId) {
        const milestone = project.milestones.id(payment.milestoneId);
        if (milestone) {
          milestone.status = 'funded';
          milestone.escrowPayment = payment._id;
        }
      } else {
        project.escrowPayment = payment._id;
        project.escrowStatus = 'funded';
      }
      await project.save();
    }

    res.json({
      success: true,
      payment,
      message: `₹${payment.amount.toLocaleString('en-IN')} deposited safely under SkillDesk Payment Protection!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/payments/:id/release
// @desc    Client or Admin releases protected funds to freelancer
router.post('/:id/release', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const project = await Project.findById(payment.project);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Associated project not found' });
    }

    const isOwner = project.client.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only client or admin can release protected funds' });
    }

    if (payment.status !== 'held_in_escrow') {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be released from status '${payment.status}'`,
      });
    }

    // Release to freelancer
    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();

    // Increment freelancer wallet balance
    if (payment.payee) {
      await User.findByIdAndUpdate(payment.payee, {
        $inc: { walletBalance: payment.amount },
      });
    }

    // Update project or milestone state
    if (payment.milestoneId) {
      const milestone = project.milestones.id(payment.milestoneId);
      if (milestone) {
        milestone.status = 'approved';
      }
    } else {
      project.escrowStatus = 'released';
    }
    await project.save();

    // Send real-time notification
    const io = req.app.get('io');
    if (payment.payee) {
      await sendNotification({
        recipient: payment.payee,
        sender: req.user._id,
        type: 'payment_released',
        title: 'Protected Payment Released! 💰',
        message: `₹${payment.amount.toLocaleString('en-IN')} has been released from Payment Protection to your SkillDesk wallet for "${project.title}".`,
        link: `/project/${project._id}`,
        projectId: project._id,
        meta: { amount: payment.amount },
        io,
      });
    }

    res.json({
      success: true,
      payment,
      message: 'Payment Protection funds released successfully to freelancer wallet.',
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error releasing payment' });
  }
});

// @route   GET /api/payments/project/:projectId
// @desc    Get all protected payments for a project
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ project: req.params.projectId })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving payments' });
  }
});

// @route   GET /api/payments/my-transactions
// @desc    Get user transaction ledger (client deposits & freelancer earnings)
router.get('/my-transactions', protect, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }],
    })
      .populate('project', 'title budget status')
      .populate('payer', 'name avatar')
      .populate('payee', 'name avatar')
      .sort({ createdAt: -1 });

    const user = await User.findById(req.user._id).select('walletBalance escrowBalance');

    res.json({
      success: true,
      count: payments.length,
      walletBalance: user ? user.walletBalance || 0 : 0,
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving transactions' });
  }
});

module.exports = router;
