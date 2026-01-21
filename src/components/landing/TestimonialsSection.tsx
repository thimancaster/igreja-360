import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { MotionCard, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Pastor João Silva",
    role: "Igreja Batista Central",
    avatar: "",
    content: "Antes gastávamos horas consolidando planilhas. Agora em minutos temos tudo organizado. O Igreja360 transformou nossa gestão financeira.",
    rating: 5,
  },
  {
    name: "Maria Santos",
    role: "Tesoureira - Comunidade Cristã",
    avatar: "",
    content: "A integração com Google Sheets é fantástica! Não precisei mudar minha forma de trabalhar, apenas conectei e pronto. Relatórios automáticos!",
    rating: 5,
  },
  {
    name: "Pr. Carlos Oliveira",
    role: "Igreja Metodista Renovada",
    avatar: "",
    content: "Finalmente consigo apresentar relatórios claros para o conselho. A visualização por ministérios ajuda muito nas decisões estratégicas.",
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section id="depoimentos" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Depoimentos</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
            O que dizem{" "}
            <span className="gradient-text">nossos usuários</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Igrejas de todo o Brasil já estão transformando sua gestão financeira.
          </p>
        </motion.div>

        <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <StaggerItem key={testimonial.name}>
              <MotionCard
                hoverLift
                className="glass-card p-6 h-full border border-white/10 relative overflow-hidden"
              >
                {/* Quote Icon */}
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="w-12 h-12 text-primary" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-muted-foreground leading-relaxed mb-6 relative z-10">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                    <AvatarImage src={testimonial.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </MotionCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
