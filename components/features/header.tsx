"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, ChevronDown, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator, DropdownLabel } from "@/components/ui/dropdown";
import { NotificationBell } from "@/components/features/notification-bell";
import { ROLE_LABELS } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

export function Header({ user }: { user: AppUser }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ambiente sem Supabase configurado */
    }
    router.push("/login");
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/solicitacoes?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white/80 px-4 md:px-6 backdrop-blur">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nº, cliente, CNPJ/CPF, título…"
            className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell userId={user.id} />
        <Dropdown>
          <DropdownTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100">
              <Avatar name={user.full_name} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-neutral-800 leading-tight">{user.full_name}</p>
                <p className="text-xs text-neutral-400 leading-tight">{ROLE_LABELS[user.role]}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </button>
          </DropdownTrigger>
          <DropdownContent className="w-56">
            <DropdownLabel>{user.email}</DropdownLabel>
            <DropdownSeparator />
            <DropdownItem onClick={() => router.push("/conta")}>
              <UserCog className="h-4 w-4" /> Minha conta
            </DropdownItem>
            <DropdownItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4" /> Sair
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
