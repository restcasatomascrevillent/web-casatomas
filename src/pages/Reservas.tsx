import Header from "@/components/Header";
import ReservasSection from "@/components/ReservasSection";

const Reservas = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <ReservasSection forceShowForm showBackButton />
    </div>
  );
};

export default Reservas;
