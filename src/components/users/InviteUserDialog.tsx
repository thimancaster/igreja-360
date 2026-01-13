import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Church {
  id: string;
  name: string;
}

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churches: Church[];
  defaultChurchId: string | null;
  onSubmit: (data: { email: string; fullName: string; role: AppRole; churchId: string }) => Promise<void>;
  isLoading?: boolean;
  isAdmin?: boolean;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "tesoureiro", label: "Tesoureiro" },
  { value: "pastor", label: "Pastor" },
  { value: "lider", label: "Líder" },
  { value: "user", label: "Usuário" },
];

export function InviteUserDialog({ 
  open, 
  onOpenChange, 
  churches, 
  defaultChurchId,
  onSubmit, 
  isLoading,
  isAdmin = false
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [churchId, setChurchId] = useState<string>(defaultChurchId || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchId) return;
    await onSubmit({ email, fullName, role, churchId });
    // Reset form on success
    setEmail("");
    setFullName("");
    setRole("user");
    if (defaultChurchId) setChurchId(defaultChurchId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail("");
      setFullName("");
      setRole("user");
      if (defaultChurchId) setChurchId(defaultChurchId);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para adicionar um novo membro.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteFullName">Nome Completo</Label>
              <Input
                id="inviteFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole">Cargo</Label>
              <Select value={role} onValueChange={(value: AppRole) => setRole(value)}>
                <SelectTrigger id="inviteRole">
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && churches.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="inviteChurch">Igreja</Label>
                <Select value={churchId} onValueChange={setChurchId}>
                  <SelectTrigger id="inviteChurch">
                    <SelectValue placeholder="Selecione uma igreja" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((church) => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !email || !fullName || !churchId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
