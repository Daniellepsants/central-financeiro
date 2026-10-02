import { z } from "zod";
import { AUTHORIZATION_RESPONSIBLES } from "./types";

/**
 * Tamanho mínimo de senha aceito pelo sistema.
 *
 * Precisa acompanhar o GOTRUE_PASSWORD_MIN_LENGTH configurado no Supabase.
 * Se os dois divergirem, a tela valida uma regra e o servidor aplica outra,
 * e o usuário leva um erro que a interface disse que não existia.
 */
export const PASSWORD_MIN_LENGTH = 8;

// O título é gerado automaticamente no servidor a partir do tipo de
// solicitação e do nome do cliente (ver app/api/requests/route.ts), então
// não é mais um campo obrigatório vindo do cliente — se enviado, é ignorado.
export const createRequestSchema = z.object({
  title: z.string().optional(),
  company_id: z.string().uuid("Selecione a empresa solicitante."),
  client_type: z.enum(["pessoa_fisica", "pessoa_juridica"]),
  document: z.string().min(11, "Informe um CPF/CNPJ válido."),
  client_name: z.string().min(2, "Informe o nome do cliente."),
  distributor: z.string().nullable().optional(),
  request_type: z.enum(["cancelamento", "renegociacao", "parcial", "geracao_boletos", "desconto"]),
  authorization_responsible: z.enum(AUTHORIZATION_RESPONSIBLES).nullable().optional(),
  total_amount: z.number().nullable().optional(),
  discount_amount: z.number().nullable().optional(),
  payment_method: z.enum(["boleto", "pix", "cartao", "transferencia", "outro"]).nullable().optional(),
  invoice_numbers: z.string().nullable().optional(),
  reason: z.string().min(3, "Descreva o motivo da solicitação."),
  details: z.string().nullable().optional(),
  type_specific_data: z.record(z.any()).optional(),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
  attachment_ids: z.array(z.string().uuid()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "nova",
    "em_analise",
    "em_validacao",
    "aguardando_informacoes",
    "aguardando_responsavel",
    "aprovada",
    "reprovada",
    "cancelada",
    "concluida",
  ]),
});

export const updateAssigneeSchema = z.object({
  assignee_id: z.string().uuid().nullable(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, "Escreva um comentário."),
  mentioned_user_ids: z.array(z.string().uuid()).optional(),
  attachment_ids: z.array(z.string().uuid()).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(["solicitante", "analista_financeiro", "administrador"]),
  password: z.string().min(PASSWORD_MIN_LENGTH).optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  role: z.enum(["solicitante", "analista_financeiro", "administrador"]).optional(),
  active: z.boolean().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(2),
});
