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
      className="fixed top-0 left-0 right-0 z-50 glass-header border-b border-border/50"
    >
      <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
        <motion.div 
          className="flex items-center gap-2 md:gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
            <Church className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <span className="text-lg md:text-xl font-bold gradient-text">Igreja360</span>
        </motion.div>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <a href="#problema" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>O Problema</span>
          </a>
          <a href="#solucao" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>Solução</span>
          </a>
          <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>Preços</span>
          </a>
          <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link">
            <span>FAQ</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/auth">
            <motion.span
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
              whileHover={{ scale: 1.05 }}
            >
              Entrar
            </motion.span>
          </Link>
          <Link to="/auth?register=true">
            <Button size="sm" ripple animate className="text-xs md:text-sm px-3 md:px-4">
              Começar Grátis
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};
