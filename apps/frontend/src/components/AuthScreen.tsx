import { useState } from 'react';
import { ArrowRight, Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { login, register } from '../lib/api';

type AuthMode = 'login' | 'register';

const demoCredentials = {
  email: 'owner@docuflow.ai',
  password: 'Password123!'
};

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState({
    email: demoCredentials.email,
    password: demoCredentials.password,
    firstName: 'Alicia',
    lastName: 'Morgan'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password
        });
      }

      onAuthenticated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
            <Sparkles className="h-4 w-4" />
            AI invoice extraction platform
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Turn supplier invoices into trusted spreadsheet data.
          </h1>

          <p className="mt-4 max-w-lg text-lg text-slate-300">
            DocuFlow AI captures OCR, AI extraction, validation, and human review in a single, auditable workflow.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <FeatureTile icon={Building2} title="Workspaces" text="Organize supplier processing by team or tenant." />
            <FeatureTile icon={ShieldCheck} title="Validation" text="Explicitly flag missing, inconsistent, or uncertain values." />
            <FeatureTile icon={ArrowRight} title="Exports" text="Deliver XLSX and CSV output with review history." />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="mb-6 flex rounded-xl border border-slate-700 bg-slate-950/70 p-1">
              {(['login', 'register'] as AuthMode[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    mode === entry ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => setMode(entry)}
                >
                  {entry === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={submit}>
              {mode === 'register' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="First name"
                    value={form.firstName}
                    onChange={(value) => setForm({ ...form, firstName: value })}
                  />
                  <InputField
                    label="Last name"
                    value={form.lastName}
                    onChange={(value) => setForm({ ...form, lastName: value })}
                  />
                </div>
              )}

              <InputField
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />

              <InputField
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
              />

              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-400">
              Demo login: {demoCredentials.email} / {demoCredentials.password}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureTile({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 inline-flex rounded-lg bg-cyan-500/10 p-2 text-cyan-300">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
      />
    </label>
  );
}
