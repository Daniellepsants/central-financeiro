import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

/** Recupera o usuário autenticado (com perfil/role) dentro de um Route Handler. */
export async function getAuthedUser(): Promise<
  { user: AppUser; supabase: ReturnType<typeof createClient> } | null
> {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  // Perfil desativado conta como deslogado; o middleware encerra a sessão.
  if (!profile || profile.active === false) return null;

  return { user: profile as AppUser, supabase };
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Você não tem permissão para esta ação." }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Não encontrado.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(err: unknown) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Define request.actor_id na sessão do Postgres para a conexão atual, usado
 * pelo trigger de histórico (log_request_status_change) para saber quem
 * fez a alteração. Precisa ser chamado com o mesmo client usado na query
 * seguinte (mesma conexão/transação).
 */
export async function setDbActor(supabase: ReturnType<typeof createClient>, userId: string) {
  await supabase.rpc("set_config_actor", { actor_id: userId }).then(
    () => {},
    () => {} // função pode não existir ainda; ver nota abaixo
  );
}
