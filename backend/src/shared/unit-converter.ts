/**
 * Dimension-safe Unit Converter for RESTUVEXO Smart Inventory
 */

export type UnitDimension = 'weight' | 'volume' | 'count';

export function getUnitDimension(unit: string): UnitDimension {
  const u = unit.toLowerCase().trim();
  if (['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'mg'].includes(u)) {
    return 'weight';
  }
  if (['ml', 'milliliter', 'l', 'ltr', 'liter', 'liters'].includes(u)) {
    return 'volume';
  }
  return 'count'; // 'pcs', 'piece', 'pieces', 'can', 'bottle', etc.
}

export function convertToBaseUnit(
  qty: number,
  fromUnit: string,
  baseUnit: string,
  dimension?: UnitDimension
): number {
  const from = fromUnit.toLowerCase().trim();
  const to = baseUnit.toLowerCase().trim();

  if (from === to) return qty;

  const dim = dimension || getUnitDimension(baseUnit);

  if (dim === 'weight') {
    let inGrams = qty;
    if (from === 'kg' || from === 'kilogram' || from === 'kilograms') inGrams = qty * 1000;
    else if (from === 'mg') inGrams = qty / 1000;
    else if (from === 'g' || from === 'gram' || from === 'grams') inGrams = qty;
    else throw new Error(`Cannot convert unit '${fromUnit}' to weight base unit '${baseUnit}'`);

    if (to === 'kg' || to === 'kilogram' || to === 'kilograms') return inGrams / 1000;
    if (to === 'g' || to === 'gram' || to === 'grams') return inGrams;
    if (to === 'mg') return inGrams * 1000;
  }

  if (dim === 'volume') {
    let inMl = qty;
    if (from === 'l' || from === 'ltr' || from === 'liter' || from === 'liters') inMl = qty * 1000;
    else if (from === 'ml' || from === 'milliliter') inMl = qty;
    else throw new Error(`Cannot convert unit '${fromUnit}' to volume base unit '${baseUnit}'`);

    if (to === 'l' || to === 'ltr' || to === 'liter' || to === 'liters') return inMl / 1000;
    if (to === 'ml' || to === 'milliliter') return inMl;
  }

  if (dim === 'count') {
    return qty; // Direct discrete item count
  }

  throw new Error(`Incompatible unit dimensions from '${fromUnit}' to '${baseUnit}'`);
}
