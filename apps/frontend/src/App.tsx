import { useEffect, useState } from 'react';
import { BarChart3, FileSpreadsheet, FolderKanban, ShieldCheck, UploadCloud } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';
import { AuthScreen } from './components/AuthScreen';
import { createJob, getJob, getJobs, getMe, logout, presignUpload, type Job, type User } from './lib/api';

const metrics = [
  { label: 'Invoices processed', value: '24.8K', change: '+18.4%' },
  { label: 'Avg. extraction accuracy', value: '97.6%', change: '+2.3%' },
  { label: 'Review backlog', value: '143', change: '-11.8%' },
  { label: 'Export latency', value: '2.1m', change: '-0.6m' }
];

const workflow = [
  { title: 'Upload', description: 'Drag in PDFs, JPGs, and PNGs with checksum validation.', icon: UploadCloud },
  { title: 'Process', description: 'Queue extraction and OCR with job state tracking.', icon: FolderKanban },
  { title: 'Validate', description: 'Check arithmetic, missing values, and inconsistency flags.', icon: ShieldCheck },
  { title: 'Export', description: 'Deliver clean XLSX and CSV output for downstream use.', icon: FileSpreadsheet }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const syncUser = async () => {
    try {
      const me = await getMe();
      setUser(me);
      const nextJobs = await getJobs();
      setJobs(nextJobs);
    } catch {
      setUser(null);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void syncUser();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshJobs();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const refreshJobs = async () => {
    if (!user) return;

    try {
      const nextJobs = await getJobs();
      setJobs(nextJobs);
    } catch {
      setJobs([]);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300">
          Loading DocuFlow AI…
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={() => void syncUser()} />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">DocuFlow AI</p>
              <p className="text-xs text-slate-400">Document-to-Excel automation</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-6 text-sm text-slate-300">
              <Link to="/" className="hover:text-white">Overview</Link>
              <Link to="/jobs" className="hover:text-white">Jobs</Link>
              <Link to="/exports" className="hover:text-white">Exports</Link>
            </nav>

            <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span>{user.firstName || 'Operator'}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <section className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
                  <div>
                    <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
                      Supplier invoice automation
                    </span>
                    <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
                      Welcome back, {user.firstName || 'Operator'}.
                    </h1>
                    <p className="mt-5 max-w-xl text-lg text-slate-300">
                      DocuFlow AI combines OCR, AI extraction, validation, and human review to produce export-ready invoice records with explicit uncertainty handling.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <button className="rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-900 transition hover:bg-cyan-400">
                        Create job
                      </button>
                      <button className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800">
                        View dashboard
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-cyan-500/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-300">Processing overview</p>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">Healthy</span>
                    </div>
                    <div className="mt-8 grid gap-4">
                      {metrics.map((metric) => (
                        <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">{metric.label}</p>
                            <span className="text-xs text-emerald-300">{metric.change}</span>
                          </div>
                          <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-16">
                  <div className="mb-8 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Workflow</p>
                      <h2 className="mt-3 text-3xl font-semibold text-white">Built for invoice operations</h2>
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {workflow.map(({ icon: Icon, title, description }) => (
                      <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="mb-4 inline-flex rounded-lg bg-cyan-500/10 p-3 text-cyan-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <p className="mt-2 text-sm text-slate-400">{description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            }
          />
          <Route path="/jobs" element={<JobsPage jobs={jobs} workspaceId={user?.workspaceId ?? 'workspace-demo'} onRefresh={refreshJobs} />} />
          <Route path="/exports" element={<ExportsPage jobs={jobs} />} />
        </Routes>
      </main>
    </div>
  );
}

function JobsPage({ jobs, workspaceId, onRefresh }: { jobs: Job[]; workspaceId: string; onRefresh: () => Promise<void> }) {
  const [templateId, setTemplateId] = useState('supplier-invoice-v1');
  const [source, setSource] = useState<'upload' | 'api'>('upload');
  const [fileCount, setFileCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const selectedFiles = (document.getElementById('job-upload-input') as HTMLInputElement | null)?.files ?? [];
      const firstFile = selectedFiles[0];

      if (firstFile) {
        await presignUpload({
          filename: firstFile.name,
          contentType: firstFile.type || 'application/pdf',
          size: firstFile.size
        });
      }

      await createJob({
        workspaceId,
        templateId,
        fileCount: Math.max(1, fileCount || selectedFiles.length || 1),
        source
      });

      await onRefresh();
      const uploadInput = document.getElementById('job-upload-input') as HTMLInputElement | null;
      if (uploadInput) uploadInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h2 className="text-2xl font-semibold text-white">Create a job</h2>

        <form onSubmit={handleCreateJob} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block text-sm text-slate-300 xl:col-span-2">
            <span className="mb-1.5 block">Template</span>
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
            >
              <option value="supplier-invoice-v1">Supplier invoice v1</option>
              <option value="purchase-order-v1">Purchase order v1</option>
            </select>
          </label>

          <label className="block text-sm text-slate-300">
            <span className="mb-1.5 block">Source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as 'upload' | 'api')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
            >
              <option value="upload">Upload</option>
              <option value="api">API</option>
            </select>
          </label>

          <label className="block text-sm text-slate-300">
            <span className="mb-1.5 block">File count</span>
            <input
              type="number"
              min={1}
              max={20}
              value={fileCount}
              onChange={(event) => setFileCount(Number(event.target.value) || 1)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create job'}
            </button>
          </div>
        </form>

        <label className="mt-4 block text-sm text-slate-300">
          <span className="mb-1.5 block">Invoice documents</span>
          <input id="job-upload-input" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-slate-300" />
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h2 className="text-2xl font-semibold text-white">Recent jobs</h2>
        <div className="mt-6 space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">
              No jobs yet. Create your first invoice run above.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{job.templateId}</p>
                  <p className="text-sm text-slate-400">{job.fileCount} files · {new Date(job.createdAt ?? Date.now()).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
                    {job.status}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const details = await getJob(job.id);
                      setSelectedJob(details);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedJob && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Selected job</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
              <div><span className="text-slate-500">ID:</span> {selectedJob.id}</div>
              <div><span className="text-slate-500">Status:</span> {selectedJob.status}</div>
              <div><span className="text-slate-500">Files:</span> {selectedJob.fileCount}</div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 md:grid-cols-2">
              <div><span className="text-slate-500">Invoice #:</span> {selectedJob.invoiceNumber ?? 'Pending'}</div>
              <div><span className="text-slate-500">Vendor:</span> {selectedJob.vendorName ?? 'Pending'}</div>
              <div><span className="text-slate-500">Total:</span> {selectedJob.totalAmount ?? 'Pending'}</div>
              <div><span className="text-slate-500">Review:</span> {selectedJob.reviewStatus ?? 'pending_review'}</div>
            </div>

            {selectedJob.reviewSummary && (
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-cyan-200">
                {selectedJob.reviewSummary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExportsPage({ jobs }: { jobs: Job[] }) {
  const exports = jobs.length
    ? jobs.map((job, index) => ({
        id: job.id,
        name: `${job.templateId.replace(/-/g, '_')}_${job.id}.csv`,
        status: job.status === 'NEEDS_REVIEW' ? 'Ready for review' : job.status === 'PROCESSING' ? 'Generating' : 'Queued',
        index
      }))
    : [
        { id: 'empty', name: 'no_exports_yet.csv', status: 'No exports yet', index: 0 }
      ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="text-2xl font-semibold text-white">Export queue</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {exports.map((file) => (
          <div key={file.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="font-medium text-white">{file.name}</p>
            <p className="mt-2 text-sm text-slate-400">{file.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
