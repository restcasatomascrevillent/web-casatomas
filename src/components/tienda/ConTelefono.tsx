import { Fragment } from "react";
import { TelLink } from "@/components/TelLink";

/** Pinta un texto de la tienda sustituyendo `{phone}` por el teléfono pulsable del restaurante. */
const ConTelefono = ({ texto, className = "font-medium text-primary underline underline-offset-2" }: { texto: string; className?: string }) => {
  const partes = texto.split("{phone}");
  return (
    <>
      {partes.map((parte, indice) => (
        <Fragment key={indice}>
          {parte}
          {indice < partes.length - 1 && <TelLink className={className} />}
        </Fragment>
      ))}
    </>
  );
};

export default ConTelefono;
