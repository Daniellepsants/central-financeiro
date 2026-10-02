import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que respondem sem sessão. As duas de senha precisam estar aqui por um
// motivo específico: no fluxo de recuperação a sessão chega no fragmento da
// URL (#access_token=...), que o navegador nunca envia ao servidor. Se o
// middleware exigisse sessão, ele mandaria a pessoa para o /login antes de o
// JavaScript da página conseguir ler o fragmento.
const PUBLIC_PATHS = ["/login", "/api/health", "/esqueci-senha", "/redefinir-senha", "/api/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas: deixa passar sem checar sessão (ambiente sem Supabase real).
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Usuário desativado (users.active = false) é deslogado à força aqui, e não
  // apenas barrado nas páginas: o Supabase Auth não conhece o campo active,
  // então a sessão dele continuaria válida. Se só as páginas o expulsassem
  // para /login, o redirecionamento de "logado em /login → /dashboard" logo
  // abaixo criaria um loop infinito entre as duas rotas.
  if (user) {
    const { data: profile } = await supabase.from("users").select("active").eq("id", user.id).single();
    if (profile && profile.active === false) {
      await supabase.auth.signOut();
      // O signOut grava a limpeza dos cookies em `response` (via handlers
      // acima); um redirect novo não os carregaria e o navegador continuaria
      // com a sessão. Copiamos os cookies para o redirect antes de devolver.
      const redirect = NextResponse.redirect(new URL("/login?desativado=1", request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  if (!user && !isPublic && !pathname.startsWith("/_next")) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
