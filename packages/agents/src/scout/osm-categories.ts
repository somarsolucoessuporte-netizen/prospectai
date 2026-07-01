/**
 * Mapeamento de termos em portugues para tags do OpenStreetMap.
 * Permite que o usuario busque "restaurantes" e o sistema traduza para amenity=restaurant.
 */

export interface OsmTag {
  key: string;
  value: string;
}

export const OSM_CATEGORY_MAP: Record<string, OsmTag[]> = {
  // Alimentacao
  restaurante: [{ key: "amenity", value: "restaurant" }],
  restaurantes: [{ key: "amenity", value: "restaurant" }],
  lanchonete: [{ key: "amenity", value: "fast_food" }],
  lanchonetes: [{ key: "amenity", value: "fast_food" }],
  padaria: [{ key: "shop", value: "bakery" }],
  padarias: [{ key: "shop", value: "bakery" }],
  bar: [{ key: "amenity", value: "bar" }],
  bares: [{ key: "amenity", value: "bar" }],
  cafeteria: [{ key: "amenity", value: "cafe" }],
  cafe: [{ key: "amenity", value: "cafe" }],
  pizzaria: [
    { key: "amenity", value: "restaurant" },
    { key: "cuisine", value: "pizza" },
  ],

  // Saude
  clinica: [{ key: "amenity", value: "clinic" }],
  clinicas: [{ key: "amenity", value: "clinic" }],
  "clinicas medicas": [{ key: "amenity", value: "clinic" }],
  dentista: [{ key: "amenity", value: "dentist" }],
  dentistas: [{ key: "amenity", value: "dentist" }],
  farmacia: [{ key: "amenity", value: "pharmacy" }],
  farmacias: [{ key: "amenity", value: "pharmacy" }],
  hospital: [{ key: "amenity", value: "hospital" }],
  medico: [{ key: "amenity", value: "doctors" }],
  medicos: [{ key: "amenity", value: "doctors" }],
  veterinario: [{ key: "amenity", value: "veterinary" }],

  // Beleza e bem-estar
  salao: [{ key: "shop", value: "hairdresser" }],
  "saloes de beleza": [{ key: "shop", value: "hairdresser" }],
  "salao de beleza": [{ key: "shop", value: "hairdresser" }],
  barbearia: [{ key: "shop", value: "barber" }],
  barbearias: [{ key: "shop", value: "barber" }],
  academia: [{ key: "leisure", value: "fitness_centre" }],
  academias: [{ key: "leisure", value: "fitness_centre" }],
  spa: [{ key: "leisure", value: "spa" }],

  // Educacao
  escola: [{ key: "amenity", value: "school" }],
  escolas: [{ key: "amenity", value: "school" }],
  creche: [{ key: "amenity", value: "kindergarten" }],
  universidade: [{ key: "amenity", value: "university" }],
  curso: [{ key: "amenity", value: "college" }],

  // Comercio
  supermercado: [{ key: "shop", value: "supermarket" }],
  supermercados: [{ key: "shop", value: "supermarket" }],
  mercado: [{ key: "shop", value: "convenience" }],
  farmaceutica: [{ key: "shop", value: "chemist" }],
  loja: [{ key: "shop", value: "clothes" }],
  livraria: [{ key: "shop", value: "books" }],
  papelaria: [{ key: "shop", value: "stationery" }],
  petshop: [{ key: "shop", value: "pet" }],
  "pet shop": [{ key: "shop", value: "pet" }],
  "pet shops": [{ key: "shop", value: "pet" }],

  // Servicos
  banco: [{ key: "amenity", value: "bank" }],
  bancos: [{ key: "amenity", value: "bank" }],
  cartorio: [{ key: "amenity", value: "courthouse" }],
  correios: [{ key: "amenity", value: "post_office" }],
  hotel: [{ key: "tourism", value: "hotel" }],
  hoteis: [{ key: "tourism", value: "hotel" }],
  pousada: [{ key: "tourism", value: "guest_house" }],
  posto: [{ key: "amenity", value: "fuel" }],
  "posto de gasolina": [{ key: "amenity", value: "fuel" }],
  "postos de gasolina": [{ key: "amenity", value: "fuel" }],
  oficina: [{ key: "shop", value: "car_repair" }],
  "oficinas mecanicas": [{ key: "shop", value: "car_repair" }],
  mecanica: [{ key: "shop", value: "car_repair" }],

  // Entretenimento
  cinema: [{ key: "amenity", value: "cinema" }],
  teatro: [{ key: "amenity", value: "theatre" }],
  parque: [{ key: "leisure", value: "park" }],
  churrasqueira: [{ key: "amenity", value: "bbq" }],

  // Profissionais liberais
  advogado: [{ key: "office", value: "lawyer" }],
  advogados: [{ key: "office", value: "lawyer" }],
  contador: [{ key: "office", value: "accountant" }],
  contadores: [{ key: "office", value: "accountant" }],
  arquiteto: [{ key: "office", value: "architect" }],
  imobiliaria: [{ key: "office", value: "estate_agent" }],
  imobiliarias: [{ key: "office", value: "estate_agent" }],
};

/**
 * Retorna as tags OSM para uma query do usuario.
 * Faz busca por correspondencia parcial e normaliza acentos.
 */
export function resolveOsmTags(query: string): OsmTag[] | null {
  const normalized = query
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim();

  // Busca exata
  const exact = OSM_CATEGORY_MAP[normalized];
  if (exact) {
    return exact;
  }

  // Busca parcial
  for (const [key, tags] of Object.entries(OSM_CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return tags;
    }
  }

  return null;
}
