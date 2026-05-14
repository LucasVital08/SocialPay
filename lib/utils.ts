import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RESERVED_HANDLES = new Set([
  "admin",
  "root",
  "stellar",
  "socialpay",
  "support",
  "suporte",
  "binance",
  "coinbase",
  "api",
  "app",
  "demo",
  "feed",
  "receipt",
]);

export function validateHandle(handle: string): string | null {
  const raw = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!raw) return "Handle é obrigatório";
  if (!/^[a-z0-9._-]+$/i.test(raw)) {
    return "Handle aceita apenas letras, números, ponto, hífen e underline";
  }
  if (raw.length < 3) return "Handle deve ter pelo menos 3 caracteres";
  if (raw.length > 30) return "Handle deve ter no máximo 30 caracteres";
  if (RESERVED_HANDLES.has(raw.toLowerCase())) {
    return "Este handle é reservado";
  }
  return null;
}

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").toLowerCase();
}

export function formatHandle(handle: string): string {
  return `@${handle.replace(/^@/, "")}`;
}

export function abbreviateKey(key: string, chars = 8): string {
  if (!key || key.length <= chars * 2) return key;
  return `${key.slice(0, chars)}...${key.slice(-chars)}`;
}

export function abbreviateHash(hash: string, chars = 8): string {
  if (!hash || hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatAmount(amount: string | number): string {
  return Number(amount).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}
