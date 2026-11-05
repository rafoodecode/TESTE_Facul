import { z } from 'zod'
import { validCpf } from './rules'
const domain = process.env.INSTITUTIONAL_EMAIL_DOMAIN
export const registerSchema = z.object({ nome: z.string().trim().min(3), email: z.string().trim().email().transform(s => s.toLowerCase()).refine(s => !domain || s.endsWith(`@${domain}`), 'Use o e-mail institucional.'), matricula: z.string().trim().min(1), dataNascimento: z.string().date(), senha: z.string().min(12), papel: z.enum(['USUARIO', 'GERENTE']), cpf: z.string().optional(), convite: z.string().optional() }).superRefine((v, ctx) => { if (v.papel === 'GERENTE' && !validCpf(v.cpf || '')) ctx.addIssue({ code: 'custom', path: ['cpf'], message: 'CPF inválido.' }) })
export const bookingSchema = z.object({ localId: z.string().min(1), nomeEvento: z.string().trim().min(2), data: z.string().date(), turno: z.enum(['MANHA', 'TARDE', 'NOITE']) })
