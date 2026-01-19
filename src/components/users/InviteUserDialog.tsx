import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, UserPlus, Key, Copy, Check } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  onSubmit: (data: { 
    email: string; 
    fullName: string; 
    role: AppRole; 
    churchId: string;
    directRegistration?: boolean;
    temporaryPassword?: string;
  }) => Promise<void>;
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

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

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
  const [directRegistration, setDirectRegistration] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchId) return;
    
    try {
      await onSubmit({ 
        email, 
        fullName, 
        role, 
        churchId,
        directRegistration,
        temporaryPassword: directRegistration ? temporaryPassword : undefined
      });
      
      if (directRegistration) {
        setShowCredentials(true);
      } else {
        resetForm();
      }
    } catch (error) {
      // Error handled by parent
    }
  };

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("user");
    setDirectRegistration(false);
    setTemporaryPassword("");
    setShowCredentials(false);
    setCopiedEmail(false);
    setCopiedPassword(false);
    if (defaultChurchId) setChurchId(defaultChurchId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleGeneratePassword = () => {
    setTemporaryPassword(generatePassword());
  };

  const copyToClipboard = async (text: string, type: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (showCredentials) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <DialogTitle>Usuário Cadastrado!</DialogTitle>
                <DialogDescription>
                  Copie as credenciais abaixo e envie ao usuário.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Alert className="bg-muted">
            <AlertDescription className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={email} readOnly className="font-mono text-sm" />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => copyToClipboard(email, 'email')}
                  >
                    {copiedEmail ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Senha Temporária</Label>
                <div className="flex items-center gap-2">
                  <Input value={temporaryPassword} readOnly className="font-mono text-sm" />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => copyToClipboard(temporaryPassword, 'password')}
                  >
                    {copiedPassword ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Recomende ao usuário trocar a senha no primeiro acesso.
              </p>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
                <DialogTitle>{directRegistration ? "Cadastrar Usuário" : "Convidar Novo Usuário"}</DialogTitle>
                <DialogDescription>
                  {directRegistration 
                    ? "Cadastre diretamente com uma senha temporária." 
                    : "Envie um convite por email para adicionar um novo membro."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Toggle for Direct Registration */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="directReg" className="text-sm font-medium">Cadastro Direto</Label>
                <p className="text-xs text-muted-foreground">
                  Criar conta sem enviar email de convite
                </p>
              </div>
              <Switch
                id="directReg"
                checked={directRegistration}
                onCheckedChange={setDirectRegistration}
              />
            </div>

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

            {directRegistration && (
              <div className="space-y-2">
                <Label htmlFor="tempPassword">Senha Temporária</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tempPassword"
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-9"
                      minLength={8}
                      required={directRegistration}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                    Gerar
                  </Button>
                </div>
              </div>
            )}

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
            <Button 
              type="submit" 
              disabled={isLoading || !email || !fullName || !churchId || (directRegistration && temporaryPassword.length < 8)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {directRegistration ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
