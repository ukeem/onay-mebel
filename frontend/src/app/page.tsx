"use client";

import { AudienceSection } from "@/components/landing/audience-section";
import { BeforeAfterSection } from "@/components/landing/before-after-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FinalCTASection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PaymentSection } from "@/components/landing/payment-section";
import { Preloader } from "@/components/landing/preloader";
import { PricingSection } from "@/components/landing/pricing-section";
import { SmoothScrollProvider } from "@/components/landing/smooth-scroll-provider";
import { StickyCTABar } from "@/components/landing/sticky-cta-bar";
import { TestimonialSection } from "@/components/landing/testimonial-section";
import { WhySection } from "@/components/landing/why-section";

function Divider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
  );
}

export default function Home() {
  return (
    <SmoothScrollProvider>
      <Preloader />
      <LandingHeader />
      <main>
        <HeroSection />
        <Divider />
        <BeforeAfterSection />
        <Divider />
        <TestimonialSection />
        <Divider />
        <AudienceSection />
        <Divider />
        <HowItWorksSection />
        <Divider />
        <FeaturesSection />
        <Divider />
        <WhySection />
        <Divider />
        <PricingSection />
        <Divider />
        <FaqSection />
        <Divider />
        <PaymentSection />
        <Divider />
        <FinalCTASection />
      </main>
      <LandingFooter />
      <StickyCTABar />
    </SmoothScrollProvider>
  );
}
