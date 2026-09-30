import React, { useState, useRef, useMemo } from 'react';
import { StoreSettings, CustomerGallerySettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  compressImageFile,
  formatFileSize,
  calculateBase64Size,
} from '../../utils/imageCompression';
import {
  DEFAULT_GALLERY_SETTINGS,
  SYSTEM_EXISTING_IMAGES,
  SystemGalleryImage,
} from '../../data/galleryImages';
import {
  Images,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  X,
  Eye,
  Sliders,
  Maximize2,
  Calendar,
  Coffee,
  Utensils,
  Layers,
  Zap,
  Info,
} from 'lucide-react';

interface CustomerGalleryManagerProps {
  onBackToInventory?: () => void;
}

type GallerySlotKey = keyof CustomerGallerySettings;

interface SlotDefinition {
  key: GallerySlotKey;
  title: string;
  badge: string;
  targetPage: string;
  description: string;
  defaultUrl: string;
  recommendedAspect: string;
  aspectClass: string;
  recommendedCategory: SystemGalleryImage['category'];
  icon: React.ReactNode;
  spotlightIndex?: number;
}

const GALLERY_SLOTS: SlotDefinition[] = [
  {
    key: 'heroBackground',
    title: 'Landing Page Hero Wallpaper',
    badge: 'Customer Landing',
    targetPage: 'Landing Page (Hero Section Wallpaper)',
    description: 'Background wall texture behind the café logo, headline, ivy vines, and action buttons.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.heroBackground || '/images/red_brick_bg.png',
    recommendedAspect: 'Landscape (16:9 or 21:9)',
    aspectClass: 'aspect-video sm:aspect-21/9',
    recommendedCategory: 'ambiance',
    icon: <Sparkles className="h-4 w-4 text-amber-500" />,
  },
  {
    key: 'heroFeaturedImage',
    title: 'Spotlight Picture #1: Artisan Brews & Coffee',
    badge: 'Spotlight 1 of 4',
    targetPage: 'Landing Page (Featured Spotlight Picture 1: Artisan Brews)',
    description: 'First picture of the 4-Picture Hero Collage Spotlight (Large Left Featured Card). Highlights signature coffee drinks.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage || '/images/food_and_drinks_images/Hot Coffee/flat_white.jpeg',
    recommendedAspect: 'Square or 4:3',
    aspectClass: 'aspect-4/3',
    recommendedCategory: 'drinks',
    icon: <Coffee className="h-4 w-4 text-amber-600" />,
    spotlightIndex: 1,
  },
  {
    key: 'heroFeaturedImage2',
    title: 'Spotlight Picture #2: Event Spaces & Studio',
    badge: 'Spotlight 2 of 4',
    targetPage: 'Landing Page (Featured Spotlight Picture 2: Event Spaces)',
    description: 'Second picture of the 4-Picture Hero Collage Spotlight (Top-Right Card). Highlights the function studio and private events.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage2 || '/images/venue.webp',
    recommendedAspect: 'Square or 4:3',
    aspectClass: 'aspect-4/3',
    recommendedCategory: 'areas',
    icon: <Calendar className="h-4 w-4 text-emerald-600" />,
    spotlightIndex: 2,
  },
  {
    key: 'heroFeaturedImage3',
    title: 'Spotlight Picture #3: Comfort on a Plate & Meals',
    badge: 'Spotlight 3 of 4',
    targetPage: 'Landing Page (Featured Spotlight Picture 3: Comfort Meals)',
    description: 'Third picture of the 4-Picture Hero Collage Spotlight (Middle-Right Card). Highlights comforting artisan meals and breakfast plates.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage3 || '/images/food_and_drinks_images/Breakfast/hungarian_sausage.jpeg',
    recommendedAspect: 'Square or 4:3',
    aspectClass: 'aspect-4/3',
    recommendedCategory: 'food',
    icon: <Utensils className="h-4 w-4 text-amber-700" />,
    spotlightIndex: 3,
  },
  {
    key: 'heroFeaturedImage4',
    title: 'Spotlight Picture #4: Cozy Café Spaces & Ambiance',
    badge: 'Spotlight 4 of 4',
    targetPage: 'Landing Page (Featured Spotlight Picture 4: Cozy Ambiance)',
    description: 'Fourth picture of the 4-Picture Hero Collage Spotlight (Bottom-Right Card). Highlights ambient café interiors, seating, and aesthetics.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage4 || '/images/18_Main_Counter_Interior.webp',
    recommendedAspect: 'Square or 4:3',
    aspectClass: 'aspect-4/3',
    recommendedCategory: 'ambiance',
    icon: <Sparkles className="h-4 w-4 text-orange-600" />,
    spotlightIndex: 4,
  },
  {
    key: 'reservationBanner',
    title: 'Reservation & Studio Venue Banner',
    badge: 'Customer Reservations',
    targetPage: 'Reservations Page & Private Studio Venue',
    description: 'Cover photo displayed in the Private Studio Venue booking section and table reservation portal.',
    defaultUrl: DEFAULT_GALLERY_SETTINGS.reservationBanner || '/images/venue.webp',
    recommendedAspect: 'Landscape (16:9)',
    aspectClass: 'aspect-video',
    recommendedCategory: 'areas',
    icon: <Calendar className="h-4 w-4 text-emerald-600" />,
  },
];

export const CustomerGalleryManager: React.FC<CustomerGalleryManagerProps> = ({
  onBackToInventory,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [settings, setSettings] = useState<StoreSettings>(() => AppStore.getSettings());
  const galleryState = settings.customer_gallery || DEFAULT_GALLERY_SETTINGS;

  // Selected Slot for Modals / Actions
  const [activeSlotKey, setActiveSlotKey] = useState<GallerySlotKey | null>(null);

  // Picker Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<'all' | 'areas' | 'drinks' | 'food' | 'ambiance'>('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savedPercentage: number;
    dimensions: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full Screen Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string; slot: string } | null>(null);

  const [sectionFilter, setSectionFilter] = useState<'all' | 'spotlight' | 'covers'>('all');

  const displayedSlots = useMemo(() => {
    if (sectionFilter === 'spotlight') {
      return GALLERY_SLOTS.filter((s) => s.key.startsWith('heroFeaturedImage'));
    }
    if (sectionFilter === 'covers') {
      return GALLERY_SLOTS.filter((s) => !s.key.startsWith('heroFeaturedImage'));
    }
    return GALLERY_SLOTS;
  }, [sectionFilter]);

  const activeSlotDef = useMemo(() => {
    return GALLERY_SLOTS.find((s) => s.key === activeSlotKey) || null;
  }, [activeSlotKey]);

  // Filtered system images for picker
  const filteredSystemImages = useMemo(() => {
    return SYSTEM_EXISTING_IMAGES.filter((img) => {
      const matchCat = pickerCategory === 'all' || img.category === pickerCategory;
      const q = pickerSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        img.title.toLowerCase().includes(q) ||
        img.categoryLabel.toLowerCase().includes(q) ||
        (img.description && img.description.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [pickerCategory, pickerSearch]);

  // Save changes to AppStore & Firestore
  const updateGallerySlot = (key: GallerySlotKey, newUrl: string) => {
    const updatedGallery: CustomerGallerySettings = {
      ...(settings.customer_gallery || DEFAULT_GALLERY_SETTINGS),
      [key]: newUrl,
    };
    const updatedSettings: StoreSettings = {
      ...settings,
      customer_gallery: updatedGallery,
    };

    setSettings(updatedSettings);
    AppStore.saveSettings(updatedSettings);

    const slotDef = GALLERY_SLOTS.find((s) => s.key === key);
    showAlert({
      title: 'Customer Page Image Updated',
      message: `The image for "${slotDef?.title || key}" has been saved. Customer pages will now display this updated image immediately.`,
      type: 'success',
    });
  };

  // Reset a specific slot to Yellow Hauz Default
  const handleResetSlot = async (slot: SlotDefinition) => {
    const confirmed = await showConfirm({
      title: `Reset ${slot.title}?`,
      message: `Revert this image back to the original default Yellow Hauz asset (${slot.defaultUrl})?`,
      confirmText: 'Reset to Default',
      type: 'warning',
    });
    if (confirmed) {
      updateGallerySlot(slot.key, slot.defaultUrl);
    }
  };

  // Reset ALL slots to Yellow Hauz Defaults
  const handleResetAll = async () => {
    const confirmed = await showConfirm({
      title: 'Reset All Customer Page Images?',
      message: 'This will restore all customer pages (Landing page hero, Reservation banner, Menu Drinks & Food backgrounds) to the original default system images.',
      confirmText: 'Reset All',
      type: 'danger',
    });
    if (confirmed) {
      const updatedSettings: StoreSettings = {
        ...settings,
        customer_gallery: { ...DEFAULT_GALLERY_SETTINGS },
      };
      setSettings(updatedSettings);
      AppStore.saveSettings(updatedSettings);
      showAlert({
        title: 'Gallery Reset to Defaults',
        message: 'All customer page banners have been restored to their original presets.',
        type: 'success',
      });
    }
  };

  // Open "Choose Existing Image"
  const handleOpenPicker = (slotKey: GallerySlotKey) => {
    setActiveSlotKey(slotKey);
    const def = GALLERY_SLOTS.find((s) => s.key === slotKey);
    setPickerCategory(def ? def.recommendedCategory : 'all');
    setPickerSearch('');
    setIsPickerOpen(true);
  };

  // Choose image from library
  const handleSelectFromPicker = (img: SystemGalleryImage) => {
    if (!activeSlotKey) return;
    updateGallerySlot(activeSlotKey, img.url);
    setIsPickerOpen(false);
  };

  // Open "Upload Image"
  const handleOpenUpload = (slotKey: GallerySlotKey) => {
    setActiveSlotKey(slotKey);
    setUploadedDataUrl('');
    setUploadStats(null);
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  // Process File Upload with Canvas Compression
  const processUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Image file is too large (>25MB). Please choose a smaller photo.');
      return;
    }

    try {
      setIsCompressing(true);
      setUploadError(null);

      // Compress to max 1600x1200 with 0.80 quality
      const result = await compressImageFile(file, file.name, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 0.80,
      });

      setUploadedDataUrl(result.dataUrl);
      setUploadStats({
        originalSize: formatFileSize(result.originalSizeBytes),
        compressedSize: formatFileSize(result.compressedSizeBytes),
        savedPercentage: result.savedPercentage,
        dimensions: `${result.dimensions.width} × ${result.dimensions.height}`,
      });
    } catch (err: any) {
      console.error('Customer image upload error:', err);
      setUploadError(err.message || 'Failed to process and compress image. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUpload = () => {
    if (!activeSlotKey || !uploadedDataUrl) return;
    updateGallerySlot(activeSlotKey, uploadedDataUrl);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-500/10 via-stone-50 dark:via-stone-900 to-amber-500/5 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-900 dark:text-amber-300 border border-amber-300/40">
              <Images className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Customer Pages Gallery &amp; Banners</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Manage Customer App Banners &amp; Visuals
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Customize key customer-facing visuals in real time — including the landing page hero wallpaper, the 4-picture featured spotlight, and the private studio reservation banner. Upload your own photography or choose from the system's curated collection. (Note: Customer Menu split covers are dynamically powered by your live category images).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white transition shadow-2xs cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All to Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Spotlight: 4 Changeable Pictures Interactive Showcase */}
      <div className="rounded-3xl border border-amber-300/80 dark:border-amber-700/60 bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500 text-stone-950 font-black text-xs shadow-xs">
                4
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-stone-900 dark:text-stone-100">
                Landing Page Featured Spotlight (4 Changeable Pictures)
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              The landing page hero collage rotates continuously across these 4 changeable pictures. Click <span className="font-bold text-amber-700 dark:text-amber-400">Upload</span> or <span className="font-bold text-amber-700 dark:text-amber-400">Choose</span> on any picture to customize it in real time.
            </p>
          </div>
          <span className="shrink-0 self-start sm:self-auto rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-3 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-300">
            4 Spotlight Pictures Active
          </span>
        </div>

        {/* 4-Picture Hero Collage Live Layout Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              key: 'heroFeaturedImage' as GallerySlotKey,
              num: 1,
              label: 'Picture 1: Artisan Brews',
              target: 'Coffee & Specialty Drinks',
              aspect: 'Large Left Slot',
              icon: <Coffee className="h-3.5 w-3.5 text-amber-600" />,
              defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage || '/images/food_and_drinks_images/Hot Coffee/flat_white.jpeg',
            },
            {
              key: 'heroFeaturedImage2' as GallerySlotKey,
              num: 2,
              label: 'Picture 2: Event Spaces',
              target: 'Studio Venue & Private Events',
              aspect: 'Top Right Slot',
              icon: <Calendar className="h-3.5 w-3.5 text-emerald-600" />,
              defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage2 || '/images/venue.webp',
            },
            {
              key: 'heroFeaturedImage3' as GallerySlotKey,
              num: 3,
              label: 'Picture 3: Comfort on a Plate',
              target: 'Artisan Fare & Breakfast',
              aspect: 'Middle Right Slot',
              icon: <Utensils className="h-3.5 w-3.5 text-amber-700" />,
              defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage3 || '/images/food_and_drinks_images/Breakfast/hungarian_sausage.jpeg',
            },
            {
              key: 'heroFeaturedImage4' as GallerySlotKey,
              num: 4,
              label: 'Picture 4: Cozy Café Spaces',
              target: 'Ambiance & Seating Nooks',
              aspect: 'Bottom Right Slot',
              icon: <Sparkles className="h-3.5 w-3.5 text-orange-600" />,
              defaultUrl: DEFAULT_GALLERY_SETTINGS.heroFeaturedImage4 || '/images/18_Main_Counter_Interior.webp',
            },
          ].map((pic) => {
            const currentUrl = (galleryState[pic.key] as string) || pic.defaultUrl;
            const isCustom = currentUrl.startsWith('data:');
            const isDef = currentUrl === pic.defaultUrl;

            return (
              <div
                key={pic.key}
                className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-stone-100">
                      {pic.icon}
                      <span>{pic.label}</span>
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        isDef
                          ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                          : isCustom
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {isDef ? 'Preset' : isCustom ? 'Custom' : 'Library'}
                    </span>
                  </div>

                  <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-200 dark:border-stone-700 mb-2.5">
                    <img
                      src={currentUrl}
                      alt={pic.label}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = pic.defaultUrl;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-white font-mono font-medium drop-shadow-sm">
                      <span className="truncate">{pic.aspect}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            title: pic.label,
                            url: currentUrl,
                            slot: pic.target,
                          })
                        }
                        className="rounded-md bg-black/60 p-1 hover:bg-black/90 transition cursor-pointer text-amber-300"
                        title="Zoom Preview"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2 truncate">
                    Focus: {pic.target}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-stone-200/70 dark:border-stone-750">
                  <button
                    type="button"
                    onClick={() => handleOpenUpload(pic.key)}
                    className="flex items-center justify-center gap-1 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 py-1.5 text-[10.5px] font-bold hover:bg-stone-800 dark:hover:bg-amber-400 transition cursor-pointer active:scale-95"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPicker(pic.key)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-200 py-1.5 text-[10.5px] font-bold hover:bg-stone-100 dark:hover:bg-stone-750 transition cursor-pointer active:scale-95"
                  >
                    <Images className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span>Choose</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Section Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setSectionFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              sectionFilter === 'all'
                ? 'bg-white dark:bg-stone-700 text-stone-950 dark:text-stone-100 shadow-2xs font-black'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            All Visuals ({GALLERY_SLOTS.length})
          </button>
          <button
            type="button"
            onClick={() => setSectionFilter('spotlight')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              sectionFilter === 'spotlight'
                ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Featured Spotlight (4 Pictures)</span>
          </button>
          <button
            type="button"
            onClick={() => setSectionFilter('covers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              sectionFilter === 'covers'
                ? 'bg-white dark:bg-stone-700 text-stone-950 dark:text-stone-100 shadow-2xs font-black'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Wallpapers &amp; Reservations (2)
          </button>
        </div>

        <span className="text-xs text-stone-500 dark:text-stone-400">
          Showing {displayedSlots.length} of {GALLERY_SLOTS.length} visual slots
        </span>
      </div>

      {/* Grid of the Customer Image Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {displayedSlots.map((slot) => {
          const currentUrl = (galleryState[slot.key] as string) || slot.defaultUrl;
          const isCustomUploaded = currentUrl.startsWith('data:');
          const isPresetOrSystem = !isCustomUploaded;
          const isDefault = currentUrl === slot.defaultUrl;

          // Find system image match if any
          const matchedSystemImage = SYSTEM_EXISTING_IMAGES.find((img) => img.url === currentUrl);

          return (
            <div
              key={slot.key}
              className="flex flex-col justify-between rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm hover:shadow-md transition group"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                      {slot.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-snug">
                        {slot.title}
                      </h3>
                      <span className="text-[10px] font-mono text-stone-400">
                        Target: {slot.badge}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isDefault
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                        : isCustomUploaded
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {isDefault ? 'Default Preset' : isCustomUploaded ? 'Custom Upload' : 'System Library'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">
                  {slot.description}
                </p>
              </div>

              {/* Visual Preview Box */}
              <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-950/40">
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-950 shadow-inner group/preview">
                  <div className={`w-full ${slot.aspectClass} relative overflow-hidden flex items-center justify-center`}>
                    <img
                      src={currentUrl}
                      alt={slot.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = slot.defaultUrl;
                      }}
                    />

                    {/* Gradient Overlay for realism */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent pointer-events-none" />

                    {/* Overlay Details */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300 font-bold">
                          {slot.badge}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-white drop-shadow-md truncate max-w-[200px] sm:max-w-[280px]">
                          {matchedSystemImage?.title || (isCustomUploaded ? 'Uploaded Custom Image' : 'Custom Image')}
                        </p>
                      </div>

                      {/* Expand / View Fullscreen */}
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            title: slot.title,
                            url: currentUrl,
                            slot: slot.targetPage,
                          })
                        }
                        className="rounded-lg bg-black/60 hover:bg-black/90 text-white p-1.5 transition backdrop-blur-xs cursor-pointer shadow-md"
                        title="View Fullscreen"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Storage / Format metrics */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-mono text-[10px]">
                    Aspect: {slot.recommendedAspect}
                  </span>
                  {isCustomUploaded ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <Zap className="h-3 w-3" />
                      <span>{calculateBase64Size(currentUrl)} (Compressed)</span>
                    </span>
                  ) : (
                    <span className="text-stone-400 font-mono text-[10px]">
                      Preset File
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Presets Carousel on the Card */}
              <div className="px-4 sm:px-5 py-3 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Quick Recommended Presets
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPicker(slot.key)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {SYSTEM_EXISTING_IMAGES.filter((img) => {
                    if (slot.key === 'heroFeaturedImage') {
                      return img.category === 'drinks' || img.recommendedFor.includes('hero');
                    }
                    if (slot.key === 'heroFeaturedImage2') {
                      return img.category === 'areas' || img.recommendedFor.includes('reservation');
                    }
                    if (slot.key === 'heroFeaturedImage3') {
                      return img.category === 'food' || img.recommendedFor.includes('food');
                    }
                    if (slot.key === 'heroFeaturedImage4') {
                      return img.category === 'ambiance' || img.recommendedFor.includes('hero');
                    }
                    if (slot.key === 'heroBackground') {
                      return img.category === 'ambiance' || img.recommendedFor.includes('hero');
                    }
                    if (slot.key === 'reservationBanner') {
                      return img.category === 'areas' || img.recommendedFor.includes('reservation');
                    }
                    return img.category === 'ambiance' || img.recommendedFor.includes('hero');
                  })
                    .slice(0, 5)
                    .map((preset) => {
                      const isSelected = currentUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => updateGallerySlot(slot.key, preset.url)}
                          className={`group shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400'
                              : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:border-amber-300 dark:hover:border-amber-600 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="h-4 w-4 rounded-md object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <span className="truncate max-w-[100px]">{preset.title.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenUpload(slot.key)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-500 px-3 py-2 text-xs font-extrabold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-400 transition shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Image</span>
                  </button>

                  {/* Choose from Existing Library Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenPicker(slot.key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Images className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Choose Existing</span>
                  </button>
                </div>

                {/* Reset to Default Button */}
                {!isDefault && (
                  <button
                    type="button"
                    onClick={() => handleResetSlot(slot)}
                    className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition cursor-pointer"
                    title="Reset to default preset"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CHOOSE EXISTING IMAGE FROM SYSTEM LIBRARY */}
      {/* ========================================================================= */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-98 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Images className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                    Choose Existing System Image
                  </h3>
                </div>
                {activeSlotDef && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Selecting image for:{' '}
                    <strong className="text-amber-700 dark:text-amber-400 font-bold">
                      {activeSlotDef.title}
                    </strong>{' '}
                    ({activeSlotDef.targetPage})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Photos' },
                  { id: 'areas', label: 'Café Spaces & Venue' },
                  { id: 'drinks', label: 'Drinks & Coffee' },
                  { id: 'food', label: 'Food & Pastries' },
                  { id: 'ambiance', label: 'Ambiance & Walls' },
                ].map((cat) => {
                  const isActive = pickerCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPickerCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search photo name or item..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Images Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[350px]">
              {filteredSystemImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                  <ImageIcon className="h-10 w-10 text-stone-300" />
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                    No matching images found
                  </p>
                  <p className="text-xs text-stone-400">
                    Try changing your search term or select "All Photos".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredSystemImages.map((img) => {
                    const isCurrent =
                      activeSlotKey && galleryState[activeSlotKey] === img.url;
                    return (
                      <div
                        key={img.id}
                        onClick={() => handleSelectFromPicker(img)}
                        className={`group relative rounded-2xl overflow-hidden border-2 transition cursor-pointer flex flex-col bg-stone-950 ${
                          isCurrent
                            ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-md'
                            : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 hover:shadow-lg'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-900">
                          <img
                            src={img.url}
                            alt={img.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/images/latte.webp';
                            }}
                          />
                          {isCurrent && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 rounded-full p-1 shadow-md">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              {img.categoryLabel}
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="p-2.5 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex-1 flex flex-col justify-between">
                          <div className="space-y-0.5">
                            <p className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-snug line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                              {img.title}
                            </p>
                            {img.description && (
                              <p className="text-[10px] text-stone-400 leading-tight line-clamp-1">
                                {img.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-2 pt-1 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-stone-400">
                              {isCurrent ? 'Currently Active' : 'Click to select'}
                            </span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                              &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {filteredSystemImages.length} images available
              </span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD CUSTOM IMAGE WITH AUTO-COMPRESSION */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8 space-y-4 animate-in fade-in zoom-in-98 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-display text-lg font-bold text-stone-900 dark:text-stone-100">
                    Upload Customer Page Image
                  </h3>
                </div>
                {activeSlotDef && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Slot: <strong className="text-amber-700 dark:text-amber-400">{activeSlotDef.title}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processUploadFile(file);
              }}
              className="hidden"
            />

            {/* Dropzone / Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition p-6 flex flex-col items-center justify-center cursor-pointer text-center space-y-3"
            >
              {isCompressing ? (
                <div className="py-6 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Optimizing &amp; Compressing Photo...
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Downscaling to safe resolution and encoding for lightweight storage
                  </p>
                </div>
              ) : uploadedDataUrl ? (
                <div className="w-full space-y-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-950">
                    <img
                      src={uploadedDataUrl}
                      alt="Uploaded preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>

                  {uploadStats && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 p-2.5 text-left text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                        <span>⚡ {uploadStats.savedPercentage}% Storage Saved</span>
                        <span className="font-mono text-[11px]">{uploadStats.dimensions}</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                        Storage Size: <strong>{uploadStats.compressedSize}</strong> (down from {uploadStats.originalSize})
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500">
                    Click anywhere on this box to choose a different photo.
                  </p>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Click to browse your device, or drop image here
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Supports JPG, PNG, and WebP (up to 25MB)
                    </p>
                  </div>
                  {activeSlotDef && (
                    <span className="inline-block rounded-md bg-stone-200/70 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-mono text-stone-600 dark:text-stone-400">
                      Recommended: {activeSlotDef.recommendedAspect}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadedDataUrl || isCompressing}
                onClick={handleApplyUpload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-black text-stone-950 transition shadow-md cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Apply &amp; Save Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FULLSCREEN PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-3xl overflow-hidden bg-stone-950 border border-stone-800 shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div>
                <h4 className="font-bold text-white text-base">{previewImage.title}</h4>
                <p className="text-xs text-stone-400">{previewImage.slot}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-800 text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden rounded-2xl flex items-center justify-center bg-stone-900">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
