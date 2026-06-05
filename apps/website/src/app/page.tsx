import { Hero } from '@/components/home/hero';
import { Features } from '@/components/home/features';
import { CodeDemo } from '@/components/home/code-demo';
import { Pricing } from '@/components/home/pricing';
import { CTASection } from '@/components/home/cta-section';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <CodeDemo />
      <Pricing />
      <CTASection />
    </>
  );
}
