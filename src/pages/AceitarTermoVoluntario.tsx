import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Check, X, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVolunteerStatus, PendingInvite } from "@/hooks/useVolunteerStatus";
import { useCommitmentTerm } from "@/hooks/useCommitmentTerm";
import { CommitmentTermDialog } from "@/components/schedules/CommitmentTermDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

export default function AceitarTermoVoluntario() {
  const navigate = useNavigate();
  const { pendingInvites, isLoading: statusLoading, acceptTerm, declineInvite } = useVolunteerStatus();
  const { activeTerm, isLoading: termLoading, ensureDefaultTerm } = useCommitmentTerm();

  const [selectedInvite, setSelectedInvite] = useState<PendingInvite | null>(null);
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState<string | null>(null);

  // Ensure default term exists
  useEffect(() => {
    if (!termLoading && !activeTerm) {
      ensureDefaultTerm();
    }
  }, [termLoading, activeTerm, ensureDefaultTerm]);

  // If no pending invites, redirect to escalas
  useEffect(() => {
    if (!statusLoading && pendingInvites.length === 0) {
      navigate("/app/escalas");
    }
  }, [statusLoading, pendingInvites, navigate]);

  const handleAcceptClick = (invite: PendingInvite) => {
    setSelectedInvite(invite);
    setShowTermDialog(true);
  };

  const handleAcceptTerm = async () => {
    if (!selectedInvite || !activeTerm) return;

    setIsAccepting(true);
    try {
      await acceptTerm(selectedInvite.id, activeTerm.version);
      toast.success("Termo aceito com sucesso! Você agora é voluntário.");
      setShowTermDialog(false);
      setSelectedInvite(null);
      
      // If no more pending invites, navigate to escalas
      if (pendingInvites.length <= 1) {
        navigate("/app/escalas");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao aceitar termo");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setIsDeclining(inviteId);
    try {
      await declineInvite(inviteId);
      toast.success("Convite recusado");
      
      // If no more pending invites, navigate to dashboard
      if (pendingInvites.length <= 1) {
        navigate("/app/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao recusar convite");
    } finally {
      setIsDeclining(null);
    }
  };

  if (statusLoading || termLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Convites de Voluntariado</h1>
          <p className="text-muted-foreground">
            Você recebeu {pendingInvites.length} convite(s) para ser voluntário(a)
          </p>
        </div>

        <div className="space-y-4">
          {pendingInvites.map((invite) => (
            <Card key={invite.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{invite.ministry_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{invite.church_name}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pendente</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Convidado por:</strong> {invite.invited_by_name}
                  </p>
                  <p>
                    <strong>Data do convite:</strong>{" "}
                    {format(parseISO(invite.invited_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleDecline(invite.id)}
                    disabled={isDeclining === invite.id}
                  >
                    {isDeclining === invite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Recusar
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleAcceptClick(invite)}
                  >
                    <Check className="h-4 w-4" />
                    Aceitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>

      {/* Commitment Term Dialog */}
      <CommitmentTermDialog
        open={showTermDialog}
        onOpenChange={setShowTermDialog}
        term={activeTerm}
        ministryName={selectedInvite?.ministry_name || ""}
        onAccept={handleAcceptTerm}
        onDecline={() => {
          setShowTermDialog(false);
          setSelectedInvite(null);
        }}
        isLoading={isAccepting}
      />
    </div>
  );
}
