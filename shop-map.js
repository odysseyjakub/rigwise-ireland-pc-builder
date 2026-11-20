const IRELAND_BOUNDS = Object.freeze({ south: 51.2, north: 55.6, west: -11.2, east: -5.2 });

export function buildShopMapPreviewUrl(coordinates) {
  const lat = Number(coordinates?.lat);
  const lon = Number(coordinates?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < IRELAND_BOUNDS.south || lat > IRELAND_BOUNDS.north || lon < IRELAND_BOUNDS.west || lon > IRELAND_BOUNDS.east) {
    return null;
  }

  const latitudePadding = 0.012;
  const longitudePadding = 0.018;
  const bounds = [
    Math.max(IRELAND_BOUNDS.west, lon - longitudePadding),
    Math.max(IRELAND_BOUNDS.south, lat - latitudePadding),
    Math.min(IRELAND_BOUNDS.east, lon + longitudePadding),
    Math.min(IRELAND_BOUNDS.north, lat + latitudePadding)
  ].map(value => Number(value.toFixed(6)));
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  url.searchParams.set("bbox", bounds.join(","));
  url.searchParams.set("layer", "mapnik");
  url.searchParams.set("marker", lat + "," + lon);
  return url.href;
}

