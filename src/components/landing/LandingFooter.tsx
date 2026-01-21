import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Church, Heart } from "lucide-react";

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 md:py-12 border-t border-border/50 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-2 md:gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Church className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground" />
            </div>
            <span className="text-base md:text-lg font-bold">Igreja360</span>
          </motion.div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <a href="#problema" className="hover:text-foreground transition-colors">
              O Problema
            </a>
            <a href="#solucao" className="hover:text-foreground transition-colors">
              Solução
            </a>
            <a href="#precos" className="hover:text-foreground transition-colors">
              Preços
            </a>
            <Link to="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>

          {/* Copyright */}
          <motion.p 
            className="text-xs md:text-sm text-muted-foreground flex items-center gap-1"
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
