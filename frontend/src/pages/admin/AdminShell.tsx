import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../components/ui';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/stores', label: 'Store approvals' },
  { to: '/admin/reviews', label: 'Review moderation' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/categories', label: 'Categories' },
];

export function AdminShell() {
  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-accent-300">
          Super admin
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Platform administration</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Approve stores, moderate customer reviews, resolve reports, manage accounts and organise categories. Every
          action here is recorded against the real database.
        </p>
      </header>

      <nav className="scrollbar-thin mb-8 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Admin sections">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                '-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-accent-500 text-navy-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-navy-800',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}

export default AdminShell;
