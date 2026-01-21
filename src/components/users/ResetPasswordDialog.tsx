import { useState } from "react";
import { Key, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userId: string;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
}

function generatePassword(length = 12): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%&*";
  const all = lowercase + uppercase + numbers + symbols;
  
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userName,
  userId,
  onSubmit,
  isLoading,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGeneratePassword = () => {
    const generated = generatePassword(12);
    setNewPassword(generated);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success("Senha copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }
    try {
      await onSubmit(userId, newPassword);
      setSuccess(true);
    } catch {
      // Error handled by parent
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setShowPassword(false);
    setCopied(false);
    setSuccess(false);
    onOpenChange(false);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Senha Atualizada
            </DialogTitle>
            <DialogDescription>
              A senha de <strong>{userName}</strong> foi atualizada com sucesso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted border">
              <Label className="text-xs text-muted-foreground">Nova Senha</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-lg font-mono bg-background p-2 rounded">
                  {newPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Copie e envie esta senha para o usuário. Recomende que ele altere a senha após o primeiro login.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Gerar Nova Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{userName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite ou gere uma senha"
                  className="pr-10"
                  minLength={8}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
          </div>

          {newPassword && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="w-full"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar Senha"}
            </Button>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || newPassword.length < 8}>
              {isLoading ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}