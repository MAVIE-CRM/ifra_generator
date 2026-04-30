export interface IfraCalculationResult {
  fragranceName: string;
  category: string;
  totalParts: number;
  items: CalculatedItem[];
  finalMaxUsage: number | null; // Overall limit for the fragrance
  limitingComponent: CalculatedItem | null;
  missingDataComponents: CalculatedItem[];
}

export interface CalculatedItem {
  materialId: string;
  name: string;
  cas: string | null;
  parts: number;
  formulaPercent: number;
  ifraLimitPercent: number | null; 
  limitText: string;
  isNoRestriction: boolean;
  source: string | null;
  maxFragranceUsage: number | null; // ifraLimitPercent / formulaPercent * 100
  isLimiting: boolean;
  hasNoData: boolean;
}

export interface RawIfraLimit {
  category: string;
  limit: number | null;
  limitText: string | null;
  isNoRestriction: boolean;
  source: string | null;
}

export function calculateFragranceIfra(
  fragranceName: string,
  category: string,
  items: Array<{
    materialId: string;
    name: string;
    cas: string | null;
    parts: number;
    ifraLimits: RawIfraLimit[];
  }>
): IfraCalculationResult {
  const totalParts = items.reduce((acc, item) => acc + item.parts, 0);
  
  if (totalParts === 0) {
    return {
      fragranceName,
      category,
      totalParts: 0,
      items: [],
      finalMaxUsage: null,
      limitingComponent: null,
      missingDataComponents: [],
    };
  }

  const calculatedItems: CalculatedItem[] = items.map((item) => {
    const formulaPercent = (item.parts / totalParts) * 100;
    
    // Logica Priorità: 1. IFRA ufficiale, 2. Altro (Fraterworks)
    const categoryLimits = item.ifraLimits.filter(l => l.category === category);
    const officialLimit = categoryLimits.find(l => l.source === 'IFRA');
    const fallbackLimit = categoryLimits.length > 0 ? categoryLimits[0] : null;
    
    const selectedLimit = officialLimit || fallbackLimit;

    let ifraLimitPercent = selectedLimit?.limit ?? null;
    let limitText = selectedLimit?.limitText || (selectedLimit?.limit != null ? `${selectedLimit.limit}%` : 'IFRA mancante');
    let isNoRestriction = selectedLimit?.isNoRestriction ?? false;
    let source = selectedLimit?.source || null;

    if (isNoRestriction) {
      limitText = "No Restriction";
      ifraLimitPercent = null;
    }

    let maxFragranceUsage: number | null = null;
    // Se c'è un limite numerico e l'ingrediente è in formula
    if (ifraLimitPercent !== null && formulaPercent > 0 && !isNoRestriction) {
      maxFragranceUsage = (ifraLimitPercent / formulaPercent) * 100;
    }

    return {
      materialId: item.materialId,
      name: item.name,
      cas: item.cas,
      parts: item.parts,
      formulaPercent,
      ifraLimitPercent,
      limitText,
      isNoRestriction,
      source,
      maxFragranceUsage,
      isLimiting: false,
      hasNoData: selectedLimit === null,
    };
  });

  // Find components with valid numeric limits to determine the final max usage
  const validLimits = calculatedItems
    .filter((item) => item.maxFragranceUsage !== null && !item.isNoRestriction)
    .map((item) => item.maxFragranceUsage as number);

  const finalMaxUsage = validLimits.length > 0 ? Math.min(...validLimits) : null;

  // Identify limiting component
  let limitingComponent: CalculatedItem | null = null;
  if (finalMaxUsage !== null) {
    // Troviamo l'ingrediente che ha generato quel limite minimo
    limitingComponent = calculatedItems.find((item) => item.maxFragranceUsage !== null && Math.abs(item.maxFragranceUsage - finalMaxUsage) < 0.00001) || null;
    if (limitingComponent) {
      limitingComponent.isLimiting = true;
    }
  }

  const missingDataComponents = calculatedItems.filter((item) => item.hasNoData);

  return {
    fragranceName,
    category,
    totalParts,
    items: calculatedItems,
    finalMaxUsage,
    limitingComponent,
    missingDataComponents,
  };
}
