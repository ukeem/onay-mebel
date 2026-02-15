"use client";

import { AuthGuard } from "@/components/auth-guard";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useForceLogout } from "@/hooks/use-force-logout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  BookOpen,
  FolderKanban,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useForceLogout();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  const navItems = [
    {
      href: "/dashboard/projects",
      label: t("nav.projects"),
      icon: FolderKanban,
    },
    { href: "/dashboard/settings", label: t("nav.settings"), icon: Settings },
  ];

  const adminNavItems = [
    { href: "/dashboard/catalog", label: t("nav.catalog"), icon: BookOpen },
    { href: "/dashboard/users", label: t("nav.users"), icon: Users },
  ];

  const isAdmin = user?.role === "SUPER" || user?.role === "ADMIN";

  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    logout();
    toast.success(t("auth.success.logout"));
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Desktop: aside left navigation */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background md:flex">
          <div className="flex h-14 items-center border-b px-6">
            <Logo />
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {allNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <div className="mb-2 text-xs text-muted-foreground truncate">
              {user?.phone}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {t("auth.logout")}
              </Button>
              <LocaleSwitcher />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={t("common.toggleTheme")}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile: top header */}
        <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b bg-background px-4 md:hidden">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("common.toggleTheme")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("auth.logout")}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="pt-12 pb-20 md:pt-0 md:pb-0 md:pl-64">
          <div className="p-4 md:p-6">{children}</div>
        </main>

        {/* Mobile: fixed bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t bg-background md:hidden">
          {allNavItems.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] leading-tight transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthGuard>
  );
}
