import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronDown, 
  Church, 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  Users, 
  FileSpreadsheet,
  HelpCircle,
  Zap,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Geral
  {
    category: "Geral",
    question: "O que é o Igreja360?",
    answer: "O Igreja360 é uma plataforma de gestão financeira desenvolvida especificamente para igrejas. Ele permite importar transações de planilhas, visualizar dashboards interativos, gerar relatórios e gerenciar as finanças de forma simples e intuitiva."
  },
  {
    category: "Geral",
    question: "Preciso ter conhecimento técnico para usar?",
    answer: "Não! O Igreja360 foi projetado para ser extremamente fácil de usar. Se você sabe usar uma planilha, você consegue usar o Igreja360. Além disso, oferecemos suporte e tutoriais para ajudar você em cada etapa."
  },
  {
    category: "Geral",
    question: "O Igreja360 funciona em celular?",
    answer: "Sim! Nossa plataforma é totalmente responsiva e funciona perfeitamente em smartphones, tablets e computadores. Você pode acessar suas finanças de qualquer lugar."
  },
  // Planos e Preços
  {
    category: "Planos e Preços",
    question: "Posso testar antes de pagar?",
    answer: "Sim! Oferecemos um plano gratuito com recursos básicos para você conhecer a plataforma. Além disso, o plano Pro tem garantia de 7 dias - se não gostar, devolvemos seu dinheiro."
  },
  {
    category: "Planos e Preços",
    question: "Qual a diferença entre o plano Gratuito e o Pro?",
    answer: "O plano Gratuito permite 1 igreja, até 100 transações/mês e recursos básicos. O plano Pro oferece igrejas e transações ilimitadas, integração com Google Sheets, relatórios personalizados, multi-usuários, exportação PDF/Excel e suporte prioritário."
  },
  {
    category: "Planos e Preços",
    question: "Como funciona o pagamento?",
    answer: "Você pode escolher entre pagamento mensal (R$ 79,90/mês) ou anual (R$ 579,90/ano com ~40% de desconto). Aceitamos cartão de crédito e PIX. O pagamento é processado de forma segura."
  },
  {
    category: "Planos e Preços",
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura a qualquer momento. Não há fidelidade ou multa. Se cancelar no plano anual, você continua tendo acesso até o fim do período pago."
  },
  // Funcionalidades
  {
    category: "Funcionalidades",
    question: "Como importo minhas planilhas existentes?",
    answer: "É muito simples! Você pode fazer upload de arquivos Excel (.xlsx) ou CSV, ou conectar diretamente ao Google Sheets. O sistema faz o mapeamento automático das colunas e você só precisa confirmar."
  },
  {
    category: "Funcionalidades",
    question: "A sincronização com Google Sheets é automática?",
    answer: "Sim! Uma vez configurada a integração, o Igreja360 sincroniza automaticamente suas transações. Você pode definir a frequência de sincronização conforme sua preferência."
  },
  {
    category: "Funcionalidades",
    question: "Posso gerenciar múltiplas igrejas?",
    answer: "Sim, no plano Pro você pode cadastrar e gerenciar quantas igrejas precisar, cada uma com suas próprias transações, categorias, ministérios e usuários."
  },
  {
    category: "Funcionalidades",
    question: "É possível gerar relatórios para prestação de contas?",
    answer: "Sim! Você pode gerar relatórios detalhados de receitas, despesas, fluxo de caixa e muito mais. Os relatórios podem ser exportados em PDF e Excel para apresentar ao conselho ou à congregação."
  },
  // Segurança
  {
    category: "Segurança",
    question: "Meus dados estão seguros?",
    answer: "Absolutamente! Utilizamos criptografia de ponta a ponta, backups automáticos diários e servidores com certificação de segurança. Seus dados financeiros são tratados com o máximo sigilo."
  },
  {
    category: "Segurança",
    question: "Quem pode acessar os dados da minha igreja?",
    answer: "Apenas os usuários que você autorizar. O sistema possui controle de permissões por função (admin, tesoureiro, pastor, líder) e você pode limitar o acesso por ministério."
  },
  {
    category: "Segurança",
    question: "Posso excluir meus dados?",
    answer: "Sim! Você tem total controle sobre seus dados. Pode excluir transações, categorias, ministérios ou até mesmo toda a conta. Respeitamos sua privacidade e o direito de exclusão."
  },
  // Suporte
  {
    category: "Suporte",
    question: "Como posso obter ajuda?",
    answer: "Oferecemos suporte por email para todos os planos. No plano Pro, você tem acesso a suporte prioritário com tempo de resposta reduzido. Também disponibilizamos tutoriais e documentação completa."
  },
  {
    category: "Suporte",
    question: "Vocês oferecem treinamento?",
    answer: "Sim! Disponibilizamos vídeos tutoriais e documentação detalhada. Para igrejas com plano Pro, podemos agendar sessões de onboarding personalizadas."
  },
];

const categories = [
  { name: "Geral", icon: HelpCircle },
  { name: "Planos e Preços", icon: CreditCard },
  { name: "Funcionalidades", icon: Zap },
  { name: "Segurança", icon: Lock },
  { name: "Suporte", icon: Users },
];

const FAQPage = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("Geral");

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQ = faqData.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-header border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Church className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Igreja360</span>
          </Link>

          <Link to="/landing">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
            Perguntas{" "}
            <span className="gradient-text">Frequentes</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Encontre respostas para as dúvidas mais comuns sobre o Igreja360. 
            Não encontrou o que procura? Entre em contato conosco.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 md:mb-12 px-2"
        >
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={activeCategory === category.name ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.name)}
              className={`gap-2 text-xs md:text-sm px-3 md:px-4 ${
                activeCategory === category.name 
                  ? "shadow-lg shadow-primary/25" 
                  : "glass border-border/50"
              }`}
            >
              <category.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden xs:inline sm:inline">{category.name}</span>
            </Button>
          ))}
        </motion.div>

        {/* FAQ Items */}
        <StaggerContainer className="max-w-3xl mx-auto space-y-3 md:space-y-4">
          {filteredFAQ.map((item, index) => {
            const globalIndex = faqData.indexOf(item);
            const isOpen = openItems.has(globalIndex);
            
            return (
              <StaggerItem key={globalIndex}>
                <motion.div
                  className="glass-card border border-border/50 rounded-xl overflow-hidden"
                  initial={false}
                >
                  <button
                    onClick={() => toggleItem(globalIndex)}
                    className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between gap-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-medium text-sm md:text-base pr-2">{item.question}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 md:px-6 pb-4 md:pb-5 pt-0">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16 md:mt-20 px-4"
        >
          <div className="glass-card p-6 md:p-10 rounded-2xl max-w-2xl mx-auto border border-border/50">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">
              Ainda tem dúvidas?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              Nossa equipe está pronta para ajudar você a transformar a gestão financeira da sua igreja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/auth?register=true">
                <Button size="lg" ripple animate className="w-full sm:w-auto px-6 md:px-8">
                  Começar Gratuitamente
                </Button>
              </Link>
              <a href="mailto:contato@igreja360.com.br">
                <Button variant="outline" size="lg" className="w-full sm:w-auto glass border-border/50 px-6 md:px-8">
                  Falar com Suporte
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Igreja360. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FAQPage;
