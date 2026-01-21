import { motion } from "framer-motion";
import { Church, Heart } from "lucide-react";

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-white/10 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Church className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Igreja360</span>
          </motion.div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#problema" className="hover:text-foreground transition-colors">
              O Problema
            </a>
            <a href="#solucao" className="hover:text-foreground transition-colors">
              Solução
            </a>
            <a href="#precos" className="hover:text-foreground transition-colors">
              Preços
            </a>
            <a href="#depoimentos" className="hover:text-foreground transition-colors">
              Depoimentos
            </a>
          </div>

          {/* Copyright */}
          <motion.p 
            className="text-sm text-muted-foreground flex items-center gap-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            © {currentYear} Igreja360. Feito com{" "}
            <Heart className="w-3 h-3 text-destructive fill-destructive" />{" "}
            para igrejas.
          </motion.p>
        </div>
      </div>
    </footer>
  );
};
