// Fit de ICP (regra 1): E lógico entre CNAE, porte, região, situação e idade.
import { arredondar2, DIA_MS } from "../shared/numeros.js";

export interface PerfilIcp {
  cnaes: string[];
  portes: string[];
  latBase: number;
  lngBase: number;
  raioKm: number;
  idadeMinAnos: number;
  idadeMaxAnos: number;
  situacaoExigida: string;
}

export interface EmpresaFirmografia {
  cnae: string;
  porte: string;
  situacao: string;
  dataInicioAtividade: Date;
  lat: number | null;
  lng: number | null;
}

export interface CriteriosFit {
  cnae: boolean;
  porte: boolean;
  regiao: boolean;
  situacao: boolean;
  idade: boolean;
}

export interface ResultadoFit {
  apto: boolean;
  criterios: CriteriosFit;
  distanciaKm: number | null;
  idadeAnos: number;
  /** 0..1 — quão "no centro" do ICP a empresa está (0 se não apto) */
  forca: number;
}

export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function idadeEmAnos(inicio: Date, hoje: Date): number {
  return (hoje.getTime() - inicio.getTime()) / (365.25 * DIA_MS);
}

export function avaliarFit(empresa: EmpresaFirmografia, icp: PerfilIcp, hoje: Date): ResultadoFit {
  const dist = empresa.lat != null && empresa.lng != null ? distanciaKm(icp.latBase, icp.lngBase, empresa.lat, empresa.lng) : null;
  const idade = idadeEmAnos(empresa.dataInicioAtividade, hoje);

  const criterios: CriteriosFit = {
    cnae: icp.cnaes.includes(empresa.cnae),
    porte: icp.portes.includes(empresa.porte),
    regiao: dist != null && dist <= icp.raioKm,
    situacao: empresa.situacao.toUpperCase() === icp.situacaoExigida.toUpperCase(),
    idade: idade >= icp.idadeMinAnos && idade <= icp.idadeMaxAnos,
  };
  const apto = Object.values(criterios).every(Boolean);

  // Força: proximidade da base pesa mais; porte "DEMAIS" (médio/grande) um pouco acima.
  const proximidade = dist != null ? Math.max(0, 1 - dist / icp.raioKm) : 0;
  const forca = apto ? arredondar2(0.6 + 0.3 * proximidade + (empresa.porte === "DEMAIS" ? 0.1 : 0.05)) : 0;

  return { apto, criterios, distanciaKm: dist != null ? arredondar2(dist) : null, idadeAnos: arredondar2(idade), forca: Math.min(1, forca) };
}
