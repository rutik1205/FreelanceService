const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please enter a project title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide project details and requirements'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'Full Stack Development',
        'Web Frontend',
        'Backend & APIs',
        'Mobile App Development',
        'DevOps & Cloud',
        'UI/UX Design',
        'Database & Systems',
        'AI & Machine Learning',
      ],
      default: 'Full Stack Development',
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    budget: {
      type: Number,
      required: [true, 'Please enter a budget amount in INR (₹)'],
      min: [500, 'Budget must be at least ₹500'],
    },
    budgetType: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed',
    },
    deadline: {
      type: Date,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        fileId: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'in_progress', 'submitted', 'completed', 'cancelled'],
      default: 'open',
    },
    selectedFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    selectedBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    awardedAt: {
      type: Date,
    },
    // Escrow integration
    escrowPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    escrowStatus: {
      type: String,
      enum: ['unfunded', 'funded', 'released', 'refunded', 'disputed'],
      default: 'unfunded',
    },
    // Milestone-based contracts
    isMilestoneBased: {
      type: Boolean,
      default: false,
    },
    milestones: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        amount: { type: Number, required: true },
        dueDate: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'funded', 'in_progress', 'submitted', 'approved', 'disputed'],
          default: 'pending',
        },
        escrowPayment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payment',
          default: null,
        },
        submission: {
          githubUrl: { type: String, default: '', trim: true },
          liveDemoUrl: { type: String, default: '', trim: true },
          notes: { type: String, default: '' },
          submittedAt: { type: Date },
          codeQualityReport: { type: mongoose.Schema.Types.Mixed, default: null },
        },
        approvedAt: { type: Date },
      },
    ],
    // Dispute state
    hasDispute: {
      type: Boolean,
      default: false,
    },
    activeDispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
      default: null,
    },
    // Deliverable submission from freelancer (specifically GitHub repository link)
    submission: {
      githubUrl: {
        type: String,
        default: '',
        trim: true,
      },
      liveDemoUrl: {
        type: String,
        default: '',
        trim: true,
      },
      notes: {
        type: String,
        default: '',
      },
      submittedAt: {
        type: Date,
      },
      codeQualityReport: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      attachments: [
        {
          name: { type: String },
          url: { type: String },
        },
      ],
    },
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
      },
      reviewedAt: {
        type: Date,
      },
    },
    bidCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
