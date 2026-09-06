import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus, Trash2, Ticket, Tag, X } from 'lucide-react';
import { CartItem } from '../../types';

interface SwipeableCartItemProps {
  cartItem: CartItem;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
  onOpenDiscount: () => void;
  onRemoveDiscount: () => void;
}

export const SwipeableCartItem: React.FC<SwipeableCartItemProps> = ({
  cartItem,
  onUpdateQuantity,
  onRemove,
  onOpenDiscount,
  onRemoveDiscount,
}) => {
  const [revealed, setRevealed] = useState<'none' | 'discount' | 'delete'>('none');
  const containerRef = useRef<HTMLDivElement>(null);

  const { item, quantity, discount } = cartItem;
  const itemSubtotal = item.price * quantity;

  let itemDiscountAmount = 0;
  if (discount) {
    if (discount.type === 'percent') {
      itemDiscountAmount = (itemSubtotal * discount.value) / 100;
    } else {
      itemDiscountAmount = Math.min(itemSubtotal, discount.value);
    }
  }

  const finalItemPrice = Math.max(0, itemSubtotal - itemDiscountAmount);

  // Close when clicking outside of this item if it's currently slid open
  useEffect(() => {
    if (revealed === 'none') return;
    const handleWindowPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setRevealed('none');
      }
    };
    window.addEventListener('pointerdown', handleWindowPointerDown);
    return () => window.removeEventListener('pointerdown', handleWindowPointerDown);
  }, [revealed]);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const { offset, velocity } = info;

    if (revealed === 'discount') {
      // It is currently open to the right (showing Discount).
      // Any flick or slide back to the left immediately snaps back to center!
      if (offset.x < -15 || velocity.x < -100) {
        setRevealed('none');
      }
      return;
    }

    if (revealed === 'delete') {
      // It is currently open to the left (showing Delete).
      // Any flick or slide back to the right immediately snaps back to center!
      if (offset.x > 15 || velocity.x > 100) {
        setRevealed('none');
      }
      return;
    }

    // When centered at 'none', require an intentional deliberate swipe
    if (offset.x > 50 || velocity.x > 250) {
      setRevealed('discount');
    } else if (offset.x < -50 || velocity.x < -250) {
      setRevealed('delete');
    } else {
      setRevealed('none');
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl bg-stone-100 select-none">
      {/* Background Revealed Actions */}
      <div className="absolute inset-0 flex items-stretch justify-between">
        {/* Left: Revealed on Swipe Right -> Discount Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed('none');
            onOpenDiscount();
          }}
          className="w-20 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 flex flex-col items-center justify-center gap-1 font-black text-xs transition cursor-pointer px-2 shadow-inner"
          title="Discount"
        >
          <Ticket className="h-4 w-4 stroke-[2.5]" />
          <span className="leading-tight text-[11px] font-black">
            {discount ? 'Edit' : 'Discount'}
          </span>
        </button>

        {/* Right: Revealed on Swipe Left -> Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed('none');
            onRemove();
          }}
          className="w-20 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 font-black text-xs transition cursor-pointer px-2 ml-auto shadow-inner"
          title="Delete"
        >
          <Trash2 className="h-4 w-4 stroke-[2.5]" />
          <span className="leading-tight text-[11px] font-black">Delete</span>
        </button>
      </div>

      {/* Foreground Swipeable Item Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        animate={{
          x: revealed === 'discount' ? 80 : revealed === 'delete' ? -80 : 0,
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`relative z-10 border rounded-2xl bg-white p-2.5 transition-shadow cursor-grab active:cursor-grabbing ${
          discount
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-stone-200/90 hover:border-stone-300'
        } ${revealed !== 'none' ? 'shadow-md ring-1 ring-stone-900/10' : 'shadow-2xs'}`}
      >
        {/* If card is revealed, clicking anywhere on it instantly centers it */}
        {revealed !== 'none' && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setRevealed('none');
            }}
            className="absolute inset-0 z-20 bg-stone-900/5 hover:bg-stone-900/10 cursor-pointer rounded-2xl flex items-center justify-center transition"
            title="Click to center item"
          >
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-stone-700 shadow-xs border border-stone-200">
              Tap to center
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          {/* Item Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-stone-900 leading-tight truncate max-w-[170px] sm:max-w-[200px]">
                {item.name}
              </h4>

              {/* Direct clickable discount tag */}
              <button
                type="button"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDiscount();
                }}
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold transition cursor-pointer ${
                  discount
                    ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                    : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-900 border border-stone-200'
                }`}
                title={discount ? `Discount: ${discount.name}` : 'Item discount'}
              >
                <Tag className="h-2.5 w-2.5" />
                <span>{discount ? `${discount.value}${discount.type === 'percent' ? '%' : '₱'}` : '+ Disc'}</span>
              </button>
            </div>

            {/* Price & Quantity Breakdown */}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 font-mono">
              <span>₱{item.price.toFixed(2)} × {quantity}</span>
              {discount && (
                <span className="text-emerald-700 font-bold font-sans text-[10px]">
                  (-₱{itemDiscountAmount.toFixed(2)})
                </span>
              )}
            </div>

            {/* Applied Discount Badge */}
            {discount && (
              <div
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-950"
              >
                <Ticket className="h-3 w-3 text-emerald-800 shrink-0" />
                <span className="truncate max-w-[130px]">{discount.name}</span>
                <span className="text-emerald-800 font-mono">
                  {discount.type === 'percent' ? `(${discount.value}%)` : `(₱${discount.value})`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDiscount();
                  }}
                  className="ml-0.5 rounded hover:bg-emerald-200 p-0.5 text-emerald-800 transition"
                  title="Remove discount"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Controls: Stepper & Price */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quantity Stepper */}
            <div
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="flex items-center rounded-lg border border-stone-200 bg-stone-50"
            >
              <button
                type="button"
                onClick={() => onUpdateQuantity(-1)}
                className="p-1 text-stone-600 hover:text-stone-900 active:scale-90 transition cursor-pointer"
                title="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-xs font-bold text-stone-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(1)}
                className="p-1 text-stone-600 hover:text-stone-900 active:scale-90 transition cursor-pointer"
                title="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Line Price Display */}
            <div className="w-16 text-right">
              {discount && (
                <span className="block text-[10px] font-mono text-stone-400 line-through leading-none">
                  ₱{itemSubtotal.toFixed(2)}
                </span>
              )}
              <span
                className={`font-mono text-xs font-black ${
                  discount ? 'text-emerald-800' : 'text-stone-900'
                }`}
              >
                ₱{finalItemPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
