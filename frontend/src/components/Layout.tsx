import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { assetUrl } from '../lib/api';
import { ROLE_LABELS } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Avatar, ButtonLink, cn } from './ui';

const PUBLIC_LINKS = [
  { to: '/stores', label: 'Stores' },
  { to: '/reviews', label: 'Review Dashboard' },
  { to: '/about', label: 'About' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-navy-50 text-navy-900' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900',
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-sm font-black text-accent-400">
        MS
      </span>
      <span className="text-base font-bold tracking-tight text-navy-900">
        Multi<span className="text-accent-600">Store</span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const dashboardPath = user.role === 'SUPER_ADMIN' ? '/admin' : user.role === 'STORE_OWNER' ? '/owner' : '/account';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} src={assetUrl(user.avatarUrl)} size={32} />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-navy-800 sm:block">{user.name}</span>
        <span className="text-xs text-slate-400" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float"
        >
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {user.role === 'SUPER_ADMIN' ? 'Admin console' : user.role === 'STORE_OWNER' ? 'Owner dashboard' : 'My account'}
          </Link>
          <Link to="/reviews" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Review dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/');
            }}
            className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="page-shell grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            A multi-vendor directory where local stores get discovered and customer reviews stay honest.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy-900">Discover</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/stores" className="hover:text-accent-600">
                Store directory
              </Link>
            </li>
            <li>
              <Link to="/reviews" className="hover:text-accent-600">
                Review dashboard
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent-600">
                How it works
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy-900">For owners</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/register?role=STORE_OWNER" className="hover:text-accent-600">
                List your store
              </Link>
            </li>
            <li>
              <Link to="/owner" className="hover:text-accent-600">
                Owner dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy-900">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/login" className="hover:text-accent-600">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-accent-600">
                Create account
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5">
        <p className="page-shell text-xs text-slate-500">
          © {new Date().getFullYear()} MultiStore Review Platform. Platform branding is separate from store branding.
        </p>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const dashboardPath = user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'STORE_OWNER' ? '/owner' : '/account';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="page-shell flex h-16 items-center gap-4">
          <Brand />

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <NavLink to={dashboardPath} className={navLinkClass}>
                {user?.role === 'SUPER_ADMIN' ? 'Admin' : user?.role === 'STORE_OWNER' ? 'My stores' : 'My reviews'}
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <ButtonLink to="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/register" size="sm">
                  Get started
                </ButtonLink>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-lg p-2 text-navy-800 hover:bg-slate-100 md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {PUBLIC_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <NavLink to={dashboardPath} className={navLinkClass}>
                  {user?.role === 'SUPER_ADMIN' ? 'Admin console' : user?.role === 'STORE_OWNER' ? 'Owner dashboard' : 'My account'}
                </NavLink>
              ) : (
                <div className="mt-2 flex gap-2">
                  <ButtonLink to="/login" variant="outline" size="sm" className="flex-1">
                    Sign in
                  </ButtonLink>
                  <ButtonLink to="/register" size="sm" className="flex-1">
                    Get started
                  </ButtonLink>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
