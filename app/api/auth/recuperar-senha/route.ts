import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

/**
 * Dispara o e-mail de "esqueci minha senha".
 *
 * Roda no servidor de propósito. O cliente de SSR usa o fluxo PKCE, que amarra
 * o link ao mesmo navegador que pediu a recuperação — quem pedisse no
 * computador e abrisse o e-mail no celular ficaria travado. O cliente puro do
 * supabase-js usa o fluxo implícito, e aí o link funciona em qualquer lugar.
 *
 * A resposta é sempre a mesma, exista a conta ou não: responder diferente
 * transformaria esta rota num verificador de quem tem acesso ao sistema.
 */
export async function POST(request: Request) {
  const sempreOk = NextResponse.json({ ok: true });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return sempreOk;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!url || !anonKey) {
    console.error("[recuperar-senha] Supabase não configurado.");
    return sempreOk;
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl || ""}/redefinir-senha`,
    });
    if (error) console.error("[recuperar-senha] Falha ao enviar:", error.message);
  } catch (err) {
    console.error("[recuperar-senha] Erro inesperado:", err);
  }

  return sempreOk;
}
