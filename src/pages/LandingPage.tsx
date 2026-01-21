import {
  LandingHeader,
  HeroSection,
  ProblemSection,
  SolutionSection,
  FeaturesSection,
  PricingSection,
  HowItWorksSection,
  TestimonialsSection,
  CTASection,
  LandingFooter,
} from "@/components/landing";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <PricingSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
