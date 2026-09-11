import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Static images
  const imagesPath = path.join(process.cwd(), 'images');
  app.use('/images', express.static(imagesPath));
  app.use('/public/images', express.static(imagesPath));

  // Basic API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', store: 'Coffee at Yellow Hauz POS & Ordering API' });
  });

  // Customer AI Concierge Assistant API
  app.post('/api/chat/assistant', async (req, res) => {
    const { message, customerName, tableNumber, history } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured',
        useFallback: true,
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const customerContext = [
        customerName ? `The guest's name is ${customerName}.` : 'The user is a valued café customer/guest.',
        tableNumber ? `The guest is currently seated at Table ${tableNumber} for Dine-In.` : '',
      ].filter(Boolean).join(' ');

      const systemInstruction = `You are the friendly, polite, and knowledgeable AI Barista & Café Concierge of "Coffee at Yellow Hauz", a beloved café located in Davao City, Philippines (established 2007).
Your sole purpose is assisting CUSTOMERS and GUESTS. Never give internal staff POS or administrative instructions.
${customerContext}

Key Café Knowledge:
- Operating Hours: Open daily from 7:00 AM to 10:00 PM.
- Top Coffee Bestsellers: Spanish Latte (sweet & silky with condensed milk, hot or iced ₱200-₱210), Iced Latte on the Rocks (₱180), Caramel Macchiato/Caramella, Flat White (₱170), Cortado (₱150), Single-Origin Bukidnon Arabica.
- Non-Coffee Favorites: Matcha Latte (hot/iced ₱250-₱260), YH Dark Chocolate (₱200-₱210), Calamansi Refresher (₱150), Cucumber Lemonade (₱150), Cookies & Cream Milkshake (₱240), Wintermelon Milk Tea (₱180).
- Milk Alternatives: Oatmilk (+₱40), Almond Milk (+₱40), Macadamia Milk (+₱30).
- Comfort Meals & Sandwiches: Crispy Pork Adobo Flakes (₱310, fan-favorite), Longganisa Breakfast (₱230), Chicken Tocino (₱230), Grilled Garlic Cheese Sandwich (₱180), Chicken Sandwich (₱200), Tuna & Garlic Pasta (₱230), Yellow Hauz Special Pizza (₱210).
- Cakes & Desserts: Signature Blueberry Cheesecake Cake (₱170), Tiramisu (₱150), Basque Burnt Cheesecake (₱250), Brownie Ala Mode (₱150).
- Table Reservations & Private Venue:
  * Regular dining tables can be booked via the "Reservations" tab (Normal Area: Tables 1-4, Airconditioned Area: Tables 5-8).
  * Private Venue / Function Studio: Only ₱300 for 3 Hours! (₱100/extra hour), accommodates 20-25 guests, includes High-speed Fiber Wi-Fi, Full Aircon, HD Projector & Screen, Bluetooth Sound System with Wireless Mics, Whiteboard, Power Stations, and In-Room Café Menu Ordering.
- How Customers Order: Customers can browse the menu, add items to their cart, customize notes/sweetness, choose Dine-In (specify table number) or Take-Out, and checkout.
- Discounts: 20% Senior Citizen and PWD discount is honored upon presenting a valid government ID to the cashier.
- Payments: Cash, GCash (scan QR code), and Debit/Credit Card terminals.
- Amenities: Fast complimentary fiber Wi-Fi, accessible charging/power outlets for working and studying.

Tone & Style:
- Warm, welcoming, respectful, and helpful like a passionate café barista.
- Use natural, appetizing descriptions with occasional café emojis (☕, 🍰, ⭐).
- Keep responses concise, scannable, and easy to read on mobile.
- If recommending dishes or drinks, name specific Yellow Hauz menu items so the guest can easily order them.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I'd be delighted to help you with our menu, coffee drinks, or reservations at Yellow Hauz!";

      return res.json({
        reply: replyText,
        source: 'gemini',
      });
    } catch (err: any) {
      console.error('Gemini API Assistant error:', err?.message || err);
      return res.status(500).json({
        error: 'Failed to generate AI response',
        useFallback: true,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coffee at Yellow Hauz Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
