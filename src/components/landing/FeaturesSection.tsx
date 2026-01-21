import { motion } from "framer-motion";
import { 
  FileSpreadsheet, 
  Link2, 
  PieChart, 
  Users, 
  Bell, 
  Shield,
  Download,
  Repeat,
  Layers
} from "lucide-react";
import { MotionCard, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Importação Inteligente",
    description: "Importe Excel, CSV ou conecte Google Sheets. Mapeamento automático de colunas.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Link2,
    title: "Integração Google Sheets",
    description: "Sincronize automaticamente com suas planilhas existentes no Google.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: PieChart,
    title: "Dashboards Interativos",
    description: "Visualize receitas, despesas e fluxo de caixa com gráficos modernos.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Download,
    title: "Relatórios Exportáveis",
    description: "Exporte relatórios em PDF e Excel para apresentações e prestação de contas.",
    gradient: "from-orange-500 to-yellow-500",
  },
  {
    icon: Users,
    title: "Multi-usuários",
    description: "Convide tesoureiros, pastores e líderes com permissões personalizadas.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    description: "Receba notificações de contas a vencer, pagamentos atrasados e metas.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Layers,
    title: "Categorias e Ministérios",
    description: "Organize transações por categorias e ministérios da sua igreja.",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Repeat,
    title: "Parcelamentos",
    description: "Gerencie receitas e despesas parceladas com controle total.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Dados criptografados e backup automático. Sua informação protegida.",
    gradient: "from-slate-500 to-gray-500",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Recursos</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
            Tudo que você precisa{" "}
            <span className="gradient-text">em um só lugar</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas completas para simplificar a gestão financeira da sua igreja.
          </p>
        </motion.div>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <StaggerItem key={feature.title}>
              <MotionCard
                hoverLift
                glowOnHover
                className="glass-card p-6 h-full border border-white/5 hover:border-primary/20 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </MotionCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
