import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShellLayout, Button, type AppShellNavItem } from "@zatgo/ui";
import { ClipboardList, LayoutDashboard, Moon, Settings, Shield, Sun } from "@zatgo/icons";
import { useThemeStore } from "@/store/theme";
import { useSessionStore } from "@/store/session";
import { logoutFromErpnext } from "@/lib/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const nav: AppShellNavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { href: "/projects", label: "Projects", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/approvals", label: "Approvals", icon: Shield },
  { href: "/connection", label: "Connection", icon: Settings },
];

export function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const connected = useSessionStore((s) => s.connected);
  const user = useSessionStore((s) => s.user);
  const fullName = useSessionStore((s) => s.fullName);
  const [version, setVersion] = useState("dev");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void window.zatgoDesktop?.getAppVersion().then(setVersion).catch(() => undefined);
  }, []);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logoutFromErpnext();
      toast.success("Signed out");
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppShellLayout
      productTitle="Tracker"
      nav={nav}
      pathname={pathname}
      renderLink={({ href, className, children, end }) => (
        <NavLink to={href} end={end} className={className}>
          {children}
        </NavLink>
      )}
      sidebarFooter={
        <>
          <p
            className="truncate font-medium text-[var(--color-foreground)]"
            title={fullName ?? user ?? undefined}
          >
            {connected ? fullName || user : "Not signed in"}
          </p>
          <p className="truncate">{connected ? "Connected" : "Not connected"}</p>
          <p>v{version}</p>
        </>
      }
      headerActions={
        <>
          <Button variant="outline" disabled={signingOut} onClick={() => void onSignOut()}>
            Sign out
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light")
            }
          >
            {mode === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            Theme: {mode}
          </Button>
        </>
      }
    >
      <Outlet />
    </AppShellLayout>
  );
}
