import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Baby, 
  Shield, 
  History, 
  Bell, 
  Calendar,
  Megaphone,
  LogOut,
  Menu,
  ChevronLeft,
  User
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements } from "@/hooks/useAnnouncements";

interface ParentLayoutProps {
  children: ReactNode;
}

const sidebarNavItems = [
  { href: "/parent", label: "Início", icon: Home },
  { href: "/parent/children", label: "Meus Filhos", icon: Baby },
  { href: "/parent/announcements", label: "Comunicados", icon: Megaphone },
  { href: "/parent/events", label: "Eventos", icon: Calendar },
  { href: "/parent/authorizations", label: "Autorizações", icon: Shield },
  { href: "/parent/history", label: "Histórico", icon: History },
];

// Bottom navigation for mobile - most important items
const bottomNavItems = [
  { href: "/parent", label: "Início", icon: Home },
  { href: "/parent/announcements", label: "Avisos", icon: Megaphone, hasBadge: true },
  { href: "/parent/events", label: "Eventos", icon: Calendar },
  { href: "/parent/authorizations", label: "Autorizar", icon: Shield },
  { href: "/parent/history", label: "Histórico", icon: History },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate">{profile?.full_name || "Responsável"}</h2>
            <p className="text-sm text-muted-foreground">Portal do Responsável</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="flex flex-col gap-1">
          {sidebarNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/parent" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
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
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Ir para App Principal
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
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
  const { unreadCount } = useAnnouncements();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg safe-area-pb lg:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/parent" && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 px-2 transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                {item.hasBadge && unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ParentLayout({ children }: ParentLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <NavContent />
      </aside>

      {/* Mobile Header + Sidebar */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-lg px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <NavContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Portal do Responsável</h1>
        </header>

        {/* Main Content - with bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
}
