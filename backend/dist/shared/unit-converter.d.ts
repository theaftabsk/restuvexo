export type UnitDimension = 'weight' | 'volume' | 'count';
export declare function getUnitDimension(unit: string): UnitDimension;
export declare function convertToBaseUnit(qty: number, fromUnit: string, baseUnit: string, dimension?: UnitDimension): number;
