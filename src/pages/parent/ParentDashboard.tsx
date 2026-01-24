import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Baby, Clock, MapPin, Bell, Plus, User, History } from "lucide-react";
import { useParentChildren, useParentPresentChildren } from "@/hooks/useParentData";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Link } from "react-router-dom";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ParentDashboard() {
  const { data: children, isLoading: loadingChildren } = useParentChildren();
  const { data: presentChildren, isLoading: loadingPresent } = useParentPresentChildren();

  if (loadingChildren || loadingPresent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getTimePresent = (checkedInAt: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkedInAt));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal do Responsável</h1>
          <p className="text-muted-foreground">
            Acompanhe seus filhos e gerencie autorizações
          </p>
        </div>
      </div>

      {/* Alert for present children */}
      {presentChildren && presentChildren.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Filhos Presentes Agora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {presentChildren.map((checkIn: any) => (
              <div key={checkIn.id} className="flex items-center justify-between rounded-lg border bg-background p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={checkIn.children?.photo_url || undefined} />
                    <AvatarFallback>
                      {checkIn.children?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{checkIn.children?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{checkIn.children?.classroom}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimePresent(checkIn.checked_in_at)}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entrada: {format(new Date(checkIn.checked_in_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Children list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children && children.length > 0 ? (
          children.map((child: any) => (
            <Card key={child.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={child.photo_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {child.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{child.full_name}</CardTitle>
                    <CardDescription>{child.classroom}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {child.is_primary && (
                    <Badge variant="default">Responsável Principal</Badge>
                  )}
                  {child.can_pickup && (
                    <Badge variant="outline">Pode Retirar</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/parent/children/${child.id}`}>
                      <User className="mr-2 h-4 w-4" />
                      Detalhes
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/parent/authorizations?childId=${child.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Autorizar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Baby className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Nenhum filho vinculado</p>
              <p className="text-muted-foreground">
                Entre em contato com a liderança para vincular seus filhos ao seu cadastro.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/parent/authorizations">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Nova Autorização</p>
                <p className="text-sm text-muted-foreground">Autorizar terceiro a buscar</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/parent/history">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-secondary/50 p-3">
                <History className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Histórico</p>
                <p className="text-sm text-muted-foreground">Ver presenças anteriores</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/parent/notifications">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-accent p-3">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Notificações</p>
                <p className="text-sm text-muted-foreground">Configurar alertas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </motion.div>
  );
}
