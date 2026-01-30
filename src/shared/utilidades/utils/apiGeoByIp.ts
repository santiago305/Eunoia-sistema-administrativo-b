// src/shared/utilidades/utils/getGeoByIp.util.ts
export type GeoLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
};

export async function getGeoByIp(ipRaw: string | null): Promise<GeoLocation> {
  if (!ipRaw) return { country: null, region: null, city: null };

  const ip = ipRaw.startsWith('::ffff:') ? ipRaw.slice(7) : ipRaw;

  if (ip === '127.0.0.1' || ip === '::1') {
    return { country: 'Localhost', region: 'Localhost', city: 'Localhost' };
  }

  try {
    const res = await fetch(`https://apip.cc/api-json/${ip}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { country: null, region: null, city: null };

    const geo = await res.json();
    if (geo?.status === 'success') {
      return {
        country: geo.CountryName ?? null,
        region: geo.RegionName ?? null,
        city: geo.City ?? null,
      };
    }
  } catch {
    // si falla, devuelve nulls
  }

  return { country: null, region: null, city: null };
}
