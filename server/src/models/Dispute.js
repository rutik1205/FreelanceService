const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    respondent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Please provide dispute reason category'],
      enum: [
        'Deliverable not according to requirements',
        'Repository incomplete or missing documentation',
        'Missed deadline without communication',
        'Refusal to release escrow payment',
        'Code quality or plagiarized work',
        'Other dispute',
      ],
      default: 'Deliverable not according to requirements',
    },
    explanation: {
      type: String,
      required: [true, 'Please explain the issue in detail'],
      maxlength: [3000, 'Explanation cannot exceed 3000 characters'],
    },
    evidenceUrls: [
      {
        name: { type: String },
        url: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_refund_client', 'resolved_release_freelancer', 'cancelled'],
      default: 'open',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

disputeSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
