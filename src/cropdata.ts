import { addDays } from './breeding';

export const CROPS = ['Maize', 'Beans', 'Sukuma wiki (kale)', 'Tomatoes', 'Potatoes', 'Cabbage', 'Onions', 'Wheat', 'Sorghum', 'Millet', 'Cassava', 'Sweet potatoes', 'Bananas', 'Coffee', 'Tea', 'Napier grass', 'Avocado', 'Mango', 'Capsicum', 'Carrots', 'Spinach', 'Pumpkin', 'Watermelon', 'Groundnuts', 'Green grams'];
// Rough days from planting to first harvest, used only to suggest an expected harvest date
export const MATURITY_DAYS: Record<string, number> = { Maize: 120, Beans: 90, 'Sukuma wiki (kale)': 60, Tomatoes: 90, Potatoes: 100, Cabbage: 80, Onions: 120, Wheat: 120, Sorghum: 110, Millet: 100, 'Sweet potatoes': 120, Capsicum: 90, Carrots: 90, Spinach: 45, Pumpkin: 100, Watermelon: 85, Groundnuts: 110, 'Green grams': 70, 'Napier grass': 90 };
export const ACTIVITY_TYPES = ['Land preparation', 'Seeds', 'Planting', 'Fertiliser', 'Manure', 'Weeding', 'Pesticide / spraying', 'Irrigation', 'Labour', 'Harvesting', 'Other'];
export const UNITS = ['kg', 'bags', 'tonnes', 'litres', 'acres', 'hours', 'people-days', 'tins', 'crates', 'units'];
export const UNIT_DEFAULT: Record<string, string> = { 'Land preparation': 'acres', Seeds: 'kg', Planting: 'acres', Fertiliser: 'kg', Manure: 'bags', Weeding: 'people-days', 'Pesticide / spraying': 'litres', Irrigation: 'hours', Labour: 'people-days', Harvesting: 'kg', Other: 'units' };
// Finance category used when a crop cost is also recorded as an expense
export const FINANCE_CATEGORY: Record<string, string> = { Seeds: 'Seeds', Fertiliser: 'Fertiliser', Manure: 'Fertiliser', 'Pesticide / spraying': 'Chemicals', Labour: 'Labour' };
export const financeCategoryFor = (type: string) => FINANCE_CATEGORY[type] || 'Crops';

export function suggestHarvest(crop: string, plantDate: string): string {
  const days = MATURITY_DAYS[crop];
  return days && plantDate ? addDays(plantDate, days) : '';
}
