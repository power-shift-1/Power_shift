import { About } from "@/components/sections/About";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { Fit } from "@/components/sections/Fit";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { HiddenCost } from "@/components/sections/HiddenCost";
import { Masterclass } from "@/components/sections/Masterclass";
import { Masthead } from "@/components/sections/Masthead";
import { Outcomes } from "@/components/sections/Outcomes";
import { Pillars } from "@/components/sections/Pillars";
import { Possibility } from "@/components/sections/Possibility";
import { Recognition } from "@/components/sections/Recognition";
import { FloatingCountdown } from "@/components/sections/FloatingCountdown";
import { StickyReserve } from "@/components/sections/StickyReserve";
import { Testimonials } from "@/components/sections/Testimonials";

export default function Home() {
  return (
    <>
      <Masthead />
      <main id="top">
        <Hero />
        <Recognition />
        <HiddenCost />
        <Possibility />
        <Pillars />
        <Outcomes />
        <About />
        <Testimonials />
        <Fit />
        <Masterclass />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <FloatingCountdown />
      <StickyReserve />
    </>
  );
}
