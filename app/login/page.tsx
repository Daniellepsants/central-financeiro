"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const desativado = searchParams.get("desativado") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Não foi possível entrar", description: error.message, variant: "error" });
        setLoading(false);
        return;
      }
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      toast({
        title: "Supabase não configurado",
        description: "Configure as variáveis de ambiente para habilitar o login.",
        variant: "error",
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Fin-Hub · Avante</h1>
          <p className="text-sm text-neutral-500">Central de solicitações financeiras</p>
        </div>

        {desativado && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta conta foi desativada pelo administrador. Se acha que é um engano, fale com o financeiro.
          </div>
        )}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
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
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label htmlFor="password" className="mb-0">
                Senha
              </Label>
              <Link href="/esqueci-senha" className="text-xs text-primary-600 hover:text-primary-700">
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-neutral-400">
          Acesso restrito à equipe Avante. Problemas para entrar? Fale com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
