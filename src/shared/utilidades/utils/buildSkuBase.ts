export function buildSkuBase(productName: string, color?: string, descriptor?: string, presentation?: string) {
  const namePart = (productName ?? '')
    .trim()
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const colorPart = (color ?? '').trim().substring(0, 3).toUpperCase();
  const descriptorPart = (descriptor ?? '').trim().substring(0, 3).toUpperCase();
  const presentationPart = (presentation ?? '').trim().substring(0, 3).toUpperCase();

  const parts = [namePart];
  if (colorPart) parts.push(colorPart);
  if (descriptorPart) parts.push(descriptorPart);
  if (presentationPart) parts.push(presentationPart);

  return parts.join('-'); // ej: "CAM-RED-STD-BOC"
}
