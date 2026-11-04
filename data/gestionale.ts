// Gestionale finto della demo: clienti e rete di convenzionati. Tutto inventato:
// persone, polizze, aziende e numeri di telefono non esistono. Le coordinate sono indicative.
import type { TipoIntervento } from "@/lib/tipi";

export type Posizione = { lat: number; lon: number };

export type Cliente = {
  id: string;
  nome: string;
  polizza: string;
  telefono: string | null;
  indirizzo: string;
  citta: string;
  posizione: Posizione;
};

export type Convenzionato = {
  id: string;
  nome: string;
  tipo: Exclude<TipoIntervento, "nessuno">;
  citta: string;
  zona: string;
  telefono: string;
  posizione: Posizione;
};

/** Centro delle città servite, per quando si conosce solo la città. */
export const CITTA: Record<string, Posizione> = {
  Milano: { lat: 45.4642, lon: 9.19 },
  Torino: { lat: 45.0703, lon: 7.6869 },
  Bologna: { lat: 44.4949, lon: 11.3426 },
};

export const CLIENTI: readonly Cliente[] = [
  {
    id: "c01",
    nome: "Giulia Ferrandi",
    polizza: "CA-48213",
    telefono: null,
    indirizzo: "Via Padova 85",
    citta: "Milano",
    posizione: { lat: 45.4985, lon: 9.2245 },
  },
  {
    id: "c02",
    nome: "Chiara Bosio",
    polizza: "CA-51907",
    telefono: "+39 347 000 1122",
    indirizzo: "Via Nizza 112",
    citta: "Torino",
    posizione: { lat: 45.0525, lon: 7.6745 },
  },
  {
    id: "c03",
    nome: "Paolo Mezzadri",
    polizza: "CA-33071",
    telefono: null,
    indirizzo: "Via Washington 50",
    citta: "Milano",
    posizione: { lat: 45.4645, lon: 9.1495 },
  },
  {
    id: "c04",
    nome: "Sara Colombetti",
    polizza: "CA-27740",
    telefono: null,
    indirizzo: "Corso Vercelli 14",
    citta: "Milano",
    posizione: { lat: 45.4679, lon: 9.1635 },
  },
  {
    id: "c05",
    nome: "Renato Cavallini",
    polizza: "CA-19458",
    telefono: null,
    indirizzo: "Via San Donato 60",
    citta: "Torino",
    posizione: { lat: 45.0805, lon: 7.6655 },
  },
  {
    id: "c06",
    nome: "Anna Brugnoli",
    polizza: "CA-40322",
    telefono: null,
    indirizzo: "Via Mazzini 98",
    citta: "Bologna",
    posizione: { lat: 44.4905, lon: 11.3605 },
  },
  {
    id: "c07",
    nome: "Marco Venturelli",
    polizza: "CA-55816",
    telefono: null,
    indirizzo: "Viale Monza 120",
    citta: "Milano",
    posizione: { lat: 45.4985, lon: 9.2215 },
  },
  {
    id: "c08",
    nome: "Davide Rinetti",
    polizza: "CA-39044",
    telefono: "+39 328 000 9900",
    indirizzo: "Via Saragozza 140",
    citta: "Bologna",
    posizione: { lat: 44.4895, lon: 11.3215 },
  },
  {
    id: "c09",
    nome: "Elena Sartori",
    polizza: "CA-60218",
    telefono: "+39 349 000 3344",
    indirizzo: "Corso Buenos Aires 40",
    citta: "Milano",
    posizione: { lat: 45.4795, lon: 9.2105 },
  },
  {
    id: "c10",
    nome: "Luca Rinaldini",
    polizza: "CA-12087",
    telefono: null,
    indirizzo: "Corso Francia 75",
    citta: "Torino",
    posizione: { lat: 45.0765, lon: 7.6505 },
  },
  {
    id: "c11",
    nome: "Giorgio Lanfranchi",
    polizza: "CA-44610",
    telefono: "+39 333 000 4455",
    indirizzo: "Via Tortona 33",
    citta: "Milano",
    posizione: { lat: 45.4535, lon: 9.1665 },
  },
];

/** Due convenzionati per tipo in ogni città, in zone diverse, per far vedere la scelta del più vicino. */
export const CONVENZIONATI: readonly Convenzionato[] = [
  // Milano
  { id: "f01", nome: "Idraulica Ferri", tipo: "idraulico", citta: "Milano", zona: "Loreto", telefono: "02 0000 1101", posizione: { lat: 45.4865, lon: 9.2165 } },
  { id: "f02", nome: "Tubi Sicuri Barona", tipo: "idraulico", citta: "Milano", zona: "Barona", telefono: "02 0000 1102", posizione: { lat: 45.4365, lon: 9.1615 } },
  { id: "f03", nome: "Elettro Gallo", tipo: "elettricista", citta: "Milano", zona: "Città Studi", telefono: "02 0000 1201", posizione: { lat: 45.4775, lon: 9.2285 } },
  { id: "f04", nome: "Impianti Moretti", tipo: "elettricista", citta: "Milano", zona: "San Siro", telefono: "02 0000 1202", posizione: { lat: 45.4785, lon: 9.1225 } },
  { id: "f05", nome: "Serrature Colombo", tipo: "fabbro_falegname", citta: "Milano", zona: "Porta Venezia", telefono: "02 0000 1301", posizione: { lat: 45.4745, lon: 9.2055 } },
  { id: "f06", nome: "Legno e Ferro Bovisa", tipo: "fabbro_falegname", citta: "Milano", zona: "Bovisa", telefono: "02 0000 1302", posizione: { lat: 45.5025, lon: 9.1595 } },
  { id: "f07", nome: "Vetreria Brambilla", tipo: "vetraio_serrandista", citta: "Milano", zona: "Lambrate", telefono: "02 0000 1401", posizione: { lat: 45.4845, lon: 9.2385 } },
  { id: "f08", nome: "Tapparelle Navigli", tipo: "vetraio_serrandista", citta: "Milano", zona: "Navigli", telefono: "02 0000 1402", posizione: { lat: 45.4505, lon: 9.1755 } },
  { id: "f09", nome: "Caldaie Pozzi", tipo: "tecnico_gas_clima", citta: "Milano", zona: "Buenos Aires", telefono: "02 0000 1501", posizione: { lat: 45.4815, lon: 9.2135 } },
  { id: "f10", nome: "Clima Service Lorenteggio", tipo: "tecnico_gas_clima", citta: "Milano", zona: "Lorenteggio", telefono: "02 0000 1502", posizione: { lat: 45.4545, lon: 9.1265 } },
  { id: "f11", nome: "Rete Casa Isola", tipo: "ripristino_rete", citta: "Milano", zona: "Isola", telefono: "02 0000 1601", posizione: { lat: 45.4875, lon: 9.1885 } },
  { id: "f12", nome: "Connessi Corvetto", tipo: "ripristino_rete", citta: "Milano", zona: "Corvetto", telefono: "02 0000 1602", posizione: { lat: 45.4405, lon: 9.2235 } },
  // Torino
  { id: "f13", nome: "Idraulica Bertola", tipo: "idraulico", citta: "Torino", zona: "San Salvario", telefono: "011 0000 2101", posizione: { lat: 45.0575, lon: 7.6805 } },
  { id: "f14", nome: "Acqua e Gas Vallette", tipo: "idraulico", citta: "Torino", zona: "Vallette", telefono: "011 0000 2102", posizione: { lat: 45.1105, lon: 7.6355 } },
  { id: "f15", nome: "Elettrica Gianotti", tipo: "elettricista", citta: "Torino", zona: "Crocetta", telefono: "011 0000 2201", posizione: { lat: 45.0595, lon: 7.6655 } },
  { id: "f16", nome: "Impianti Barriera", tipo: "elettricista", citta: "Torino", zona: "Barriera di Milano", telefono: "011 0000 2202", posizione: { lat: 45.0935, lon: 7.6965 } },
  { id: "f17", nome: "Fabbro Rolando", tipo: "fabbro_falegname", citta: "Torino", zona: "Lingotto", telefono: "011 0000 2301", posizione: { lat: 45.0335, lon: 7.6655 } },
  { id: "f18", nome: "Porte e Chiavi Aurora", tipo: "fabbro_falegname", citta: "Torino", zona: "Aurora", telefono: "011 0000 2302", posizione: { lat: 45.0845, lon: 7.6885 } },
  { id: "f19", nome: "Vetri Ferrero", tipo: "vetraio_serrandista", citta: "Torino", zona: "Santa Rita", telefono: "011 0000 2401", posizione: { lat: 45.0435, lon: 7.6455 } },
  { id: "f20", nome: "Serrande Madonna di Campagna", tipo: "vetraio_serrandista", citta: "Torino", zona: "Madonna di Campagna", telefono: "011 0000 2402", posizione: { lat: 45.0995, lon: 7.6655 } },
  { id: "f21", nome: "Termoidraulica Alasia", tipo: "tecnico_gas_clima", citta: "Torino", zona: "Nizza Millefonti", telefono: "011 0000 2501", posizione: { lat: 45.0395, lon: 7.6735 } },
  { id: "f22", nome: "Clima Pozzo Strada", tipo: "tecnico_gas_clima", citta: "Torino", zona: "Pozzo Strada", telefono: "011 0000 2502", posizione: { lat: 45.0685, lon: 7.6235 } },
  { id: "f23", nome: "Rete Facile Vanchiglia", tipo: "ripristino_rete", citta: "Torino", zona: "Vanchiglia", telefono: "011 0000 2601", posizione: { lat: 45.0715, lon: 7.7005 } },
  { id: "f24", nome: "Wi-Fi Casa Mirafiori", tipo: "ripristino_rete", citta: "Torino", zona: "Mirafiori", telefono: "011 0000 2602", posizione: { lat: 45.0255, lon: 7.6385 } },
  // Bologna
  { id: "f25", nome: "Idraulica Malaguti", tipo: "idraulico", citta: "Bologna", zona: "Saragozza", telefono: "051 0000 3101", posizione: { lat: 44.4915, lon: 11.3275 } },
  { id: "f26", nome: "Scarichi Liberi San Donato", tipo: "idraulico", citta: "Bologna", zona: "San Donato", telefono: "051 0000 3102", posizione: { lat: 44.5085, lon: 11.3685 } },
  { id: "f27", nome: "Elettro Zanetti", tipo: "elettricista", citta: "Bologna", zona: "Bolognina", telefono: "051 0000 3201", posizione: { lat: 44.5105, lon: 11.3455 } },
  { id: "f28", nome: "Impianti Savena", tipo: "elettricista", citta: "Bologna", zona: "Savena", telefono: "051 0000 3202", posizione: { lat: 44.4775, lon: 11.3755 } },
  { id: "f29", nome: "Fabbro Govoni", tipo: "fabbro_falegname", citta: "Bologna", zona: "Santo Stefano", telefono: "051 0000 3301", posizione: { lat: 44.4875, lon: 11.3505 } },
  { id: "f30", nome: "Falegnameria Borgo Panigale", tipo: "fabbro_falegname", citta: "Bologna", zona: "Borgo Panigale", telefono: "051 0000 3302", posizione: { lat: 44.5115, lon: 11.2795 } },
  { id: "f31", nome: "Vetreria Costa", tipo: "vetraio_serrandista", citta: "Bologna", zona: "Costa Saragozza", telefono: "051 0000 3401", posizione: { lat: 44.4885, lon: 11.3155 } },
  { id: "f32", nome: "Tapparelle Navile", tipo: "vetraio_serrandista", citta: "Bologna", zona: "Navile", telefono: "051 0000 3402", posizione: { lat: 44.5205, lon: 11.3405 } },
  { id: "f33", nome: "Caldaie Righi", tipo: "tecnico_gas_clima", citta: "Bologna", zona: "Murri", telefono: "051 0000 3501", posizione: { lat: 44.4835, lon: 11.3635 } },
  { id: "f34", nome: "Clima Reno", tipo: "tecnico_gas_clima", citta: "Bologna", zona: "Reno", telefono: "051 0000 3502", posizione: { lat: 44.4975, lon: 11.2985 } },
  { id: "f35", nome: "Rete Casa Mazzini", tipo: "ripristino_rete", citta: "Bologna", zona: "Mazzini", telefono: "051 0000 3601", posizione: { lat: 44.4895, lon: 11.3705 } },
  { id: "f36", nome: "Connessi Porto", tipo: "ripristino_rete", citta: "Bologna", zona: "Porto", telefono: "051 0000 3602", posizione: { lat: 44.5005, lon: 11.3305 } },
];
