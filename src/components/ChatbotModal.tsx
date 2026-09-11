import React, { useState, useRef, useEffect } from 'react';
import { AppStore } from '../services/store';
import { CustomerAccount, MenuItem } from '../types';
import {
  X,
  Bot,
  User as UserIcon,
  Sparkles,
  Send,
  Coffee,
  Calendar,
  Utensils,
  Plus,
  Check,
  MapPin,
  Clock,
  Wifi,
  CreditCard,
  Percent,
  Compass,
  RotateCcw,
} from 'lucide-react';

export interface ChatbotModalProps {
  onClose: () => void;
  activeCustomer?: CustomerAccount | null;
  activeTableNumber?: number | null;
  onAddToCart?: (item: MenuItem) => void;
  onNavigateTab?: (tab: 'home' | 'menu' | 'orders' | 'reservation' | 'account') => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  recommendedItems?: MenuItem[];
  suggestedAction?: 'menu' | 'reservation' | 'orders' | 'none';
  source?: 'gemini' | 'local';
}

const QUICK_PROMPTS = [
  { label: '⭐ Best Sellers', query: 'What are your top best sellers?' },
  { label: '☕ Sweet Coffee', query: 'What coffee drinks are sweet and creamy?' },
  { label: '⚡ Strong Coffee', query: 'I need a strong, bold caffeine kick!' },
  { label: '🧊 Iced & Refreshers', query: 'What cold drinks and iced refreshers do you have?' },
  { label: '🍳 Comfort Food', query: 'What meals or breakfast do you recommend?' },
  { label: '🍰 Desserts & Cakes', query: 'What cakes and desserts do you have?' },
  { label: '🌱 Dairy-Free Milks', query: 'What plant-based milk alternatives do you offer?' },
  { label: '🏢 ₱300 Private Venue', query: 'Tell me about the Private Venue / Function Studio rental' },
  { label: '🪑 Reserve Table', query: 'How do I reserve a dining table?' },
  { label: '🏷️ 20% Senior/PWD', query: 'How does the Senior Citizen and PWD discount work?' },
  { label: '💳 Payment Methods', query: 'What payment options do you accept (GCash, Card, Cash)?' },
  { label: '📍 Hours & Wi-Fi', query: 'What are your store hours and do you have Wi-Fi?' },
];

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  onClose,
  activeCustomer,
  activeTableNumber,
  onAddToCart,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcomeGreeting = activeCustomer?.fullName
      ? `Welcome back, ${activeCustomer.fullName}! ☕`
      : 'Welcome to Coffee at Yellow Hauz! ☕';

    const tableNote = activeTableNumber
      ? ` I see you are seated at **Table ${activeTableNumber}** for Dine-In.`
      : '';

    return [
      {
        id: 'msg-welcome',
        sender: 'bot',
        text: `Hi! ${welcomeGreeting}${tableNote}\n\nI am your dedicated **Yellow Hauz AI Concierge & Barista**. I'm here to assist you exclusively with anything you need as our guest:\n\n• Tailored coffee & drink recommendations (sweet, bold, or dairy-free)\n• Filipino comfort meals, pizzas, pastas & freshly baked pastries\n• Reserving a table or booking our **₱300 / 3-Hour Private Venue**\n• Store hours (7 AM - 10 PM), complimentary Wi-Fi, and payment methods\n\nWhat can I prepare or find for you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: 'menu',
        source: 'local',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [addedItemId, setAddedItemId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isThinking) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsThinking(true);

    try {
      const result = await AppStore.askCustomerAssistant(query, {
        customerName: activeCustomer?.fullName,
        tableNumber: activeTableNumber,
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: result.reply,
        recommendedItems: result.recommendedItems,
        suggestedAction: result.suggestedAction,
        source: result.source,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallback = AppStore.getChatbotCustomerResponse(query);
      const botMsg: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'bot',
        text: fallback.reply,
        recommendedItems: fallback.recommendedItems,
        suggestedAction: fallback.suggestedAction,
        source: 'local',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAddRecommendedItem = (item: MenuItem) => {
    if (onAddToCart) {
      onAddToCart(item);
      setAddedItemId(item.id);
      setTimeout(() => {
        setAddedItemId(null);
      }, 1800);
    }
  };

  const handleActionClick = (action?: 'menu' | 'reservation' | 'orders' | 'none') => {
    if (!action || action === 'none') return;
    if (onNavigateTab) {
      onNavigateTab(action);
      onClose();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'bot',
        text: 'Chat history cleared! How can I assist you next with your Yellow Hauz visit?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: 'menu',
        source: 'local',
      },
    ]);
  };

  return (
    <div
      id="customer-assistant-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 font-baskerville"
    >
      <div className="flex flex-col w-full max-w-xl h-[660px] max-h-[92vh] rounded-3xl bg-white dark:bg-stone-900 shadow-2xl overflow-hidden border border-amber-900/20 dark:border-stone-700 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="relative bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white px-5 py-3.5 border-b border-amber-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-amber-500 text-stone-950 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-md">
                <img
                  src="/images/Coffeatyellowhauz_logo.jpg"
                  alt="Yellow Hauz Concierge"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <Bot className="h-6 w-6 absolute text-stone-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base tracking-wide text-amber-100 flex items-center gap-1.5">
                    <span>Yellow Hauz Concierge</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-amber-200/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950/50" />
                  <span>AI Barista &amp; Guest Assistant</span>
                  {activeTableNumber && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300 font-medium">Table {activeTableNumber}</span>
                    </>
                  )}
                  {activeCustomer && (
                    <>
                      <span>•</span>
                      <span className="text-amber-200 font-medium truncate max-w-[120px]">
                        {activeCustomer.fullName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="reset-chat-btn"
                onClick={handleResetChat}
                title="Restart conversation"
                className="rounded-full p-2 text-stone-400 hover:text-amber-300 hover:bg-stone-800/80 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                id="close-chat-btn"
                onClick={onClose}
                title="Close Assistant"
                className="rounded-full p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>Open Daily 7AM - 10PM</span>
              </span>
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-amber-400" />
                <span>Free Fiber Wi-Fi</span>
              </span>
            </div>
            <span className="text-amber-300/90 font-medium hidden sm:inline">
              Davao City, Philippines
            </span>
          </div>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/70 dark:bg-stone-950/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-900 text-amber-400 border border-amber-500/30'
                }`}
              >
                {msg.sender === 'user' ? (
                  <UserIcon className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[80%] space-y-2`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-xs ml-auto'
                      : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200/90 dark:border-stone-700/80 rounded-tl-xs whitespace-pre-line'
                  }`}
                >
                  {msg.text}

                  {/* AI Origin Badge & Timestamp */}
                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t ${
                      msg.sender === 'user'
                        ? 'border-amber-600/30 text-stone-800'
                        : 'border-stone-100 dark:border-stone-700 text-stone-400 dark:text-stone-400'
                    }`}
                  >
                    <span>
                      {msg.sender === 'bot' && (
                        <span className="flex items-center gap-1 font-sans">
                          <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                          {msg.source === 'gemini' ? 'AI Barista (Gemini)' : 'Yellow Hauz Concierge'}
                        </span>
                      )}
                    </span>
                    <span>{msg.time}</span>
                  </div>
                </div>

                {/* Interactive Recommended Items (if provided) */}
                {msg.recommendedItems && msg.recommendedItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 px-1">
                      <Coffee className="h-3 w-3" />
                      <span>Recommended from our menu:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.recommendedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-stone-800/90 border border-amber-200 dark:border-stone-700 shadow-xs hover:border-amber-400 transition"
                        >
                          <div className="h-12 w-12 rounded-lg bg-stone-100 dark:bg-stone-700 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-600">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=300';
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                              <span>₱{item.price.toFixed(2)}</span>
                              {item.isBestSeller && (
                                <span className="text-[9px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded font-sans">
                                  Bestseller
                                </span>
                              )}
                            </div>
                          </div>

                          {onAddToCart && (
                            <button
                              onClick={() => handleAddRecommendedItem(item)}
                              className={`shrink-0 p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                addedItemId === item.id
                                  ? 'bg-emerald-500 border-emerald-600 text-white'
                                  : 'bg-amber-500 hover:bg-amber-400 border-amber-600 text-stone-950 font-bold'
                              }`}
                              title={`Add ${item.name} to cart`}
                            >
                              {addedItemId === item.id ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action Button (Jump to Menu, Reservation, Orders) */}
                {msg.suggestedAction && msg.suggestedAction !== 'none' && onNavigateTab && (
                  <div className="pt-0.5">
                    <button
                      onClick={() => handleActionClick(msg.suggestedAction)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 transition cursor-pointer shadow-2xs"
                    >
                      {msg.suggestedAction === 'menu' && (
                        <>
                          <Utensils className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Browse Full Yellow Hauz Menu</span>
                        </>
                      )}
                      {msg.suggestedAction === 'reservation' && (
                        <>
                          <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Go to Reservations &amp; Private Venue</span>
                        </>
                      )}
                      {msg.suggestedAction === 'orders' && (
                        <>
                          <Compass className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Track Live Order Status</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking / Typing State */}
          {isThinking && (
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900 text-amber-400 border border-amber-500/30">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl bg-white dark:bg-stone-800 px-4 py-3 border border-stone-200 dark:border-stone-700 shadow-xs rounded-tl-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" />
                  <span className="text-xs text-stone-500 dark:text-stone-400 ml-2 font-medium">
                    Consulting Yellow Hauz Barista...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Customer Prompt Pills */}
        <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 px-3.5 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              disabled={isThinking}
              onClick={() => handleSend(item.query)}
              className="shrink-0 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1 text-[11px] font-medium text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-700 hover:border-amber-300 dark:hover:border-amber-500 transition cursor-pointer whitespace-nowrap shadow-2xs disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={isThinking}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. sweet iced coffee, private venue, best meals)..."
              className="flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-500 focus:bg-white dark:focus:bg-stone-800 focus:outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 disabled:opacity-40 hover:bg-amber-400 transition cursor-pointer shadow-md shrink-0 font-bold"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 px-1">
            <span>Ask for drink advice, comfort dishes, or reservations</span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
