import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Church {
  id: string;
  name: string;
}

interface AssignUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string | null;
    church_id: string | null;
    church_name: string | null;
    roles: AppRole[];
  } | null;
  churches: Church[];
  onSubmit: (data: { userId: string; fullName: string; role: AppRole; churchId: string | null }) => Promise<void>;
  isLoading?: boolean;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "tesoureiro", label: "Tesoureiro" },
  { value: "pastor", label: "Pastor" },
  { value: "lider", label: "Líder" },
  { value: "user", label: "Usuário" },
];

export function AssignUserDialog({ open, onOpenChange, user, churches, onSubmit, isLoading }: AssignUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [churchId, setChurchId] = useState<string>("none");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setRole(user.roles[0] || "user");
      setChurchId(user.church_id || "none");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await onSubmit({ 
      userId: user.id, 
      fullName, 
      role, 
      churchId: churchId === "none" ? null : churchId 
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Edite as informações, cargo e associação à igreja do usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select value={role} onValueChange={(value: AppRole) => setRole(value)}>
                <SelectTrigger id="role">
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

            <div className="space-y-2">
              <Label htmlFor="church">Igreja</Label>
              <Select value={churchId} onValueChange={setChurchId}>
                <SelectTrigger id="church">
                  <SelectValue placeholder="Selecione uma igreja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem igreja associada</SelectItem>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
