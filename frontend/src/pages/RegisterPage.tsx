import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { fieldErrorMap } from '../lib/endpoints';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Card, Checkbox, Input, cn } from '../components/ui';
import type { Role } from '../types';

const ROLE_CHOICES: { value: Role; title: string; description: string }[] = [
  {
    value: 'CUSTOMER',
    title: 'Customer',
    description: 'Discover stores, write reviews and build your review history.',
  },
  {
    value: 'STORE_OWNER',
    title: 'Store owner',
    description: 'Create and customise storefronts, then reply to customer reviews.',
  },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'STORE_OWNER' ? 'STORE_OWNER' : 'CUSTOMER';

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirm) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (!agree) {
      setError('Please confirm that your reviews will be honest and based on real experiences.');
      return;
    }

    setBusy(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, role, city: city.trim() || undefined });
      navigate(role === 'STORE_OWNER' ? '/owner' : '/account', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(fieldErrorMap(err.errors));
      } else {
        setError('Could not create your account. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell grid gap-10 py-12 lg:grid-cols-[1fr_380px] lg:py-20">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join MultiStore as a customer or as a store owner. You can always add a store later.
        </p>

        <Card className="mt-8">
          <form onSubmit={submit} className="space-y-5" noValidate>
            {error && <Alert tone="error">{error}</Alert>}

            <fieldset>
              <legend className="field-label">I am joining as</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className={cn(
                      'cursor-pointer rounded-xl border p-4 transition-colors',
                      role === choice.value
                        ? 'border-accent-500 bg-accent-50 ring-1 ring-accent-300'
                        : 'border-slate-300 bg-white hover:border-slate-400',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      value={choice.value}
                      checked={role === choice.value}
                      onChange={() => setRole(choice.value)}
                    />
                    <span className="block text-sm font-semibold text-navy-900">{choice.title}</span>
                    <span className="mt-1 block text-xs text-slate-600">{choice.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Input
              label="Full name"
              required
              value={name}
              error={fieldErrors.name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              error={fieldErrors.email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Input
              label="City (optional)"
              value={city}
              error={fieldErrors.city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Bengaluru"
              autoComplete="address-level2"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
              hint="At least 8 characters, including a letter and a number."
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              required
              value={confirm}
              error={fieldErrors.confirmPassword}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />

            <Checkbox
              checked={agree}
              onChange={(event) => setAgree(event.target.checked)}
              label="My reviews will be honest and based on real experiences I have had."
            />

            <Button type="submit" fullWidth size="lg" loading={busy}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-accent-600 hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What happens next</h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                1
              </span>
              {role === 'STORE_OWNER' ? (
                <span>Create your store. It is submitted for admin approval before it goes public.</span>
              ) : (
                <span>Browse the directory and find stores worth visiting.</span>
              )}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                2
              </span>
              {role === 'STORE_OWNER' ? (
                <span>Customise colours, logo, banner and gallery from the owner dashboard.</span>
              ) : (
                <span>Leave a 1-5 star rating and written feedback on stores you have visited.</span>
              )}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                3
              </span>
              {role === 'STORE_OWNER' ? (
                <span>Reply to reviews and watch your rating analytics update live.</span>
              ) : (
                <span>Manage your review history - edit or delete your reviews any time.</span>
              )}
            </li>
          </ol>
        </Card>

        <Card className="border-accent-200 bg-accent-50">
          <h2 className="text-sm font-semibold text-navy-900">Why accounts are required</h2>
          <p className="mt-2 text-sm text-slate-700">
            Reviews are tied to a verified account, which keeps ratings trustworthy. Repeat submissions are blocked
            automatically, and every review can be reported for moderation.
          </p>
        </Card>
      </aside>
    </div>
  );
}

export default RegisterPage;
