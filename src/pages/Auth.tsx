import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Church } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
export default function Auth() {
  const {
    user,
    signIn,
    signUp
  } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirecionar se já estiver logado (verificação síncrona)
  if (user) {
    // Usar setTimeout para evitar problemas de renderização
    setTimeout(() => navigate('/', {
      replace: true
    }), 0);
    return null;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate login inputs
      const loginSchema = z.object({
        email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa")
      });
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword
      });
      await signIn(validated.email, validated.password);

      // Redirecionar explicitamente após login bem-sucedido
      console.log('Auth: Login successful, redirecting...');
      navigate('/', {
        replace: true
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Erro de validação",
          description: firstError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao entrar",
          description: error.message || "Verifique suas credenciais",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate signup inputs
      const signupSchema = z.object({
        name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
        email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(72, "Senha muito longa").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter maiúsculas, minúsculas e números")
      });
      const validated = signupSchema.parse({
        name: signupName,
        email: signupEmail,
        password: signupPassword
      });
      await signUp(validated.email, validated.password, validated.name);
      toast({
        title: "Conta criada!",
        description: "Você já pode fazer login."
      });

      // Redirecionar após cadastro bem-sucedido
      console.log('Auth: Signup successful, redirecting...');
      navigate('/', {
        replace: true
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Erro de validação",
          description: firstError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao cadastrar",
          description: error.message || "Tente novamente",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl bg-secondary-foreground">
        <CardHeader className="text-center space-y-4 border rounded shadow-none my-[10px] mx-[10px] border-primary-light border-double">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-lg">
              <Church className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Igreja360
          </CardTitle>
          <CardDescription className="text-base">
            Gestão clara. Igreja saudável.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-[10px] py-[20px] mx-[10px] my-[10px] border-0 border-dashed border-primary rounded-none shadow-none">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input id="signup-name" type="text" placeholder="Seu nome" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}