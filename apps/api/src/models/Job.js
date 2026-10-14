import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true },
    templateId: { type: String, required: true },
    status: {
      type: String,
      enum: ['CREATED', 'UPLOADING', 'QUEUED', 'PROCESSING', 'NEEDS_REVIEW', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED'],
      default: 'CREATED'
    },
    source: { type: String, enum: ['upload', 'api'], default: 'upload' },
    fileCount: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    failureReason: { type: String, default: null },
    retries: { type: Number, default: 0 },
    queueName: { type: String, default: 'docuflow-processing' },
    invoiceNumber: { type: String, default: null },
    vendorName: { type: String, default: null },
    totalAmount: { type: String, default: null },
    reviewStatus: { type: String, default: 'pending_review' },
    exportPath: { type: String, default: null },
    reviewSummary: { type: String, default: null }
  },
  { timestamps: true }
);

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
export default Job;
