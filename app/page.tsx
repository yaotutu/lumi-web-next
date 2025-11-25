import Navigation from "@/components/layout/Navigation";
import HeroSection from "./home/components/HeroSection";
import ModelGallery from "./home/components/ModelGallery";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <ModelGallery />
    </div>
  );
}
