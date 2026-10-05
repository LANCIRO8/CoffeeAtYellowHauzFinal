import React, { useState, useEffect } from 'react';
import { CategoryIcon } from '../../utils/categoryIcons';

export interface ItemThumbnailProps {
  imageUrl?: string | null;
  itemName?: string;
  categoryId?: number;
  categoryName?: string;
  categoryIcon?: string;
  isDrink?: boolean;
  variant?: 'card' | 'detail' | 'avatar' | 'circular';
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
  showCategoryLabel?: boolean;
  children?: React.ReactNode; // For overlay badges, prices, etc.
}

export const ItemThumbnail: React.FC<ItemThumbnailProps> = ({
  imageUrl,
  itemName = 'Item',
  categoryId,
  categoryName,
  categoryIcon,
  isDrink,
  variant = 'card',
  className = '',
  imageClassName = '',
  iconClassName = '',
  showCategoryLabel = false,
  children,
}) => {
  const [hasError, setHasError] = useState(false);

  // If the image URL changes, reset the error state
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const hasImage = Boolean(imageUrl && imageUrl.trim() !== '' && !hasError);

  // Calculate isDrink if not explicitly provided
  const resolvedIsDrink =
    isDrink !== undefined
      ? isDrink
      : Boolean(categoryId && categoryId >= 9 && categoryId <= 17);

  // If image is present and has not errored, render <img>
  if (hasImage && imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={imageUrl}
          alt={itemName}
          className={`h-full w-full object-cover ${imageClassName}`}
          onError={() => setHasError(true)}
        />
        {children}
      </div>
    );
  }

  // --- Fallback: Just the Category Icon! ---
  if (variant === 'avatar') {
    return (
      <div
        className={`relative flex items-center justify-center bg-amber-50/80 dark:bg-stone-800 text-amber-800 dark:text-amber-400 overflow-hidden ${className}`}
      >
        <CategoryIcon
          categoryId={categoryId}
          categoryName={categoryName}
          iconName={categoryIcon}
          isDrink={resolvedIsDrink}
          className={`h-5 w-5 sm:h-6 sm:w-6 stroke-[2] ${iconClassName}`}
        />
        {children}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-50 via-amber-100/70 to-stone-100 dark:from-stone-850 dark:via-stone-800 dark:to-stone-900 border border-amber-200/70 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 overflow-hidden shadow-inner ${className}`}
      >
        <CategoryIcon
          categoryId={categoryId}
          categoryName={categoryName}
          iconName={categoryIcon}
          isDrink={resolvedIsDrink}
          className={`h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 stroke-[1.8] ${iconClassName}`}
        />
        {categoryName && (
          <span className="text-[10px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1.5 px-2 text-center truncate max-w-full">
            {categoryName}
          </span>
        )}
        {children}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950/80 text-amber-400 overflow-hidden select-none p-6 ${className}`}
      >
        {/* Soft background ambient circles */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/50 mb-3">
            <CategoryIcon
              categoryId={categoryId}
              categoryName={categoryName}
              iconName={categoryIcon}
              isDrink={resolvedIsDrink}
              className={`h-10 w-10 sm:h-12 sm:w-12 stroke-[2] text-amber-400 ${iconClassName}`}
            />
          </div>
          {categoryName && (
            <span className="text-xs sm:text-sm font-bold tracking-widest text-amber-300 uppercase">
              {categoryName}
            </span>
          )}
        </div>
        {children}
      </div>
    );
  }

  // Default 'card' variant (menu items, favorites, pos cards)
  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-amber-50/70 via-stone-50 to-stone-100/90 dark:from-stone-850 dark:via-stone-900 dark:to-stone-950 text-amber-800 dark:text-amber-400 overflow-hidden select-none ${className}`}
    >
      <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
        <div className="rounded-2xl p-3 sm:p-3.5 bg-white/95 dark:bg-stone-800/95 shadow-xs border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <CategoryIcon
            categoryId={categoryId}
            categoryName={categoryName}
            iconName={categoryIcon}
            isDrink={resolvedIsDrink}
            className={`h-7 w-7 sm:h-8 sm:w-8 stroke-[2] text-amber-700 dark:text-amber-400 ${iconClassName}`}
          />
        </div>
        {(showCategoryLabel || categoryName) && (
          <span className="mt-2 text-[10px] sm:text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider line-clamp-1 max-w-[130px]">
            {categoryName}
          </span>
        )}
      </div>
      {children}
    </div>
  );
};
