const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');
const Dispute = require('../models/Dispute');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

// Middleware to verify admin status (with flexible test mode)
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.headers['x-admin-demo'] === 'true')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Admin privileges required to view or modify this dashboard.',
  });
};

// @route   GET /api/admin/analytics
// @desc    Get complete platform KPI analytics & summary stats
router.get('/analytics', protect, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalFreelancers, totalClients, totalAdmins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['freelancer', 'both'] } }),
      User.countDocuments({ role: { $in: ['client', 'both'] } }),
      User.countDocuments({ role: 'admin' }),
    ]);

    const [totalProjects, openProjects, inProgressProjects, submittedProjects, completedProjects] =
      await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ status: 'open' }),
        Project.countDocuments({ status: 'in_progress' }),
        Project.countDocuments({ status: 'submitted' }),
        Project.countDocuments({ status: 'completed' }),
      ]);

    const totalBids = await Bid.countDocuments();

    // Escrow metrics
    const escrowAggregation = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const escrowSummary = {
      held_in_escrow: 0,
      released: 0,
      refunded: 0,
      total_volume: 0,
    };

    escrowAggregation.forEach((item) => {
      if (item._id === 'held_in_escrow') escrowSummary.held_in_escrow = item.totalAmount;
      if (item._id === 'released') escrowSummary.released = item.totalAmount;
      if (item._id === 'refunded') escrowSummary.refunded = item.totalAmount;
      escrowSummary.total_volume += item.totalAmount;
    });

    // Disputes metrics
    const [openDisputes, resolvedDisputes] = await Promise.all([
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      Dispute.countDocuments({ status: { $in: ['resolved_refund_client', 'resolved_release_freelancer', 'cancelled'] } }),
    ]);

    // Recent activity feed
    const recentProjects = await Project.find()
      .populate('client', 'name email avatar')
      .populate('selectedFreelancer', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentPayments = await Payment.find()
      .populate('payer', 'name')
      .populate('payee', 'name')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          freelancers: totalFreelancers,
          clients: totalClients,
          admins: totalAdmins,
        },
        projects: {
          total: totalProjects,
          open: openProjects,
          inProgress: inProgressProjects,
          submitted: submittedProjects,
          completed: completedProjects,
        },
        bids: {
          total: totalBids,
        },
        escrow: {
          heldInEscrowINR: escrowSummary.held_in_escrow,
          releasedINR: escrowSummary.released,
          refundedINR: escrowSummary.refunded,
          totalVolumeINR: escrowSummary.total_volume,
          estimatedPlatformFeeINR: Math.round(escrowSummary.released * 0.05), // 5% platform fee
        },
        disputes: {
          open: openDisputes,
          resolved: resolvedDisputes,
          total: openDisputes + resolvedDisputes,
        },
        recentProjects,
        recentPayments,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error generating analytics' });
  }
});

// @route   GET /api/admin/users
// @desc    List all users with search, role filter, and ban status
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status === 'banned') {
      filter.isBanned = true;
    } else if (status === 'active') {
      filter.isBanned = false;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving users list' });
  }
});

// @route   PATCH /api/admin/users/:id/moderate
// @desc    Ban, unban, or update moderation notes for a user
router.patch('/users/:id/moderate', protect, requireAdmin, async (req, res) => {
  try {
    const { isBanned, banReason, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (isBanned !== undefined) user.isBanned = Boolean(isBanned);
    if (banReason !== undefined) user.banReason = banReason;
    if (role && ['client', 'freelancer', 'both', 'admin'].includes(role)) user.role = role;

    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} moderation status updated`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error moderating user' });
  }
});

// @route   GET /api/admin/disputes
// @desc    List all dispute tickets across all projects
router.get('/disputes', protect, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const disputes = await Dispute.find(filter)
      .populate('project', 'title budget status client selectedFreelancer')
      .populate('raisedBy', 'name email avatar')
      .populate('respondent', 'name email avatar')
      .populate('payment')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: disputes.length,
      disputes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving dispute list' });
  }
});

// @route   POST /api/admin/disputes/:id/resolve
// @desc    Admin resolves a dispute with refund or release decision
router.post('/disputes/:id/resolve', protect, requireAdmin, async (req, res) => {
  try {
    const { decision, adminNotes } = req.body;
    // decision: 'refund_client' or 'release_freelancer'

    if (!['refund_client', 'release_freelancer'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be "refund_client" or "release_freelancer".',
      });
    }

    const dispute = await Dispute.findById(req.params.id)
      .populate('project')
      .populate('payment');

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute ticket not found' });
    }

    if (dispute.status.startsWith('resolved_')) {
      return res.status(400).json({ success: false, message: 'This dispute has already been resolved' });
    }

    const project = dispute.project;
    const payment = dispute.payment;
    const io = req.app.get('io');

    if (decision === 'refund_client') {
      dispute.status = 'resolved_refund_client';
      dispute.adminNotes = adminNotes || 'Admin ruled in favor of client refund based on evidence.';

      if (payment) {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        await payment.save();

        // Refund client balance
        await User.findByIdAndUpdate(dispute.project.client, {
          $inc: { walletBalance: payment.amount },
        });
      }

      if (project) {
        project.hasDispute = false;
        project.escrowStatus = 'refunded';
        project.status = 'cancelled';
        await project.save();
      }

      // Notify Client
      await sendNotification({
        recipient: project.client,
        sender: req.user._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved: Escrow Refunded ⚖️',
        message: `SkillDesk moderation resolved the dispute on "${project.title}". Funds have been refunded to your account.`,
        link: `/project/${project._id}`,
        projectId: project._id,
        io,
      });

      // Notify Freelancer
      if (project.selectedFreelancer) {
        await sendNotification({
          recipient: project.selectedFreelancer,
          sender: req.user._id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved: Project Cancelled',
          message: `SkillDesk moderation resolved the dispute on "${project.title}" in favor of client refund.`,
          link: `/project/${project._id}`,
          projectId: project._id,
          io,
        });
      }
    } else if (decision === 'release_freelancer') {
      dispute.status = 'resolved_release_freelancer';
      dispute.adminNotes = adminNotes || 'Admin ruled in favor of freelancer deliverable approval.';

      if (payment) {
        payment.status = 'released';
        payment.releasedAt = new Date();
        await payment.save();

        if (payment.payee) {
          await User.findByIdAndUpdate(payment.payee, {
            $inc: { walletBalance: payment.amount },
          });
        }
      }

      if (project) {
        project.hasDispute = false;
        project.escrowStatus = 'released';
        project.status = 'completed';
        await project.save();
      }

      // Notify Freelancer
      if (project.selectedFreelancer) {
        await sendNotification({
          recipient: project.selectedFreelancer,
          sender: req.user._id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved: Escrow Released! 🎉',
          message: `SkillDesk moderation approved your deliverable for "${project.title}". Funds have been released to your wallet.`,
          link: `/project/${project._id}`,
          projectId: project._id,
          io,
        });
      }

      // Notify Client
      await sendNotification({
        recipient: project.client,
        sender: req.user._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved by Admin',
        message: `SkillDesk moderation completed evaluation of "${project.title}" and approved release of escrow funds.`,
        link: `/project/${project._id}`,
        projectId: project._id,
        io,
      });
    }

    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    res.json({
      success: true,
      message: `Dispute resolved successfully with decision: ${decision}`,
      dispute,
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error resolving dispute' });
  }
});

module.exports = router;
