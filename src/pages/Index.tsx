import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CartaSection from "@/components/CartaSection";
import NovedadesSection from "@/components/NovedadesSection";
import ReservasSection from "@/components/ReservasSection";
import EspaciosSection from "@/components/EspaciosSection";
import NosotrosSection from "@/components/NosotrosSection";
import ContactoSection from "@/components/ContactoSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
      <Hero />
      <CartaSection />
      <NovedadesSection />
      <ReservasSection />
      <EspaciosSection />
      <NosotrosSection />
      <ContactoSection />
      <Footer />
      </div>
    </>
  );
};

export default Index;
