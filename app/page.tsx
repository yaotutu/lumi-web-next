import HeroSection from "@/components/hero/HeroSection";
import ModelGallery from "@/components/gallery/ModelGallery";
import Navigation from "@/components/layout/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <ModelGallery />
    </div>
  );
}
