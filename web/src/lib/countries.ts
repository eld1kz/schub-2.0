// Countries as ISO 3166 two-letter codes (opportunities.country), their English names, and the country a typed-in
// place is in: a profile's city ("Seoul", "서울", "Almaty, Kazakhstan") or an event's address.

// Every assigned code; names come from Intl, so they need no list of their own
const CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG " +
  "CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL " +
  "GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA " +
  "LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP " +
  "NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV " +
  "SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const names = new Intl.DisplayNames(["en"], { type: "region" });

export const isCountryCode = (code: unknown): code is string => typeof code === "string" && CODES.includes(code);

// "South Korea"; "" for no country
export const countryName = (code: string | null) => (code && isCountryCode(code) ? (names.of(code) ?? code) : "");

// Every country by name, for a picker
export const COUNTRY_OPTIONS = CODES.map((code) => ({ value: code, label: countryName(code) })).sort((a, b) => a.label.localeCompare(b.label));

// Other ways people write a country, and cities students are likely to name. Lowercase.
const ALIASES: Record<string, string> = {
  korea: "KR", "republic of korea": "KR", "s. korea": "KR", 한국: "KR", 대한민국: "KR",
  usa: "US", "u.s.": "US", "u.s.a.": "US", america: "US", "united states of america": "US",
  uk: "GB", england: "GB", scotland: "GB", wales: "GB", britain: "GB", "great britain": "GB",
  russia: "RU", россия: "RU", казахстан: "KZ", қазақстан: "KZ", ozbekiston: "UZ", "o'zbekiston": "UZ", узбекистан: "UZ",
  china: "CN", 中国: "CN", japan: "JP", 日本: "JP", vietnam: "VN", "viet nam": "VN", mongolia: "MN", монгол: "MN",
  holland: "NL", "czech republic": "CZ", türkiye: "TR", turkey: "TR", uae: "AE",
};

const CITIES: Record<string, string> = {
  // Korea, in English and Hangul
  seoul: "KR", busan: "KR", pusan: "KR", incheon: "KR", daegu: "KR", daejeon: "KR", gwangju: "KR", ulsan: "KR", sejong: "KR",
  suwon: "KR", seongnam: "KR", pangyo: "KR", goyang: "KR", yongin: "KR", bucheon: "KR", ansan: "KR", anyang: "KR", hwaseong: "KR",
  cheongju: "KR", cheonan: "KR", jeonju: "KR", changwon: "KR", pohang: "KR", gyeongsan: "KR", jeju: "KR", chuncheon: "KR", wonju: "KR",
  gangnam: "KR", songdo: "KR",
  서울: "KR", 부산: "KR", 인천: "KR", 대구: "KR", 대전: "KR", 광주: "KR", 울산: "KR", 세종: "KR", 수원: "KR", 성남: "KR", 판교: "KR",
  고양: "KR", 용인: "KR", 청주: "KR", 천안: "KR", 전주: "KR", 창원: "KR", 포항: "KR", 제주: "KR", 춘천: "KR", 원주: "KR",
  // Central Asia and Russia, in Latin and Cyrillic
  almaty: "KZ", astana: "KZ", "nur-sultan": "KZ", shymkent: "KZ", karaganda: "KZ", aktobe: "KZ", алматы: "KZ", астана: "KZ",
  tashkent: "UZ", toshkent: "UZ", samarkand: "UZ", bukhara: "UZ", ташкент: "UZ", bishkek: "KG", бишкек: "KG", dushanbe: "TJ",
  moscow: "RU", "saint petersburg": "RU", "st. petersburg": "RU", "st petersburg": "RU", novosibirsk: "RU", kazan: "RU",
  vladivostok: "RU", москва: "RU", "санкт-петербург": "RU", ulaanbaatar: "MN", "ulan bator": "MN", улаанбаатар: "MN",
  // East and Southeast Asia
  tokyo: "JP", osaka: "JP", kyoto: "JP", yokohama: "JP", nagoya: "JP", fukuoka: "JP", sapporo: "JP", 東京: "JP", 大阪: "JP",
  beijing: "CN", shanghai: "CN", shenzhen: "CN", hangzhou: "CN", guangzhou: "CN", 北京: "CN", 上海: "CN",
  "hong kong": "HK", taipei: "TW", singapore: "SG", hanoi: "VN", "ho chi minh city": "VN", saigon: "VN", "da nang": "VN",
  bangkok: "TH", manila: "PH", jakarta: "ID", "kuala lumpur": "MY", bangalore: "IN", bengaluru: "IN", mumbai: "IN", delhi: "IN",
  "new delhi": "IN", hyderabad: "IN", lahore: "PK", karachi: "PK",
  // Europe
  london: "GB", oxford: "GB", manchester: "GB", edinburgh: "GB", paris: "FR", lyon: "FR", berlin: "DE", munich: "DE",
  münchen: "DE", hamburg: "DE", madrid: "ES", barcelona: "ES", amsterdam: "NL", zurich: "CH", vienna: "AT", warsaw: "PL",
  // Americas and Oceania
  "new york": "US", nyc: "US", "san francisco": "US", "los angeles": "US", boston: "US", seattle: "US", chicago: "US",
  austin: "US", "san jose": "US", "palo alto": "US", toronto: "CA", vancouver: "CA", montreal: "CA", waterloo: "CA",
  "mexico city": "MX", "são paulo": "BR", "sao paulo": "BR", sydney: "AU", melbourne: "AU", auckland: "NZ",
};

const byName = new Map<string, string>([
  ...CODES.map((code): [string, string] => [countryName(code).toLowerCase(), code]),
  ...Object.entries(ALIASES),
  ...Object.entries(CITIES),
]);

const clean = (part: string) => part.normalize("NFKC").trim().toLowerCase().replace(/[.\s]+$/, "");
// The parts of a place: "Gangnam-gu, Seoul, South Korea" → each comma or line on its own
const parts = (place: string) => place.split(/[,\n]/).map(clean).filter(Boolean);
// A Korean city written with its suffix: 서울특별시, 부산광역시, 수원시
const korean = (part: string) => part.replace(/(특별시|광역시|특별자치시|특별자치도|시)$/, "");

// Names only, never two-letter codes: "in" or "it" in an address is a word, not India or Italy
const lookUp = (part: string) => byName.get(part) ?? byName.get(korean(part));

// The country a typed-in place is in, or null when it isn't recognized. The whole text first, then each part
// from the last (the country usually comes last), then each word, for "Seoul Korea" and "서울 강남구".
export function countryOf(place: string): string | null {
  const whole = clean(place);
  if (!whole) return null;
  const found = lookUp(whole) ?? [...parts(place)].reverse().map(lookUp).find(Boolean) ?? whole.split(/\s+/).map(lookUp).find(Boolean);
  return found ?? null;
}

// A known city named in an address, in its own spelling: "20 Tojeong-ro, Mapo-gu, Seoul, South Korea" → "Seoul"
export function cityIn(place: string) {
  const original = place.split(/[,\n]/).map((p) => p.trim());
  const index = parts(place).findIndex((p) => p in CITIES || korean(p) in CITIES);
  return index === -1 ? "" : original.filter(Boolean)[index];
}
