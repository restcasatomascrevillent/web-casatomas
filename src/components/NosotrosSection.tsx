import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ChefHat } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useTranslations } from "@/i18n/LanguageProvider";
import { ENLACES_ESPECIALIDADES } from "@/lib/carta-seo";
import { categoriaPorSlug, rutaCategoria } from "@/lib/carta-rutas";

const NosotrosSection = () => {
  const { t, language } = useTranslations();
  // Enlaces de texto a las especialidades, solo a categorías que existen en el build.
  const especialidades = ENLACES_ESPECIALIDADES[language];
  const enlaces = especialidades.enlaces.filter((enlace) => categoriaPorSlug(enlace.slug));
  const equipo = t.nosotros.team.map((persona, index) => ({
    ...persona,
    icon: index === 0 ? Crown : index === 1 ? Users : ChefHat,
  }));

  return (
    <section id="nosotros" className="py-20 px-4 md:px-8 lg:px-16 bg-background">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        {/* Historia del Restaurante */}
        <div className="text-center mb-16">
          <motion.h2
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-6"
          >
            {t.nosotros.title}
          </motion.h2>
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto space-y-6 text-left"
          >
            {t.nosotros.intro.map((paragraph, index) => (
              <p key={index} className="text-lg text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
            {enlaces.length > 0 && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {especialidades.antes}
                {enlaces.map((enlace, indice) => (
                  <Fragment key={enlace.slug}>
                    {indice > 0 && (indice === enlaces.length - 1 ? especialidades.ultimo : especialidades.separador)}
                    <Link to={rutaCategoria(enlace.slug, language)} className="text-accent underline underline-offset-4 hover:text-primary">
                      {enlace.texto}
                    </Link>
                  </Fragment>
                ))}
                {especialidades.despues}
              </p>
            )}

            <div className="pt-6">
              <h3 className="text-2xl font-bold text-primary mb-4">{t.nosotros.moreTitle}</h3>
              {t.nosotros.moreBody.map((paragraph, index) => (
                <p
                  key={index}
                  className={`text-lg text-muted-foreground leading-relaxed${index === 0 ? " mb-4" : ""}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-6">
              <h3 className="text-2xl font-bold text-primary mb-4">{t.nosotros.legacyTitle}</h3>
              {t.nosotros.legacyBody.map((paragraph, index) => (
                <p
                  key={index}
                  className={`text-lg text-muted-foreground leading-relaxed${index === 0 ? " mb-4" : ""}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Equipo */}
        <div>
          <motion.h3
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-primary text-center mb-12"
          >
            {t.nosotros.teamTitle}
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {equipo.map((persona, index) => {
              const IconComponent = persona.icon;
              return (
                <motion.div
                  key={index}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center mb-4">
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
