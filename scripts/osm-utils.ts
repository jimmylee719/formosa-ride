// scripts/osm-utils.ts — 匯入腳本共用的 OSM 工具（Overpass 抓取＋縫合＋抽稀）
// ⚠️ Overpass 必須帶自訂 User-Agent，否則 406（2026-07-09 實測）

export type Coord = [number, number];

export function distKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** 貪婪端點縫合多段 way → 最長連續鏈 */
export function stitch(ways: Coord[][], toleranceKm = 0.12): Coord[] {
  const pool = [...ways].sort((a, b) => b.length - a.length);
  let chain = pool.shift() ?? [];
  let extended = true;
  while (extended && pool.length) {
    extended = false;
    for (let i = 0; i < pool.length; i++) {
      const w = pool[i];
      if (!w) continue;
      const cs = chain[0];
      const ce = chain[chain.length - 1];
      const ws = w[0];
      const we = w[w.length - 1];
      if (!cs || !ce || !ws || !we) continue;
      if (distKm(ce, ws) < toleranceKm) chain = chain.concat(w.slice(1));
      else if (distKm(ce, we) < toleranceKm)
        chain = chain.concat([...w].reverse().slice(1));
      else if (distKm(cs, we) < toleranceKm) chain = w.slice(0, -1).concat(chain);
      else if (distKm(cs, ws) < toleranceKm)
        chain = [...w].reverse().slice(0, -1).concat(chain);
      else continue;
      pool.splice(i, 1);
      extended = true;
      break;
    }
  }
  return chain;
}

/** 抽稀至最多 maxPoints 點（保留頭尾） */
export function decimate(coords: Coord[], maxPoints = 1500): Coord[] {
  if (coords.length <= maxPoints) return coords;
  const step = (coords.length - 1) / (maxPoints - 1);
  const out: Coord[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const c = coords[Math.round(i * step)];
    if (c) out.push(c);
  }
  return out;
}

/** 以 Overpass 查詢式抓取 way 幾何並縫合為單一鏈 */
export async function fetchStitchedChain(overpassWayQuery: string): Promise<Coord[]> {
  const query = `[out:json][timeout:60];\n${overpassWayQuery}\nout geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'FormoSARide-seed/0.1 (skadoosh.ai.lab@gmail.com)' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as {
    elements: { geometry?: { lat: number; lon: number }[] }[];
  };
  const ways: Coord[][] = data.elements
    .filter((el) => (el.geometry?.length ?? 0) > 1)
    .map((el) => (el.geometry ?? []).map((g) => [g.lon, g.lat] as Coord));
  return decimate(stitch(ways));
}

export function toWkt(chain: Coord[]): string {
  return (
    'SRID=4326;LINESTRING(' +
    chain.map((c) => `${c[0].toFixed(6)} ${c[1].toFixed(6)}`).join(',') +
    ')'
  );
}

export function chainKm(chain: Coord[]): number {
  let km = 0;
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1];
    const b = chain[i];
    if (a && b) km += distKm(a, b);
  }
  return km;
}

/** 消耗式縫合：把 ways 分解成多條互相連通的子鏈（Phase 15A，處理大型路線關聯） */
export function decomposeChains(ways: Coord[][], tolKm = 0.15): Coord[][] {
  const pool = ways.filter((w) => w.length >= 2).map((w) => [...w]);
  const chains: Coord[][] = [];
  while (pool.length) {
    pool.sort((a, b) => b.length - a.length);
    let chain = pool.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i]!;
        const cs = chain[0]!;
        const ce = chain[chain.length - 1]!;
        const ws = w[0]!;
        const we = w[w.length - 1]!;
        if (distKm(ce, ws) <= tolKm) chain = chain.concat(w);
        else if (distKm(ce, we) <= tolKm) chain = chain.concat([...w].reverse());
        else if (distKm(cs, we) <= tolKm) chain = w.concat(chain);
        else if (distKm(cs, ws) <= tolKm) chain = [...w].reverse().concat(chain);
        else continue;
        pool.splice(i, 1);
        extended = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains;
}

/** 主要子鏈（≥minKm）就近排序串接成單一路線；碎片（圓環/岔口小段）捨棄 */
export function joinMajorChains(ways: Coord[][], minKm = 2): Coord[] {
  const chains = decomposeChains(ways).filter((c) => chainKm(c) >= minKm);
  if (chains.length === 0) return decomposeChains(ways).sort((a, b) => chainKm(b) - chainKm(a))[0] ?? [];
  chains.sort((a, b) => chainKm(b) - chainKm(a));
  let route = chains.shift()!;
  while (chains.length) {
    const re = route[route.length - 1]!;
    let best = 0;
    let bestD = Infinity;
    let flip = false;
    for (let i = 0; i < chains.length; i++) {
      const c = chains[i]!;
      const d1 = distKm(re, c[0]!);
      const d2 = distKm(re, c[c.length - 1]!);
      if (d1 < bestD) {
        bestD = d1;
        best = i;
        flip = false;
      }
      if (d2 < bestD) {
        bestD = d2;
        best = i;
        flip = true;
      }
    }
    const next = chains.splice(best, 1)[0]!;
    route = route.concat(flip ? [...next].reverse() : next);
  }
  return route;
}
