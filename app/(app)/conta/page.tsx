import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/features/password-form";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Minha conta | Fin-Hub" };

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Minha conta</h1>
        <p className="mt-1 text-sm text-neutral-500">Seus dados de acesso ao sistema.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Nome</dt>
            <dd className="mt-1 text-sm text-neutral-800">{user.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">E-mail</dt>
            <dd className="mt-1 text-sm text-neutral-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Perfil</dt>
            <dd className="mt-1 text-sm text-neutral-800">{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-neutral-400">
          Nome, e-mail e perfil são definidos pelo administrador do sistema.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">Trocar senha</h2>
        <p className="mb-4 mt-1 text-sm text-neutral-500">
          Para sua segurança, confirme a senha atual antes de definir a nova.
        </p>
        <PasswordForm requireCurrent email={user.email} />
      </div>
    </div>
  );
}
