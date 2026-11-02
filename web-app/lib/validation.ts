import { z } from 'zod';

/** Same rule as the API: 8+ characters with an uppercase and a lowercase letter, a digit and one of @$!%*?& */
export const passwordRule = z
  .string()
  .min(8, 'Pelo menos 8 caracteres')
  .regex(/[a-z]/, 'Inclua uma letra minúscula')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
  .regex(/\d/, 'Inclua um número')
  .regex(/[@$!%*?&]/, 'Inclua um destes caracteres: @ $ ! % * ? &');

export const PASSWORD_HINT = 'Pelo menos 8 caracteres, com maiúscula, minúscula, número e um destes: @ $ ! % * ? &';

/** Email or phone number, as typed (the API recognises both, in any common format). */
export const identifierRule = z.string().trim().min(3, 'Indique o seu email ou número de telefone');

export const newPasswordForm = z
  .object({
    password: passwordRule,
    confirmPassword: z.string()
  })
  .refine((v) => v.password === v.confirmPassword, { message: 'As palavras-passe não coincidem', path: ['confirmPassword'] });
