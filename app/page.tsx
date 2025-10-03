import FeatureCards from "@/components/FeatureCards";
import HeroSection from "@/components/HeroSection";
import ModelGallery from "@/components/ModelGallery";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <FeatureCards />
      <ModelGallery />
    </div>
  );
}
