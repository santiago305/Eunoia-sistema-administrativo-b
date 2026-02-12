export function buildSkuBase(productName: string, color?: string, size?: string) {
  const namePart = (productName ?? '')
    .trim()
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const colorPart = (color ?? '').trim().toUpperCase();
  const sizePart = (size ?? '').trim().toUpperCase();

  const parts = [namePart];
  if (colorPart) parts.push(colorPart);
  if (sizePart) parts.push(sizePart);

  return parts.join('-'); // ej: "CAM-RED-M"
}
