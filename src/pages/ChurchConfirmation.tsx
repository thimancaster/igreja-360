import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, MapPin, FileText } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { LoadingSpinner } from "@/components/LoadingSpinner"; // Importar LoadingSpinner

type Church = Tables<'churches'>;

export default function ChurchConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChurch = async () => {
      if (!profile?.church_id) {
        navigate("/create-church");
        return;
      }

      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();

      if (error) {
        console.error("Error fetching church:", error);
        navigate("/app/dashboard");
        return;
      }

      setChurch(data);
      setLoading(false);
    };

    fetchChurch();
  }, [profile?.church_id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!church) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Igreja Criada com Sucesso!</CardTitle>
          <CardDescription className="text-base">
            Confira os dados cadastrados da sua igreja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Nome da Igreja</p>
                <p className="text-lg font-semibold">{church.name}</p>
              </div>
            </div>

            {church.cnpj && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
                  <p className="text-lg font-semibold">{church.cnpj}</p>
                </div>
              </div>
            )}

            {(church.address || church.city || church.state) && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Localização</p>
                  <div className="space-y-1">
                    {church.address && (
                      <p className="text-base">{church.address}</p>
                    )}
                    {(church.city || church.state) && (
                      <p className="text-base">
                        {church.city}{church.city && church.state && ", "}{church.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => navigate("/app/dashboard")} 
              className="w-full"
              size="lg"
            >
              Ir para o Dashboard
            </Button>
            <Button 
              onClick={() => navigate("/app/configuracoes")} 
              variant="outline"
              className="w-full"
            >
              Editar Dados da Igreja
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}