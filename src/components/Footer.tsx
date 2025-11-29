import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-dark-slate text-background py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Casa Tomás</h3>
            <p className="text-stone text-sm leading-relaxed">
              Tradición familiar convertida en arte culinario desde hace más de 30 años.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-stone">
              <li>
                <a href="#carta" className="hover:text-accent transition-colors">
                  Nuestra Carta
                </a>
              </li>
              <li>
                <Link to="/reservas" className="hover:text-accent transition-colors">
                  Reservar Mesa
                </Link>
              </li>
              <li>
                <a href="https://restaurantecasatomascrevillente.es/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  Sitio Web
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-stone">
              <li>966 10 78 87</li>
              <li>casatomascrevillent@gmail.com</li>
              <li>Carrer Santa Maria de la Cabeza, 2</li>
              <li>03330 Crevillent, Alicante</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-mid-gray pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone">
            © 2025 Casa Tomás Restaurante. Todos los derechos reservados.
          </p>
          
          <div className="flex gap-4 items-center">
            <a href="/admin/login" className="text-xs text-stone hover:text-accent transition-colors">
              Administración
            </a>
            <span className="text-stone">|</span>
            <Button variant="link" className="text-xs text-stone hover:text-accent p-0 h-auto">
              Términos y Condiciones
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
