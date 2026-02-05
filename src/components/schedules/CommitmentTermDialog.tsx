import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FileText, Shield } from "lucide-react";
import { CommitmentTerm } from "@/hooks/useCommitmentTerm";
import ReactMarkdown from "react-markdown";

interface CommitmentTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: CommitmentTerm | null;
  ministryName: string;
  onAccept: () => Promise<void>;
  onDecline?: () => void;
  isLoading: boolean;
}

export function CommitmentTermDialog({
  open,
  onOpenChange,
  term,
  ministryName,
  onAccept,
  onDecline,
  isLoading,
}: CommitmentTermDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    try {
      await onAccept();
      setAccepted(false);
      setHasScrolledToEnd(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAccepted(false);
      setHasScrolledToEnd(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Termo de Compromisso de Voluntariado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Ministério: {ministryName}</p>
              <p className="text-xs text-muted-foreground">
                Leia atentamente o termo abaixo antes de aceitar
              </p>
            </div>
          </div>

          <ScrollArea 
            className="h-[300px] border rounded-lg p-4"
            onScroll={handleScroll}
          >
            {term ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{term.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Carregando termo...
              </div>
            )}
          </ScrollArea>

          {!hasScrolledToEnd && (
            <p className="text-xs text-muted-foreground text-center">
              Role até o final para poder aceitar o termo
            </p>
          )}

          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id="accept-term"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              disabled={!hasScrolledToEnd}
            />
            <label
              htmlFor="accept-term"
              className={`text-sm leading-relaxed cursor-pointer ${!hasScrolledToEnd ? 'text-muted-foreground' : ''}`}
            >
              Li, compreendi e aceito integralmente os termos acima descritos, declarando que minha 
              participação como voluntário(a) é de livre e espontânea vontade.
            </label>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Data do aceite:</strong> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p>
              <strong>Versão do termo:</strong> {term?.version || "1.0"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onDecline && (
            <Button variant="outline" onClick={onDecline}>
              Recusar Convite
            </Button>
          )}
          <Button
            onClick={handleAccept}
            disabled={!accepted || isLoading || !hasScrolledToEnd}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
