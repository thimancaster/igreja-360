import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap } from "lucide-react";
import { MotionCard } from "@/components/ui/motion-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const plans = {
  free: {
    name: "Gratuito",
    description: "Perfeito para começar",
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    features: [
      "1 igreja cadastrada",
      "Até 100 transações/mês",
      "Dashboard básico",
      "Importação manual de planilhas",
      "Relatórios limitados",
      "Suporte por email",
    ],
    limitations: [
      "Sem integração Google Sheets",
      "Sem multi-usuários",
      "Sem exportação PDF/Excel",
    ],
  },
  pro: {
    name: "Pro",
    description: "Para igrejas em crescimento",
    monthlyPrice: 79.90,
    annualPrice: 579.90,
    popular: true,
    features: [
      "Igrejas ilimitadas",
      "Transações ilimitadas",
      "Dashboard completo com gráficos",
      "Integração Google Sheets",
      "Sincronização automática",
      "Relatórios personalizados",
      "Exportação PDF e Excel",
      "Multi-usuários com permissões",
      "Alertas e notificações",
      "Gestão de parcelamentos",
      "Suporte prioritário",
    ],
    limitations: [],
  },
};

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  
  const annualMonthly = plans.pro.annualPrice / 12;
  const savingsPercent = Math.round(((plans.pro.monthlyPrice * 12 - plans.pro.annualPrice) / (plans.pro.monthlyPrice * 12)) * 100);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <section id="precos" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient opacity-15 md:opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] md:w-[800px] h-[500px] md:h-[800px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="text-xs md:text-sm font-medium text-primary uppercase tracking-wider">Preços</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 md:mt-4 mb-4 md:mb-6">
            Escolha o plano{" "}
            <span className="gradient-text">ideal para sua igreja</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 px-2">
            Comece gratuitamente e evolua conforme sua necessidade. Sem surpresas, sem taxas ocultas.
          </p>

          {/* Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <span className={`text-xs md:text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Mensal
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-xs md:text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual
            </span>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Economize {savingsPercent}%
            </Badge>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MotionCard
              hoverLift
              className="glass-card p-5 md:p-8 h-full border border-border/50 relative overflow-hidden"
            >
              <div className="mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl font-bold mb-1.5 md:mb-2">{plans.free.name}</h3>
                <p className="text-sm md:text-base text-muted-foreground">{plans.free.description}</p>
              </div>

              <div className="mb-6 md:mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-bold">R$ 0</span>
                  <span className="text-sm md:text-base text-muted-foreground">/mês</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Para sempre</p>
              </div>

              <Link to="/auth?register=true" className="block mb-6 md:mb-8">
                <Button
                  variant="outline"
                  className="w-full py-5 md:py-6 text-sm md:text-base glass border-border/50"
                  ripple
                  animate
                >
                  Começar Grátis
                </Button>
              </Link>

              <div className="space-y-2.5 md:space-y-3">
                {plans.free.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 md:gap-3">
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm">{feature}</span>
                  </div>
                ))}
                {plans.free.limitations.map((limitation) => (
                  <div key={limitation} className="flex items-start gap-2.5 md:gap-3 opacity-50">
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] md:text-xs">✕</span>
                    </div>
                    <span className="text-xs md:text-sm line-through">{limitation}</span>
                  </div>
                ))}
              </div>
            </MotionCard>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MotionCard
              hoverLift
              className="glass-card p-5 md:p-8 h-full border-2 border-primary/50 relative overflow-hidden"
            >
              {/* Popular Badge */}
              <div className="absolute -top-px -right-px">
                <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] md:text-xs font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  Mais Popular
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />

              <div className="relative">
                <div className="mb-4 md:mb-6">
                  <h3 className="text-xl md:text-2xl font-bold mb-1.5 md:mb-2 gradient-text">{plans.pro.name}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">{plans.pro.description}</p>
                </div>

                <div className="mb-6 md:mb-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isAnnual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isAnnual ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl md:text-4xl font-bold gradient-text">
                              {formatPrice(annualMonthly)}
                            </span>
                            <span className="text-sm md:text-base text-muted-foreground">/mês</span>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            Cobrado {formatPrice(plans.pro.annualPrice)}/ano
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl md:text-4xl font-bold gradient-text">
                              {formatPrice(plans.pro.monthlyPrice)}
                            </span>
                            <span className="text-sm md:text-base text-muted-foreground">/mês</span>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            Cobrado mensalmente
                          </p>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <Link to="/auth?register=true" className="block mb-6 md:mb-8">
                  <Button
                    className="w-full py-5 md:py-6 text-sm md:text-base shadow-xl shadow-primary/25"
                    ripple
                    animate
                  >
                    Assinar Agora
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 ml-2" />
                  </Button>
                </Link>

                <div className="space-y-2.5 md:space-y-3">
                  {plans.pro.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 md:gap-3">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                      </div>
                      <span className="text-xs md:text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </MotionCard>
          </motion.div>
        </div>

        {/* Money Back Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            🔒 Garantia de 7 dias. Se não gostar, devolvemos seu dinheiro.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
