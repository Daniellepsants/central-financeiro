"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordForm } from "@/components/features/password-form";

type Estado = "verificando" | "pronto" | "invalido";

/**
 * Tela onde a pessoa define a senha nova depois de clicar no link do e-mail.
 *
 * O Supabase valida o token e redireciona para cá com a sessão no FRAGMENTO da
 * URL (#access_token=...). O navegador nunca envia fragmento ao servidor, então
 * esta página é pública no middleware e quem lê a sessão é o supabase-js aqui
 * no cliente. Por isso também existe o estado "verificando": a leitura do
 * fragmento é assíncrona e acontece depois da primeira renderização.
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = React.useState<Estado>("verificando");
  const [motivo, setMotivo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    // Link expirado ou já usado: o Supabase devolve o erro no próprio fragmento.
    if (hash.get("error")) {
      const codigo = hash.get("error_code");
      setMotivo(
        codigo === "otp_expired"
          ? "Este link expirou. Os links de recuperação valem por 1 hora."
          : hash.get("error_description")?.replace(/\+/g, " ") || "Este link não é mais válido."
      );
      setEstado("invalido");
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setMotivo("Não encontramos um link de recuperação válido nesta página.");
      setEstado("invalido");
      return;
    }

    let vivo = true;

    (async () => {
      try {
        const supabase = createClient();

        // Os tokens são lidos e aplicados à mão, em vez de deixar o supabase-js
        // detectar sozinho: o cliente do @supabase/ssr é fixado em flowType
        // "pkce" e recusa explicitamente uma sessão vinda no fragmento
        // ("Not a valid PKCE flow url"). O setSession valida os tokens e grava
        // a sessão nos cookies, que é o que o middleware e o servidor leem.
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!vivo) return;

        if (error) {
          setMotivo("Este link expirou ou já foi usado. Peça um novo para continuar.");
          setEstado("invalido");
          return;
        }

        // Tira os tokens da barra de endereços e do histórico do navegador.
        window.history.replaceState(window.history.state, "", window.location.pathname);
        setEstado("pronto");
      } catch {
        if (!vivo) return;
        setMotivo("O sistema está sem as credenciais do Supabase configuradas.");
        setEstado("invalido");
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Fin-Hub · Avante</h1>
          <p className="text-sm text-neutral-500">Criar uma senha nova</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {estado === "verificando" && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando o link…
            </div>
          )}

          {estado === "invalido" && (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-neutral-900">Link inválido</h2>
              <p className="mt-2 text-sm text-neutral-500">{motivo}</p>
              <Link
                href="/esqueci-senha"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Pedir um link novo
              </Link>
            </div>
          )}

          {estado === "pronto" && (
            <>
              <p className="mb-4 text-sm text-neutral-500">Escolha a senha que você vai usar a partir de agora.</p>
              <PasswordForm
                submitLabel="Salvar e entrar"
                onSuccess={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
              />
            </>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
