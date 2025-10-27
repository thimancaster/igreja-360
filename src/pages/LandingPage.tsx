import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, BarChart, EyeOff, Zap, Lightbulb, Timer, UploadCloud, FileText, Settings, Users, Bell, LineChart, MapPin, Sheet } from "lucide-react";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import MockupDevice from "@/components/MockupDevice"; // Import MockupDevice

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header da Landing Page */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-glow">
              <span className="text-primary-foreground font-bold text-sm">I360</span>
            </div>
            <span className="text-lg font-semibold text-primary">Igreja360</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/auth" className="text-sm font-medium hover:text-primary transition-colors">
              Entrar
            </Link>
            <Button asChild>
              <Link to="/auth">Quero Organizar Minhas Finanças</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
          <div className="container text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Igreja360: A Visão Completa da Gestão Financeira da Sua Igreja.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Menos tempo com planilhas, mais tempo para o ministério. O Igreja360 organiza suas finanças de forma automática e intuitiva.
            </p>
            <Button asChild size="lg" className="mt-10 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/auth">Quero Organizar Minhas Finanças</Link>
            </Button>
            <div className="mt-16 max-w-5xl mx-auto">
              {/* Mockup Principal (Visão Geral do Dashboard) */}
              <MockupDevice src="/mockups/dashboard-overview.png" alt="Visão Geral do Dashboard" className="w-full max-w-md mx-auto md:max-w-full" />
            </div>
          </div>
        </section>

        {/* Secção "O Problema" */}
        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mx-auto">
              Cansado de erros, retrabalho e falta de clareza nas finanças?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Sabemos que gerenciar as finanças da igreja pode ser um desafio. O Igreja360 foi feito para resolver isso.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300">
                <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Horas Perdidas</CardTitle>
                <CardDescription className="mt-2">
                  Gastando tempo precioso com tarefas manuais e repetitivas.
                </CardDescription>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <CardTitle className="text-xl">Risco de Erros</CardTitle>
                <CardDescription className="mt-2">
                  Cálculos manuais e planilhas complexas aumentam a chance de falhas.
                </CardDescription>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300">
                <BarChart className="h-10 w-10 text-secondary mx-auto mb-4" />
                <CardTitle className="text-xl">Relatórios Difíceis</CardTitle>
                <CardDescription className="mt-2">
                  Dificuldade em gerar relatórios claros e tomar decisões rápidas.
                </CardDescription>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300">
                <EyeOff className="h-10 w-10 text-warning mx-auto mb-4" />
                <CardTitle className="text-xl">Falta de Visão</CardTitle>
                <CardDescription className="mt-2">
                  Sem uma visão consolidada, é difícil planejar o futuro financeiro.
                </CardDescription>
              </Card>
            </div>
          </div>
        </section>

        {/* Secção "A Solução" */}
        <section className="py-20 md:py-28">
          <div className="container space-y-20">
            {/* Benefício 1: Automatize */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2">
                <img src="/mockups/automate-import.png" alt="Mockup de Automação" className="w-full h-72 object-cover rounded-xl" />
              </div>
              <div className="md:w-1/2 space-y-4 text-center md:text-left">
                <Badge variant="secondary" className="text-primary-foreground bg-primary/80">
                  <Zap className="h-4 w-4 mr-2" /> Automatize
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight">Automatize sua Rotina</h3>
                <p className="text-lg text-muted-foreground">
                  Conecte suas contas bancárias e planilhas do Google Sheets para importar transações automaticamente. Diga adeus à entrada manual de dados e foque no que realmente importa.
                </p>
              </div>
            </div>

            {/* Benefício 2: Visualize */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/2">
                <img src="/mockups/visualize-charts.png" alt="Mockup de Visualização" className="w-full h-72 object-cover rounded-xl" />
              </div>
              <div className="md:w-1/2 space-y-4 text-center md:text-left">
                <Badge variant="secondary" className="text-primary-foreground bg-secondary/80">
                  <BarChart className="h-4 w-4 mr-2" /> Visualize
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight">Visualize suas Finanças em Tempo Real</h3>
                <p className="text-lg text-muted-foreground">
                  Dashboards intuitivos e relatórios claros que mostram para onde o dinheiro da sua igreja está indo e de onde ele vem. Tenha uma visão 360º a qualquer momento.
                </p>
              </div>
            </div>

            {/* Benefício 3: Decida */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2">
                <img src="/mockups/decision-report.png" alt="Mockup de Decisão" className="w-full h-72 object-cover rounded-xl" />
              </div>
              <div className="md:w-1/2 space-y-4 text-center md:text-left">
                <Badge variant="secondary" className="text-primary-foreground bg-accent/80">
                  <Lightbulb className="h-4 w-4 mr-2" /> Decida
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight">Tome Decisões Estratégicas com Confiança</h3>
                <p className="text-lg text-muted-foreground">
                  Com dados precisos e relatórios personalizados, você terá as informações necessárias para tomar decisões financeiras mais inteligentes e eficazes para o crescimento do ministério.
                </p>
              </div>
            </div>

            {/* Benefício 4: Ganhe Tempo */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/2">
                <img src="/mockups/time-peace.png" alt="Mockup de Tempo" className="w-full h-72 object-cover rounded-xl" />
              </div>
              <div className="md:w-1/2 space-y-4 text-center md:text-left">
                <Badge variant="secondary" className="text-primary-foreground bg-warning/80">
                  <Timer className="h-4 w-4 mr-2" /> Ganhe Tempo
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight">Ganhe Tempo para o que Realmente Importa</h3>
                <p className="text-lg text-muted-foreground">
                  Reduza o tempo gasto com burocracia e tarefas administrativas. O Igreja360 libera você e sua equipe para dedicarem mais energia ao propósito da igreja e ao cuidado com as pessoas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Secção de Funcionalidades Principais */}
        <section className="py-20 md:py-28 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mx-auto">
              Recursos Poderosos, Pensados para a Realidade da Igreja.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo o que você precisa para uma gestão financeira eficiente e transparente.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <UploadCloud className="h-8 w-8 text-primary mb-4" />
                <CardTitle className="text-xl">Importação Inteligente</CardTitle>
                <CardDescription className="mt-2">
                  Importe transações de planilhas (Excel, CSV) de forma rápida e com mapeamento flexível.
                </CardDescription>
              </Card>
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <Sheet className="h-8 w-8 text-secondary mb-4" />
                <CardTitle className="text-xl">Integração Google Sheets</CardTitle>
                <CardDescription className="mt-2">
                  Sincronize automaticamente suas planilhas do Google Sheets.
                  <Badge variant="secondary" className="ml-2">Em Breve</Badge>
                </CardDescription>
              </Card>
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <FileText className="h-8 w-8 text-accent mb-4" />
                <CardTitle className="text-xl">Relatórios Personalizados</CardTitle>
                <CardDescription className="mt-2">
                  Gere relatórios detalhados de receitas, despesas, fluxo de caixa e mais.
                  <Badge variant="secondary" className="ml-2">Em Breve</Badge>
                </CardDescription>
              </Card>
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <Settings className="h-8 w-8 text-primary mb-4" />
                <CardTitle className="text-xl">Gestão de Categorias e Ministérios</CardTitle>
                <CardDescription className="mt-2">
                  Organize suas transações por categorias e ministérios para maior clareza.
                </CardDescription>
              </Card>
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <Users className="h-8 w-8 text-secondary mb-4" />
                <CardTitle className="text-xl">Controle de Usuários e Permissões</CardTitle>
                <CardDescription className="mt-2">
                  Gerencie o acesso da sua equipe com diferentes níveis de permissão.
                </CardDescription>
              </Card>
              <Card className="p-6 text-left hover:shadow-lg transition-shadow duration-300">
                <Bell className="h-8 w-8 text-accent mb-4" />
                <CardTitle className="text-xl">Alertas e Notificações</CardTitle>
                <CardDescription className="mt-2">
                  Receba alertas sobre contas a pagar, vencimentos e outras informações importantes.
                  <Badge variant="secondary" className="ml-2">Em Breve</Badge>
                </CardDescription>
              </Card>
            </div>
          </div>
        </section>

        {/* Secção "Como Funciona?" */}
        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mx-auto">
              Comece a Usar em 3 Passos Simples.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A gestão financeira da sua igreja nunca foi tão fácil.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto mb-6 text-3xl font-bold">
                  1
                </div>
                <UploadCloud className="h-10 w-10 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Conecte ou Importe</CardTitle>
                <CardDescription className="mt-2">
                  Faça o upload de suas planilhas ou conecte-se diretamente ao Google Sheets.
                </CardDescription>
              </Card>
              <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary/10 text-secondary mx-auto mb-6 text-3xl font-bold">
                  2
                </div>
                <MapPin className="h-10 w-10 text-secondary mx-auto mb-4" />
                <CardTitle className="text-xl">Mapeie Uma Vez</CardTitle>
                <CardDescription className="mt-2">
                  Associe as colunas da sua planilha aos campos do sistema em poucos cliques.
                </CardDescription>
              </Card>
              <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 text-accent mx-auto mb-6 text-3xl font-bold">
                  3
                </div>
                <LineChart className="h-10 w-10 text-accent mx-auto mb-4" />
                <CardTitle className="text-xl">Visualize e Gerencie</CardTitle>
                <CardDescription className="mt-2">
                  Tenha acesso a dashboards, relatórios e controle total das finanças da sua igreja.
                </CardDescription>
              </Card>
            </div>
          </div>
        </section>

        {/* Secção de Prova Social/Testemunhos */}
        <section className="py-20 md:py-28">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mx-auto">
              Igrejas que já Simplificaram sua Gestão com o Igreja360.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Veja o que nossos líderes e tesoureiros estão dizendo.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=AnaSilva" alt="Ana Silva" />
                    <AvatarFallback>AS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Ana Silva</p>
                    <p className="text-sm text-muted-foreground">Tesoureira, Igreja da Paz</p>
                  </div>
                </div>
                <p className="mt-4 italic text-muted-foreground">
                  "O Igreja360 transformou a forma como lidamos com as finanças. É intuitivo, poderoso e nos poupa um tempo enorme. Recomendo a todas as igrejas!"
                </p>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=PastorJoao" alt="Pastor João" />
                    <AvatarFallback>PJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Pastor João</p>
                    <p className="text-sm text-muted-foreground">Líder Sênior, Comunidade da Fé</p>
                  </div>
                </div>
                <p className="mt-4 italic text-muted-foreground">
                  "Finalmente temos clareza sobre cada centavo. O dashboard é incrível e me ajuda a tomar decisões mais assertivas para o ministério."
                </p>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=MariaFernandes" alt="Maria Fernandes" />
                    <AvatarFallback>MF</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Maria Fernandes</p>
                    <p className="text-sm text-muted-foreground">Voluntária Financeira, Igreja Esperança</p>
                  </div>
                </div>
                <p className="mt-4 italic text-muted-foreground">
                  "A importação de dados é super fácil e o suporte é excelente. O Igreja360 é uma bênção para nossa equipe de voluntários!"
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Secção de Chamada para Ação Final (CTA) */}
        <section className="py-20 md:py-28 bg-primary text-primary-foreground text-center">
          <div className="container">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto">
              Simplifique Hoje Mesmo. Solicite seu Acesso Beta.
            </h2>
            <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto opacity-90">
              Junte-se às igrejas que estão transformando sua gestão financeira com o Igreja360.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-10 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/auth">Quero Organizar Minhas Finanças</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-sidebar text-sidebar-foreground py-8">
        <div className="container text-center text-sm">
          <p>© 2025 Igreja360 by Thiago Ferreira. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;