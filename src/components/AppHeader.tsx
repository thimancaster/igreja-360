import { Bell, LogOut, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function AppHeader() {
  const { user, profile, signOut } = useAuth(); // Obter profile do AuthContext
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, isMarkingAsRead } = useNotifications();

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-foreground" />
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold">Bem-vindo, {profile?.full_name || user?.user_metadata?.full_name || "Usuário"}</h2>
            <p className="text-sm text-muted-foreground">Gerencie as finanças com clareza</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-xs text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    disabled={isMarkingAsRead}
                    className="h-auto px-2 py-1 text-xs text-primary"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[200px]">
                {isLoading ? (
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : notifications && notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start space-y-1 cursor-pointer"
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <p className="text-sm font-medium leading-none">{notification.message}</p>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at || new Date()), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <p className="p-2 text-sm text-muted-foreground text-center">
                    Nenhuma notificação
                  </p>
                )}
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-primary">
                <Mail className="mr-2 h-4 w-4" />
                <span>Ver todas as notificações</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name ? getInitials(profile.full_name) : (user?.email ? getInitials(user.email) : "U")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || user?.user_metadata?.full_name || "Usuário"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}