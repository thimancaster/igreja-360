import { motion } from "framer-motion";
import { Upload, Settings, BarChart3 } from "lucide-react";
import { MotionCard } from "@/components/ui/motion-primitives";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Conecte ou Importe",
    description: "Conecte seu Google Sheets ou importe suas planilhas Excel/CSV existentes. O sistema aceita diversos formatos.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Settings,
    title: "Mapeie uma vez",
    description: "Configure o mapeamento de colunas uma única vez. O sistema aprende e aplica automaticamente nas próximas importações.",
    color: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Visualize e Gerencie",
    description: "Acesse dashboards interativos, gere relatórios e tome decisões baseadas em dados claros e organizados.",
    color: "from-green-500 to-emerald-500",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Como Funciona</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
            Simples como{" "}
            <span className="gradient-text">1, 2, 3</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Em poucos minutos você terá suas finanças organizadas e visualizadas.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Timeline Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <MotionCard
                  hoverLift
                  className="glass-card p-8 text-center relative overflow-hidden group"
                >
                  {/* Background Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  {/* Step Number */}
                  <div className={`text-6xl font-bold bg-gradient-to-br ${step.color} bg-clip-text text-transparent opacity-20 absolute top-4 right-4`}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Step Indicator for mobile */}
                  <div className="lg:hidden mt-6 flex justify-center">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold`}>
                      {index + 1}
                    </div>
                  </div>
                </MotionCard>

                {/* Desktop Step Indicator */}
                <div className="hidden lg:flex justify-center mt-6">
                  <motion.div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold shadow-lg`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {index + 1}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
