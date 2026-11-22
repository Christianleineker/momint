"use client";
import { alerta } from "@/lib/alertas";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { MoreHorizontal, UserPlus, Users } from "lucide-react";
import { Badge, Botao, Card, CardTitulo, type Tom } from "@/components/ui";
import { CampoSenha } from "@/components/CampoSenha";
import { Modal } from "@/components/Modal";
import { enviar, lerJson } from "@/lib/api";

type Usuario = { id: string; nome: string; email: string; papel: string; ativo: boolean };

const PAPEL: Record<string, { rotulo: string; tom: Tom }> = {
  ADMIN: { rotulo: "Administrador", tom: "vermelho" },
  GESTOR: { rotulo: "Gestor", tom: "roxo" },
  VENDEDOR: { rotulo: "Vendedor", tom: "azul" },
  ATENDENTE: { rotulo: "Atendente", tom: "cinza" },
};
const campo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-acento focus:ring-2 focus:ring-blue-100";
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).map((parte) => parte[0]).slice(0, 2).join("");

/** Equipe do sistema: lista os usuários da API e cadastra novos (POST /api/usuarios). */
export function EquipeCard({ podeGerir }: { podeGerir: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<{ usuarios: Usuario[] }>("/api/configuracoes", lerJson);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const usuarios = data?.usuarios ?? [];

  function abrir() { setAberto(true); }
  function fechar() { if (!salvando) setAberto(false); }

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    const f = new FormData(event.currentTarget);
    setSalvando(true);
    try {
      await enviar("/api/usuarios", "POST", { nome: f.get("nome"), email: f.get("email"), senha: f.get("senha"), papel: f.get("papel") });
      await mutate();
      setAberto(false);
      alerta.sucesso("Usuário criado. Ele já pode entrar com o e-mail e a senha definidos.");
    } catch (e) {
      alerta.falha(e, "Não foi possível criar o usuário.");
    } finally {
      setSalvando(false);
    }
  }

  const subtitulo = isLoading ? "Carregando equipe..." : `${usuarios.length} ${usuarios.length === 1 ? "usuário" : "usuários"} com acesso ao Momint`;

  return (
    <Card className="lg:col-span-2">
      <CardTitulo icone={Users} titulo="Equipe" subtitulo={subtitulo} extra={podeGerir && <Botao onClick={abrir}><UserPlus aria-hidden="true" className="h-4 w-4" /> Adicionar usuário</Botao>} />
      {error && !isLoading && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">Não foi possível carregar a equipe. <button type="button" className="font-medium underline" onClick={() => void mutate()}>Tentar novamente</button></div>}
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nome</th>
              <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
              <th scope="col" className="px-4 py-3 font-medium">Papel</th>
              <th scope="col" className="px-4 py-3 font-medium">Situação</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => {
              const papel = PAPEL[u.papel] ?? { rotulo: u.papel, tom: "cinza" as const };
              return (
                <tr key={u.id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acento/10 text-xs font-semibold text-acento">{iniciais(u.nome)}</span>
                      <span className="font-semibold text-navy">{u.nome}</span>
                    </div>
                  </td>
                  <td className="break-all px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><Badge tom={papel.tom}>{papel.rotulo}</Badge></td>
                  <td className="px-4 py-3"><Badge tom={u.ativo ? "verde" : "cinza"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" aria-label={`Ações de ${u.nome}`} title="Ações" className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy">
                      <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Carregando equipe...</td></tr>}
            {!isLoading && !error && !usuarios.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Nenhum usuário cadastrado neste sistema.</td></tr>}
          </tbody>
        </table>
      </div>

      {aberto && (
        <Modal titulo="Adicionar usuário" ocupado={salvando} fechar={fechar}>
          <form onSubmit={criar} className="space-y-4">
            <fieldset disabled={salvando} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Nome<input name="nome" className={campo} minLength={2} maxLength={120} required autoFocus /></label>
                <label className="block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="off" className={campo} maxLength={254} required /></label>
              </div>
              <CampoSenha autoComplete="new-password" minLength={12} rotulo="Senha inicial" placeholder="Pelo menos 12 caracteres" />
              <label className="block text-sm font-medium">Papel
                <select name="papel" defaultValue="VENDEDOR" className={campo}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ATENDENTE">Atendente</option>
                  <option value="GESTOR">Gestor do sistema</option>
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Senha de 12 a 72 caracteres. No primeiro acesso, a pessoa pode manter essa senha ou definir outra.</p>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Botao type="button" variante="secundario" disabled={salvando} onClick={fechar}>Cancelar</Botao>
              <Botao type="submit" disabled={salvando}><UserPlus aria-hidden="true" className="h-4 w-4" />{salvando ? "Criando..." : "Criar usuário"}</Botao>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
