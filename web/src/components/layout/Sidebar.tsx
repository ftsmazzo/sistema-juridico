import { NavLink } from "react-router-dom";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { DocumentIcon } from "@/components/icons/DocumentIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { SettingsIcon } from "@/components/icons/SettingsIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { podeVerUsuarios, isGestor } from "@/lib/auth";

const baseNav = [
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/prazos", label: "Prazos", Icon: CalendarIcon },
  { to: "/publicacoes", label: "Publicações", Icon: DocumentIcon },
  { to: "/monitoramento-email", label: "Monitoramento de e-mail", Icon: MailIcon },
  { to: "/processos", label: "Processos", Icon: DocumentIcon },
];

export function Sidebar() {
  const nav = [
    ...baseNav,
    ...(podeVerUsuarios() ? [{ to: "/usuarios" as const, label: "Usuários" as const, Icon: UsersIcon }] : []),
    ...(isGestor() ? [{ to: "/administracao" as const, label: "Administração" as const, Icon: SettingsIcon }] : []),
  ];
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-[var(--sidebar-bg)] lg:block">
      <div className="flex min-h-[11rem] flex-col items-center justify-center border-b border-white/10 px-3 py-4">
        <img
          src="/logo.png"
          alt="Lourenço & Najm - Sociedade de Advogados"
          className="w-full max-w-[240px] object-contain object-center"
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
                  ? "bg-white/10 text-white"
                  : "text-white/85 hover:bg-white/5 hover:text-white"
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
