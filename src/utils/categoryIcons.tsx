import React from 'react';
import {
  Coffee,
  GlassWater,
  CupSoda,
  IceCream,
  Flame,
  Citrus,
  Milk,
  Leaf,
  Plus,
  Egg,
  Utensils,
  Soup,
  CookingPot,
  Pizza,
  Sandwich,
  Cake,
} from 'lucide-react';

export interface CategoryIconProps {
  categoryName?: string;
  iconName?: string;
  categoryId?: number;
  isDrink?: boolean;
  className?: string;
}

export function getCategoryIconName(
  categoryName: string = '',
  iconName: string = '',
  categoryId?: number,
  isDrink?: boolean
): string {
  const name = categoryName.toLowerCase();
  const ic = iconName.toLowerCase();

  // Explicit ID matching
  if (categoryId === 1) return 'Egg';
  if (categoryId === 2) return 'Utensils';
  if (categoryId === 3) return 'Soup';
  if (categoryId === 4) return 'CookingPot';
  if (categoryId === 5) return 'Pizza';
  if (categoryId === 6) return 'Sandwich';
  if (categoryId === 7) return 'Cake';
  if (categoryId === 8) return 'Plus';
  if (categoryId === 9) return 'Coffee';
  if (categoryId === 10) return 'GlassWater';
  if (categoryId === 11) return 'CupSoda';
  if (categoryId === 12) return 'IceCream';
  if (categoryId === 13) return 'Flame';
  if (categoryId === 14) return 'Citrus';
  if (categoryId === 15) return 'Milk';
  if (categoryId === 16) return 'Leaf';
  if (categoryId === 17) return 'Plus';

  // Keyword / Icon matching
  if (
    ic === 'coffee' ||
    name.includes('hot coffee') ||
    (isDrink && name.includes('coffee') && !name.includes('blended'))
  ) {
    return 'Coffee';
  }
  if (ic === 'glasswater' || ic === 'glass' || name.includes('on the rocks')) {
    return 'GlassWater';
  }
  if (
    ic === 'cupsoda' ||
    name.includes('blended coffee') ||
    name.includes('soda') ||
    name.includes('frappe')
  ) {
    return 'CupSoda';
  }
  if (ic === 'icecream' || name.includes('cream blended') || name.includes('ice cream')) {
    return 'IceCream';
  }
  if (ic === 'flame' || name.includes('hot drink') || name.includes('flame')) {
    return 'Flame';
  }
  if (
    ic === 'citrus' ||
    name.includes('refresher') ||
    name.includes('citrus') ||
    name.includes('juice')
  ) {
    return 'Citrus';
  }
  if (
    ic === 'milk' ||
    name.includes('milkshake') ||
    name.includes('shake') ||
    name.includes('milk')
  ) {
    return 'Milk';
  }
  if (
    ic === 'leaf' ||
    name.includes('milk tea') ||
    name.includes('tea') ||
    name.includes('matcha')
  ) {
    return 'Leaf';
  }
  if (
    name.includes('drink add-on') ||
    name.includes('add-on') ||
    name.includes('addon') ||
    name.includes('plus')
  ) {
    return 'Plus';
  }
  if (
    ic === 'egg' ||
    name.includes('breakfast') ||
    name.includes('egg') ||
    name.includes('waffle')
  ) {
    return 'Egg';
  }
  if (ic === 'utensils' || name.includes('appetizer')) {
    return 'Utensils';
  }
  if (
    ic === 'soup' ||
    name.includes('meal') ||
    name.includes('soup') ||
    name.includes('rice') ||
    name.includes('adobo')
  ) {
    return 'Soup';
  }
  if (
    ic === 'cookingpot' ||
    ic === 'salad' ||
    name.includes('pasta') ||
    name.includes('noodle')
  ) {
    return 'CookingPot';
  }
  if (ic === 'pizza' || name.includes('pizza')) {
    return 'Pizza';
  }
  if (
    ic === 'sandwich' ||
    name.includes('sandwich') ||
    name.includes('bread') ||
    name.includes('toast')
  ) {
    return 'Sandwich';
  }
  if (
    ic === 'cake' ||
    name.includes('cake') ||
    name.includes('pastr') ||
    name.includes('dessert') ||
    name.includes('bakery')
  ) {
    return 'Cake';
  }

  return isDrink || (categoryId && categoryId >= 9 && categoryId <= 17)
    ? 'Coffee'
    : 'Utensils';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryName = '',
  iconName = '',
  categoryId,
  isDrink,
  className = 'h-4 w-4 shrink-0',
}) => {
  const iconKey = getCategoryIconName(categoryName, iconName, categoryId, isDrink);

  switch (iconKey) {
    case 'Egg':
      return <Egg className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Soup':
      return <Soup className={className} />;
    case 'CookingPot':
      return <CookingPot className={className} />;
    case 'Pizza':
      return <Pizza className={className} />;
    case 'Sandwich':
      return <Sandwich className={className} />;
    case 'Cake':
      return <Cake className={className} />;
    case 'Plus':
      return <Plus className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'GlassWater':
      return <GlassWater className={className} />;
    case 'CupSoda':
      return <CupSoda className={className} />;
    case 'IceCream':
      return <IceCream className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Citrus':
      return <Citrus className={className} />;
    case 'Milk':
      return <Milk className={className} />;
    case 'Leaf':
      return <Leaf className={className} />;
    default:
      return isDrink ? <Coffee className={className} /> : <Utensils className={className} />;
  }
};
