import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ChefHat, Heart, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const NosotrosSection = () => {
  const equipo = [
    {
      nombre: "Tomás",
      rol: "Jefe y Dueño del Restaurante",
      descripcion:
        "Con más de 30 años de experiencia, Tomás ha convertido la tradición familiar en un arte culinario único. Su pasión por los productos locales de su tierra y las recetas tradicionales es el corazón de Casa Tomás.",
      icon: Crown,
      imagen: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop",
    },
    {
      nombre: "Hugo",
      rol: "La Siguiente Generación",
      descripcion:
        "Mano izquierda de Tomás, Hugo representa la nueva generación que honra la tradición mientras aporta su energía y visión fresca al servicio del restaurante.",
      icon: Users,
      imagen: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    },
    {
      nombre: "Antxon",
      rol: "Jefe de Cocina",
      descripcion:
        "Experto en la perfecta ejecución de cada plato, Antxon lidera nuestro equipo de cocina con maestría y dedicación, asegurando la excelencia en cada servicio.",
      icon: ChefHat,
      imagen: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400&h=400&fit=crop",
    },
  ];

  return (
    <section id="nosotros" className="py-20 px-4 md:px-8 lg:px-16 bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        {/* Historia del Restaurante */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-6"
          >
            Nuestra Historia
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <p className="text-lg text-muted-foreground leading-relaxed">
              Allá por 1998, Tomás Vázquez González dejó su tierra, A Touza (Ourense), para empezar una nueva vida en Crevillente. Venía con una maleta llena de ilusión y una idea muy clara: levantar un bar familiar donde se comiera bien y se sintiera aún mejor.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Ese sueño empezó en el antiguo Bar Manuel, el bar de sus tíos Rosa y Manuel, que confiaron en Tomás para seguir dando vida a aquel pequeño rincón del poble. Con el tiempo pasó a llamarse Bar Tomás, y ese toque gallego que Tomás trajo consigo convirtió aquella esquina en un lugar especial para muchos vecinos.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Los años, el boca a boca y el cariño de la gente hicieron posible dar un paso más: de bar familiar a restaurante. Así nació Casa Tomás, en la calle Santa María de la Cabeza, donde seguimos hoy, intentando que cada visita se sienta como llegar a casa.
            </p>

            <div className="pt-6">
              <h3 className="text-2xl font-bold text-primary mb-4">Mucho más que un restaurante</h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Casa Tomás siempre ha sido un lugar sencillo, cercano y muy nuestro.
                El amor por la gastronomía y las inquietudes profesionales de Tomás han hecho que el restaurante no deje de evolucionar:
                productos de calidad, recetas cuidadas al detalle y un trato de tú a tú con cada persona que se sienta a la mesa.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Las ampliaciones del local han llegado gracias a todos aquellos que han querido venir a probar nuestras recetas y repetir una y otra vez. Poco a poco, Casa Tomás se ha convertido en un pequeño referente gastronómico en la provincia de Alicante, sin perder nunca su esencia de bar de barrio de toda la vida.
              </p>
            </div>

            <div className="pt-6">
              <h3 className="text-2xl font-bold text-primary mb-4">De padres a hijos</h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Hoy, la historia continúa de la manera más bonita posible:
                Hugo, el hijo de Tomás, está mano a mano con su padre en el día a día del restaurante, aprendiendo todo lo que puede –desde lo más sencillo hasta los pequeños detalles que hacen que cada cliente se sienta especial.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Casa Tomás es, al final, eso: la evolución personal y profesional de una familia que ama la cocina tradicional y que, desde 1998, tiene un único objetivo:
                que cada persona que se siente en nuestra casa viva una experiencia cercana, sabrosa y difícil de olvidar.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Equipo */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-primary text-center mb-12"
          >
            Nosotros
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {equipo.map((persona, index) => {
              const IconComponent = persona.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20">
                          <AvatarImage src={persona.imagen} alt={persona.nombre} />
                          <AvatarFallback className="text-2xl bg-accent/10 text-accent">
                            {persona.nombre.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="mb-3">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-2">
                            <IconComponent className="w-6 h-6 text-accent" />
                          </div>
                        </div>
                        <h4 className="text-xl font-bold mb-1">{persona.nombre}</h4>
                        <p className="text-sm text-accent font-medium mb-3">{persona.rol}</p>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-center">{persona.descripcion}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default NosotrosSection;
