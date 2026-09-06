import React from 'react';
import { Order, StoreSettings } from '../types';
import { Printer, X, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-bold text-stone-900">Official Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thermal Receipt Content Container */}
        <div
          id="printable-receipt"
          className="my-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4 font-mono text-[11px] leading-tight text-stone-800"
        >
          <div className="text-center pb-2.5 border-b border-dashed border-stone-300 flex flex-col items-center">
            <img
              src="/images/Coffeatyellowhauz_logo.jpg"
              alt="Yellow Hauz"
              className="h-10 w-10 rounded-full object-cover border border-stone-300 mb-1.5 grayscale"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <h2 className="text-xs font-black tracking-tight text-stone-900 font-display">
              {settings.shop_name}
            </h2>
            <p className="text-[10px] text-stone-500 mt-0.5">{settings.shop_address}</p>
            <p className="text-[10px] text-stone-500">Tel: {settings.shop_phone}</p>
            <div className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900 uppercase">
              {order.orderType.replace('_', ' ')} {order.tableNumber ? `• Table #${order.tableNumber}` : ''}
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-stone-300 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Receipt No:</span>
              <span className="font-bold text-stone-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Date/Time:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Cashier:</span>
              <span>{order.cashierName}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span>{order.customerName}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="py-2 border-b border-dashed border-stone-300 text-[10px]">
            <table className="w-full text-left">
              <thead>
                <tr className="text-stone-400 text-[9px] border-b border-stone-200">
                  <th className="pb-1">ITEM</th>
                  <th className="pb-1 text-center">QTY</th>
                  <th className="pb-1 text-right">PRICE</th>
                  <th className="pb-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="py-0.5">
                    <td className="py-0.5 pr-1 font-medium text-stone-900 text-[10px]">
                      {item.name}
                      {item.specialInstructions && (
                        <div className="text-[9px] text-stone-500 italic">
                          ({item.specialInstructions})
                        </div>
                      )}
                    </td>
                    <td className="py-0.5 text-center text-stone-600 text-[10px]">{item.quantity}</td>
                    <td className="py-0.5 text-right text-stone-600 text-[10px]">₱{item.unitPrice.toFixed(2)}</td>
                    <td className="py-0.5 text-right font-medium text-stone-900 text-[10px]">
                      ₱{item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Breakdown */}
          <div className="py-2 border-b border-dashed border-stone-300 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal:</span>
              <span>₱{order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>
                  Discount {order.discountPercent ? `(${order.discountPercent}%)` : ''}:
                </span>
                <span>-₱{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">VAT ({order.taxRate}%):</span>
              <span>₱{order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-stone-900 pt-1 border-t border-stone-200">
              <span>TOTAL AMOUNT:</span>
              <span>₱{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="py-2 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Payment Method:</span>
              <span className="uppercase font-bold">{order.paymentMethod}</span>
            </div>
            {order.paymentMethod === 'cash' && order.amountPaid !== undefined && (
              <>
                <div className="flex justify-between">
                  <span className="text-stone-500">Amount Tendered:</span>
                  <span>₱{order.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Change:</span>
                  <span>₱{(order.changeAmount ?? 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center pt-2 border-t border-dashed border-stone-300 text-[9px] text-stone-500 space-y-0.5">
            <p className="font-medium text-stone-700">{settings.receipt_footer}</p>
            <p>This serves as your official sales invoice.</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-bold text-stone-950 hover:bg-amber-400 transition"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2.5 font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
