import React, { useState, useMemo, useEffect } from 'react';
import { SYSTEM_EXISTING_IMAGES, SystemGalleryImage } from '../../data/galleryImages';
import {
  Images,
  Image as ImageIcon,
  Search,
  X,
  CheckCircle2,
  Check,
  Coffee,
  Utensils,
  Store,
  Sparkles,
} from 'lucide-react';

export interface SystemImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, image: SystemGalleryImage) => void;
  currentImageUrl?: string;
  title?: string;
  subtitle?: string;
  targetName?: string;
  initialCategory?: 'all' | 'drinks' | 'food' | 'areas' | 'ambiance';
}

export const SystemImagePickerModal: React.FC<SystemImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl,
  title = 'Choose Existing System Image',
  subtitle = 'Select a high-resolution photo from the café system library',
  targetName,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'drinks' | 'food' | 'areas' | 'ambiance'
  >(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync category filter when initialCategory or modal open changes
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory);
      setSearchQuery('');
    }
  }, [isOpen, initialCategory]);

  const filteredImages = useMemo(() => {
    return SYSTEM_EXISTING_IMAGES.filter((img) => {
      // Category filter
      if (selectedCategory !== 'all' && img.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = img.title.toLowerCase().includes(q);
        const matchDesc = (img.description || '').toLowerCase().includes(q);
        const matchCat = img.categoryLabel.toLowerCase().includes(q);
        const matchUrl = img.url.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchCat || matchUrl;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-98 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/60 dark:bg-stone-900">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                <Images className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate">
                {title}
              </h3>
            </div>
            {targetName ? (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                Target:{' '}
                <strong className="text-amber-700 dark:text-amber-400 font-bold">
                  {targetName}
                </strong>{' '}
                • {subtitle}
              </p>
            ) : (
              <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Photos', icon: <Sparkles className="h-3.5 w-3.5" /> },
              { id: 'drinks', label: 'Drinks & Coffee', icon: <Coffee className="h-3.5 w-3.5" /> },
              { id: 'food', label: 'Food & Pastries', icon: <Utensils className="h-3.5 w-3.5" /> },
              { id: 'areas', label: 'Café Spaces & Venue', icon: <Store className="h-3.5 w-3.5" /> },
              { id: 'ambiance', label: 'Ambiance & Walls', icon: <ImageIcon className="h-3.5 w-3.5" /> },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold ring-1 ring-amber-400'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search photo by name..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-stone-850"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Info count bar */}
        <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900/90 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <span>
            Showing <strong className="text-stone-800 dark:text-stone-200">{filteredImages.length}</strong> system images
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500">
            Click any image to select immediately
          </span>
        </div>

        {/* Images Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[300px]">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="p-3 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 mb-1">
                <ImageIcon className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                No matching photos found
              </p>
              <p className="text-xs text-stone-400 max-w-sm">
                Try searching for another keyword or switch category to &ldquo;All Photos&rdquo;.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-400 underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredImages.map((img) => {
                const isSelected = currentImageUrl === img.url;
                return (
                  <div
                    key={img.id}
                    onClick={() => {
                      onSelectImage(img.url, img);
                      onClose();
                    }}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition cursor-pointer flex flex-col bg-white dark:bg-stone-900 shadow-2xs hover:shadow-lg ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/50 dark:ring-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20'
                        : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-900">
                      <img
                        src={img.url}
                        alt={img.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/latte.webp';
                        }}
                      />
                      {/* Active Indicator Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 rounded-full p-1 shadow-md">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-black/65 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          {img.categoryLabel}
                        </span>
                      </div>
                    </div>

                    {/* Image Details */}
                    <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between border-t border-stone-100 dark:border-stone-800">
                      <div className="space-y-1 mb-2">
                        <p className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-snug line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                          {img.title}
                        </p>
                        {img.description && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                            {img.description}
                          </p>
                        )}
                      </div>

                      {/* Select Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectImage(img.url, img);
                          onClose();
                        }}
                        className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                            : 'bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-500 text-stone-700 dark:text-stone-300 group-hover:text-stone-950'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Currently Selected</span>
                          </>
                        ) : (
                          <>
                            <span>Select Image</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
            Pre-bundled café photos are optimized for speed and storage quotas.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
