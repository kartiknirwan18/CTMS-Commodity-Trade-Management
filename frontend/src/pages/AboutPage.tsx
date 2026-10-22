import { ButtonLink, Card } from '../components/ui';

const STEPS = [
  {
    title: 'Store owners register and build a storefront',
    body: 'Owners sign up, create a store with a unique slug, upload a logo, banner and gallery, describe their opening hours and pick their own brand colours.',
  },
  {
    title: 'An admin reviews and approves the store',
    body: 'New stores start life as Pending. A super admin approves, rejects or suspends them. Only approved and published stores appear in the public directory.',
  },
  {
    title: 'Customers review stores they visited',
    body: 'Registered customers leave a 1-5 star rating plus written feedback. Average rating, review count and the 1-5 distribution update instantly.',
  },
  {
    title: 'Every review lands on the central dashboard',
    body: 'The review dashboard at /reviews pulls reviews from all approved stores into one searchable, filterable feed - no hardcoded data anywhere.',
  },
  {
    title: 'Owners reply, admins moderate',
    body: 'Owners see their own reviews and can reply. Admins can hide or restore reviews from the moderation queue, and every report is tracked.',
  },
];

export function AboutPage() {
  return (
    <div className="page-shell py-12 sm:py-16">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-200">
          How MultiStore works
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy-900">
          A multi-vendor directory with reviews you can trust
        </h1>
        <p className="mt-3 text-base text-slate-600">
          MultiStore separates platform branding from store branding. The platform keeps a consistent navy-and-cyan
          experience, while each storefront can apply its own colours, logo and layout.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-accent-400">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-semibold text-navy-900">{step.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Roles</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-navy-900">Super Admin</dt>
                <dd className="text-slate-600">Approves stores, moderates reviews, manages users and categories.</dd>
              </div>
              <div>
                <dt className="font-semibold text-navy-900">Store Owner</dt>
                <dd className="text-slate-600">
                  Manages only their own storefronts: content, theme, gallery, reviews and analytics.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-navy-900">Customer</dt>
                <dd className="text-slate-600">Writes, edits and deletes their own reviews, and can report reviews.</dd>
              </div>
              <div>
                <dt className="font-semibold text-navy-900">Public visitor</dt>
                <dd className="text-slate-600">Browses stores and reviews; must register to leave a review.</dd>
              </div>
            </dl>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <h2 className="text-sm font-semibold text-navy-900">About "verified visit" badges</h2>
            <p className="mt-2 text-sm text-slate-700">
              MultiStore only shows a verified badge when a visit is genuinely verifiable. There is no purchase or
              check-in integration yet, so reviews are stored as unverified rather than faking a badge.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Try it now</h2>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonLink to="/stores" fullWidth variant="outline">
                Browse the store directory
              </ButtonLink>
              <ButtonLink to="/reviews" fullWidth variant="outline">
                Open the review dashboard
              </ButtonLink>
              <ButtonLink to="/register?role=STORE_OWNER" fullWidth>
                List your store
              </ButtonLink>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default AboutPage;
