import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Church } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LandingHeader = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-header border-b border-white/10"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
            <Church className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">Igreja360</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#problema" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>O Problema</span>
          </a>
          <a href="#solucao" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>Solução</span>
          </a>
          <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>Preços</span>
          </a>
          <a href="#depoimentos" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>Depoimentos</span>
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <motion.span
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
              whileHover={{ scale: 1.05 }}
            >
              Entrar
            </motion.span>
          </Link>
          <Link to="/auth?register=true">
            <Button size="sm" ripple animate>
              Começar Grátis
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};
