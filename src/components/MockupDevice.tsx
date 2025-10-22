import React from "react";
import { motion } from "framer-motion";

type Props = {
  src?: string; // caminho para screenshot
  alt?: string;
  className?: string;
  interactive?: boolean;
};

const MockupDevice: React.FC<Props> = ({ src, alt="Mockup", className="", interactive=false }) => {
  return (
    <motion.div
      initial={{ y: 8, rotate: -1 }}
      animate={{ y: [8, -6, 8] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`relative rounded-2xl shadow-2xl ${className}`}
      whileHover={interactive ? { scale: 1.02, rotate: 0 } : undefined}
    >
      {/* Glass frame */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        {/* gradient overlay decor */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/5 via-white/3 to-transparent mix-blend-overlay" />
        {/* Mockup screenshot */}
        {src ? (
          <img src={src} alt={alt} className="w-full h-72 object-cover" />
        ) : (
          <div className="w-full h-72 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 text-gray-400">
            Mockup Placeholder
          </div>
        )}
        {/* subtle bottom shadow */}
        <div className="absolute left-4 right-4 bottom-3 h-6 rounded-xl blur-xl opacity-50 bg-gradient-to-r from-black/20 to-transparent" />
      </div>
    </motion.div>
  );
};

export default MockupDevice;