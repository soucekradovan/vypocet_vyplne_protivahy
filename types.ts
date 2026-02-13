
export interface Material {
  id: string;
  name: string;
  density: number; // kg/m3
  priority: number;
}

export interface Dimensions {
  width: number; // mm
  depth: number; // mm
  height: number; // mm
}

export interface CalculationResult {
  totalVolume: number; // m3
  netTargetWeight: number; // kg
  materials: {
    material: Material;
    volume: number; // m3
    weight: number; // kg
    percentage: number; // %
  }[];
  isFeasible: boolean;
  message: string;
}
