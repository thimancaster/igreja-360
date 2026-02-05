import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InviteVolunteerData } from "@/hooks/useDepartmentVolunteers";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InviteVolunteerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministryId: string;
  onInvite: (data: InviteVolunteerData) => Promise<any>;
  isLoading: boolean;
}

export function InviteVolunteerDialog({
  open,
  onOpenChange,
  ministryId,
  onInvite,
  isLoading,
}: InviteVolunteerDialogProps) {
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'select' | 'manual'>('select');
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("membro");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Fetch members for selection
  const { data: members } = useQuery({
    queryKey: ["members-for-invite"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, email, phone")
        .eq("church_id", profile.church_id)
        .eq("status", "active")
        .order("full_name");

      if (error) return [];
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  // Fetch profiles (users) for selection
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-invite"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("church_id", profile.church_id)
        .order("full_name");

      if (error) return [];
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  const handleSubmit = async () => {
    setError("");

    if (mode === 'select') {
      if (!selectedMemberId) {
        setError("Selecione um membro");
        return;
      }

      // Find selected member/profile
      const member = members?.find(m => m.id === selectedMemberId);
      const profile = profiles?.find(p => p.id === selectedMemberId);

      if (!member && !profile) {
        setError("Membro não encontrado");
        return;
      }

      try {
        await onInvite({
          ministry_id: ministryId,
          profile_id: profile?.id,
          full_name: member?.full_name || profile?.full_name || "",
          email: member?.email || undefined,
          phone: member?.phone || undefined,
          role,
          notes: notes || undefined,
        });
        onOpenChange(false);
        resetForm();
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!fullName.trim()) {
        setError("Nome é obrigatório");
        return;
      }

      try {
        await onInvite({
          ministry_id: ministryId,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          notes: notes || undefined,
        });
        onOpenChange(false);
        resetForm();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetForm = () => {
    setMode('select');
    setSelectedMemberId("");
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("membro");
    setNotes("");
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Combine members and profiles for selection, avoiding duplicates
  const selectableItems = [
    ...(profiles || []).map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const })),
    ...(members || [])
      .filter(m => !profiles?.some(p => p.full_name === m.full_name))
      .map(m => ({ id: m.id, name: m.full_name, type: 'member' as const })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar Voluntário</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('select')}
            >
              Selecionar Membro
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('manual')}
            >
              Cadastrar Novo
            </Button>
          </div>

          {mode === 'select' ? (
            <div className="grid gap-2">
              <Label htmlFor="member">Membro</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {selectableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do voluntário"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma observação..."
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
