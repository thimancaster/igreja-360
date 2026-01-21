import { motion } from "framer-motion";
import { FileSpreadsheet, Clock, AlertTriangle, Eye } from "lucide-react";
import { MotionCard, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives";

const problems = [
  {
    icon: FileSpreadsheet,
    title: "Planilhas Confusas",
    description: "Múltiplas planilhas desorganizadas, fórmulas quebradas e dados inconsistentes dificultam a gestão.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Clock,
    title: "Tempo Desperdiçado",
    description: "Horas gastas consolidando dados manualmente que poderiam ser usadas no ministério.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: AlertTriangle,
    title: "Erros Frequentes",
    description: "Lançamentos duplicados, valores incorretos e categorização inconsistente geram retrabalho.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Eye,
    title: "Falta de Visibilidade",
    description: "Sem dashboards claros, é difícil tomar decisões estratégicas sobre as finanças.",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
];

export const ProblemSection = () => {
  return (
    <section id="problema" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">O Problema</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
            Você ainda gerencia as finanças{" "}
            <span className="gradient-text">assim?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Muitas igrejas enfrentam os mesmos desafios na gestão financeira. 
            Reconhece algum desses problemas?
          </p>
        </motion.div>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <StaggerItem key={problem.title}>
              <MotionCard
                hoverLift
                className="glass-card p-6 h-full border border-white/5 hover:border-primary/20 transition-colors"
              >
                <div className={`w-14 h-14 rounded-2xl ${problem.bgColor} flex items-center justify-center mb-5`}>
                  <problem.icon className={`w-7 h-7 ${problem.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-3">{problem.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
              </MotionCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
