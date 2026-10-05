const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Client
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Freelancer (can be assigned once freelancer is selected)
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: [1, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    type: {
      type: String,
      enum: ['full_project', 'milestone'],
      default: 'full_project',
    },
    transactionReference: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['created', 'held_in_escrow', 'released', 'refunded', 'disputed'],
      default: 'created',
    },
    protectionNote: {
      type: String,
      default: 'Funds safely held under SkillDesk Payment Protection until work approval.',
    },
    escrowNote: {
      type: String,
      default: 'Funds safely held under SkillDesk Payment Protection until work approval.',
    },
    fundedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    disputedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ project: 1, payer: 1, payee: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
