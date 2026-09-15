import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, StoreSettings } from '../../types';
import { ShoppingCart, Calendar, Clock, Utensils, Heart, Sparkles, ArrowRight, ShieldCheck, MapPin, Phone, Leaf, Flower2, Coffee, Eye, X, ZoomIn, ChevronLeft, ChevronRight, Mail, Globe, CheckCircle2, MessageCircle, Bot, Send, Loader2, Plus, Check } from 'lucide-react';
import { HangingVinesOverlay, MonsteraPlantCorner, CoffeePlantBranch } from './BotanicalElements';
import { AppStore } from '../../services/store';

interface CustomerHomeProps {
  bestSellers?: MenuItem[];
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

  const carouselRef = useRef<HTMLDivElement>(null);

  // Duplicated items for endless smooth continuous loop
  const displayItems = bestSellers && bestSellers.length > 0
    ? [...bestSellers, ...bestSellers, ...bestSellers]
    : [];

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || displayItems.length === 0) return;

    let animationFrameId: number;
    let isPaused = false;

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    const handleTouchStart = () => { isPaused = true; };
    const handleTouchEnd = () => { isPaused = false; };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    const speed = 0.65; // slow, smooth continuous drift (px per frame)

    const step = () => {
      if (!isPaused && el) {
        el.scrollLeft += speed;
        // Seamless loop when reaching the end of one set of items
        const singleSetWidth = el.scrollWidth / 3;
        if (el.scrollLeft >= singleSetWidth) {
          el.scrollLeft -= singleSetWidth;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [displayItems.length]);

  const activeArea = YELLOWHAUZ_AREAS[currentAreaIndex] || YELLOWHAUZ_AREAS[0];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section - Warm Red Brick, Plants & Amber Cafe Atmosphere */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#7A3620]/30 text-white shadow-xl bg-stone-950">
        {/* Red Brick Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-100"
          style={{ backgroundImage: 'url("/images/red_brick_bg.png")' }}
          role="img"
          aria-label="Yellow Hauz Red Brick Café Wall"
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
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 sm:h-16 sm:w-16 overflow-hidden rounded-2xl bg-amber-400/90 border-2 border-amber-300/40 shadow-lg shrink-0">
                <img
                  src="/images/Coffeatyellowhauz_logo.jpg"
                  alt="Coffee at Yellow Hauz Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                  <Leaf className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-lime-400" />
                  Garden &amp; Brick Oasis • Est. 2007 • Davao
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
                <span>Order Online</span>
              </button>
              <button
                id="hero-book-table-btn"
                onClick={onNavigateReservation}
                className="inline-flex h-10 sm:h-12 items-center justify-center gap-2 rounded-xl bg-stone-900/80 border border-emerald-400/40 backdrop-blur-xs px-4 sm:px-5 text-xs sm:text-sm font-bold text-emerald-300 hover:bg-stone-800 transition cursor-pointer"
              >
                <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Reserve Garden Table</span>
              </button>
            </div>

            <div className="mt-3.5 sm:mt-6 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-stone-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                <span>Open 7:00 AM - 10:00 PM Daily</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-400">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                <span>Davao City</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-lime-400">
                <Leaf className="h-3.5 w-3.5 shrink-0" />
                <span>Indoor Plants &amp; Garden Nook</span>
              </div>
            </div>
          </div>

          {/* Hero Collage: 1 Hot Coffee, 1 Place, 1 Cold Drink, 1 Food */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
            <div className="space-y-2 sm:space-y-3.5">
              {/* 1. Hot Coffee */}
              <div className="group relative aspect-square sm:aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-stone-900/60 border border-white/10 shadow-md">
                <img
                  src="/images/01_Hearts_Latte_Art.jpg"
                  alt="Hot Coffee & Latte Art"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/latte.webp';
                  }}
                />
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 rounded-md bg-stone-950/80 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold text-amber-300 border border-amber-500/20">
                  Artisan Hot Coffee
                </div>
              </div>

              {/* 2. The Place */}
              <div className="group relative aspect-4/3 overflow-hidden rounded-xl sm:rounded-2xl bg-stone-900/60 border border-white/10 shadow-md">
                <img
                  src="/images/18_Main_Counter_Interior.webp"
                  alt="Yellow Hauz Café Interior"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/20_Seating_Area.webp';
                  }}
                />
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 rounded-md bg-stone-950/80 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold text-amber-300 border border-amber-500/20">
                  Cozy Café Spaces
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3.5 pt-2 sm:pt-6">
              {/* 3. Cold Drink */}
              <div className="group relative aspect-4/3 overflow-hidden rounded-xl sm:rounded-2xl bg-stone-900/60 border border-white/10 shadow-md">
                <img
                  src="/images/08_Cold_Brew.jpg"
                  alt="Iced Cold Brew & Chilled Drinks"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/icelatte.webp';
                  }}
                />
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 rounded-md bg-stone-950/80 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold text-amber-300 border border-amber-500/20">
                  Chilled Drinks &amp; Cold Brew
                </div>
              </div>

              {/* 4. Food */}
              <div className="group relative aspect-square sm:aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-stone-900/60 border border-white/10 shadow-md">
                <img
                  src="/images/grilledgarliccheese.webp"
                  alt="Fresh Gourmet Food & Pastries"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/blueberrycheesecake.webp';
                  }}
                />
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 rounded-md bg-stone-950/80 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold text-amber-300 border border-amber-500/20">
                  Handcrafted Food &amp; Pastries
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Strip - Featuring Garden & Indoor Seating with Botanical Highlights */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition hover:border-amber-200">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Operating Hours</p>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              {settings.business_hours} (Daily)
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Breakfast, Lunch, Merienda &amp; Dinner</p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition hover:border-amber-200">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Curated Menu</p>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              17 Signature Categories
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Specialty beans, pastries &amp; hot mains</p>
          </div>
        </div>

        <div className="relative overflow-hidden flex items-start gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-stone-50 p-5 shadow-xs transition hover:border-emerald-300">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <Leaf className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="z-10">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Garden &amp; Café</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-800">Aircon + Patio</span>
            </div>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              {settings.shop_address}
            </p>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Potted fiddle-leaf figs, ferns &amp; open-air garden</p>
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
              <span className="rounded-lg bg-amber-500/20 text-amber-300 px-2.5 py-1 border border-amber-500/30 font-bold">👥 Capacity: 25 persons only</span>
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
                url: '/images/venue.webp',
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
                  url: '/images/venue.webp',
                  title: 'Yellow Hauz Private Studio Venue',
                });
              }
            }}
          >
            <img
              src="/images/venue.webp"
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

      {/* Best Sellers Auto-Moving Carousel */}
      {bestSellers && bestSellers.length > 0 && (
        <section id="best-sellers-carousel-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-display">
              Best Sellers
            </h2>
          </div>

          {/* Seamless Auto-moving Carousel Track */}
          <div className="relative -mx-4 sm:mx-0 overflow-hidden">
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-hidden px-4 sm:px-1 py-2 select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {displayItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={onNavigateMenu}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs transition duration-300 hover:shadow-md hover:border-amber-400 w-[185px] sm:w-[215px] shrink-0 cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden bg-stone-100">
                    <img
                      src={item.imageUrl || '/images/latte.webp'}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/latte.webp';
                      }}
                    />
                  </div>
                  <div className="p-3 text-center bg-white">
                    <h3 className="font-display text-sm sm:text-base font-bold text-stone-800 group-hover:text-amber-700 transition line-clamp-1">
                      {item.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Time-Based Menus Highlights */}
      <section className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-stone-100/60 p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800">
            Daily Kitchen Highlights
          </span>
          <h3 className="mt-1 font-display text-2xl font-bold text-stone-900">
            Tailored for Every Time of Day
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
            Whether you are waking up to our hearty longganisa and pour-overs, craving afternoon cheesecake &amp; iced lattes, or sharing hot pizzas with friends in the evening.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {settings.time_based_menus.map((menu, idx) => (
            <div key={idx} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {menu.time}
                </span>
              </div>
              <h4 className="mt-2 font-display text-base font-bold text-stone-900">{menu.title}</h4>
              <p className="mt-1 text-xs text-stone-600 line-clamp-2">{menu.focus}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {menu.item_names.slice(0, 3).map((item, i) => (
                  <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

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
                <span>AI Barista &amp; Concierge</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                Ask Yellow Hauz AI
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
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-4 py-2 text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Bot className="h-4 w-4" />
                  <span>Open Full Chat Concierge</span>
                  <ArrowRight className="h-3.5 w-3.5" />
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
                className="absolute right-1.5 p-2 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 transition cursor-pointer active:scale-95 shadow-sm"
                title="Send to AI Barista"
                aria-label="Send to AI Barista"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-950" />
                ) : (
                  <Send className="h-4 w-4 text-stone-950" />
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
                    <span className="text-xs font-bold text-white">AI Barista</span>
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
                              onClick={() => handleAddAiItem(item)}
                              className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition active:scale-95 cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-500 text-stone-950 font-black'
                                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                              }`}
                              title="Add to Order"
                            >
                              {isAdded ? (
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
                  href="https://facebook.com/yellowhauzcafe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Facebook"
                  aria-label="Facebook"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Instagram"
                  aria-label="Instagram"
                >
                  <Globe className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${settings.shop_email || 'hello@yellowhauz.com'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Email Us"
                  aria-label="Email Us"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <a
                  href={`tel:${settings.shop_phone || '+639123456789'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition shadow-sm active:scale-95 cursor-pointer"
                  title="Call Us"
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
                    <p className="font-medium">{settings.shop_address || '102 V. Mapa Street'}</p>
                    <p className="text-[11px] text-stone-400">Davao City, Philippines</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <p className="font-medium">{settings.shop_phone || '+63 912 345 6789'}</p>
                    <p className="text-[11px] text-stone-400">+63 82 227 3456</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-stone-300">
                    <p className="font-medium">{settings.shop_email || 'hello@yellowhauz.com'}</p>
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
