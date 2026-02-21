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
      .max(20, { message: messages.guestsMax }),
    notas_cliente: z
      .string()
      .max(500, { message: messages.notesMax })
      .optional(),
  });

export type ReservationFormData = z.infer<ReturnType<typeof createReservationSchema>>;
