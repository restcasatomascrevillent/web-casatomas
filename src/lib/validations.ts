import { MAX_COMENSALES_RESERVA_WEB } from "@/lib/mi-mesa";
import { z } from "zod";

export type ReservationValidationMessages = {
  nameMin: string;
  nameMax: string;
  phoneInvalid: string;
  emailInvalid: string;
  emailMax: string;
  dateRequired: string;
  guestsMin: string;
  guestsMax: string;
  notesMax: string;
  termsRequired: string;
};

export const createReservationSchema = (messages: ReservationValidationMessages) =>
  z.object({
    nombre: z
      .string()
      .trim()
      .min(2, { message: messages.nameMin })
      .max(100, { message: messages.nameMax }),
    telefono: z
      .string()
      .trim()
      .regex(/^\+\d{1,3}\s?\d{6,14}$/, {
        message: messages.phoneInvalid,
      }),
    email: z
      .string()
      .trim()
      .email({ message: messages.emailInvalid })
      .max(255, { message: messages.emailMax }),
    fecha: z.date({
      required_error: messages.dateRequired,
    }),
    hora: z.string().optional(),
    numero_comensales: z
      .number()
      .min(1, { message: messages.guestsMin })
      .max(MAX_COMENSALES_RESERVA_WEB, { message: messages.guestsMax }),
    notas_cliente: z
      .string()
      .max(500, { message: messages.notesMax })
      .optional(),
    /**
     * Aceptación de las condiciones de reserva y la política de privacidad:
     * OBLIGATORIA. Sin ella no se envía nada.
     */
    acepta_condiciones: z.boolean().refine((valor) => valor === true, {
      message: messages.termsRequired,
    }),
    /**
     * Newsletter: casilla aparte, OPCIONAL y desmarcada por defecto. El RGPD
     * y la LSSI exigen que este consentimiento sea libre y específico: no
     * puede ir agrupado con las condiciones ni ser requisito para reservar,
     * así que aquí no hay `refine` — `false` es tan válido como `true`.
     */
    consentimiento_newsletter: z.boolean().default(false),
  });

export type ReservationFormData = z.infer<ReturnType<typeof createReservationSchema>>;
