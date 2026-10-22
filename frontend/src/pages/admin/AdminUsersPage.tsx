import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/endpoints';
import { useAsyncData, useDebouncedValue } from '../../hooks/useAsyncData';
import { ROLE_LABELS, formatDate } from '../../lib/format';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  Pagination,
  Select,
  cn,
  statusToneName,
  useToast,
} from '../../components/ui';
import { assetUrl } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { AdminUserRow, Role, UserStatus } from '../../types';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'STORE_OWNER', label: 'Store Owner' },
  { value: 'CUSTOMER', label: 'Customer' },
];

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(searchDraft, 350);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);

  useEffect(() => setPage(1), [role, status, debounced]);

  const { data, loading, error: loadError, reload } = useAsyncData(
    () =>
      adminApi.users({
        role: (role || undefined) as Role | undefined,
        status: (status || undefined) as UserStatus | undefined,
        search: debounced || undefined,
        page,
        pageSize: 10,
      }),
    [role, status, debounced, page],
    { keepPrevious: true },
  );

  const setUserStatus = async (user: AdminUserRow, next: UserStatus) => {
    setBusyId(user.id);
    setError(null);
    try {
      await adminApi.setUserStatus(user.id, next);
      toast.show(`${user.name} ${next === 'SUSPENDED' ? 'suspended' : 'reactivated'}`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this account');
    } finally {
      setBusyId(null);
    }
  };

  const setUserRole = async (user: AdminUserRow, next: Role) => {
    setBusyId(user.id);
    setError(null);
    try {
      await adminApi.setUserRole(user.id, next);
      toast.show(`${user.name} is now a ${ROLE_LABELS[next]}`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change this role');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast.show('Account deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this account');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Card className="flex flex-wrap items-end gap-3">
        <Input
          containerClassName="flex-1 min-w-[220px]"
          label="Search users"
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Name or email address"
        />
        <Select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ]}
        />
        <p className="ml-auto pb-2 text-sm text-slate-500">
          {loading && !data ? 'Loading...' : `${data?.total ?? 0} account${data?.total === 1 ? '' : 's'}`}
        </p>
      </Card>

      {loading && !data ? (
        <LoadingBlock label="Loading accounts..." />
      ) : data?.items.length ? (
        <>
          <div className={cn('space-y-3', loading && 'opacity-60')}>
            {data.items.map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <Card key={user.id} className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Avatar name={user.name} src={assetUrl(user.avatarUrl)} size={44} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-navy-900">{user.name}</p>
                        <Badge tone={user.role === 'SUPER_ADMIN' ? 'accent' : user.role === 'STORE_OWNER' ? 'info' : 'neutral'}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        <Badge tone={statusToneName(user.status)}>{user.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Badge>
                        {isSelf && <Badge tone="warning">You</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {user.email}
                        {user.city ? ` · ${user.city}` : ''} · joined {formatDate(user.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.counts.reviews} reviews · {user.counts.stores} stores
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={user.role}
                      disabled={isSelf || busyId === user.id}
                      onChange={(event) => setUserRole(user, event.target.value as Role)}
                      options={ROLE_OPTIONS}
                    />
                    {user.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSelf || busyId === user.id}
                        onClick={() => setUserStatus(user, 'SUSPENDED')}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busyId === user.id} onClick={() => setUserStatus(user, 'ACTIVE')}>
                        Reactivate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      disabled={isSelf || busyId === user.id}
                      onClick={() => setDeleteTarget(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="👥" title="No accounts match this filter" description="Try a different role or search term." />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'account'}?`}
        description="This permanently removes the account along with its stores, reviews and replies. This cannot be undone."
        confirmLabel="Delete account"
        loading={Boolean(busyId)}
        onConfirm={deleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default AdminUsersPage;
