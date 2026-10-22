import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { ButtonLink, EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="page-shell py-20">
      <EmptyState
        icon="🧭"
        title="Page not found"
        description="The page you were looking for has moved or never existed. Try the store directory or the review dashboard."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/">Back to home</ButtonLink>
            <ButtonLink to="/stores" variant="outline">
              Browse stores
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}

/** Router-level error boundary rendered by React Router's `errorElement`. */
export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <div className="page-shell py-20">
      <EmptyState
        icon="⚠️"
        title="Something went wrong"
        description={message}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/" variant="outline">
              Back to home
            </ButtonLink>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center rounded-xl bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800"
            >
              Reload page
            </button>
          </div>
        }
      />
    </div>
  );
}

export default NotFoundPage;
