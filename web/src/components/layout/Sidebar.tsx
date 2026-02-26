import { NavLink } from "react-router-dom";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { DocumentIcon } from "@/components/icons/DocumentIcon";

const nav = [
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/prazos", label: "Prazos", Icon: CalendarIcon },
  { to: "/publicacoes", label: "Publicações", Icon: DocumentIcon },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-primary/30 bg-primary lg:block">
      <div className="flex min-h-[8.5rem] items-center justify-center border-b border-primary-foreground/20 px-3 py-3">
        <img
          src="/logo.png"
          alt="Lourenço & Najm - Sociedade de Advogados"
          className="h-24 w-full max-w-[240px] object-contain object-center"
        />
      </div>
      <nav className="space-y-0.5 p-4">
        {nav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
