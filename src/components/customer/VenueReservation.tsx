import React, { useState, useMemo } from 'react';
import { Reservation, CustomerAccount, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Layers,
  CreditCard,
  QrCode,
  DollarSign,
  Lock,
  Tv,
  Wind,
  Sparkles,
  Phone,
  ExternalLink,
  MessageCircle,
  UtensilsCrossed,
  FileText,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface VenueReservationProps {
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onReservationSuccess: (res: Reservation) => void;
  onRequireLogin?: () => void;
  onNavigateAccount?: () => void;
}

// Pricing & Rates:
// Base Rate: ₱3,500 for 3 hours (fully consumable on food and drinks).
// Extension Rate: ₱1,000 per extra hour (also consumable).
const VENUE_HOURLY_OPTIONS = [
  { hours: 3, label: '3 Hours', subtitle: 'Base Block (100% Consumable)', price: 3500, isPopular: true },
  { hours: 4, label: '4 Hours', subtitle: '+1 Extra Hr (Consumable)', price: 4500, isPopular: false },
  { hours: 5, label: '5 Hours', subtitle: '+2 Extra Hrs (Consumable)', price: 5500, isPopular: false },
  { hours: 6, label: '6 Hours', subtitle: '+3 Extra Hrs (Consumable)', price: 6500, isPopular: false },
  { hours: 8, label: '8 Hours', subtitle: '+5 Extra Hrs (Consumable)', price: 8500, isPopular: false },
];

const EVENT_TYPES = [
  { id: 'meeting', name: '💼 Business Meeting & Planning', desc: 'Conference table, TV HDMI & whiteboard' },
  { id: 'workshop', name: '🎨 Creative Workshop & Art Class', desc: 'Flexible desk arrangement & presentation setup' },
  { id: 'celebration', name: '🎉 Birthday & Intimate Gathering', desc: 'Social dining layout, music & food service' },
  { id: 'study', name: '📚 Study Group & Team Review', desc: 'Quiet environment with abundant power sockets' },
  { id: 'photoshoot', name: '📸 Photo / Video Shoot & Content', desc: 'Aesthetic ambient lighting & creative corners' },
  { id: 'tasting', name: '☕ Coffee Tasting & Cupping', desc: 'Barista demonstration & sensory coffee table' },
  { id: 'other', name: '✨ Other Private Function', desc: 'Custom tailored layout for your special event' },
];

// 25 Heads only.
const SEATING_LAYOUTS = [
  { id: 'boardroom', name: 'Boardroom / Conference', pax: '12-16 Pax', desc: 'Central conference table for discussions' },
  { id: 'classroom', name: 'Classroom / Seminar', pax: '15-20 Pax', desc: 'Rows facing TV HDMI & whiteboard' },
  { id: 'banquet', name: 'Banquet / Party Dining', pax: '20-25 Pax', desc: 'Dining tables with buffet counter space' },
  { id: 'lounge', name: 'Casual Lounge & Circle', pax: '10-15 Pax', desc: 'Armchairs, cozy sofas & coffee tables' },
];

export const VenueReservation: React.FC<VenueReservationProps> = ({
  settings,
  activeCustomer,
  onReservationSuccess,
  onRequireLogin,
  onNavigateAccount,
}) => {
  const { showAlert, showConfirm } = useModal();
  const allReservations = useMemo(() => AppStore.getReservations(), []);

  const venueBannerUrl = settings?.customer_gallery?.reservationBanner || '/images/venue.webp';

  // Form State
  const [guestCount, setGuestCount] = useState<number>(12);
  const [selectedDuration, setSelectedDuration] = useState<number>(3); // 3 hours standard
  const [eventType, setEventType] = useState<string>('🎨 Creative Workshop & Art Class');
  const [seatingLayout, setSeatingLayout] = useState<'boardroom' | 'classroom' | 'banquet' | 'lounge'>('classroom');
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cash' | 'card'>('gcash');

  // Date and Time calculation
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>('14:00'); // 2:00 PM
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Gradual Step-by-Step State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    if (stepNumber > maxStepReached) {
      setMaxStepReached(stepNumber);
    }
    const flowEl = document.getElementById('venue-booking-flow');
    if (flowEl) {
      flowEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNextStep = () => {
    if (currentStep === 2 && conflictingBooking) {
      showAlert({
        title: 'Schedule Conflict Detected',
        message: `The Yellow Hauz Private Studio is already reserved on this date around ${new Date(
          conflictingBooking.reservationAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please adjust your time slot or pick a different date.`,
        type: 'error',
      });
      return;
    }
    goToStep(Math.min(currentStep + 1, 4));
  };

  const handlePrevStep = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  // Compute End Time based on selected duration
  const endTimeFormatted = useMemo(() => {
    if (!timeSlot) return '';
    const [h, m] = timeSlot.split(':').map(Number);
    const startMins = h * 60 + (m || 0);
    const endMins = startMins + selectedDuration * 60;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    const endH12 = endH % 12 || 12;
    const endAmPm = endH >= 12 ? 'PM' : 'AM';
    const endMStr = endM < 10 ? `0${endM}` : endM;
    return `${endH12}:${endMStr} ${endAmPm}`;
  }, [timeSlot, selectedDuration]);

  // Format 12-hour start time
  const startTimeFormatted = useMemo(() => {
    if (!timeSlot) return '';
    const [h, m] = timeSlot.split(':').map(Number);
    const h12 = h % 12 || 12;
    const amPm = h >= 12 ? 'PM' : 'AM';
    const mStr = m < 10 ? `0${m}` : m;
    return `${h12}:${mStr} ${amPm}`;
  }, [timeSlot]);

  // Pricing calculations
  // Base Rate: ₱3,500 for 3 hours (fully consumable on food and drinks).
  // Extension Rate: ₱1,000 per extra hour (also consumable).
  const baseRate = useMemo(() => {
    if (selectedDuration <= 3) return 3500;
    return 3500 + (selectedDuration - 3) * 1000;
  }, [selectedDuration]);

  const grandTotal = baseRate;

  // Conflict Checking: Check if single venue is booked on this date & time range
  const conflictingBooking = useMemo(() => {
    if (!date || !timeSlot) return null;
    const targetStart = new Date(`${date}T${timeSlot}:00`).getTime();
    const targetEnd = targetStart + selectedDuration * 3600000;

    return allReservations.find((res) => {
      if (res.bookingType !== 'venue') return false;
      if (res.status === 'cancelled') return false;

      const resStart = new Date(res.reservationAt).getTime();
      const resDurationHrs = res.venueDurationHours || 3;
      const resEnd = resStart + resDurationHrs * 3600000;

      return targetStart < resEnd && targetEnd > resStart;
    });
  }, [date, timeSlot, selectedDuration, allReservations]);

  const handleBookVenue = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check customer sign in requirement
    if (!activeCustomer) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in or create an account to reserve the private studio.',
        type: 'warning',
      });
      if (onRequireLogin) onRequireLogin();
      return;
    }

    if (conflictingBooking) {
      showAlert({
        title: 'Schedule Conflict Detected',
        message: `The Yellow Hauz Private Studio is already reserved on this date around ${new Date(
          conflictingBooking.reservationAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please select an alternate time slot or date.`,
        type: 'error',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirm Studio Venue Booking',
      message: `Please review your booking details:\n\n• Event: ${eventType}\n• Date & Time: ${date} at ${timeSlot}\n• Duration: ${selectedDuration} hours\n• Guests: ${guestCount} persons (Capacity: 25 only)\n• Total Amount: ₱${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• Policy: 100% Fully Consumable on Food & Drinks!\n• Inclusions: Air conditioning, TV HDMI, Whiteboard\n\nConfirm this venue reservation?`,
      type: 'info',
      confirmText: 'Yes, Confirm Booking',
      cancelText: 'Review Details',
    });

    if (!confirmed) {
      return;
    }

    const reservationAt = `${date}T${timeSlot}:00`;
    // Name and contact are populated directly from the authenticated customer account
    const customerName = activeCustomer.fullName;
    const contactNumber = activeCustomer.contactNumber || settings.shop_phone || 'N/A';

    const newVenueRes = AppStore.createReservation({
      bookingType: 'venue',
      venueName: 'The Yellow Hauz Private Studio & Event Nook',
      tableId: 99,
      tableNumber: 99,
      venueDurationHours: selectedDuration,
      venueRate: baseRate,
      venueAddons: [],
      totalAmount: grandTotal,
      eventType,
      seatingLayout,
      paymentStatus: paymentMethod === 'gcash' ? 'downpayment_paid' : 'unpaid',
      paymentMethod,
      customerId: activeCustomer.id,
      customerName,
      contactNumber,
      guestCount,
      reservationAt,
    });

    setConfirmedReservation(newVenueRes);
    onReservationSuccess(newVenueRes);
  };

  return (
    <div className="space-y-10">
      {/* Confirmation Success View */}
      {confirmedReservation ? (
        <div className="max-w-2xl mx-auto rounded-2xl sm:rounded-3xl border border-emerald-300 bg-white p-4 sm:p-10 shadow-xl space-y-4 sm:space-y-6 animate-in fade-in zoom-in duration-200">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto shadow-xs">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Venue Reservation Confirmed
            </span>
            <h2 className="text-lg sm:text-3xl font-extrabold font-display text-stone-900 leading-tight">
              The Private Studio is Booked for You!
            </h2>
            <p className="text-[11px] sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              We have locked in your schedule. Our event coordinator and baristas are preparing the space, Wi-Fi, audio setup, and amenities.
            </p>
          </div>

          {/* Reservation Code Badge */}
          <div className="rounded-xl sm:rounded-2xl border border-amber-300 bg-amber-50/80 p-3 sm:p-4 text-center">
            <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-widest text-amber-800 block">
              Official Venue Voucher Code
            </span>
            <span className="font-mono text-lg sm:text-2xl font-black text-amber-950 tracking-wider">
              {confirmedReservation.reservationCode}
            </span>
            <span className="text-[9px] sm:text-[11px] text-stone-500 block mt-0.5">
              Please present this voucher code upon arrival at the café front counter.
            </span>
          </div>

          {/* Venue Visual Preview */}
          <div className="relative aspect-16/9 rounded-xl overflow-hidden border border-stone-200 shadow-xs">
            <img
              src={venueBannerUrl}
              alt="The Yellow Hauz Private Studio Venue"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/venue.webp';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 text-white">
              <span className="text-xs font-bold font-display">The Yellow Hauz Private Studio</span>
              <span className="block text-[10px] text-stone-200">Exclusive booked space • Up to 25 guests</span>
            </div>
          </div>

          {/* Summary Details Grid */}
          <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:p-5 space-y-3 sm:space-y-4 text-[10px] sm:text-xs">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-stone-200">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px]">Client / Host</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">{confirmedReservation.customerName}</span>
                <span className="text-stone-500 block text-[9px] sm:text-xs">{confirmedReservation.contactNumber}</span>
              </div>
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px]">Event Type &amp; Guests</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">{confirmedReservation.eventType}</span>
                <span className="text-stone-500 block text-[9px] sm:text-xs">
                  {confirmedReservation.guestCount} Guests • {confirmedReservation.seatingLayout} setup
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-stone-200">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px]">Date &amp; Schedule</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">
                  {new Date(confirmedReservation.reservationAt).toLocaleDateString('en-PH', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-amber-800 font-bold block text-[9px] sm:text-xs">
                  {startTimeFormatted} – {endTimeFormatted} ({confirmedReservation.venueDurationHours || 3}h)
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px]">Venue Location</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">The Yellow Hauz Private Studio</span>
                <span className="text-stone-500 block text-[9px] sm:text-xs">V. Mapa &amp; Mabini St., Davao</span>
              </div>
            </div>

            {/* Inclusions Checklist */}
            <div>
              <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px] mb-1">
                Included Amenities &amp; Inclusions (Capacity: 25 Persons)
              </span>
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] text-stone-700">
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600 shrink-0" />
                  Air conditioning
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Tv className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 shrink-0" />
                  TV HDMI Display
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 shrink-0" />
                  Whiteboard &amp; Markers
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 shrink-0" />
                  100% Consumable F&amp;B
                </span>
              </div>
            </div>

            {/* Total Fee & Payment */}
            <div className="pt-2 sm:pt-3 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[9px] sm:text-[10px]">Total Venue Fee</span>
                <span className="text-[10px] sm:text-xs text-stone-500 font-medium capitalize">
                  Payment: {confirmedReservation.paymentMethod} (
                  {confirmedReservation.paymentStatus === 'downpayment_paid'
                    ? 'Downpayment Settled'
                    : 'Pay at Counter / Arrival'}
                  )
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 block">
                  ✓ 100% fully consumable on café food and drinks
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-base sm:text-xl font-extrabold text-amber-900">
                  ₱{(confirmedReservation.totalAmount || 3500).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
            {onNavigateAccount && (
              <button
                type="button"
                onClick={onNavigateAccount}
                className="flex-1 rounded-xl bg-stone-900 py-2.5 sm:py-3 text-xs font-bold text-amber-400 hover:bg-stone-800 transition text-center"
              >
                View in My Account
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmedReservation(null)}
              className="flex-1 rounded-xl bg-amber-500 py-2.5 sm:py-3 text-xs font-black text-stone-950 hover:bg-amber-400 transition shadow-md text-center"
            >
              Book Another Event Slot
            </button>
          </div>
        </div>
      ) : (
        /* Venue Booking Form */
        <div className="space-y-6 sm:space-y-8">
          {/* Venue Photography Showcase */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-stone-900 shadow-md">
            <div className="relative aspect-16/9 sm:aspect-21/9 w-full overflow-hidden">
              <img
                src={venueBannerUrl}
                alt="The Yellow Hauz Private Studio Venue"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/venue.webp';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6 flex items-end justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-950 shadow-xs mb-1 sm:mb-1.5">
                    <Sparkles className="h-3 w-3" />
                    Private Studio &amp; Event Space
                  </span>
                  <h3 className="font-display text-base sm:text-2xl font-black text-white">
                    The Yellow Hauz Function &amp; Workshop Venue
                  </h3>
                </div>
                <div className="hidden sm:block shrink-0 text-right">
                  <span className="inline-block rounded-xl bg-stone-900/80 backdrop-blur-xs border border-white/20 px-3 py-1.5 text-xs font-bold text-amber-300">
                    Max 25 Guests
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Rates & Amenities Highlight Banner */}
          <div className="rounded-2xl sm:rounded-3xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 p-4 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4 border-b border-amber-200/80 dark:border-stone-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                    <UtensilsCrossed className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                    100% Fully Consumable on Food &amp; Drinks
                  </span>
                </div>
                <h2 className="text-base sm:text-2xl font-black text-stone-950 dark:text-stone-100 font-display">
                  Private Studio Venue Rates &amp; Inclusions
                </h2>
              </div>

              {/* Rate Badges */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 shrink-0">
                <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-stone-850 border border-amber-300/80 dark:border-amber-700/60 p-2.5 sm:p-3 text-center min-w-[120px] shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-amber-800 dark:text-amber-300 block">
                    Base Rate (3 Hours)
                  </span>
                  <span className="font-mono text-base sm:text-xl font-black text-stone-950">
                    ₱3,500
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold block">
                    Consumable
                  </span>
                </div>
                <div className="rounded-xl sm:rounded-2xl bg-white border border-stone-200 p-2.5 sm:p-3 text-center min-w-[120px] shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-stone-600 block">
                    Extension Rate
                  </span>
                  <span className="font-mono text-base sm:text-xl font-black text-stone-950">
                    ₱1,000
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-stone-500 font-bold block">
                    per extra hr (consumable)
                  </span>
                </div>
              </div>
            </div>

            {/* Inclusions & Venue Amenities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
              <div className="rounded-xl bg-white/90 border border-stone-200/90 p-2.5 sm:p-3 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-sky-700 font-bold text-[11px] sm:text-xs">
                  <Wind className="h-4 w-4" />
                  <span>Air conditioning</span>
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-stone-200/90 p-2.5 sm:p-3 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-purple-700 font-bold text-[11px] sm:text-xs">
                  <Tv className="h-4 w-4" />
                  <span>TV HDMI</span>
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-stone-200/90 p-2.5 sm:p-3 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] sm:text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Whiteboard</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 sm:p-3 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] sm:text-xs">
                  <Users className="h-4 w-4" />
                  <span>25 Heads only</span>
                </div>
              </div>
            </div>

            {/* Extended Stays / Special Hours Banner */}
            <div className="rounded-xl bg-stone-900 text-white p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 block">
                  Extended Stays / Special Hours &amp; Bulk Packages
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${(settings.shop_phone || '09231160300').replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 text-[10px] sm:text-xs font-bold text-amber-300 transition"
                >
                  <Phone className="h-3 w-3" />
                  <span>Call Owner ({settings.shop_phone || '0923 116 0300'})</span>
                </a>
                <a
                  href={settings.facebook_url || "https://www.facebook.com/yellowhauz/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-[10px] sm:text-xs font-bold text-white transition shadow-xs"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>Facebook Page</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          {/* Gradual Step-by-Step Venue Booking Flow */}
          <div id="venue-booking-flow" className="space-y-4 sm:space-y-6">
            {/* Step Navigation Bar */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5 sm:p-4 shadow-xs">
              <div className="grid grid-cols-4 gap-1 sm:gap-3">
                {[
                  { id: 1, label: 'Select Duration', short: 'Duration', icon: Clock },
                  { id: 2, label: 'Choose Date & Start Time', short: 'Date & Time', icon: Calendar },
                  { id: 3, label: 'Event Purpose & Layout', short: 'Purpose & Layout', icon: Layers },
                  { id: 4, label: 'Reservation Summary', short: 'Summary & Pay', icon: CheckCircle2 },
                ].map((s) => {
                  const Icon = s.icon;
                  const isCurrent = currentStep === s.id;
                  const isCompleted = currentStep > s.id;
                  const isClickable = s.id <= maxStepReached;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && goToStep(s.id)}
                      className={`group w-full min-w-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all overflow-hidden ${
                        isCurrent
                          ? 'bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500 text-stone-900 dark:text-stone-100 shadow-2xs ring-2 ring-amber-500/15'
                          : isCompleted
                          ? 'bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 cursor-pointer'
                          : 'bg-stone-50/40 dark:bg-stone-850/40 border border-stone-200/60 dark:border-stone-800/60 text-stone-400 dark:text-stone-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black transition-colors ${
                          isCurrent
                            ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> : s.id}
                      </div>
                      <div className="text-center sm:text-left min-w-0 w-full max-w-full overflow-hidden">
                        <span className="hidden sm:block text-[9px] uppercase tracking-wider font-extrabold text-stone-400 dark:text-stone-500">
                          Step 0{s.id}
                        </span>
                        <span
                          className={`text-[9px] xs:text-[10px] sm:text-xs font-bold block leading-tight text-center sm:text-left break-words sm:truncate max-w-full ${
                            isCurrent ? 'text-amber-950 dark:text-amber-200 font-black' : isCompleted ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {s.short}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleBookVenue}>
              {/* STEP 1: Select Duration */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-8 shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3 mb-2">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>1. Select Duration</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                        Base rental includes 3 hours and is 100% consumable on all food &amp; drinks.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300">
                      Step 1 of 4
                    </span>
                  </div>

                  {/* Hourly options cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                    {VENUE_HOURLY_OPTIONS.map((opt) => {
                      const isSelected = selectedDuration === opt.hours;
                      return (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setSelectedDuration(opt.hours)}
                          className={`relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-[#2e1d10] text-stone-900 dark:text-amber-100 shadow-xs ring-2 ring-amber-500/20 dark:ring-amber-400/30'
                              : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {opt.isPopular && (
                            <span className="absolute -top-2.5 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-stone-950 shadow-2xs">
                              Base Block
                            </span>
                          )}
                          <span className="font-mono text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 block">
                            ₱{opt.price.toLocaleString()}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-200 block mt-0.5">
                            {opt.label}
                          </span>
                          <span className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 block truncate mt-0.5">
                            {opt.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 100% Consumable Highlight Callout */}
                  <div className="rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 p-3 sm:p-4 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-200 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 shrink-0">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-emerald-900 dark:text-emerald-200">100% Fully Consumable on Food &amp; Drinks!</div>
                      <p className="text-emerald-800 dark:text-emerald-300/80 text-xs">
                        Your ₱{grandTotal.toLocaleString()} venue fee is fully consumable on all menu items during your reservation.
                      </p>
                    </div>
                  </div>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 gap-3">
                    <div className="text-xs sm:text-sm text-stone-600">
                      <span className="text-stone-400">Selected: </span>
                      <strong className="text-stone-900">{selectedDuration} Hours (₱{grandTotal.toLocaleString()})</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-amber-500 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-stone-950 hover:bg-amber-400 active:scale-95 transition shadow-sm cursor-pointer ml-auto"
                    >
                      <span>Continue to Date &amp; Start Time</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Choose Date & Start Time */}
              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-8 shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3 mb-2">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>2. Choose Date &amp; Start Time</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                        Choose your event date and arrival time. The reserved window updates automatically.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300">
                      Step 2 of 4
                    </span>
                  </div>

                  <div className="grid gap-3 sm:gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                        Event Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                        <input
                          type="date"
                          required
                          value={date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                        Start Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                        <select
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="08:00">08:00 AM (Morning Session)</option>
                          <option value="09:00">09:00 AM (Morning Workshop)</option>
                          <option value="10:30">10:30 AM (Late Morning / Lunch Block)</option>
                          <option value="13:00">01:00 PM (Early Afternoon)</option>
                          <option value="14:00">02:00 PM (Afternoon Workshop / Meeting)</option>
                          <option value="16:00">04:00 PM (Late Afternoon / Merienda)</option>
                          <option value="18:00">06:00 PM (Evening Gathering / Dinner)</option>
                          <option value="19:00">07:00 PM (Night Function)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Reserved Window Badge */}
                  <div className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-stone-100 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/80 p-3 sm:p-4 text-xs sm:text-sm">
                    <span className="text-stone-600 dark:text-stone-400 font-medium">Reserved Window:</span>
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-300 bg-white dark:bg-stone-800 px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                      {startTimeFormatted} – {endTimeFormatted} ({selectedDuration}h)
                    </span>
                  </div>

                  {/* Conflict Alert */}
                  {conflictingBooking && (
                    <div className="rounded-xl sm:rounded-2xl border border-rose-300 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/50 p-3 sm:p-4 text-xs sm:text-sm text-rose-800 dark:text-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Slot Already Booked ({conflictingBooking.reservationCode})</span>
                      </div>
                      <p className="leading-relaxed">
                        The studio is already reserved on {new Date(conflictingBooking.reservationAt).toLocaleDateString()} around{' '}
                        {new Date(conflictingBooking.reservationAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        . Please choose an alternate start time or date.
                      </p>
                    </div>
                  )}

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Duration</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!!conflictingBooking}
                      className={`inline-flex items-center gap-2 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold transition shadow-sm cursor-pointer ${
                        conflictingBooking
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95'
                      }`}
                    >
                      <span>Continue to Purpose &amp; Layout</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Event Purpose & Layout */}
              {currentStep === 3 && (
                <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-8 shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3 mb-2">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>3. Event Purpose &amp; Layout</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                        Tell us about your event and preferred table arrangement.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300">
                      Step 3 of 4
                    </span>
                  </div>

                  <div className="grid gap-3 sm:gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                        Event Type / Occasion
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none"
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                        Expected Guests (Max 25 Pax)
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(Number(e.target.value))}
                          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none"
                        >
                          {[4, 6, 8, 10, 12, 15, 18, 20, 22, 25].map((n) => (
                            <option key={n} value={n}>
                              {n} Guests
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                      Preferred Seating Arrangement
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      {SEATING_LAYOUTS.map((lay) => {
                        const isSelected = seatingLayout === lay.id;
                        return (
                          <button
                            key={lay.id}
                            type="button"
                            onClick={() => setSeatingLayout(lay.id as any)}
                            className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-[#2e1d10] text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 dark:ring-amber-400/30 font-bold'
                                : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-bold block leading-tight">{lay.name}</span>
                            <span className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 block mt-1">{lay.pax}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800 gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Date &amp; Time</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-amber-500 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-stone-950 hover:bg-amber-400 active:scale-95 transition shadow-sm cursor-pointer"
                    >
                      <span>Review Reservation &amp; Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Reservation Summary & Payment */}
              {currentStep === 4 && (
                <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-8 shadow-md animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3 mb-2">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Reservation Summary</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                        Review all details and choose your payment preference to finalize your studio booking.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800/60 px-3 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      Step 4 of 4
                    </span>
                  </div>

                  <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
                    {/* Left Details: Schedule & Inclusions */}
                    <div className="space-y-3.5">
                      <div className="rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/80 p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Date:</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {new Date(date).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Schedule:</span>
                          <span className="font-bold text-amber-900 dark:text-amber-300">
                            {startTimeFormatted} – {endTimeFormatted}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Duration:</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">{selectedDuration} Hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Guests:</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">{guestCount} Pax</span>
                        </div>
                        {activeCustomer && (
                          <div className="flex justify-between pt-1.5 border-t border-stone-200 dark:border-stone-700">
                            <span className="text-stone-500 dark:text-stone-400">Customer:</span>
                            <span className="font-bold text-stone-900 dark:text-stone-100">{activeCustomer.fullName}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-stone-200 dark:border-stone-700">
                          <span className="text-stone-500 dark:text-stone-400">Purpose:</span>
                          <span className="font-bold text-stone-800 dark:text-stone-200 text-right truncate max-w-[180px]">{eventType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Seating:</span>
                          <span className="font-bold text-stone-800 dark:text-stone-200 capitalize">
                            {SEATING_LAYOUTS.find((l) => l.id === seatingLayout)?.name || seatingLayout}
                          </span>
                        </div>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="rounded-xl sm:rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between text-stone-700 dark:text-stone-300">
                          <span>Base Studio Rental (3 hrs)</span>
                          <span className="font-mono font-bold">₱3,500.00</span>
                        </div>

                        {selectedDuration > 3 && (
                          <div className="flex justify-between text-stone-700 dark:text-stone-300">
                            <span>Extension ({selectedDuration - 3} extra hr{selectedDuration - 3 > 1 ? 's' : ''} @ ₱1,000/hr)</span>
                            <span className="font-mono font-bold">₱{((selectedDuration - 3) * 1000).toFixed(2)}</span>
                          </div>
                        )}

                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                          <span className="font-bold flex items-center gap-1 text-emerald-800 dark:text-emerald-300 mb-0.5">
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                            100% Fully Consumable
                          </span>
                          Your ₱{grandTotal.toLocaleString()} venue fee is fully consumable on all food &amp; drinks during the reservation.
                        </div>

                        <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-baseline">
                          <span className="font-display font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">Total Amount:</span>
                          <span className="font-mono text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-300">
                            ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Details: Payment Preference & Final Action */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                          Payment Preference
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('gcash')}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'gcash'
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 dark:ring-blue-500/30'
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                          >
                            <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>GCash</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'cash'
                                ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 dark:ring-emerald-500/30'
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                          >
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Cash</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'card'
                                ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20 dark:ring-purple-500/30'
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                          >
                            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span>Card Tap</span>
                          </button>
                        </div>

                        {paymentMethod === 'gcash' && (
                          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 p-3 text-xs text-blue-950 dark:text-blue-200 space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-200">
                              <QrCode className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                              <span>GCash QR Available on Voucher</span>
                            </div>
                            <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                              Scan GCash QR or send to Yellow Hauz ({settings.shop_phone || '0923 116 0300'}) to settle your reservation fee.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Final Submit Button */}
                      <div className="pt-2 space-y-3">
                        {activeCustomer ? (
                          <button
                            type="submit"
                            disabled={!!conflictingBooking}
                            className={`w-full rounded-xl sm:rounded-2xl py-3.5 text-xs sm:text-sm font-black transition shadow-md flex items-center justify-center gap-2 ${
                              conflictingBooking
                                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                : 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-[0.99] cursor-pointer'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Reserve Studio for ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              showAlert({
                                title: 'Sign In Required',
                                message: 'Please sign in or create an account to finalize and reserve the private studio.',
                                type: 'warning',
                              });
                              if (onRequireLogin) onRequireLogin();
                            }}
                            className="w-full rounded-xl sm:rounded-2xl bg-stone-950 py-3.5 text-xs sm:text-sm font-extrabold text-amber-400 shadow-md hover:bg-stone-800 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Lock className="h-4 w-4 text-amber-400" />
                            <span>Sign In to Reserve Studio</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Purpose &amp; Layout</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
