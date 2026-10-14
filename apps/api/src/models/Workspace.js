import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    ownerId: { type: String, required: true },
    members: [{ type: String }],
    settings: {
      invoiceTemplate: { type: String, default: 'supplier-invoice-v1' },
      fileSizeLimitMb: { type: Number, default: 25 },
      maxFilesPerJob: { type: Number, default: 20 }
    }
  },
  { timestamps: true }
);

const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
export default Workspace;
