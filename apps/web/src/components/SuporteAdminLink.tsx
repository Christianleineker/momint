"use client";
import Link from "next/link";
import useSWR from "swr";
import { MessageCircle } from "lucide-react";
import { lerJson } from "@/lib/api";
export function SuporteAdminLink() {
  const { data } = useSWR<{ naoLidas: number }>("/api/admin/suporte", lerJson, { refreshInterval: 5000 });
  return <Link href="/admin/suporte" className="relative inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-blue-50 hover:text-acento"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Atendimentos</span>{!!data?.naoLidas && <span className="rounded-full bg-red-500 px-1.5 text-[10px] leading-4 text-white">{data.naoLidas > 99 ? "99+" : data.naoLidas}</span>}</Link>;
}
