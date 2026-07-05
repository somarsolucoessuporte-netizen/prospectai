/**
 * Converte um telefone em um link direto do WhatsApp (wa.me).
 *
 * Numeros brasileiros no OSM costumam vir como "+55 85 3224 8575" — o
 * prefixo "55" precisa aparecer uma unica vez no link, entao so e
 * adicionado se os digitos extraidos ainda nao comecarem com ele.
 */
export function toWhatsAppLink(
  phone: string | null | undefined,
  message?: string | null
): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${withCountryCode}`;

  if (message && message.trim().length > 0) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }

  return base;
}
