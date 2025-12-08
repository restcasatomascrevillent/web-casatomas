import { z } from "zod";

export const reservationSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  telefono: z
    .string()
    .trim()
    .regex(/^(\+34|0034|34)?[6789]\d{8}$/, {
      message: "Ingresa un teléfono válido (ej: 612345678)",
    }),
  email: z
    .string()
    .trim()
    .email({ message: "Ingresa un email válido" })
    .max(255, { message: "El email no puede exceder 255 caracteres" }),
  fecha: z.date({
    required_error: "Selecciona una fecha",
  }),
  hora: z.string().optional(),
  numero_comensales: z
    .number()
    .min(1, { message: "Mínimo 1 comensal" })
    .max(20, { message: "Máximo 20 comensales" }),
  sala_id: z.string().min(1, { message: "Selecciona una sala" }),
  notas_cliente: z
    .string()
    .max(500, { message: "Las notas no pueden exceder 500 caracteres" })
    .optional(),
});
