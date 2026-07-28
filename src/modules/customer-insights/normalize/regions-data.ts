/** US states / territories → United States */
export const US_STATES: Record<string, true> = {
  alabama: true, alaska: true, arizona: true, arkansas: true, california: true, colorado: true,
  connecticut: true, delaware: true, florida: true, georgia: true, hawaii: true, idaho: true,
  illinois: true, indiana: true, iowa: true, kansas: true, kentucky: true, louisiana: true,
  maine: true, maryland: true, massachusetts: true, michigan: true, minnesota: true,
  mississippi: true, missouri: true, montana: true, nebraska: true, nevada: true,
  "new hampshire": true, "new jersey": true, "new mexico": true, "new york": true,
  "north carolina": true, "north dakota": true, ohio: true, oklahoma: true, oregon: true,
  pennsylvania: true, "rhode island": true, "south carolina": true, "south dakota": true,
  tennessee: true, texas: true, utah: true, vermont: true, virginia: true, washington: true,
  "west virginia": true, wisconsin: true, wyoming: true,
  "district of columbia": true, dc: true,
  al: true, ak: true, az: true, ar: true, ca: true, co: true, ct: true, de: true, fl: true,
  ga: true, hi: true, id: true, il: true, in: true, ia: true, ks: true, ky: true, la: true,
  me: true, md: true, ma: true, mi: true, mn: true, ms: true, mo: true, mt: true, ne: true,
  nv: true, nh: true, nj: true, nm: true, ny: true, nc: true, nd: true, oh: true, ok: true,
  or: true, pa: true, ri: true, sc: true, sd: true, tn: true, tx: true, ut: true, vt: true,
  va: true, wa: true, wv: true, wi: true, wy: true,
};

/** Trailing tokens that indicate a country when prefixed by a city/state. */
export const TRAILING_COUNTRY_HINTS = new Set([
  "usa", "us", "u.s.", "u.s.a.", "u.s", "america",
  "uk", "u.k.", "england", "scotland", "wales",
  "au", "aus", "australia",
  "nz", "canada", "ca",
]);

export const US_CITIES: Record<string, true> = {
  austin: true, honolulu: true, seattle: true, "san francisco": true, "san diego": true,
  "san antonio": true, houston: true, dallas: true, denver: true, boston: true,
  philadelphia: true, phoenix: true, portland: true, atlanta: true, detroit: true,
  minneapolis: true, nashville: true, "las vegas": true, "salt lake city": true,
  baltimore: true, charlotte: true, pittsburgh: true, cleveland: true, tampa: true,
  orlando: true, "new orleans": true, milwaukee: true, indianapolis: true,
  columbus: true, cincinnati: true, sacramento: true, "kansas city": true,
  "st louis": true, "saint louis": true, raleigh: true, omaha: true,
};

/** Thai cities / provinces — common form answers & typos */
export const THAILAND_PLACES: Record<string, true> = {
  bangkok: true, bkk: true, phuket: true, pattaya: true, samui: true, "koh samui": true,
  phangan: true, "koh phangan": true, krabi: true, "hua hin": true, "chiang mai": true,
  chiangmai: true, chaingmai: true, "chiang rai": true, chiangrai: true, chaingrai: true, sukhothai: true, kanchanaburi: true, rayong: true,
  "chiang dao": true, pai: true, "mae hong son": true, trang: true, suratthani: true,
  "surat thani": true, hatyai: true, "hat yai": true, nakhonratchasima: true,
  "nakhon ratchasima": true, korat: true, udon: true, "udon thani": true,
  khonkaen: true, "khon kaen": true, silom: true, ekkamai: true, laguna: true,
};

export function isUsState(key: string): boolean {
  return US_STATES[key] === true;
}

export function isUsCity(key: string): boolean {
  return US_CITIES[key] === true;
}

export function isThailandPlace(key: string): boolean {
  if (THAILAND_PLACES[key]) return true;
  // Common prefix typos: chaingmai, chiangrai, etc.
  if (/^chiang|^chaing/.test(key)) return true;
  if (key.startsWith("koh ") || key.startsWith("ko ")) return true;
  return false;
}
