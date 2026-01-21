import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
      <div className="absolute inset-0 mesh-gradient opacity-30" />
      
      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Social Proof */}
          <motion.div
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm">
              <span className="font-bold text-primary">+50 igrejas</span>{" "}
              <span className="text-muted-foreground">já estão usando</span>
            </span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Pronto para transformar a{" "}
            <span className="gradient-text">gestão financeira</span>{" "}
            da sua igreja?
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Comece gratuitamente hoje mesmo. Sem cartão de crédito, sem compromisso. 
            Veja na prática como o Igreja360 pode ajudar sua comunidade.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?register=true">
              <Button 
                size="lg" 
                ripple 
                animate 
                className="w-full sm:w-auto text-lg px-10 py-7 shadow-2xl shadow-primary/30"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Começar Gratuitamente
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            ✨ Configuração em menos de 5 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
};
