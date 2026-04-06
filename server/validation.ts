import Joi from "joi";

// ─── Auth Schemas ──────────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Nome deve ter pelo menos 2 caracteres",
    "string.max": "Nome deve ter no máximo 100 caracteres",
    "any.required": "Nome é obrigatório",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Email inválido",
      "any.required": "Email é obrigatório",
    }),
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Senha deve ter pelo menos 8 caracteres",
    "string.max": "Senha deve ter no máximo 128 caracteres",
    "any.required": "Senha é obrigatória",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Email inválido",
    "any.required": "Email é obrigatório",
  }),
  password: Joi.string().required().messages({
    "any.required": "Senha é obrigatória",
  }),
});

// ─── Incident Schemas ──────────────────────────────────────────────────────
export const createIncidentSchema = Joi.object({
  title: Joi.string().min(3).max(255).required().messages({
    "string.min": "Título deve ter pelo menos 3 caracteres",
    "string.max": "Título deve ter no máximo 255 caracteres",
    "any.required": "Título é obrigatório",
  }),
  description: Joi.string().min(10).max(5000).required().messages({
    "string.min": "Descrição deve ter pelo menos 10 caracteres",
    "string.max": "Descrição deve ter no máximo 5000 caracteres",
    "any.required": "Descrição é obrigatória",
  }),
});

export function validateJoi<T>(schema: Joi.Schema, data: unknown): T {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    throw new Error(messages);
  }
  return value as T;
}
