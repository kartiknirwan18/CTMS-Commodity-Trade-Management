import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { fieldErrorMap, storesApi, type StoreFormPayload } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { Alert, Card, LoadingBlock } from '../../components/ui';
import { StoreForm } from '../../components/StoreForm';

export function OwnerStoreCreatePage() {
  const navigate = useNavigate();
  const { data: categories, loading } = useAsyncData(() => storesApi.categories(), []);

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (payload: StoreFormPayload) => {
    setBusy(true);
    setServerError(null);
    setFieldErrors({});
    try {
      const { store } = await storesApi.create(payload);
      navigate(`/owner/stores/${store.id}`, {
        replace: true,
        state: { notice: 'Store submitted for approval. It will appear publicly once an admin approves it.' },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        setFieldErrors(fieldErrorMap(error.errors));
      } else {
        setServerError('Could not create the store. Please try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading categories..." />;

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Create a store</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Fill in your store details below. New stores are submitted as <strong>Pending</strong> and become publicly
          visible as soon as a platform admin approves them.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <StoreForm
            store={null}
            categories={categories?.items ?? []}
            busy={busy}
            serverError={serverError}
            fieldErrors={fieldErrors}
            submitLabel="Submit store for approval"
            onSubmit={submit}
            onCancel={() => navigate('/owner')}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Approval checklist</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>· A clear store name and category</li>
              <li>· A description customers can understand</li>
              <li>· A real street address and city</li>
              <li>· Working contact details</li>
              <li>· A logo and banner so your storefront looks complete</li>
            </ul>
          </Card>

          <Alert tone="info" title="You stay in control">
            You can edit every detail, change your colours and upload photos at any time after saving - even while the
            store is pending.
          </Alert>
        </aside>
      </div>
    </div>
  );
}

export default OwnerStoreCreatePage;
