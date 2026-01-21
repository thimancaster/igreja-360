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
    <section id="problema" className="py-16 md:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="text-xs md:text-sm font-medium text-primary uppercase tracking-wider">O Problema</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4 mb-4 md:mb-6">
            Você ainda gerencia as finanças{" "}
            <span className="gradient-text">assim?</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Muitas igrejas enfrentam os mesmos desafios na gestão financeira. 
            Reconhece algum desses problemas?
          </p>
        </motion.div>

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {problems.map((problem, index) => (
            <StaggerItem key={problem.title}>
              <MotionCard
                hoverLift
                className="glass-card p-4 md:p-6 h-full border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${problem.bgColor} flex items-center justify-center mb-3 md:mb-5`}>
                  <problem.icon className={`w-5 h-5 md:w-7 md:h-7 ${problem.color}`} />
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1.5 md:mb-3">{problem.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
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
