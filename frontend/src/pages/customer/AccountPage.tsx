import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, assetUrl } from '../../lib/api';
import { authApi, fieldErrorMap, reviewsApi } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { ROLE_LABELS, formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import {
  Alert,
  Avatar,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  Pagination,
  StatCard,
  Tabs,
  Textarea,
  useToast,
} from '../../components/ui';
import { ReviewCard } from '../../components/ReviewCard';

export function AccountPage() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<'profile' | 'reviews'>('reviews');
  const [page, setPage] = useState(1);

  const { data: meData, reload: reloadMe } = useAsyncData(() => authApi.me(), []);
  const { data: history, loading, reload: reloadHistory } = useAsyncData(
    () => reviewsApi.mine({ page, pageSize: 5 }),
    [page],
    { keepPrevious: true },
  );

  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFields, setProfileFields] = useState<Record<string, string>>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return <LoadingBlock />;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProfileError(null);
    setProfileFields({});
    try {
      const { user: updated } = await authApi.updateProfile({
        name: name.trim(),
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setUser(updated);
      toast.show('Profile updated');
      reloadMe();
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message);
        setProfileFields(fieldErrorMap(err.errors));
      } else {
        setProfileError('Could not save your profile');
      }
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setPasswordError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.show('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update your password');
    } finally {
      setBusy(false);
    }
  };

  const stats = meData?.stats;

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center gap-5">
        <Avatar name={user.name} src={assetUrl(user.avatarUrl)} size={64} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ROLE_LABELS[user.role]} · {user.email}
            {user.city ? ` · ${user.city}` : ''}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <ButtonLink to="/stores" variant="outline" size="sm">
            Browse stores
          </ButtonLink>
          <ButtonLink to="/reviews" variant="outline" size="sm">
            Review dashboard
          </ButtonLink>
        </div>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Reviews written" value={stats?.reviewCount ?? 0} icon="💬" />
        <StatCard label="Member since" value={formatDate(user.createdAt)} icon="📅" />
        <StatCard label="Stores owned" value={stats?.storeCount ?? 0} icon="🏬" />
      </div>

      <Tabs
        className="mb-6"
        active={tab}
        onChange={(id) => setTab(id as 'profile' | 'reviews')}
        tabs={[
          { id: 'reviews', label: 'My review history', count: stats?.reviewCount },
          { id: 'profile', label: 'Profile settings' },
        ]}
      />

      {tab === 'reviews' && (
        <section>
          {loading && !history ? (
            <LoadingBlock label="Loading your reviews..." />
          ) : history?.items.length ? (
            <>
              <div className="space-y-4">
                {history.items.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showStore
                    onChanged={() => {
                      reloadHistory();
                      reloadMe();
                    }}
                  />
                ))}
              </div>
              <Pagination
                className="mt-8"
                page={history.page}
                totalPages={history.totalPages}
                total={history.total}
                onChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          ) : (
            <EmptyState
              icon="✍️"
              title="You have not written any reviews yet"
              description="Find a store you have visited and share your experience - it takes a minute and helps other customers."
              action={<ButtonLink to="/stores">Find a store to review</ButtonLink>}
            />
          )}
        </section>
      )}

      {tab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-base font-semibold text-navy-900">Profile details</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your display name appears next to every review you write.
            </p>
            <form onSubmit={saveProfile} className="mt-5 space-y-4">
              {profileError && <Alert tone="error">{profileError}</Alert>}
              <Input
                label="Display name"
                required
                value={name}
                error={profileFields.name}
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                label="City"
                value={city}
                error={profileFields.city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Mumbai"
              />
              <Input
                label="Avatar image URL"
                value={avatarUrl}
                error={profileFields.avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
              />
              <Textarea
                label="Short bio"
                value={bio}
                error={profileFields.bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                maxLength={280}
                hint="Optional - helps store owners understand your context."
              />
              <p className="text-xs text-slate-500">
                Email address: <strong>{user.email}</strong> (contact support to change it)
              </p>
              <Button type="submit" loading={busy}>
                Save profile
              </Button>
            </form>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="text-base font-semibold text-navy-900">Change password</h2>
              <form onSubmit={changePassword} className="mt-5 space-y-4">
                {passwordError && <Alert tone="error">{passwordError}</Alert>}
                <Input
                  label="Current password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <Input
                  label="New password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  hint="At least 8 characters with a letter and a number."
                  autoComplete="new-password"
                />
                <Button type="submit" variant="outline" loading={busy}>
                  Update password
                </Button>
              </form>
            </Card>

            <Card className="border-accent-200 bg-accent-50">
              <h2 className="text-sm font-semibold text-navy-900">Review integrity</h2>
              <p className="mt-2 text-sm text-slate-700">
                You can write one review per store. Editing keeps your original date, and other customers can mark
                reviews as helpful. If you spot a review that breaks the rules, report it and a moderator will review
                it.
              </p>
              <Link to="/about" className="mt-3 inline-block text-sm font-semibold text-accent-700 hover:underline">
                Read how MultiStore works →
              </Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
