import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, FileDown, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIntegrations } from "@/hooks/useIntegrations";
import { usePublicSheetIntegrations } from "@/hooks/usePublicSheetIntegrations";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate();
  const { integrations: googleIntegrations, syncIntegration: syncGoogle } = useIntegrations();
  const { integrations: publicIntegrations, syncIntegration: syncPublic } = usePublicSheetIntegrations();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAll = async () => {
    const googleCount = googleIntegrations?.length || 0;
    const publicCount = publicIntegrations?.length || 0;
    const totalCount = googleCount + publicCount;

    if (totalCount === 0) {
      toast({
        title: "Nenhuma integração",
        description: "Configure uma planilha primeiro em Integrações.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Sync Google integrations
      if (googleIntegrations && googleIntegrations.length > 0) {
        for (const integration of googleIntegrations) {
          try {
            await syncGoogle.mutateAsync(integration.id);
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      // Sync Public Sheet integrations
      if (publicIntegrations && publicIntegrations.length > 0) {
        for (const integration of publicIntegrations) {
          try {
            await syncPublic.mutateAsync(integration.id);
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Sincronização concluída",
          description: `${successCount} planilha(s) sincronizada(s) com sucesso.`,
        });
      } else {
        toast({
          title: "Sincronização parcial",
          description: `${successCount} sincronizada(s), ${errorCount} com erro.`,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro na sincronização",
        description: "Algumas planilhas não puderam ser sincronizadas.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const actions = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: "Nova Transação",
      onClick: () => navigate("/app/transacoes"),
      variant: "default" as const,
    },
    {
      icon: <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />,
      label: "Sincronizar",
      onClick: handleSyncAll,
      variant: "outline" as const,
      disabled: isSyncing,
    },
    {
      icon: <FileDown className="h-4 w-4" />,
      label: "Relatórios",
      onClick: () => navigate("/app/relatorios"),
      variant: "outline" as const,
    },
  ];

  if (isMobile) {
    return (
      <>
        {/* FAB Button */}
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                >
                  <Menu className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        {/* Action buttons */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Actions */}
              <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3">
                {actions.map((action, index) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <span className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm shadow-md">
                      {action.label}
                    </span>
                    <Button
                      size="icon"
                      variant={action.variant}
                      className="rounded-full w-12 h-12 shadow-md"
                      onClick={() => {
                        action.onClick();
                        setIsOpen(false);
                      }}
                      disabled={action.disabled}
                    >
                      {action.icon}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop version
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg"
    >
      <span className="text-sm font-medium text-muted-foreground px-2">
        Ações Rápidas:
      </span>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="gap-2"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </motion.div>
  );
};
