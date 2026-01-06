import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, Check, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SelectChurch() {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth();
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);

  // Buscar todas as igrejas onde o usuário é owner
  const { data: churches, isLoading } = useQuery({
    queryKey: ["user-churches", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching churches:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mutation para vincular igreja ao perfil
  const linkChurchMutation = useMutation({
    mutationFn: async (churchId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ church_id: churchId })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Igreja vinculada ao seu perfil com sucesso!");
      await refetchProfile();
      navigate("/app/dashboard");
    },
    onError: (error) => {
      toast.error("Erro ao vincular igreja: " + error.message);
    },
  });

  const handleConfirm = () => {
    if (!selectedChurchId) {
      toast.error("Selecione uma igreja para continuar");
      return;
    }
    linkChurchMutation.mutate(selectedChurchId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Se não há igrejas, redirecionar para criar
  if (!churches || churches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Nenhuma Igreja Encontrada</CardTitle>
            <CardDescription>
              Você ainda não possui nenhuma igreja cadastrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/create-church")} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Criar Nova Igreja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
              <Building2 className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Selecione sua Igreja</CardTitle>
          <CardDescription className="text-base">
            Você possui {churches.length} igreja{churches.length > 1 ? "s" : ""} cadastrada{churches.length > 1 ? "s" : ""}. 
            Selecione qual deseja usar neste momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedChurchId || undefined}
            onValueChange={setSelectedChurchId}
            className="space-y-3"
          >
            {churches.map((church) => (
              <div
                key={church.id}
                className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedChurchId === church.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedChurchId(church.id)}
              >
                <RadioGroupItem value={church.id} id={church.id} className="mt-1" />
                <Label htmlFor={church.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">{church.name}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground space-y-1">
                    {church.cnpj && <p>CNPJ: {church.cnpj}</p>}
                    {(church.city || church.state) && (
                      <p>
                        {church.city}
                        {church.city && church.state && ", "}
                        {church.state}
                      </p>
                    )}
                    <p>
                      Criada em:{" "}
                      {format(new Date(church.created_at!), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </Label>
                {selectedChurchId === church.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </RadioGroup>

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleConfirm}
              className="w-full"
              size="lg"
              disabled={!selectedChurchId || linkChurchMutation.isPending}
            >
              {linkChurchMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Vinculando...
                </>
              ) : (
                "Confirmar Seleção"
              )}
            </Button>
            <Button
              onClick={() => navigate("/create-church")}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Nova Igreja
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
