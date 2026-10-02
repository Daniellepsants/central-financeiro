"use client";

import * as React from "react";
import Link from "next/link";
import { Wallet, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* a tela mostra a mesma mensagem de qualquer forma */
    }
    // Mensagem única, tenha a conta existido ou não: dizer "esse e-mail não
    // existe" entregaria a estranhos quem tem acesso ao sistema.
    setEnviado(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Fin-Hub · Avante</h1>
          <p className="text-sm text-neutral-500">Recuperação de senha</p>
        </div>

        {enviado ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600">
              <MailCheck className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900">Verifique seu e-mail</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Se houver uma conta para <strong className="text-neutral-700">{email}</strong>, enviamos um link para
              criar uma senha nova. O link vale por 1 hora.
            </p>
            <p className="mt-3 text-xs text-neutral-400">
              Não chegou? Confira a caixa de spam ou fale com o administrador do sistema.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">
              Informe seu e-mail e enviaremos um link para você criar uma senha nova.
            </p>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@avante.com.br"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        )}

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
