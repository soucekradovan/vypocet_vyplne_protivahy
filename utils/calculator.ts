
import { Material, Dimensions, CalculationResult } from '../types';

export const calculateCounterweight = (
  dimensions: Dimensions,
  targetTotalWeight: number,
  frameWeight: number,
  materials: Material[]
): CalculationResult => {
  // 1. Calculate volume in m3 (input is in mm)
  const volM3 = (dimensions.width / 1000) * (dimensions.depth / 1000) * (dimensions.height / 1000);
  
  // 2. Net weight needed from fill
  const netWeight = targetTotalWeight - frameWeight;

  if (netWeight <= 0) {
    return {
      totalVolume: volM3,
      netTargetWeight: netWeight,
      materials: [],
      isFeasible: false,
      message: "Cílová váha je nižší nebo rovna váze samotného rámu."
    };
  }

  // Sort materials by priority (lower number = higher priority)
  const sortedMaterials = [...materials].sort((a, b) => a.priority - b.priority);

  // We look for a pair of consecutive priority materials that can satisfy the weight
  // within the fixed volume V.
  // Equation 1: V1 + V2 = V
  // Equation 2: V1*D1 + V2*D2 = W
  // Solving for V1: V1 = (W - V*D2) / (D1 - D2)
  
  for (let i = 0; i < sortedMaterials.length - 1; i++) {
    const m1 = sortedMaterials[i];
    const m2 = sortedMaterials[i + 1];

    const d1 = m1.density;
    const d2 = m2.density;

    if (d1 === d2) continue; // Skip if densities are identical

    // Calculate V1
    const v1 = (netWeight - volM3 * d2) / (d1 - d2);
    const v2 = volM3 - v1;

    // Check if the solution is valid (both volumes non-negative)
    // Precision tolerance for floating point
    if (v1 >= -0.000001 && v2 >= -0.000001 && v1 <= volM3 + 0.000001) {
      const actualV1 = Math.max(0, Math.min(volM3, v1));
      const actualV2 = Math.max(0, Math.min(volM3, v2));

      return {
        totalVolume: volM3,
        netTargetWeight: netWeight,
        isFeasible: true,
        message: `Nalezeno řešení kombinací: ${m1.name} a ${m2.name}`,
        materials: [
          {
            material: m1,
            volume: actualV1,
            weight: actualV1 * d1,
            percentage: (actualV1 / volM3) * 100
          },
          {
            material: m2,
            volume: actualV2,
            weight: actualV2 * d2,
            percentage: (actualV2 / volM3) * 100
          }
        ]
      };
    }
  }

  // If no pair found, check if only one material could work (edge cases)
  for (const m of sortedMaterials) {
    const theoreticalWeight = volM3 * m.density;
    if (Math.abs(theoreticalWeight - netWeight) < 0.1) {
       return {
        totalVolume: volM3,
        netTargetWeight: netWeight,
        isFeasible: true,
        message: `Nalezeno řešení: 100% ${m.name}`,
        materials: [
          {
            material: m,
            volume: volM3,
            weight: theoreticalWeight,
            percentage: 100
          }
        ]
      };
    }
  }

  // Determine if it's too heavy or too light
  const minDensity = Math.min(...materials.map(m => m.density));
  const maxDensity = Math.max(...materials.map(m => m.density));
  
  const minWeight = volM3 * minDensity;
  const maxWeight = volM3 * maxDensity;

  let failMsg = "Nelze dosáhnout cílové váhy se zadaným objemem a materiály.";
  if (netWeight < minWeight) failMsg += ` (Cílová váha výplně ${netWeight.toFixed(1)} kg je příliš nízká. Minimum je ${minWeight.toFixed(1)} kg)`;
  if (netWeight > maxWeight) failMsg += ` (Cílová váha výplně ${netWeight.toFixed(1)} kg je příliš vysoká. Maximum je ${maxWeight.toFixed(1)} kg)`;

  return {
    totalVolume: volM3,
    netTargetWeight: netWeight,
    materials: [],
    isFeasible: false,
    message: failMsg
  };
};
