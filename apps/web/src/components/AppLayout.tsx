import { Compass, MapPin, Plus, UserRound, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router";

const tabs = [
  { to: "/", label: "Today", icon: MapPin, end: true },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/roadmaps/new", label: "Create", icon: Plus },
  { to: "/circles", label: "Circles", icon: Users },
  { to: "/me", label: "Me", icon: UserRound },
];

/** ログイン後の画面の枠。PC は上部ヘッダー、スマホ幅は下部タブ */
export function AppLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "text-accent" : "text-muted hover:text-ink";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 hidden border-b border-line bg-paper/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <NavLink to="/" className="font-serif text-xl">Readtree</NavLink>
          <nav className="flex gap-6 text-sm">
            {tabs.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${linkClass({ isActive })}`}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
