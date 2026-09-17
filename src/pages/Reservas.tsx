import Header from "@/components/Header";
import ReservasSection from "@/components/ReservasSection";
import { Seo } from "@/components/Seo";

const Reservas = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="Reservar mesa | Casa Tomás Restaurante en Crevillent"
        description="Reserva tu mesa en Casa Tomás, restaurante de cocina tradicional en Crevillent (Alicante). Reservas online rápidas y sencillas."
        canonical="https://restaurantecasatomascrevillente.es/reservas"
        keywords={["reservar mesa Crevillent", "reservas Casa Tomás", "reservar restaurante Alicante"]}
      />
      <Header />
      <ReservasSection forceShowForm showBackButton />
    </div>
  );
};

export default Reservas;
