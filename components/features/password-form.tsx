"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";

interface PasswordFormProps {
  /**
   * Pede a senha atual antes de trocar. Usado na tela "Minha conta": sem isso,
   * quem passasse por um computador destravado trocaria a senha da pessoa.
   * No fluxo de recuperação fica desligado, porque ali a prova de identidade
   * é o próprio link recebido por e-mail.
   */
  requireCurrent?: boolean;
  /** Necessário para conferir a senha atual. */
  email?: string;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function PasswordForm({ requireCurrent, email, onSuccess, submitLabel = "Salvar nova senha" }: PasswordFormProps) {
  const { toast } = useToast();
  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const curta = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const diferentes = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < PASSWORD_MIN_LENGTH) {
      toast({
        title: "Senha muito curta",
        description: `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
        variant: "error",
      });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (requireCurrent) {
        if (!email) {
          toast({ title: "Não foi possível confirmar sua identidade", variant: "error" });
          setLoading(false);
          return;
        }
        const { error: erroAtual } = await supabase.auth.signInWithPassword({ email, password: current });
        if (erroAtual) {
          toast({ title: "Senha atual incorreta", description: "Confira e tente de novo.", variant: "error" });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Não foi possível trocar a senha", description: error.message, variant: "error" });
        setLoading(false);
        return;
      }

      toast({ title: "Senha alterada", description: "Use a senha nova no próximo acesso.", variant: "success" });
      setCurrent("");
      setPassword("");
      setConfirm("");
      onSuccess?.();
    } catch {
      toast({
        title: "Supabase não configurado",
        description: "Configure as variáveis de ambiente para habilitar a troca de senha.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {requireCurrent && (
        <div>
          <Label htmlFor="senha-atual">Senha atual</Label>
          <Input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      )}

      <div>
        <Label htmlFor="senha-nova">Nova senha</Label>
        <Input
          id="senha-nova"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <p className={`mt-1.5 text-xs ${curta ? "text-red-600" : "text-neutral-500"}`}>
          Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
        </p>
      </div>

      <div>
        <Label htmlFor="senha-confirma">Repita a nova senha</Label>
        <Input
          id="senha-confirma"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
        {diferentes && <p className="mt-1.5 text-xs text-red-600">As duas senhas estão diferentes.</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
