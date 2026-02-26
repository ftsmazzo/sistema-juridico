import { NavLink } from "react-router-dom";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { DashboardIcon } from "@/components/icons/DashboardIcon";

const nav = [
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/prazos", label: "Prazos", Icon: CalendarIcon },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Agenda Prazos
        </span>
      </div>
      <nav className="space-y-0.5 p-4">
        {nav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon size={20} className="shrink-0 opacity-90" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
