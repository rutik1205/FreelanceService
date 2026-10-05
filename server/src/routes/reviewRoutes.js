const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

// @route   GET /api/reviews/freelancer/:freelancerId
// @desc    Get all unique reviews for a specific freelancer
router.get('/freelancer/:freelancerId', async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const freelancer = await User.findById(freelancerId).select('name avatar headline ratingsAverage ratingsCount');
    if (!freelancer) {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    const reviews = await Review.find({ freelancer: freelancerId })
      .populate('client', 'name avatar')
      .populate('project', 'title budget')
      .sort({ createdAt: -1 });

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const calculatedAvg = reviews.length > 0 ? Number((total / reviews.length).toFixed(1)) : 0;

    res.json({
      success: true,
      count: reviews.length,
      ratingsAverage: calculatedAvg,
      ratingsCount: reviews.length,
      reviews,
      freelancer,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Error retrieving reviews' });
  }
});

// @route   POST /api/reviews
// @desc    Submit a review for a specific freelancer
router.post('/', protect, async (req, res) => {
  try {
    const { freelancerId, projectId, rating, feedback } = req.body;

    if (!freelancerId || !rating || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Freelancer ID, rating (1-5), and feedback text are required',
      });
    }

    if (req.user._id.toString() === freelancerId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot review your own profile' });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    let projectTitle = '';
    if (projectId) {
      const existingProjectReview = await Review.findOne({
        freelancer: freelancerId,
        client: req.user._id,
        project: projectId,
      });
      if (existingProjectReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a review for this project',
        });
      }

      const project = await Project.findById(projectId);
      if (project) {
        projectTitle = project.title;
      }
    } else {
      // Prevent rapid duplicate clicks from the same client
      const recentReview = await Review.findOne({
        freelancer: freelancerId,
        client: req.user._id,
        feedback: feedback.trim(),
      });
      if (recentReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this review for this developer',
        });
      }
    }

    const newReview = await Review.create({
      freelancer: freelancerId,
      client: req.user._id,
      project: projectId || null,
      projectTitle,
      rating: Number(rating),
      feedback: feedback.trim(),
    });

    // Recalculate average rating exclusively for this freelancer
    const allReviews = await Review.find({ freelancer: freelancerId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const newAverage = Number((totalRating / allReviews.length).toFixed(1));

    freelancer.ratingsAverage = newAverage;
    freelancer.ratingsCount = allReviews.length;
    await freelancer.save();

    // Populate client details for immediate frontend display
    const populated = await Review.findById(newReview._id).populate('client', 'name avatar');

    // Notify the freelancer of the new review
    await sendNotification({
      recipient: freelancerId,
      sender: req.user._id,
      type: 'bid_received',
      title: 'New Review Received! ⭐',
      message: `${req.user.name} left you a ${rating}-star review: "${feedback.trim().substring(0, 80)}..."`,
      link: '/talent',
      req,
    });

    res.status(201).json({
      success: true,
      review: populated,
      ratingsAverage: newAverage,
      ratingsCount: allReviews.length,
      message: 'Review posted successfully',
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ success: false, message: error.message || 'Error submitting review' });
  }
});

module.exports = router;
