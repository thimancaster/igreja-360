import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Church, Shield, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  pastor: "Pastor",
  tesoureiro: "Tesoureiro",
  lider: "Líder",
  user: "Membro",
  parent: "Responsável",
};

export default function PortalProfile() {
  const { user, profile } = useAuth();
  const { roles } = useRole();
  const { activeMinistries } = useVolunteerStatus();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Suas informações pessoais</p>
      </div>

      {/* Avatar & Name */}
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="h-20 w-20 border-2">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
              {profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{profile?.full_name || "Membro"}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Funções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-sm py-1.5 px-3">
                {roleLabels[role] || role}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ministry Memberships */}
      {activeMinistries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Church className="h-5 w-5" />
              Ministérios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMinistries.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{m.ministry_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                </div>
                {m.term_accepted_at && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Calendar className="h-3 w-3" />
                    Desde {format(new Date(m.term_accepted_at), "MM/yyyy", { locale: ptBR })}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
