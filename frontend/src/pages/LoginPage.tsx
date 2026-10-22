import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { fieldErrorMap } from '../lib/endpoints';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Card, Input } from '../components/ui';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@multistore.test', password: 'Admin@12345' },
  { role: 'Store Owner', email: 'priya@multistore.test', password: 'Owner@12345' },
  { role: 'Customer', email: 'customer@multistore.test', password: 'Customer@12345' },
];

function dashboardFor(role: string) {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'STORE_OWNER') return '/owner';
  return '/account';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const account = await login(email.trim(), password);
      navigate(redirectTo ?? dashboardFor(account.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(fieldErrorMap(err.errors));
      } else {
        setError('Could not sign you in. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="page-shell grid gap-10 py-12 lg:grid-cols-2 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to review stores, manage your storefront or moderate the platform.
        </p>

        <Card className="mt-8">
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && <Alert tone="error">{error}</Alert>}
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              error={fieldErrors.email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" fullWidth loading={busy} size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            New to MultiStore?{' '}
            <Link to="/register" className="font-semibold text-accent-600 hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Card className="bg-navy-900 text-white">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-300">Demo accounts</h2>
          <p className="mt-2 text-sm text-slate-300">
            The seed script creates these accounts so you can try every role. Click one to fill the form.
          </p>
          <ul className="mt-5 space-y-3">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => quickFill(account)}
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-left ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">{account.role}</p>
                  <p className="mt-1 text-sm font-medium text-white">{account.email}</p>
                  <p className="text-xs text-slate-400">{account.password}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
