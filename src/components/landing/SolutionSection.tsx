import { motion } from "framer-motion";
import { Upload, BarChart3, FileCheck, Clock } from "lucide-react";
import { TiltCard } from "@/components/ui/motion-primitives";
import { Badge } from "@/components/ui/badge";

const solutions = [
  {
    icon: Upload,
    badge: "Automação",
    title: "Importe Automaticamente",
    description: "Conecte seu Google Sheets ou importe planilhas Excel. O sistema reconhece e categoriza automaticamente suas transações.",
    image: "/mockups/automate-import.png",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    badge: "Visualização",
    title: "Visualize com Clareza",
    description: "Dashboards interativos com gráficos de receitas, despesas, fluxo de caixa e comparativos mensais em tempo real.",
    image: "/mockups/visualize-charts.png",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: FileCheck,
    badge: "Decisão",
    title: "Tome Decisões Informadas",
    description: "Relatórios personalizados exportáveis em PDF e Excel. Tenha todos os dados para apresentar ao conselho e à congregação.",
    image: "/mockups/decision-report.png",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Clock,
    badge: "Eficiência",
    title: "Ganhe Tempo Precioso",
    description: "Reduza horas de trabalho manual para minutos. Foque no que realmente importa: o crescimento espiritual da sua comunidade.",
    image: "/mockups/time-peace.png",
    color: "from-orange-500 to-yellow-500",
  },
];

export const SolutionSection = () => {
  return (
    <section id="solucao" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">A Solução</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
            Conheça o{" "}
            <span className="gradient-text">Igreja360</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa que transforma a complexidade financeira em simplicidade e clareza.
          </p>
        </motion.div>

        <div className="space-y-32">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:grid-flow-dense" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                <Badge 
                  variant="outline" 
                  className={`mb-4 px-3 py-1 bg-gradient-to-r ${solution.color} bg-clip-text text-transparent border-primary/30`}
                >
                  <solution.icon className="w-4 h-4 mr-2 text-primary" />
                  {solution.badge}
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  {solution.title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {solution.description}
                </p>
              </div>

              {/* Image */}
              <div className={index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <TiltCard className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${solution.color} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition-opacity`} />
                  <div className="relative glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img
                      src={solution.image}
                      alt={solution.title}
                      className="w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.src = "/fallback-mockup.png";
                      }}
                    />
                  </div>
                </TiltCard>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
