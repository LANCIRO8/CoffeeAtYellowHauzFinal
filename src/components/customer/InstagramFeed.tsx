import React, { useState } from 'react';
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  ExternalLink, 
  Share2, 
  MapPin, 
  Sparkles,
  Check,
  X,
  ArrowRight
} from 'lucide-react';

interface InstagramFeedProps {
  onNavigateMenu?: () => void;
  onNavigateReservation?: () => void;
}

interface StoryItem {
  id: number;
  image: string;
  category: string;
  title: string;
  story: string;
  caption: string;
  location: string;
  timeAgo: string;
  initialLikes: number;
  commentsCount: number;
  tags: string[];
  ctaType: 'menu' | 'reservation';
  ctaLabel: string;
}

const STORIES: StoryItem[] = [
  {
    id: 1,
    image: '/images/01_Hearts_Latte_Art.jpg',
    category: 'Barista Craft & Morning Ritual',
    title: 'The Heart in Every Pour',
    story: 'Every morning before the first guest walks in, our baristas dial in the espresso grind, calibrate the extraction temperature, and steam fresh local milk into velvety microfoam. Pouring latte art is never just decorative — it is our personal invitation to pause, breathe, and savor a peaceful moment.',
    caption: 'Pouring love and dedication into every single cup. What’s your morning mood today? ☕💛',
    location: 'Main Espresso Bar',
    timeAgo: '2 hours ago',
    initialLikes: 248,
    commentsCount: 18,
    tags: ['#YellowHauz', '#LatteArt', '#BaristaCraft', '#DavaoCoffee'],
    ctaType: 'menu',
    ctaLabel: 'Order Hot Coffee'
  },
  {
    id: 2,
    image: '/images/04_Cozy_Corner.jpg',
    category: 'Our Sanctuary Since 2007',
    title: 'A Cozy Nook by the Garden Breeze',
    story: 'Nestled beside warm timber walls and overlooking our garden greenery, this quiet corner has cradled countless conversations, first dates, thesis breakthroughs, and peaceful solo book-reading afternoons. We crafted Yellow Hauz to feel like home — a comforting refuge away from the busy streets.',
    caption: 'Your favorite cozy spot overlooking the garden breeze is all set. Who are you bringing today? 🌿☕',
    location: 'Garden View Seating Nook',
    timeAgo: '1 day ago',
    initialLikes: 425,
    commentsCount: 37,
    tags: ['#CozyCorner', '#YellowHauzSpaces', '#DavaoCafes', '#Sanctuary'],
    ctaType: 'reservation',
    ctaLabel: 'Reserve This Table'
  },
  {
    id: 3,
    image: '/images/06_Coffee_Beans.jpg',
    category: 'Heritage & Ethical Roasting',
    title: 'From Ethical High-Altitude Farms to Your Cup',
    story: 'Exceptional coffee begins long before the grinder spins. We work with dedicated coffee farms to source beans nurtured in rich volcanic soil, hand-roasted to preserve notes of dark cacao, warm caramel, and subtle dried fruit. Ground freshly for every order, ready to pair with our signature cheesecake.',
    caption: 'From ethical high-altitude farms to our grinders. Freshness you can taste in every single pour. 🌱✨',
    location: 'Roasting & Grinding Station',
    timeAgo: '3 days ago',
    initialLikes: 312,
    commentsCount: 24,
    tags: ['#ArtisanRoast', '#CoffeeOrigins', '#SpecialtyCoffee', '#BeanToCup'],
    ctaType: 'menu',
    ctaLabel: 'Explore Specialty Brews'
  }
];

export const InstagramFeed: React.FC<InstagramFeedProps> = ({
  onNavigateMenu,
  onNavigateReservation,
}) => {
  const [likes, setLikes] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<StoryItem | null>(null);

  const toggleLike = (id: number) => {
    setLikes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleShare = (story: StoryItem) => {
    setCopiedId(story.id);
    navigator.clipboard?.writeText?.(window.location.origin);
    setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <section className="space-y-6 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 text-amber-300 text-[11px] font-bold shadow-xs">
              <Camera className="h-3 w-3 text-amber-400" />
              <span>@coffeeatyellowhauz</span>
            </span>
            <span className="text-xs text-stone-500 font-medium">Stories &amp; Moments</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight font-display">
            Stories From Yellow Hauz
          </h2>
        </div>

        <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-black text-stone-950 shadow-xs transition active:scale-95"
        >
          <Camera className="h-4 w-4" />
          <span>Follow on Instagram</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      </div>

      {/* Story Cards List: Photo on one side, Story text beside it */}
      <div className="space-y-6">
        {STORIES.map((item, index) => {
          const isLiked = !!likes[item.id];
          const totalLikes = item.initialLikes + (isLiked ? 1 : 0);
          const isEven = index % 2 === 1;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md transition duration-300 grid grid-cols-1 md:grid-cols-12"
            >
              {/* Image Side (Photo) */}
              <div 
                className={`relative md:col-span-5 h-64 sm:h-72 md:h-full min-h-[260px] overflow-hidden bg-amber-100/40 group cursor-pointer ${
                  isEven ? 'md:order-2' : 'md:order-1'
                }`}
                onClick={() => setPreviewImage(item)}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                
                {/* Location Overlay Pill */}
                <div className="absolute top-3 left-3 rounded-full bg-stone-950/75 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-xs">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  <span>{item.location}</span>
                </div>

                {/* Tap to expand hint */}
                <div className="absolute bottom-3 right-3 rounded-md bg-stone-950/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-stone-200 opacity-0 group-hover:opacity-100 transition">
                  Click to enlarge
                </div>
              </div>

              {/* Text Side (Story text beside the image) */}
              <div className={`p-5 sm:p-6 md:p-7 md:col-span-7 flex flex-col justify-between ${
                isEven ? 'md:order-1' : 'md:order-2'
              }`}>
                <div>
                  {/* Instagram Post Meta Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-amber-400 border border-amber-500/40 shrink-0">
                        <img
                          src="/images/Coffeatyellowhauz_logo.jpg"
                          alt="Yellow Hauz"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-stone-900 leading-none">
                            coffeeatyellowhauz
                          </span>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-stone-400 font-semibold leading-none">
                            {item.timeAgo}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-bold tracking-wide uppercase mt-0.5 block">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-stone-400">
                      Story #{item.id}
                    </span>
                  </div>

                  {/* Story Title & Narrative */}
                  <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                    {item.story}
                  </p>

                  {/* Instagram Caption Block */}
                  <div className="mt-4 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-stone-800">
                    <span className="font-bold text-amber-950 mr-1.5">coffeeatyellowhauz:</span>
                    <span className="italic text-stone-700 font-medium">"{item.caption}"</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-amber-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions: Likes, Comments, Share, Order / Reserve CTA */}
                <div className="mt-5 pt-3.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(item.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-950 transition cursor-pointer group"
                    >
                      <Heart 
                        className={`h-4 w-4 transition duration-200 group-active:scale-125 ${
                          isLiked 
                            ? 'fill-rose-500 text-rose-500' 
                            : 'text-stone-400 group-hover:text-stone-700'
                        }`} 
                      />
                      <span className={isLiked ? 'text-rose-600 font-black' : ''}>
                        {totalLikes}
                      </span>
                    </button>

                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500">
                      <MessageCircle className="h-4 w-4 text-stone-400" />
                      <span>{item.commentsCount}</span>
                    </div>

                    <button
                      onClick={() => handleShare(item)}
                      title="Share link"
                      className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900 transition cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied</span>
                        </span>
                      ) : (
                        <Share2 className="h-3.5 w-3.5 text-stone-400" />
                      )}
                    </button>
                  </div>

                  {/* Contextual Action Button */}
                  <div>
                    {item.ctaType === 'menu' && onNavigateMenu && (
                      <button
                        onClick={onNavigateMenu}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-stone-950 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <span>{item.ctaLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {item.ctaType === 'reservation' && onNavigateReservation && (
                      <button
                        onClick={onNavigateReservation}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 px-3.5 py-1.5 text-xs font-bold text-amber-300 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <span>{item.ctaLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox / Full Photo Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-stone-950/70 text-white hover:bg-stone-950 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="aspect-4/3 sm:aspect-16/10 w-full bg-stone-100 overflow-hidden">
              <img
                src={previewImage.image}
                alt={previewImage.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span className="font-bold text-amber-700 uppercase">{previewImage.category}</span>
                <span>{previewImage.location}</span>
              </div>
              <h4 className="font-display font-black text-base sm:text-lg text-stone-900">
                {previewImage.title}
              </h4>
              <p className="mt-1.5 text-xs sm:text-sm text-stone-600">
                {previewImage.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
