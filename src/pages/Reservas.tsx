import Header from "@/components/Header";
import ReservasSection from "@/components/ReservasSection";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, SITE_URL } from "@/lib/negocio";

const Reservas = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="Reservar mesa | Casa Tomás Restaurante en Crevillent"
        description="Reserva tu mesa en Casa Tomás, restaurante de cocina tradicional en Crevillent (Alicante). Reservas online rápidas y sencillas."
        canonical={`${SITE_URL}/reservas`}
        keywords={["reservar mesa Crevillent", "reservas Casa Tomás", "reservar restaurante Alicante"]}
      />
      <JsonLd data={breadcrumbSchema([{ nombre: "Reservar mesa", path: "/reservas" }])} />
      <Header />
      <ReservasSection forceShowForm showBackButton />
    </div>
  );
};

export default Reservas;
