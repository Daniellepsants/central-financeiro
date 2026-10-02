import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import { redirect } from "next/navigation";

/** Retorna o usuário autenticado (perfil da tabela public.users) ou null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
    // Perfil desativado conta como deslogado; o middleware encerra a sessão.
    if (!profile || profile.active === false) return null;
    return profile as AppUser;
  } catch {
    return null;
  }
}

/** Igual a getCurrentUser, mas redireciona para /login se não houver sessão. Uso em páginas protegidas. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "administrador") redirect("/dashboard");
  return user;
}
