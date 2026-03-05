import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useVolunteerAnnouncements } from "@/hooks/useVolunteerAnnouncements";
import {
  Home,
  Calendar,
  Bell,
  User,
  Baby,
  LogOut,
  Menu,
  ChevronLeft,
  Megaphone,
  CalendarDays,
} from "lucide-react";

interface PortalLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/portal", label: "Início", icon: Home },
  { href: "/portal/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/portal/escalas", label: "Escalas", icon: Calendar },
  { href: "/portal/comunicados", label: "Comunicados", icon: Megaphone },
  { href: "/portal/filhos", label: "Meus Filhos", icon: Baby },
  { href: "/portal/perfil", label: "Meu Perfil", icon: User },
];

const bottomNavItems = [
  { href: "/portal", label: "Início", icon: Home },
  { href: "/portal/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/portal/comunicados", label: "Avisos", icon: Megaphone, hasBadge: true },
  { href: "/portal/filhos", label: "Filhos", icon: Baby },
  { href: "/portal/perfil", label: "Perfil", icon: User },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header with gradient */}
      <div className="bg-gradient-to-br from-primary to-secondary p-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-white/30 shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
              {profile?.full_name?.[0] || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white truncate">{profile?.full_name || "Membro"}</h2>
            <p className="text-sm text-white/70">Portal do Membro</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/portal" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4 space-y-2">
        <Link to="/app/dashboard" onClick={onNavigate}>
          <Button variant="outline" className="w-full justify-start gap-3 rounded-xl">
            <ChevronLeft className="h-4 w-4" />
            Ir para App Principal
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

function BottomNavigation() {
  const location = useLocation();
  const { unreadCount: parentUnread } = useAnnouncements();
  const { unreadCount: volunteerUnread } = useVolunteerAnnouncements();
  const totalUnread = (parentUnread || 0) + (volunteerUnread || 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-area-pb lg:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/portal" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 px-2 transition-all relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                {item.hasBadge && totalUnread > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </Badge>
                )}
              </div>
              <span className={cn("text-[10px]", isActive ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 border-r bg-card lg:block">
        <NavContent />
      </aside>

      {/* Mobile */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header - minimal, transparent */}
        <header className="sticky top-0 z-40 flex h-12 items-center gap-4 bg-background/60 backdrop-blur-xl px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <NavContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-sm font-semibold text-muted-foreground">Portal do Membro</h1>
        </header>

        <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>

        <BottomNavigation />
      </div>
    </div>
  );
}
