import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, StoreSettings, Category } from '../../types';
import { ShoppingCart, Calendar, Clock, Heart, Sparkles, ArrowRight, ShieldCheck, MapPin, Phone, Leaf, Flower2, Coffee, Eye, X, ZoomIn, ChevronLeft, ChevronRight, Mail, Globe, CheckCircle2, MessageCircle, Bot, Send, Loader2, Plus, Check, RotateCw } from 'lucide-react';
import { HangingVinesOverlay, MonsteraPlantCorner, CoffeePlantBranch } from './BotanicalElements';
import { AppStore } from '../../services/store';

interface CustomerHomeProps {
  bestSellers?: MenuItem[];
  categories?: Category[];
  settings: StoreSettings;
  onNavigateMenu: () => void;
  onNavigateReservation: () => void;
  onNavigateOrders?: () => void;
  onAddToCart?: (item: MenuItem) => void;
  onOpenChatbot?: () => void;
}

interface AreaSpot {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  portraitImg: string;
  topImg: string;
  bottomImg: string;
  features: string[];
}

interface HeroCollageItem {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
  fallbackUrl: string;
  actionText: string;
  actionType: 'menu' | 'reservation';
}

const HERO_COLLAGE_ITEMS: HeroCollageItem[] = [
  {
    id: 'artisan-brews',
    label: 'Artisan Brews',
    title: 'Artisan Brews • Flat White',
    description: 'Freshly pulled double ristretto shots married with velvety micro-foam, showcasing rich caramel sweetness and silky crema pulled from premium beans.',
    imageUrl: '/images/food_and_drinks_images/Hot Coffee/flat_white.jpeg',
    fallbackUrl: '/images/01_Hearts_Latte_Art.jpg',
    actionText: 'View on Menu',
    actionType: 'menu',
  },
  {
    id: 'event-spaces',
    label: 'Event Spaces',
    title: 'Yellow Hauz Event Spaces & Studio',
    description: 'A cozy, dedicated air-conditioned studio space featuring presentation display, whiteboard, comfortable seating, and access to our lush garden courtyard. Perfect for intimate events, meetings, and celebrations.',
    imageUrl: '/images/venue.webp',
    fallbackUrl: '/venue.webp',
    actionText: 'Book Reservation',
    actionType: 'reservation',
  },
  {
    id: 'comfort-plate',
    label: 'Comfort on a Plate',
    title: 'Comfort on a Plate • Hungarian Sausage',
    description: 'Grilled spicy Hungarian sausage with a signature crisp snap, served hot with garlic butter rice or golden crispy fries.',
    imageUrl: '/images/food_and_drinks_images/Breakfast/hungarian_sausage.jpeg',
    fallbackUrl: '/images/grilledgarliccheese.webp',
    actionText: 'View on Menu',
    actionType: 'menu',
  },
  {
    id: 'cozy-spaces',
    label: 'Cozy Café Spaces',
    title: 'Cozy Café Spaces & Ambiance',
    description: 'Warm red brick walls, lush indoor plants, ambient hanging lanterns, and welcoming seating designed for relaxed conversations, study, and coffee lovers.',
    imageUrl: '/images/18_Main_Counter_Interior.webp',
    fallbackUrl: '/images/20_Seating_Area.webp',
    actionText: 'View Menu',
    actionType: 'menu',
  },
];

const HERO_SLOT_CLASSES: Record<number, string> = {
  0: 'col-start-1 row-start-1 row-span-3', // 1 BIG featured image (full height on left)
  1: 'col-start-2 row-start-1 row-span-1', // Top-Right small image
  2: 'col-start-2 row-start-2 row-span-1', // Middle-Right small image
  3: 'col-start-2 row-start-3 row-span-1', // Bottom-Right small image
};

const YELLOWHAUZ_AREAS: AreaSpot[] = [
  {
    id: 'all',
    name: 'All Spaces',
    title: 'YELLOW HAUZ AREAS',
    subtitle: '',
    description:
      'Nice that you have found us. Founded in 2007 along V. Mapa Street in Davao City, Yellow Hauz was thoughtfully built as an eclectic haven where warm brick walls, lush greenery, and handcrafted coffee come together.',
    portraitImg: '/images/venue.webp',
    topImg: '/images/yellowhauz_areas_images/Main_area_tables.webp',
    bottomImg: '/images/yellowhauz_areas_images/couch.webp',
    features: [],
  },
  {
    id: 'main-hall',
    name: 'Main Hall',
    title: 'MAIN DINING & WORK TABLES',
    subtitle: '',
    description:
      'Spacious wooden tables paired with ambient lighting, cool air conditioning, and convenient access to power outlets. Designed for remote workers, study groups, or hearty family lunches.',
    portraitImg: '/images/yellowhauz_areas_images/Main_area_tables.webp',
    topImg: '/images/yellowhauz_areas_images/Counter.webp',
    bottomImg: '/images/yellowhauz_areas_images/corner_seats.webp',
    features: [],
  },
  {
    id: 'couch',
    name: 'Couch Lounge',
    title: 'VELVET COUCH NOOK',
    subtitle: '',
    description:
      'Our signature plush couch nook is tucked away for maximum comfort. Sink in with an iced caramel macchiato, your favorite paperback novel, or catch up intimately with close friends.',
    portraitImg: '/images/yellowhauz_areas_images/couch.webp',
    topImg: '/images/yellowhauz_areas_images/corner_seats.webp',
    bottomImg: '/images/yellowhauz_areas_images/front_glass_garden_window.webp',
    features: [],
  },
  {
    id: 'garden',
    name: 'Garden Courtyard',
    title: 'OUTDOOR GARDEN PATIO',
    subtitle: '',
    description:
      'Breathe in the evening breeze surrounded by hanging ivy, potted monsteras, and warm bistro string lights. A peaceful sanctuary under the open sky perfect for twilight dinners and chill dates.',
    portraitImg: '/images/yellowhauz_areas_images/Outdoor_Garden_Night.webp',
    topImg: '/images/yellowhauz_areas_images/yellowhauz_front_view.jpg',
    bottomImg: '/images/yellowhauz_areas_images/front_glass_garden_window.webp',
    features: [],
  },
  {
    id: 'counter',
    name: 'Espresso Bar',
    title: 'ARTISAN COFFEE COUNTER',
    subtitle: '',
    description:
      'Watch our passionate baristas pull smooth double shots of specialty espresso and steam silky microfoam. Browse freshly baked cheesecakes, artisan pastries, and warm toasts in the glass display.',
    portraitImg: '/images/yellowhauz_areas_images/Counter.webp',
    topImg: '/images/yellowhauz_areas_images/Main_area_tables.webp',
    bottomImg: '/images/yellowhauz_areas_images/couch.webp',
    features: [],
  },
  {
    id: 'corner',
    name: 'Corner Nooks',
    title: 'INTIMATE CORNER SEATS',
    subtitle: '',
    description:
      'Framed by our tall front glass window with views looking out to the lush garden, these corner seats capture golden natural daylight by day and cozy warm lamp light by night.',
    portraitImg: '/images/yellowhauz_areas_images/corner_seats.webp',
    topImg: '/images/yellowhauz_areas_images/front_glass_garden_window.webp',
    bottomImg: '/images/yellowhauz_areas_images/yellowhauz_front_view.jpg',
    features: [],
  },
];

const AI_QUICK_CHIPS = [
  { label: '⭐ Best Sellers', query: 'What are your top best sellers and signature drinks?' },
  { label: '☕ Sweet & Creamy', query: 'What coffee drinks are sweet and creamy?' },
  { label: '⚡ Strong Coffee', query: 'I need a strong, bold coffee with a rich caffeine kick!' },
  { label: '🌱 Dairy-Free Milks', query: 'What plant-based milk alternatives do you offer?' },
  { label: '🏢 Studio Rental', query: 'Tell me about the Private Venue / Function Studio rental' },
  { label: '🥪 Comfort Meals', query: 'What savory comfort meals or pasta dishes do you recommend?' },
];

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  bestSellers = [],
  categories: categoriesProp,
  settings,
  onNavigateMenu,
  onNavigateReservation,
  onNavigateOrders,
  onAddToCart,
  onOpenChatbot,
}) => {
  const [currentAreaIndex, setCurrentAreaIndex] = useState<number>(0);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string } | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [policyModal, setPolicyModal] = useState<{ title: string; content: string } | null>(null);

  // Hero Collage Clockwise Animation & Modal State
  const [heroRotationStep, setHeroRotationStep] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [selectedHeroImage, setSelectedHeroImage] = useState<HeroCollageItem | null>(null);

  // Auto-rotate hero images clockwise every 4.5 seconds (paused on hover or when modal is open)
  useEffect(() => {
    if (isHeroHovered || selectedHeroImage) return;
    const timer = setInterval(() => {
      setHeroRotationStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHeroHovered, selectedHeroImage]);

  // Keyboard accessibility: Close hero image modal on Escape key
  useEffect(() => {
    if (!selectedHeroImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHeroImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHeroImage]);

  // AI Assistant Section State
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [addedAiItemId, setAddedAiItemId] = useState<number | null>(null);
  const [aiResponse, setAiResponse] = useState<{
    query: string;
    reply: string;
    recommendedItems?: MenuItem[];
    suggestedAction?: 'menu' | 'reservation' | 'orders' | 'none';
    source?: 'gemini' | 'local';
  } | null>({
    query: 'What are your top recommendations?',
    reply: 'Try our signature **Spanish Latte** paired with a freshly baked **Matcha White Chocolate Cookie** or comforting **Beef Lasagna**!',
    suggestedAction: 'menu',
    source: 'local',
  });

  const handleAskAi = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await AppStore.askCustomerAssistant(trimmed);
      setAiResponse({
        query: trimmed,
        reply: result.reply,
        recommendedItems: result.recommendedItems,
        suggestedAction: result.suggestedAction,
        source: result.source,
      });
    } catch {
      const fallback = AppStore.getChatbotCustomerResponse(trimmed);
      setAiResponse({
        query: trimmed,
        reply: fallback.reply,
        recommendedItems: fallback.recommendedItems,
        suggestedAction: fallback.suggestedAction,
        source: 'local',
      });
    } finally {
      setAiLoading(false);
      setAiQuery('');
    }
  };

  const handleAddAiItem = (item: MenuItem) => {
    if (onAddToCart) {
      onAddToCart(item);
      setAddedAiItemId(item.id);
      setTimeout(() => setAddedAiItemId(null), 1800);
    }
  };

  const handlePrevArea = () => {
    setCurrentAreaIndex((prev) => (prev === 0 ? YELLOWHAUZ_AREAS.length - 1 : prev - 1));
  };

  const handleNextArea = () => {
    setCurrentAreaIndex((prev) => (prev === YELLOWHAUZ_AREAS.length - 1 ? 0 : prev + 1));
  };

  // Category map for item subtitles
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    const list = categoriesProp && categoriesProp.length > 0 ? categoriesProp : AppStore.getCategories();
    list.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categoriesProp]);

  // Best Sellers Carousel state & controls
  const [activeBestSellerIndex, setActiveBestSellerIndex] = useState<number>(0);
  const bestSellersTrackRef = useRef<HTMLDivElement>(null);
  const isBestSellerPausedRef = useRef<boolean>(false);

  const scrollBestSellerTo = (index: number) => {
    const container = bestSellersTrackRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('.best-seller-card');
    if (cards[index]) {
      const card = cards[index];
      const targetLeft = card.offsetLeft - container.offsetLeft;
      container.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
      setActiveBestSellerIndex(index);
    }
  };

  const handlePrevBestSeller = () => {
    if (!bestSellers || bestSellers.length === 0) return;
    const next = activeBestSellerIndex <= 0 ? bestSellers.length - 1 : activeBestSellerIndex - 1;
    scrollBestSellerTo(next);
  };

  const handleNextBestSeller = () => {
    if (!bestSellers || bestSellers.length === 0) return;
    const next = (activeBestSellerIndex + 1) % bestSellers.length;
    scrollBestSellerTo(next);
  };

  // Auto-move carousel every 3.5 seconds
  useEffect(() => {
    if (!bestSellers || bestSellers.length <= 1) return;

    const timer = setInterval(() => {
      if (isBestSellerPausedRef.current) return;
      setActiveBestSellerIndex((prev) => {
        const next = (prev + 1) % bestSellers.length;
        const container = bestSellersTrackRef.current;
        if (container) {
          const cards = container.querySelectorAll<HTMLElement>('.best-seller-card');
          if (cards[next]) {
            const targetLeft = cards[next].offsetLeft - container.offsetLeft;
            container.scrollTo({
              left: targetLeft,
              behavior: 'smooth',
            });
          }
        }
        return next;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [bestSellers]);

  const handleCarouselScroll = () => {
    const container = bestSellersTrackRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('.best-seller-card');
    const scrollLeft = container.scrollLeft;
    let closestIndex = 0;
    let minDiff = Infinity;
    cards.forEach((card, idx) => {
      const diff = Math.abs(card.offsetLeft - container.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    setActiveBestSellerIndex(closestIndex);
  };

  const activeArea = YELLOWHAUZ_AREAS[currentAreaIndex] || YELLOWHAUZ_AREAS[0];

  // Hero Collage dynamic items based on admin gallery settings (4 changeable spotlight pictures)
  const heroCollageItems = useMemo(() => {
    return HERO_COLLAGE_ITEMS.map((item, index) => {
      let customUrl: string | undefined;
      if (index === 0) {
        customUrl = settings.customer_gallery?.heroFeaturedImage;
      } else if (index === 1) {
        customUrl = settings.customer_gallery?.heroFeaturedImage2 || settings.customer_gallery?.reservationBanner;
      } else if (index === 2) {
        customUrl = settings.customer_gallery?.heroFeaturedImage3;
      } else if (index === 3) {
        customUrl = settings.customer_gallery?.heroFeaturedImage4;
      }

      if (customUrl) {
        return {
          ...item,
          imageUrl: customUrl,
        };
      }
      return item;
    });
  }, [settings.customer_gallery]);

  const reservationBannerUrl = settings.customer_gallery?.reservationBanner || '/images/venue.webp';

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section - Warm Red Brick, Plants & Amber Cafe Atmosphere */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#7A3620]/30 text-white shadow-xl bg-stone-950">
        {/* Hero Background Image (Configurable via Admin Gallery) */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-100"
          style={{
            backgroundImage: `url("${settings.customer_gallery?.heroBackground || '/images/red_brick_bg.png'}")`,
          }}
          role="img"
          aria-label="Yellow Hauz Café Wall"
        />

        {/* Ambient Dark & Warm Amber Overlay to keep typography crisp and rich */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/80 to-stone-950/70 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/25 via-transparent to-stone-950/60 pointer-events-none" />

        {/* Botanical Hanging Ivy Vines draping down the red brick wall */}
        <HangingVinesOverlay className="absolute top-0 left-0 right-0 z-1" />

        {/* Lush corner Monstera Plant accent */}
        <MonsteraPlantCorner className="absolute -bottom-6 -left-6 w-36 h-36 sm:w-48 sm:h-48 z-1 rotate-12" />

        <div className="relative z-10 grid gap-4 sm:gap-6 px-4 py-5 sm:px-8 sm:py-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-8">
          <div>
            <div className="flex items-center gap-3.5 sm:gap-4.5">
              {/* Coffee at Yellow Hauz Logo - Enlarged Size */}
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl sm:rounded-3xl bg-amber-400/90 border-2 sm:border-3 border-amber-300/50 shadow-2xl ring-4 ring-amber-500/20 shrink-0">
                <img
                  src="/images/Coffeatyellowhauz_logo.jpg"
                  alt="Coffee at Yellow Hauz Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                  Est. 2007
                </span>
                <h1 className="mt-0.5 font-display text-2xl sm:text-4xl lg:text-5xl font-black leading-tight sm:leading-[1.15] text-white tracking-tight">
                  Coffee at Yellow Hauz
                </h1>
              </div>
            </div>
            <p className="mt-2.5 sm:mt-3.5 max-w-lg text-xs sm:text-base leading-snug sm:leading-relaxed text-stone-200 font-medium">
              A cozy sanctuary wrapped in warm red brick and lush greenery. Enjoy freshly pulled artisan lattes, slow-crisped pork adobo flakes, and homemade cheesecakes in our airconditioned hall or garden terrace.
            </p>

            <div className="mt-4 sm:mt-6 flex flex-row items-center gap-2.5 sm:gap-3.5">
              <button
                id="hero-order-online-btn"
                onClick={onNavigateMenu}
                className="inline-flex h-10 sm:h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 sm:px-6 text-xs sm:text-sm font-black text-stone-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition transform active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4 shrink-0 text-stone-950" />
                <span>View Menu</span>
              </button>
              <button
                id="hero-book-table-btn"
                onClick={onNavigateReservation}
                className="inline-flex h-10 sm:h-12 items-center justify-center gap-2 rounded-xl bg-stone-900/80 border border-emerald-400/40 backdrop-blur-xs px-4 sm:px-5 text-xs sm:text-sm font-bold text-emerald-300 hover:bg-stone-800 transition cursor-pointer"
              >
                <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Reservation</span>
              </button>
            </div>

            <div className="mt-3.5 sm:mt-6 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-stone-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                <span>Open 7:00 AM - 10:00 PM Daily</span>
              </div>
              <a
                href={settings.google_maps_url || "https://www.google.com/maps/place/Coffee+at+Yellow+Hauz/@7.0757824,125.6066351,17z/data=!3m1!4b1!4m6!3m5!1s0x32f96d74e17f56db:0xc0436864b68e2b5!8m2!3d7.0757824!4d125.6066351!16s%2Fg%2F12qgm_g5g!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 transition"
                title="View on Google Maps"
              >
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                <span>V. Mapa Street, Corner Mabini St.</span>
              </a>
            </div>
          </div>

          {/* Hero Collage: Clockwise Animated 4-Card Grid with Click Modal */}
          {/* Hero Collage: 1 Big + 3 Smaller Images Clockwise Animated with Click Modal */}
          <div>
            <div
              className="relative grid grid-cols-[1.5fr_1fr] sm:grid-cols-[1.65fr_1fr] grid-rows-3 gap-2 sm:gap-3 h-[270px] sm:h-[340px] lg:h-[370px]"
              onMouseEnter={() => setIsHeroHovered(true)}
              onMouseLeave={() => setIsHeroHovered(false)}
            >
              {heroCollageItems.map((item, index) => {
                const currentSlot = (index + heroRotationStep) % 4;
                const isBig = currentSlot === 0;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    transition={{
                      type: 'spring',
                      stiffness: 90,
                      damping: 20,
                      mass: 0.85,
                    }}
                    onClick={() => setSelectedHeroImage(item)}
                    className={`group relative h-full w-full overflow-hidden rounded-xl sm:rounded-2xl bg-stone-900/60 border ${
                      isBig
                        ? 'border-amber-400/70 shadow-xl shadow-amber-500/15 ring-2 ring-amber-400/20'
                        : 'border-white/10 hover:border-amber-400/60 shadow-md hover:shadow-lg'
                    } transition-colors cursor-pointer ${HERO_SLOT_CLASSES[currentSlot]}`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = item.fallbackUrl;
                      }}
                    />

                    {/* Dark gradient overlay for badge readability */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${
                        isBig
                          ? 'from-stone-950/90 via-stone-950/25 to-transparent'
                          : 'from-stone-950/85 via-stone-950/20 to-transparent'
                      } pointer-events-none`}
                    />

                    {/* Category Label Badge */}
                    <div
                      className={`absolute ${
                        isBig
                          ? 'bottom-2 left-2 sm:bottom-3 sm:left-3 px-2 py-1 sm:px-3 sm:py-1.5'
                          : 'bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5'
                      } rounded-md sm:rounded-lg bg-stone-950/85 backdrop-blur-xs text-amber-300 border border-amber-500/30 shadow-xs flex items-center gap-1.5`}
                    >
                      <span
                        className={`${
                          isBig
                            ? 'text-[10px] sm:text-xs font-black'
                            : 'text-[8.5px] sm:text-[10px] font-bold'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Hover Zoom-in Icon */}
                    <div
                      className={`absolute ${
                        isBig
                          ? 'top-2 right-2 sm:top-3 sm:right-3 p-1.5'
                          : 'top-1 right-1 sm:top-1.5 sm:right-1.5 p-1'
                      } rounded-full bg-stone-950/70 backdrop-blur-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/20`}
                    >
                      <ZoomIn
                        className={`${
                          isBig
                            ? 'h-3.5 w-3.5 sm:h-4 sm:w-4'
                            : 'h-2.5 w-2.5 sm:h-3 sm:w-3'
                        } text-amber-300`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Atmospheric Scroll-Revealed Brand Phrases */}
      <section
        aria-label="Yellow Hauz Cafe Atmosphere"
        className="relative overflow-hidden rounded-3xl border border-amber-900/30 bg-gradient-to-b from-stone-950 via-[#1C1612] to-stone-950 py-16 sm:py-24 px-6 sm:px-12 shadow-2xl text-center"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <MonsteraPlantCorner className="absolute -bottom-12 -left-12 w-48 h-48 opacity-15 pointer-events-none" />
        <MonsteraPlantCorner className="absolute -top-12 -right-12 w-48 h-48 opacity-15 rotate-180 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Phrase 1: SIP THE FINEST COFFEE */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.65 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase text-amber-100/95 leading-tight transition duration-300 group-hover:text-amber-300">
                SIP THE FINEST COFFEE,
              </h2>
            </motion.div>

            {/* Subtle botanical separator */}
            <div className="flex items-center justify-center gap-3 opacity-40">
              <span className="h-px w-12 bg-amber-500/50" />
              <Coffee className="h-4 w-4 text-amber-400" />
              <span className="h-px w-12 bg-amber-500/50" />
            </div>

            {/* Phrase 2: SAVOR EVERY MEALS */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.65 }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase text-amber-300 leading-tight transition duration-300 group-hover:text-amber-200">
                SAVOR EVERY MEALS,
              </h2>
            </motion.div>

            {/* Subtle botanical separator */}
            <div className="flex items-center justify-center gap-3 opacity-40">
              <span className="h-px w-12 bg-amber-500/50" />
              <Leaf className="h-4 w-4 text-emerald-400" />
              <span className="h-px w-12 bg-amber-500/50" />
            </div>

            {/* Phrase 3: COZY LOCAL DINE */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.65 }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase text-[#F3ECE2] leading-tight transition duration-300 group-hover:text-amber-100">
                COZY LOCAL DINE.
              </h2>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Private Venue Reservation Callout with Botanical Charm */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white shadow-xl">
        <MonsteraPlantCorner className="absolute -top-10 -right-10 w-44 h-44 opacity-25 z-0" />
        <div className="relative z-10 grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              Host Your Next Event at The Yellow Hauz Private Studio
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl">
              Perfect for meetings, workshops, intimate celebrations, and gatherings. Fully air-conditioned private room with TV HDMI presentation display, whiteboard, and access to our garden courtyard.
            </p>

            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <div className="inline-flex items-baseline gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400">₱3,500</span>
                <span className="text-xs font-bold text-stone-200">Base Rate (3 Hours)</span>
                <span className="text-[11px] text-stone-400">• Extension: +₱1,000/extra hr (consumable)</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-stone-300 font-medium">
              <span className="rounded-lg bg-stone-800/80 px-2.5 py-1 border border-stone-700">❄️ Air conditioning</span>
              <span className="rounded-lg bg-stone-800/80 px-2.5 py-1 border border-stone-700">📺 TV HDMI</span>
              <span className="rounded-lg bg-stone-800/80 px-2.5 py-1 border border-stone-700">📋 Whiteboard</span>
              <span className="rounded-lg bg-amber-500/20 text-amber-300 px-2.5 py-1 border border-amber-500/30 font-bold">👥 25 Heads only</span>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onNavigateReservation}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs sm:text-sm font-extrabold text-stone-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition transform active:scale-95 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Book Studio / View Rates
              </button>
            </div>
          </div>

          <div
            onClick={() =>
              setLightboxImg({
                url: reservationBannerUrl,
                title: 'Yellow Hauz Private Studio Venue',
              })
            }
            className="group relative aspect-16/10 sm:aspect-4/3 overflow-hidden rounded-2xl border border-stone-700 bg-stone-800 shadow-lg cursor-pointer transition duration-300 hover:border-amber-400/50"
            role="button"
            tabIndex={0}
            aria-label="View photo modal"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setLightboxImg({
                  url: reservationBannerUrl,
                  title: 'Yellow Hauz Private Studio Venue',
                });
              }
            }}
          >
            <img
              src={reservationBannerUrl}
              alt="Yellow Hauz Private Studio Venue"
              className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/venue.webp';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/90 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold shadow-md">
                <ZoomIn className="h-3.5 w-3.5" /> View Photo
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Yellow Hauz Areas Section - Red Brick Wall, Botanical Accents & Photo Collage */}
      <section
        id="yellowhauz-areas-section"
        className="relative overflow-hidden rounded-3xl bg-stone-950 text-white shadow-2xl p-6 sm:p-10 lg:p-12 border border-[#7A3620]/40"
      >
        {/* Red Brick Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-100"
          style={{ backgroundImage: 'url("/images/red_brick_bg.png")' }}
          role="img"
          aria-label="Yellow Hauz Red Brick Café Wall"
        />

        {/* Ambient Dark & Warm Amber Overlay to keep typography crisp and rich */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/85 to-stone-950/78 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-stone-950/60 pointer-events-none" />

        {/* Hanging Ivy Vines overlay */}
        <HangingVinesOverlay className="absolute top-0 left-0 right-0 opacity-40 z-1 pointer-events-none" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center xl:gap-12">
          {/* Left Column: Photo Collage directly following reference image proportions */}
          <div className="relative group/collage">
            <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
              {/* Left Column of collage: Tall portrait image card with generous rounded-3xl */}
              <div
                onClick={() =>
                  setLightboxImg({
                    url: activeArea.portraitImg,
                    title: `${activeArea.name} - Feature View`,
                  })
                }
                className="group relative h-[360px] sm:h-[480px] lg:h-[530px] w-full overflow-hidden rounded-3xl border-2 border-white/20 bg-stone-900 shadow-2xl cursor-pointer transition duration-300 hover:scale-[1.01] hover:border-amber-400/50"
              >
                <img
                  src={activeArea.portraitImg}
                  alt={activeArea.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/yellowhauz_areas_images/couch.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/90 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold shadow-md">
                    <ZoomIn className="h-3.5 w-3.5" /> View Photo
                  </span>
                </div>
              </div>

              {/* Right Column of collage: Two vertically stacked rounded-3xl image cards */}
              <div className="flex flex-col justify-between gap-3 sm:gap-4.5 h-[360px] sm:h-[480px] lg:h-[530px]">
                {/* Top card */}
                <div
                  onClick={() =>
                    setLightboxImg({
                      url: activeArea.topImg,
                      title: `${activeArea.name} - Atmosphere`,
                    })
                  }
                  className="group relative h-[172px] sm:h-[230px] lg:h-[254px] w-full overflow-hidden rounded-3xl border-2 border-white/20 bg-stone-900 shadow-xl cursor-pointer transition duration-300 hover:scale-[1.01] hover:border-amber-400/50"
                >
                  <img
                    src={activeArea.topImg}
                    alt="Area Detail Top"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/yellowhauz_areas_images/Main_area_tables.webp';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/90 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold shadow-md">
                      <ZoomIn className="h-3 w-3" /> View Photo
                    </span>
                  </div>
                </div>

                {/* Bottom card */}
                <div
                  onClick={() =>
                    setLightboxImg({
                      url: activeArea.bottomImg,
                      title: `${activeArea.name} - Ambience`,
                    })
                  }
                  className="group relative h-[172px] sm:h-[230px] lg:h-[254px] w-full overflow-hidden rounded-3xl border-2 border-white/20 bg-stone-900 shadow-xl cursor-pointer transition duration-300 hover:scale-[1.01] hover:border-amber-400/50"
                >
                  <img
                    src={activeArea.bottomImg}
                    alt="Area Detail Bottom"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/yellowhauz_areas_images/Outdoor_Garden_Night.webp';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/90 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold shadow-md">
                      <ZoomIn className="h-3 w-3" /> View Photo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating overlay navigation buttons on photo collage */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevArea();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-stone-950/80 backdrop-blur-md border border-white/20 text-white hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-xl active:scale-95 cursor-pointer"
              aria-label="Previous photo"
              title="Previous photo"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextArea();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-stone-950/80 backdrop-blur-md border border-white/20 text-white hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-xl active:scale-95 cursor-pointer"
              aria-label="Next photo"
              title="Next photo"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Photo index counter badge overlaid on collage */}
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-stone-950/85 backdrop-blur-md border border-white/20 px-3.5 py-1 shadow-xl pointer-events-none">
              <span className="text-[11px] sm:text-xs font-bold text-amber-300 tracking-wider">
                {currentAreaIndex + 1} / {YELLOWHAUZ_AREAS.length}
              </span>
            </div>
          </div>

          {/* Right Column: Title & Text exactly mirroring the reference typography & composition */}
          <div className="space-y-4 sm:space-y-5 text-white">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                {activeArea.title}
              </h2>
              {activeArea.subtitle ? (
                <p className="mt-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-400">
                  {activeArea.subtitle}
                </p>
              ) : null}
            </div>

            {/* Narrative text paragraphs with clean spacing and high contrast */}
            <div className="space-y-3.5 text-sm sm:text-base leading-relaxed text-stone-200 font-normal">
              <p>{activeArea.description}</p>
              <p>
                Whether you need quiet concentration for remote work, a vibrant gathering space with friends, or a tranquil garden corner to sip your favorite hand-pulled espresso, Yellow Hauz offers distinct atmospheres to match your mood.
              </p>
            </div>

            {/* Area Features badges */}
            {activeArea.features && activeArea.features.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeArea.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900/80 border border-stone-700/90 px-3 py-1 text-xs font-medium text-stone-300"
                  >
                    <Leaf className="h-3 w-3 text-lime-400" />
                    {feat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal for Hero Images */}
      <AnimatePresence>
        {selectedHeroImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedHeroImage(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-stone-900 border border-amber-500/30 shadow-2xl flex flex-col text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-950/90 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                    {selectedHeroImage.label}
                  </span>
                  <h3 className="font-display font-bold text-base sm:text-lg text-white">
                    {selectedHeroImage.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedHeroImage(null)}
                  className="rounded-full p-2 text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Image */}
              <div className="relative bg-stone-950 flex items-center justify-center overflow-hidden max-h-[55vh]">
                <img
                  src={selectedHeroImage.imageUrl}
                  alt={selectedHeroImage.title}
                  className="w-full h-auto max-h-[55vh] object-cover sm:object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = selectedHeroImage.fallbackUrl;
                  }}
                />
              </div>

              {/* Modal Body & Action buttons */}
              <div className="p-4 sm:p-6 bg-stone-900/95 space-y-4 border-t border-white/10">
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-normal">
                  {selectedHeroImage.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <a
                    href={settings.google_maps_url || "https://www.google.com/maps/place/Coffee+at+Yellow+Hauz/@7.0757824,125.6066351,17z/data=!3m1!4b1!4m6!3m5!1s0x32f96d74e17f56db:0xc0436864b68e2b5!8m2!3d7.0757824!4d125.6066351!16s%2Fg%2F12qgm_g5g!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-stone-400 hover:text-amber-400 flex items-center gap-1.5 transition"
                    title="View on Google Maps"
                  >
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>V. Mapa Street, Corner Mabini St. (View Google Maps)</span>
                  </a>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setSelectedHeroImage(null)}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition cursor-pointer"
                    >
                      Close
                    </button>
                    {selectedHeroImage.actionType === 'reservation' ? (
                      <button
                        onClick={() => {
                          setSelectedHeroImage(null);
                          onNavigateReservation();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Reserve Studio</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedHeroImage(null);
                          onNavigateMenu();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-stone-950 transition cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>View on Menu</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Preview Modal for Area Photos */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-stone-900 border border-white/20 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-stone-950/80">
              <h4 className="font-display font-bold text-white text-sm sm:text-base">
                {lightboxImg.title}
              </h4>
              <button
                onClick={() => setLightboxImg(null)}
                className="rounded-full p-1.5 text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 bg-stone-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxImg.url}
                alt={lightboxImg.title}
                className="max-h-[72vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Best Sellers Carousel - Styled like user reference image with Red Brick Background */}
      {bestSellers && bestSellers.length > 0 && (
        <section
          id="best-sellers-carousel-section"
          className="relative overflow-hidden rounded-3xl bg-stone-950 p-4 sm:p-6 lg:p-8 pt-8 sm:pt-10 lg:pt-12 border border-[#7A3620]/40 shadow-xl"
        >
          {/* Red Brick Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-100"
            style={{ backgroundImage: 'url("/images/red_brick_bg.png")' }}
            role="img"
            aria-label="Yellow Hauz Red Brick Café Wall"
          />

          {/* Ambient Dark & Warm Amber Overlay to make the white cards pop beautifully */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/88 via-stone-950/75 to-stone-950/88 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-stone-950/55 pointer-events-none" />

          {/* Botanical Hanging Ivy Vines draping along the top */}
          <HangingVinesOverlay className="absolute top-0 left-0 right-0 opacity-45 z-1 pointer-events-none" />

          {/* Section Header: Best Sellers Title */}
          <div className="relative z-10 text-center mb-1 sm:mb-2 px-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-3.5 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 backdrop-blur-xs mb-2 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Yellow Hauz Favorites</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">
              Best Sellers
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mt-1.5 leading-relaxed">
              Our most-loved handcrafted coffee, signature beverages, and comfort kitchen classics.
            </p>
          </div>

          {/* Track with Cards - Mobile fits 1 item (w-full snap-center) */}
          <div
            ref={bestSellersTrackRef}
            onScroll={handleCarouselScroll}
            onMouseEnter={() => { isBestSellerPausedRef.current = true; }}
            onMouseLeave={() => { isBestSellerPausedRef.current = false; }}
            onTouchStart={() => { isBestSellerPausedRef.current = true; }}
            onTouchEnd={() => { isBestSellerPausedRef.current = false; }}
            className="flex gap-4 sm:gap-3.5 lg:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-[102px] sm:pt-[112px] lg:pt-[122px] px-1 sm:px-2 relative z-10"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {bestSellers.map((item) => (
              <div
                key={item.id}
                className="best-seller-card snap-center shrink-0 w-full sm:w-[calc(50%-7px)] lg:w-[calc(33.333%-11px)] flex justify-center"
              >
                <div
                  onClick={onNavigateMenu}
                  className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 pt-[124px] sm:pt-[134px] lg:pt-[144px] pb-4 sm:pb-4.5 px-4 sm:px-5 flex flex-col border border-stone-100 cursor-pointer text-center w-full max-w-[310px] sm:max-w-none"
                >
                  {/* Floating Circular Dish / Plate Overflowing Top of Card */}
                  <div className="absolute -top-[88px] sm:-top-[96px] lg:-top-[106px] left-1/2 -translate-x-1/2 w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] md:w-[225px] md:h-[225px] lg:w-[240px] lg:h-[240px] rounded-full p-1.5 sm:p-2 bg-white shadow-xl shadow-stone-900/25 border border-stone-200/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                    <img
                      src={item.imageUrl || '/images/latte.webp'}
                      alt={item.name}
                      className="w-full h-full rounded-full object-cover shadow-inner"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/latte.webp';
                      }}
                    />
                  </div>

                  {/* Header / Titles with comfortable spacing from the plate above */}
                  <div className="flex flex-col items-center mt-3">
                    <h3 className="font-serif text-base sm:text-lg lg:text-xl font-bold text-stone-900 leading-snug line-clamp-2 text-center group-hover:text-amber-800 transition">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-400 font-medium mt-1">
                      {categoryMap.get(item.categoryId) || 'Yellow Hauz Signature'}
                    </p>
                  </div>

                  {/* Divider & Meta Row - compact, no big void gap */}
                  <div className="w-full mt-3 sm:mt-3.5">
                    <div className="w-full border-t border-stone-200/80 mb-3" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-900">
                        <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <button
                        type="button"
                        disabled={item.quantity <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.quantity <= 0) return;
                          if (onAddToCart) {
                            onAddToCart(item);
                          } else {
                            onNavigateMenu();
                          }
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition ${
                          item.quantity <= 0
                            ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                            : 'text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 cursor-pointer active:scale-95'
                        }`}
                      >
                        {item.quantity <= 0 ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 text-amber-700" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Controls: Circular Left Arrow, Dots, Circular Right Arrow */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              type="button"
              onClick={handlePrevBestSeller}
              aria-label="Previous best seller"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-900/80 hover:bg-amber-500 text-white hover:text-stone-950 border border-white/20 hover:border-amber-400 flex items-center justify-center transition shadow-lg cursor-pointer active:scale-95 backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-2 px-1">
              {bestSellers.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => scrollBestSellerTo(dotIdx)}
                  aria-label={`Go to item ${dotIdx + 1}`}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${
                    dotIdx === activeBestSellerIndex
                      ? 'w-3 h-3 bg-amber-400 ring-2 ring-amber-400/40 scale-110'
                      : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNextBestSeller}
              aria-label="Next best seller"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-900/80 hover:bg-amber-500 text-white hover:text-stone-950 border border-white/20 hover:border-amber-400 flex items-center justify-center transition shadow-lg cursor-pointer active:scale-95 backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </section>
      )}

      {/* Garden Courtyard & Botanical Dining Atmosphere */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-800/30 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 p-6 sm:p-8 text-white shadow-lg">
        <HangingVinesOverlay className="absolute top-0 left-0 right-0 opacity-40" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              <span>Plant-Lover's Sanctuary</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Sip Under The Greenery &amp; Red Bricks
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Surrounded by climbing ivy, vibrant potted monsteras, fiddle-leaf figs, and native Philippine plants. Whether working on your laptop or unwinding with friends, experience Davao's most peaceful café haven.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onNavigateReservation}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-black text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Reserve Garden Dining</span>
            </button>
            <button
              onClick={onNavigateMenu}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-800/90 border border-stone-700 px-4 py-3 text-xs sm:text-sm font-bold text-stone-200 hover:bg-stone-700 transition cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4 text-amber-400" />
              <span>Explore Drinks &amp; Sweets</span>
            </button>
          </div>
        </div>
      </section>

      {/* Yellow Hauz AI Assistant & Concierge Section (De-cluttered, placed right before footer) */}
      <section
        id="ai-assistant-landing-section"
        className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#181411] via-[#141210] to-[#1e1713] text-white shadow-2xl p-6 sm:p-8 lg:p-10"
      >
        {/* Ambient warm glow */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-600/[0.04] blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Left Column: Focused intro, prompt chips, and concierge trigger (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>Brewmate AI • Virtual Barista</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                Ask Brewmate AI
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Get drink recommendations, dietary guidance, flavor pairings, or check private studio details in seconds.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 block">
                Popular Questions
              </span>
              <div className="flex flex-wrap gap-2">
                {AI_QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskAi(chip.query)}
                    className="rounded-full bg-stone-900/90 border border-stone-750 hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-300 px-3 py-1.5 text-xs text-stone-300 transition text-left cursor-pointer active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Open Full Floating Concierge Chatbot */}
            {onOpenChatbot && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenChatbot}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 dark:from-stone-850 dark:via-stone-900 dark:to-stone-950 dark:border dark:border-amber-500/60 dark:hover:border-amber-400 text-stone-950 dark:text-amber-300 font-black px-4 py-2 text-xs sm:text-sm shadow-md dark:shadow-stone-950/70 transition active:scale-95 cursor-pointer dark:hover:from-stone-800 dark:hover:to-stone-900 dark:hover:text-amber-200"
                >
                  <Bot className="h-4 w-4 text-stone-950 dark:text-amber-400" />
                  <span>Open Full Chat Concierge</span>
                  <ArrowRight className="h-3.5 w-3.5 text-stone-950 dark:text-amber-400" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Query Bar, Answer, and Recommendations (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3.5">
            {/* Interactive Query Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAi(aiQuery);
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about coffees, pastries, milk options, or studio..."
                className="w-full rounded-2xl bg-stone-900/95 border border-stone-750 pl-4 pr-12 py-3 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!aiQuery.trim() || aiLoading}
                className="absolute right-1.5 p-2 rounded-xl bg-amber-500 hover:bg-amber-400 dark:bg-stone-800 dark:border dark:border-amber-500/50 dark:hover:bg-stone-750 text-stone-950 dark:text-amber-400 font-bold disabled:opacity-40 disabled:hover:bg-amber-500 transition cursor-pointer active:scale-95 shadow-sm"
                title="Send to AI Barista"
                aria-label="Send to AI Barista"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-950 dark:text-amber-400" />
                ) : (
                  <Send className="h-4 w-4 text-stone-950 dark:text-amber-400" />
                )}
              </button>
            </form>

            {/* AI Response Card */}
            <div className="rounded-2xl border border-stone-800 bg-[#120f0d] p-4 sm:p-5 shadow-xl space-y-3.5">
              {/* Header Status */}
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-stone-950 font-black text-xs shadow-xs">
                    <Bot className="h-3.5 w-3.5" />
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#120f0d]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Brewmate AI</span>
                    {aiResponse?.source === 'gemini' && (
                      <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                        Gemini
                      </span>
                    )}
                  </div>
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[11px] font-medium">Brewing answer...</span>
                  </div>
                )}
              </div>

              {/* Question Asked Pill */}
              {aiResponse?.query && (
                <div className="flex items-center gap-2 rounded-xl bg-stone-900/80 border border-stone-800 px-3 py-1.5 text-xs text-stone-300">
                  <span className="font-bold text-amber-400 shrink-0">Asked:</span>
                  <span className="italic truncate">"{aiResponse.query}"</span>
                </div>
              )}

              {/* AI Text Reply */}
              {aiResponse && (
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed bg-stone-900/40 rounded-xl p-3.5 border border-stone-800/60">
                  {aiResponse.reply.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className="mb-1.5 last:mb-0">
                      {paragraph.split('**').map((part, partIdx) =>
                        partIdx % 2 === 1 ? (
                          <strong key={partIdx} className="text-amber-300 font-bold">
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  ))}
                </div>
              )}

              {/* Recommended Menu Items Grid */}
              {aiResponse?.recommendedItems && aiResponse.recommendedItems.length > 0 && (
                <div className="space-y-2 pt-0.5">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Recommended Items</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiResponse.recommendedItems.slice(0, 4).map((item) => {
                      const isAdded = addedAiItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-stone-900/90 border border-stone-800 p-2 hover:border-amber-500/40 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={item.imageUrl || '/images/default_food.jpg'}
                              alt={item.name}
                              className="h-9 w-9 shrink-0 rounded-lg object-cover bg-stone-800"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {item.name}
                              </p>
                              <p className="text-[11px] font-extrabold text-amber-400">
                                ₱{item.price.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {onAddToCart && (
                            <button
                              type="button"
                              disabled={item.quantity <= 0}
                              onClick={() => {
                                if (item.quantity <= 0) return;
                                handleAddAiItem(item);
                              }}
                              className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
                                item.quantity <= 0
                                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                                  : isAdded
                                  ? 'bg-emerald-500 text-stone-950 font-black active:scale-95 cursor-pointer'
                                  : 'bg-amber-500 hover:bg-amber-400 dark:bg-stone-800 dark:border dark:border-amber-500/50 dark:hover:bg-stone-750 text-stone-950 dark:text-amber-300 active:scale-95 cursor-pointer'
                              }`}
                              title={item.quantity <= 0 ? 'Out of stock' : 'Add to Order'}
                            >
                              {item.quantity <= 0 ? (
                                <span>Out of stock</span>
                              ) : isAdded ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Quick Navigation */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={onNavigateMenu}
                  className="inline-flex items-center gap-1 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <Coffee className="h-3.5 w-3.5 text-amber-400" />
                  <span>Menu</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateReservation}
                  className="inline-flex items-center gap-1 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Reserve Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Landing Page Footer - 4-Column Design with Warm Café Palette & Subtle Ellipses */}
      <footer className="relative mt-12 sm:mt-16 overflow-hidden rounded-3xl border border-stone-800 bg-[#141210] text-white shadow-2xl">
        {/* Subtle decorative background ellipses mirroring the layout depth */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/[0.03] border border-amber-500/[0.04] pointer-events-none" />
        <div className="absolute left-[38%] -bottom-24 h-80 w-80 rounded-full bg-stone-800/20 border border-stone-850 pointer-events-none" />

        <div className="relative z-10 px-6 sm:px-10 lg:px-12 pt-12 sm:pt-14 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Column 1: Brand Info & Socials (span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white block">
                      YELLOW HAUZ
                    </span>
                    <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                      CAFÉ &amp; STUDIO • DAVAO
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm">
                Passionate specialty coffee craft, comforting artisan fare, and lush garden tranquility since 2007 along V. Mapa Street, Davao City.
              </p>

              {/* Social Media Circular Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href={settings.facebook_url || "https://www.facebook.com/yellowhauz/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Facebook (@yellowhauz)"
                  aria-label="Facebook"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={settings.instagram_url || "https://www.instagram.com/yellowhauz"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Instagram (@yellowhauz)"
                  aria-label="Instagram"
                >
                  <Globe className="h-4 w-4" />
                </a>
                <a
                  href={settings.google_maps_url || "https://www.google.com/maps/place/Coffee+at+Yellow+Hauz/@7.0757824,125.6066351,17z/data=!3m1!4b1!4m6!3m5!1s0x32f96d74e17f56db:0xc0436864b68e2b5!8m2!3d7.0757824!4d125.6066351!16s%2Fg%2F12qgm_g5g!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Google Maps Location"
                  aria-label="Google Maps"
                >
                  <MapPin className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${settings.shop_email || 'yellowhauz@gmail.com'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title={`Email Us: ${settings.shop_email || 'yellowhauz@gmail.com'}`}
                  aria-label="Email Us"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <a
                  href={`tel:${(settings.shop_phone || '09231160300').replace(/\s+/g, '')}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title={`Call Us: ${settings.shop_phone || '0923 116 0300'}`}
                  aria-label="Call Us"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links (span 2) */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-display text-base font-extrabold text-white tracking-wide">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-stone-400">
                <li>
                  <button
                    type="button"
                    onClick={onNavigateMenu}
                    className="hover:text-amber-400 transition text-left cursor-pointer"
                  >
                    Menu &amp; Beverages
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onNavigateReservation}
                    className="hover:text-amber-400 transition text-left cursor-pointer"
                  >
                    Private Studio Rental
                  </button>
                </li>
                <li>
                  <a
                    href="#yellowhauz-areas-section"
                    className="hover:text-amber-400 transition block"
                  >
                    Explore Café Areas
                  </a>
                </li>
                <li>
                  <a
                    href="#ai-assistant-landing-section"
                    className="hover:text-amber-400 transition block"
                  >
                    AI Concierge &amp; Barista
                  </a>
                </li>
                {onNavigateOrders && (
                  <li>
                    <button
                      type="button"
                      onClick={onNavigateOrders}
                      className="hover:text-amber-400 transition text-left cursor-pointer"
                    >
                      Track My Orders
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 3: Get In Touch (span 3) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-display text-base font-extrabold text-white tracking-wide">
                Get In Touch
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <a
                      href={settings.google_maps_url || "https://www.google.com/maps/place/Coffee+at+Yellow+Hauz/@7.0757824,125.6066351,17z/data=!3m1!4b1!4m6!3m5!1s0x32f96d74e17f56db:0xc0436864b68e2b5!8m2!3d7.0757824!4d125.6066351!16s%2Fg%2F12qgm_g5g!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-amber-400 transition underline underline-offset-2 decoration-stone-600 block"
                    >
                      {settings.shop_address || 'Yellow Hauz, Davao City, Philippines'}
                    </a>
                    <p className="text-[11px] text-stone-400">V. Mapa Street, Corner Mabini St.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <a
                      href={`tel:${(settings.shop_phone || '09231160300').replace(/\s+/g, '')}`}
                      className="font-medium hover:text-amber-400 transition"
                    >
                      {settings.shop_phone || '0923 116 0300'}
                    </a>
                    <p className="text-[11px] text-stone-400">Direct Mobile / Call &amp; Text</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <a
                      href={`mailto:${settings.shop_email || 'yellowhauz@gmail.com'}`}
                      className="font-medium hover:text-amber-400 transition"
                    >
                      {settings.shop_email || 'yellowhauz@gmail.com'}
                    </a>
                    <p className="text-[11px] text-stone-400">Inquiries &amp; Events</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 4: Stay Updated (span 3) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-display text-base font-extrabold text-white tracking-wide">
                Stay Updated
              </h4>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Subscribe to get updates on seasonal drinks, café events, and exclusive perks.
              </p>
              {newsletterSubscribed ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-300 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Thank you! You're now subscribed.</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.trim()) {
                      setNewsletterSubscribed(true);
                    }
                  }}
                  className="space-y-2"
                >
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full rounded-xl bg-stone-900/90 border border-stone-800 px-3.5 py-2.5 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-2.5 text-xs sm:text-sm shadow-md transition active:scale-[0.99] cursor-pointer"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Bottom Copyright and Policy Bar */}
          <div className="mt-10 pt-6 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] sm:text-xs text-stone-400">
            <p>© {new Date().getFullYear()} Coffee at Yellow Hauz. All rights reserved.</p>
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() =>
                  setPolicyModal({
                    title: 'Privacy Policy',
                    content:
                      'At Coffee at Yellow Hauz, we respect your personal privacy. Customer information gathered through online orders or studio bookings is used strictly for processing your requests and providing customer care. We never sell or share your data with unauthorized third parties.',
                  })
                }
                className="hover:text-amber-400 transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() =>
                  setPolicyModal({
                    title: 'Terms of Service',
                    content:
                      'Welcome to Coffee at Yellow Hauz. By using our services, placing orders, or reserving our private studio space, you agree to comply with our store policies, consumable venue credit terms, and house etiquette for a safe, welcoming café environment for everyone.',
                  })
                }
                className="hover:text-amber-400 transition cursor-pointer"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() =>
                  setPolicyModal({
                    title: 'Cookie Policy',
                    content:
                      'We use essential browser cookies and local storage to remember your table bindings, recent orders, and preferred shopping preferences to ensure a smooth, seamless ordering experience.',
                  })
                }
                className="hover:text-amber-400 transition cursor-pointer"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Policy Info Modal */}
      {policyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setPolicyModal(null)}
        >
          <div
            className="relative max-w-lg w-full overflow-hidden rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                {policyModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="rounded-full p-1 text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {policyModal.content}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-stone-950 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
