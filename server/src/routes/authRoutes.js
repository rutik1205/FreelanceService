const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'skilldesk_jwt_secret_dev_2024_change_in_production', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'freelancer',
    });

    const token = signToken(user._id);

    const userSafe = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      headline: user.headline,
      bio: user.bio,
      skills: user.skills,
      hourlyRate: user.hourlyRate,
      githubUrl: user.githubUrl,
      ratingsAverage: user.ratingsAverage,
    };

    res.status(201).json({
      success: true,
      token,
      user: userSafe,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);

    const userSafe = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      headline: user.headline,
      bio: user.bio,
      skills: user.skills,
      hourlyRate: user.hourlyRate,
      githubUrl: user.githubUrl,
      portfolioUrl: user.portfolioUrl,
      ratingsAverage: user.ratingsAverage,
      ratingsCount: user.ratingsCount,
      completedProjectsCount: user.completedProjectsCount,
      postedProjectsCount: user.postedProjectsCount,
    };

    res.json({
      success: true,
      token,
      user: userSafe,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user data' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, headline, bio, skills, hourlyRate, githubUrl, portfolioUrl, avatar, role } = req.body;

    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (headline !== undefined) fieldsToUpdate.headline = headline;
    if (bio !== undefined) fieldsToUpdate.bio = bio;
    if (skills !== undefined) {
      fieldsToUpdate.skills = Array.isArray(skills)
        ? skills
        : skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (hourlyRate !== undefined) fieldsToUpdate.hourlyRate = Number(hourlyRate) || 0;
    if (githubUrl !== undefined) fieldsToUpdate.githubUrl = githubUrl;
    if (portfolioUrl !== undefined) fieldsToUpdate.portfolioUrl = portfolioUrl;
    if (avatar !== undefined) fieldsToUpdate.avatar = avatar;
    if (role && ['client', 'freelancer', 'both'].includes(role)) fieldsToUpdate.role = role;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating profile' });
  }
});

// @route   GET /api/auth/freelancers
// @desc    Get list of freelancers
router.get('/freelancers', async (req, res) => {
  try {
    const { skill, search } = req.query;
    const filter = { role: { $in: ['freelancer', 'both'] } };

    if (skill) {
      filter.skills = { $regex: skill, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    const rawFreelancers = await User.find(filter)
      .select('-email -password')
      .sort({ ratingsAverage: -1, completedProjectsCount: -1 })
      .limit(30)
      .lean();

    const freelancerIds = rawFreelancers.map((f) => f._id);
    const allReviews = await Review.find({ freelancer: { $in: freelancerIds } })
      .populate('client', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    const reviewsMap = {};
    for (const r of allReviews) {
      const fid = r.freelancer.toString();
      if (!reviewsMap[fid]) reviewsMap[fid] = [];
      reviewsMap[fid].push(r);
    }

    const freelancers = rawFreelancers.map((f) => {
      const devReviews = reviewsMap[f._id.toString()] || [];
      const totalStars = devReviews.reduce((sum, rev) => sum + rev.rating, 0);
      const computedAvg = devReviews.length > 0 ? Number((totalStars / devReviews.length).toFixed(1)) : 0;

      return {
        ...f,
        reviews: devReviews,
        ratingsCount: devReviews.length,
        ratingsAverage: computedAvg,
      };
    });

    res.json({
      success: true,
      count: freelancers.length,
      freelancers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving freelancers' });
  }
});

module.exports = router;
