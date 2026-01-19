import { FeaturedResourcesSection } from "@/components/sections/featured-resources";
import { HeroSection } from "@/components/sections/hero-section";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <HeroSection />
      <FeaturedResourcesSection />
    </div>
  );
}
