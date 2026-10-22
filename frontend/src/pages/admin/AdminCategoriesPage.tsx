import { useState } from 'react';
import { adminApi, storesApi } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { CATEGORY_ICONS, categoryIcon, pluralise } from '../../lib/format';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  Textarea,
  useToast,
} from '../../components/ui';
import type { Category } from '../../types';

const ICON_CHOICES = Object.keys(CATEGORY_ICONS);

export function AdminCategoriesPage() {
  const toast = useToast();
  const { data: categories, loading, reload } = useAsyncData(() => storesApi.categories(), []);
  const { data: facets } = useAsyncData(() => storesApi.facets(), []);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setIcon(ICON_CHOICES[0]);
    setError(null);
    setCreating(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setIcon(category.icon ?? ICON_CHOICES[0]);
    setError(null);
    setCreating(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, { name, description: description || undefined, icon });
        toast.show('Category updated');
      } else {
        await adminApi.createCategory({ name, description: description || undefined, icon });
        toast.show('Category created');
      }
      setCreating(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this category');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      toast.show('Category deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this category');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const countFor = (category: Category) =>
    facets?.categories.find((entry) => entry.id === category.id)?.storeCount ?? category.storeCount ?? 0;

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Store categories</h2>
          <p className="text-sm text-slate-600">
            Categories group stores in the directory. A category can only be deleted when no stores use it.
          </p>
        </div>
        <Button onClick={openCreate}>+ New category</Button>
      </Card>

      {loading && !categories ? (
        <LoadingBlock label="Loading categories..." />
      ) : categories?.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.items.map((category) => (
            <Card key={category.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl" aria-hidden="true">
                  {categoryIcon(category.icon)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">{category.name}</p>
                  <p className="truncate text-xs text-slate-500">/stores?category={category.slug}</p>
                </div>
              </div>
              <p className="clamp-2 text-sm text-slate-600">{category.description || 'No description provided.'}</p>
              <p className="text-xs text-slate-500">{pluralise(countFor(category), 'store')} in this category</p>
              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => setDeleteTarget(category)}
                  disabled={countFor(category) > 0}
                  title={countFor(category) > 0 ? 'Move its stores to another category first' : undefined}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon="🏷️" title="No categories yet" description="Create your first category to organise the directory." action={<Button onClick={openCreate}>+ New category</Button>} />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? `Edit ${editing.name}` : 'New category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={name.trim().length < 2}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={200}
          />
          <div>
            <p className="field-label">Icon</p>
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setIcon(choice)}
                  aria-label={choice}
                  aria-pressed={icon === choice}
                  className={
                    icon === choice
                      ? 'flex h-11 w-11 items-center justify-center rounded-xl border-2 border-accent-500 bg-accent-50 text-xl'
                      : 'flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl hover:border-slate-400'
                  }
                >
                  {CATEGORY_ICONS[choice]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'category'}?`}
        description="Stores keep working, but they will appear as uncategorised until you assign a new category."
        confirmLabel="Delete category"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default AdminCategoriesPage;
