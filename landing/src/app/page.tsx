"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { 
  Phone, Mail, Building, MessageSquare, Check, ChevronRight, Sparkles, 
  TrendingUp, Smartphone, Search, Mic, QrCode, BellRing, IndianRupee, 
  Layers, Printer, Wifi, Percent, Star, ArrowRight, Lock, CheckCircle2, 
  Calculator, Store, Clock, Award, ShieldCheck, HeartHandshake, Eye,
  Laugh, Smile, Meh, Frown, Angry, ShoppingCart, Globe, Gift, Zap, ChefHat, AlertTriangle,
  Pill, Shirt, Laptop, ExternalLink, BookOpen, Database, Bot, Terminal
} from "lucide-react";

function FoodIcon({ name, className = "w-8 h-8" }) {
  if (name === "Truffle Burger") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6H3z" fill="currentColor" fillOpacity="0.1" />
        <path d="M2 13h20" strokeWidth="3" stroke="currentColor" />
        <rect x="3" y="15" width="18" height="2" rx="1" fill="currentColor" />
        <path d="M4 18c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2H4z" fill="currentColor" fillOpacity="0.1" />
      </svg>
    );
  }
  if (name === "Truffle Fries") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14l-1.5 8h-11L5 12z" fill="currentColor" fillOpacity="0.1" />
        <path d="M7 6v6M10 4v8M12 5v7M14 4v8M17 6v6" />
      </svg>
    );
  }
  if (name === "Matcha Latte") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" fill="currentColor" fillOpacity="0.1" />
        <path d="M6 2v2M10 2v2M14 2v2" />
      </svg>
    );
  }
  if (name === "Mango Smoothie") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l-3 5" />
        <path d="M6 7h12l-1.5 13h-9L6 7z" fill="currentColor" fillOpacity="0.1" />
        <path d="M6 7c0-2 2-3 6-3s6 1 6 3" />
      </svg>
    );
  }
  if (name === "Margherita Pizza") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20L4 12 20 4v16z" fill="currentColor" fillOpacity="0.1" />
        <path d="M20 4c-2 2-2 14 0 16" strokeWidth="3" />
        <circle cx="15" cy="9" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="16" cy="15" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "Caesar Salad") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 11h20a10 10 0 0 1-20 0z" fill="currentColor" fillOpacity="0.1" />
        <path d="M5 6c1 2 3 2 4 0M10 5c1 2 3 2 4 0M15 6c1 2 3 2 4 0" />
      </svg>
    );
  }
  return null;
}


const TRANSLATIONS = {
  en: {
    heroBadge: "AI-Powered Cloud-Native Restaurant OS",
    heroTitle1: "{curT.heroTitle1}",
    heroTitle2: "Restaurant Management System",
    heroSub: "Elevate hospitality and speed up operations with RESTUVEXO, the leading restaurant management operating system. Integrating ultra-high-speed POS, real-time Kitchen Displays (KDS), automated recipe inventory, and smart QR code table ordering into one unified platform.",
    scheduleDemo: "Schedule Free Demo",
    registerShop: "Start 1-Month Free Trial",
    staffTerminal: "Staff Terminal",
    bookDemoNav: "Book A Demo",
    benefitsTag: "Live Running Orders & Kitchen Automation",
    benefitsTitle1: "Why Real-Time Running Orders",
    benefitsTitle2: "Double Your Restaurant Profits",
    benefitsSub: "Say goodbye to lost paper slips and waiter errors. From table ordering to live kitchen displays (KDS) and counter checkout, everything syncs instantly to save hours and eliminate food waste.",
    card1Title: "3x Faster Table Turnover",
    card1Badge: "{curT.card1Badge}",
    card1Desc: "See which tables are occupied, running, or ready for bill settlement in real-time. The moment payment is completed, the table frees up automatically on the live floor plan.",
    card1ProfitLabel: "Profit Impact:",
    card1Profit: "Serve 40+ extra dining guests every rush hour",
    card2Title: "Zero Wrong Orders & Food Waste",
    card2Badge: "{curT.card2Badge}",
    card2Desc: "No more illegible handwriting or misplaced paper slips. Table numbers, item modifications, and special cooking notes flash on the Kitchen Display System (KDS) with sound chimes.",
    card2ProfitLabel: "Profit Impact:",
    card2Profit: "Save ₹15,000 - ₹30,000 every month in wasted raw food",
    card3Title: "Contactless Self QR Ordering",
    card3Badge: "{curT.card3Badge}",
    card3Desc: "Guests scan the acrylic table QR standee to view high-res food photos, browse categories, and place orders directly from their phones. Waiters confirm with 1 tap.",
    card3ProfitLabel: "Profit Impact:",
    card3Profit: "Operate a 50-100 seat restaurant smoothly with half the service staff",
    card4Title: "Live Sales & Profit Telemetry",
    card4Badge: "{curT.card4Badge}",
    card4Desc: "Monitor occupied tables, running unpaid orders, gross sales, and net food profits in real-time from anywhere in the world on your smartphone.",
    card4ProfitLabel: "Profit Impact:",
    card4Profit: "100% financial transparency and zero cash pilferage",
    bannerTitle: "Want to see live running orders and kitchen sync in your restaurant?",
    bannerSub: "Join today and enjoy 1 full month of complete free access.",
    bannerBtn: "Book Free Demo →",
    pricingBadge: "{curT.pricingBadge}",
    pricingTitle: "1 Month Complete Free Access — All-in-One",
    pricingSub: "No credit card required. Experience all features of RESTUVEXO with unlimited terminals, tables, and staff for a full month at zero cost.",
    pricingPrice: "₹0",
    pricingPeriod: "/ 1st Month Free",
    pricingGuarantee: "✓ No hidden fees • Continue with flexible renewal after 1 month",
    f1: "High-Speed Counter POS Billing Terminal",
    f2: "Unlimited Tables & Dynamic QR Menus",
    f3: "Real-Time Kitchen Display System (KDS KOT)",
    f4: "Unlimited Waiter & Chef Staff Terminals",
    f5: "Automated Recipe Costing & Stock Depletion",
    f6: "24/7 Priority Support & Free Onboarding Assist",
    pricingCta: "Start 1-Month Free Trial Now",
    pricingInstant: "Instant 1-minute setup • Go live with your restaurant immediately"
  },
  bn: {
    heroBadge: "ক্লাউড-নেটিভ রেস্তোরাঁ অপারেটিং সিস্টেম",
    heroTitle1: "আধুনিক রেস্তোরাঁর জন্য",
    heroTitle2: "কমপ্লিট ম্যানেজমেন্ট সিস্টেম",
    heroSub: "রেস্তোরাঁর সার্ভিস দ্রুত ও নির্ভুল করতে RESTUVEXO-র আধুনিক প্রযুক্তি। হাই-স্পিড POS কাউন্টার বিলিং, রিয়েল-টাইম কিচেন ডিসপ্লে (KDS), স্বয়ংক্রিয় স্টক ইনভেন্টরি এবং টেবিল QR সেলফ-অর্ডারিং—সবকিছু এক প্ল্যাটফর্মে।",
    scheduleDemo: "ফ্রি ডেমো বুক করুন",
    registerShop: "১ মাসের ফ্রি ট্রায়াল শুরু করুন",
    staffTerminal: "স্টাফ টার্মিনাল",
    bookDemoNav: "ডেমো বুক করুন",
    benefitsTag: "লাইভ রানিং অর্ডার ও কিচেন অটোমেশন",
    benefitsTitle1: "রানিং অর্ডার ও কিচেন ট্র্যাকিং কেন আপনার",
    benefitsTitle2: "লাভ দ্বিগুণ করে?",
    benefitsSub: "{curT.benefitsSub}",
    card1Title: "{curT.card1Title}",
    card1Badge: "৩ গুণ টার্নওভার",
    card1Desc: "{curT.card1Desc}",
    card1ProfitLabel: "আর্থিক লাভ:",
    card1Profit: "{curT.card1Profit}",
    card2Title: "{curT.card2Title}",
    card2Badge: "শূন্য অপচয়",
    card2Desc: "{curT.card2Desc}",
    card2ProfitLabel: "আর্থিক লাভ:",
    card2Profit: "{curT.card2Profit}",
    card3Title: "{curT.card3Title}",
    card3Badge: "৫০% কম স্টাফ",
    card3Desc: "{curT.card3Desc}",
    card3ProfitLabel: "আর্থিক লাভ:",
    card3Profit: "{curT.card3Profit}",
    card4Title: "{curT.card4Title}",
    card4Badge: "লাইভ টেলিমেট্রি",
    card4Desc: "{curT.card4Desc}",
    card4ProfitLabel: "আর্থিক লাভ:",
    card4Profit: "{curT.card4Profit}",
    bannerTitle: "{curT.bannerTitle}",
    bannerSub: "{curT.bannerSub}",
    bannerBtn: "{curT.bannerBtn}",
    pricingBadge: "১ মাস ফ্রি ট্রায়াল",
    pricingTitle: "{curT.pricingTitle}",
    pricingSub: "{curT.pricingSub}",
    pricingPrice: "₹0",
    pricingPeriod: "{curT.pricingPeriod}",
    pricingGuarantee: "{curT.pricingGuarantee}",
    f1: "{curT.f1}",
    f2: "{curT.f2}",
    f3: "{curT.f3}",
    f4: "{curT.f4}",
    f5: "{curT.f5}",
    f6: "{curT.f6}",
    pricingCta: "১ মাসের ফ্রি ট্রায়াল শুরু করুন",
    pricingInstant: "{curT.pricingInstant}",
  },
  hi: {
    heroBadge: "क्लाउड-नेगेटिव रेस्टोरेंट ऑपरेटिंग सिस्टम",
    heroTitle1: "आधुनिक रेस्टोरेंट के लिए",
    heroTitle2: "सम्पूर्ण मैनेजमेंट सिस्टम",
    heroSub: "RESTUVEXO के साथ रेस्टोरेंट संचालन को तेज और आसान बनाएं। हाई-स्पीड POS बिलिंग, रियल-टाइम किचन डिस्प्ले (KDS), स्वचालित इन्वेंट्री और टेबल QR सेल्फ-ऑर्डरिंग—सब एक जगह।",
    scheduleDemo: "मुफ्त डेमो बुक करें",
    registerShop: "1 महीने का फ्री ट्रायल शुरू करें",
    staffTerminal: "स्टाफ टर्मिनल",
    bookDemoNav: "डेमो बुक करें",
    benefitsTag: "लाइव रनिंग ऑर्डर्स और किचन ऑटोमेशन",
    benefitsTitle1: "रनिंग ऑर्डर्स और किचन ट्रैकिंग कैसे",
    benefitsTitle2: "दोगुना करता है आपका मुनाफा?",
    benefitsSub: "कागज की पर्ची खोने या वेटर की गलतियों को कहें अलविदा। टेबल ऑर्डरिंग से किचन KDS और काउंटर बिलिंग तक—सब कुछ सेकंडों में सिंक होता है।",
    card1Title: "टेबल 3 गुना तेजी से खाली होती है",
    card1Badge: "3x टर्नओवर",
    card1Desc: "फ्लोर प्लान पर लाइव देखें कौन सी टेबल खाली है या बिलिंग के लिए तैयार है। पेमेंट पूरा होते ही टेबल अपने आप खाली मार्क हो जाती है।",
    card1ProfitLabel: "वित्तीय लाभ:",
    card1Profit: "पीक ऑवर्स में 40+ अतिरिक्त ग्राहकों को सेवा दें",
    card2Title: "0% गलत ऑर्डर और खाना बर्बादी बंद",
    card2Badge: "शून्य बर्बादी",
    card2Desc: "वेटर की लिखावट न समझने की परेशानी खत्म। टेबल नंबर, मॉडिफिकेशन और कुकिंग नोट्स सीधे किचन डिस्प्ले (KDS) पर अलर्ट के साथ जाते हैं।",
    card2ProfitLabel: "वित्तीय लाभ:",
    card2Profit: "हर महीने ₹15,000 - ₹30,000 कच्चे माल की बर्बादी रोकें",
    card3Title: "वेटर के बिना ग्राहक सेल्फ QR ऑर्डर",
    card3Badge: "50% कम स्टाफ",
    card3Desc: "ग्राहक टेबल पर रखे QR कोड को स्कैन करके फोटो और दाम देखकर सीधे अपने फोन से ऑर्डर कर सकते हैं। वेटर 1 टैप में कन्फर्म करता है।",
    card3ProfitLabel: "वित्तीय लाभ:",
    card3Profit: "कम स्टाफ के साथ भी 50-100 सीट का रेस्टोरेंट सुगमता से चलाएं",
    card4Title: "मालिक के फोन पर लाइव सेल्स और मुनाफा",
    card4Badge: "लाइव टेलीमेट्री",
    card4Desc: "दुकान में न होकर भी अपने स्मार्टफोन से लाइव देखें—कितनी टेबल चल रही हैं, आज का कुल कैश और UPI कलेक्शन कितना है और नेट प्रॉफिट क्या है।",
    card4ProfitLabel: "वित्तीय लाभ:",
    card4Profit: "कैश चोरी या हेराफेरी का जोखिम 100% खत्म",
    bannerTitle: "क्या आप अपने रेस्टोरेंट में लाइव रनिंग ऑर्डर देखना चाहते हैं?",
    bannerSub: "आज ही जुड़ें और पूरे 1 महीने का मुफ्त ट्रायल पाएं।",
    bannerBtn: "फ्री डेमो बुक करें →",
    pricingBadge: "1 महीना फ्री ट्रायल",
    pricingTitle: "1 महीना पूरी तरह मुफ्त — ऑल-इन-वन",
    pricingSub: "कोई क्रेडिट कार्ड जरूरी नहीं। बिना किसी अग्रिम भुगतान के 1 महीने तक RESTUVEXO के सभी फीचर्स असीमित इस्तेमाल करें।",
    pricingPrice: "₹0",
    pricingPeriod: "/ पहला महीना फ्री",
    pricingGuarantee: "✓ कोई छुपा शुल्क नहीं • 1 महीने बाद अपनी मर्जी से रिन्यू करें",
    f1: "हाई-स्पीड POS काउंटर बिलिंग टर्मिनल",
    f2: "असीमित टेबल और डायनेमिक QR मेनू",
    f3: "रियल-टाइम किचन डिस्प्ले सिस्टम (KDS KOT)",
    f4: "असीमित वेटर और शेफ स्टाफ टर्मिनल",
    f5: "ऑटो रेसिपी कॉस्टिंग और स्टॉक ट्रैकिंग",
    f6: "24/7 प्रायोरिटी सपोर्ट और फ्री सेटअप",
    pricingCta: "1 महीने का फ्री ट्रायल अभी शुरू करें",
    pricingInstant: "त्वरित साइन-अप • सिर्फ 1 मिनट में अपना रेस्टोरेंट लाइव करें",
  }
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "bn" | "hi">("en");
  const curT = TRANSLATIONS[lang];

  // Intro loading state for Petpooja-style animation
  const [introLoading, setIntroLoading] = useState(true);
  const [fadeExit, setFadeExit] = useState(false);

  useEffect(() => {
    // Disable body scroll while loading
    document.body.style.overflow = "hidden";
    
    // Start exit fade a bit before removing from DOM
    const fadeTimer = setTimeout(() => {
      setFadeExit(true);
    }, 2200);

    const removeTimer = setTimeout(() => {
      setIntroLoading(false);
      document.body.style.overflow = "";
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = "";
    };
  }, []);

  // Tabs for Marketplace / Add-ons
  const [activeTab, setActiveTab] = useState("qr_ordering");

  // Interactive KDS/POS Beacon call status in Marketplace
  const [beacons, setBeacons] = useState({
    "AC 1": { status: "Active", type: "Water", color: "bg-blue-100 text-blue-800 border-blue-200" },
    "AC 2": { status: "Idle", type: "None", color: "bg-slate-100 text-slate-400 border-slate-200" },
    "AC 4": { status: "Active", type: "Bill", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    "AC 5": { status: "Idle", type: "None", color: "bg-slate-100 text-slate-400 border-slate-200" },
    "G1": { status: "Active", type: "Assist", color: "bg-amber-100 text-amber-800 border-amber-200" },
    "G2": { status: "Idle", type: "None", color: "bg-slate-100 text-slate-400 border-slate-200" },
    "G3": { status: "Active", type: "Assist", color: "bg-amber-100 text-amber-800 border-amber-200" },
  });

  // Micro-interactive voice order simulation state
  const [voiceText, setVoiceText] = useState("Tap mic to record voice order...");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceOrders, setVoiceOrders] = useState([
    { name: "Paneer Tikka", qty: 2, price: 249.00 },
    { name: "Matcha Latte", qty: 1, price: 189.00 }
  ]);

  // Handle voice order demo click
  const triggerVoiceRecord = () => {
    setIsRecording(true);
    setVoiceText("Listening: 'Add Truffle Burger and fresh Lime Juice'...");
    setTimeout(() => {
      setVoiceOrders(prev => [
        ...prev,
        { name: "Truffle Burger", qty: 1, price: 249.00 },
        { name: "Lime Juice", qty: 1, price: 99.00 }
      ]);
      setVoiceText("Order parsed successfully!");
      setIsRecording(false);
    }, 2500);
  };

  // Toggle beacon assistance type
  const toggleBeacon = (table) => {
    const types = ["None", "Water", "Bill", "Assist"];
    const colors = {
      "None": "bg-slate-100 text-slate-400 border-slate-200",
      "Water": "bg-blue-100 text-blue-800 border-blue-200",
      "Bill": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Assist": "bg-amber-100 text-amber-800 border-amber-200",
    };
    
    setBeacons(prev => {
      const current = prev[table].type;
      const nextIndex = (types.indexOf(current) + 1) % types.length;
      const nextType = types[nextIndex];
      return {
        ...prev,
        [table]: {
          status: nextType === "None" ? "Idle" : "Active",
          type: nextType,
          color: colors[nextType]
        }
      };
    });
  };

  // Feedback Emoji Rating Simulator
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const feedbackEmojis = [
    { icon: Laugh, val: "Excellent", color: "text-emerald-500" },
    { icon: Smile, val: "Good", color: "text-green-500" },
    { icon: Meh, val: "Average", color: "text-amber-500" },
    { icon: Frown, val: "Poor", color: "text-orange-500" },
    { icon: Angry, val: "Terrible", color: "text-red-500" },
  ];

  // Live POS Order simulator
  const [posItems, setPosItems] = useState([
    { id: 1, name: "Truffle Burger", price: 249.00, count: 0 },
    { id: 2, name: "Truffle Fries", price: 119.00, count: 0 },
    { id: 3, name: "Matcha Latte", price: 189.00, count: 0 },
    { id: 4, name: "Mango Smoothie", price: 149.00, count: 0 },
    { id: 5, name: "Margherita Pizza", price: 349.00, count: 0 },
    { id: 6, name: "Caesar Salad", price: 229.00, count: 0 },
  ]);
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [printedBill, setPrintedBill] = useState(null);

  const adjustItemCount = (id, delta) => {
    setPosItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, count: Math.max(0, item.count + delta) };
      }
      return item;
    }));
  };

  const getPosTotal = () => {
    return posItems.reduce((acc, item) => acc + (item.price * item.count), 0).toFixed(2);
  };

  const hasPosItems = posItems.some(i => i.count > 0);

  const handleSimulatePrint = () => {
    if (!hasPosItems) return;
    setIsPrintingBill(true);
    setTimeout(() => {
      const activeItems = posItems.filter(i => i.count > 0);
      setPrintedBill({
        id: Math.floor(1000 + Math.random() * 9000),
        items: activeItems,
        total: getPosTotal(),
        date: new Date().toLocaleTimeString()
      });
      setIsPrintingBill(false);
    }, 1500);
  };

  const handleClearPOS = () => {
    setPosItems(prev => prev.map(item => ({ ...item, count: 0 })));
    setPrintedBill(null);
  };

  // ROI Savings Calculator State
  const [tables, setTables] = useState(25);
  const [dailyOrders, setDailyOrders] = useState(120);
  const [ticketValue, setTicketValue] = useState(400);

  const calculateSavings = () => {
    const monthlyRev = dailyOrders * ticketValue * 30;
    // Assume 3.5% increased throughput due to quick POS
    const extraRevenue = monthlyRev * 0.035;
    // Assume 1.8 mins saved per order. At ₹150/hr labor cost
    const hoursSaved = (dailyOrders * 1.8 * 30) / 60;
    const laborSavings = hoursSaved * 150;
    // Assume reduction of food waste (auto-inventory reconciliation) saves 1.5% of total revenue
    const inventorySavings = monthlyRev * 0.015;

    return {
      monthlyRevenue: monthlyRev.toLocaleString("en-IN"),
      extraRevenue: Math.round(extraRevenue).toLocaleString("en-IN"),
      laborSavings: Math.round(laborSavings).toLocaleString("en-IN"),
      inventorySavings: Math.round(inventorySavings).toLocaleString("en-IN"),
      totalSavings: Math.round(extraRevenue + laborSavings + inventorySavings).toLocaleString("en-IN")
    };
  };

  const savings = calculateSavings();

  // Booking Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    message: ""
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null });

  const handleInputChange = (e) => {
    const { name, val } = { name: e.target.name, val: e.target.value };
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.restuvexo.shop";

    try {
      const payload = { ...formData };
      const res = await fetch(`${apiUrl}/api/demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFormStatus({ loading: false, success: true, error: null });
        setFormData({ name: "", email: "", phone: "", restaurantName: "", message: "" });
      } else {
        setFormStatus({ loading: false, success: false, error: data.message || "Failed to submit demo request" });
      }
    } catch (err) {
      console.error("Submit Demo Error:", err);
      setFormStatus({ loading: false, success: false, error: "Unable to connect to the backend server. Please verify the server is running." });
    }
  };

  // FAQ Expand state
  const [faqOpen, setFaqOpen] = useState({});
  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "Will this POS work offline if the internet goes down?",
      a: "Yes! RESTUVEXO utilizes client-side database caching. The POS registers orders locally and syncs them automatically to the server the second connection is restored, ensuring zero interrupted service."
    },
    {
      q: "Can I connect my existing thermal ESC/POS bill printers?",
      a: "Absolutely. Our local server client connects instantly to standard USB, Ethernet, and Bluetooth thermal printers to print kitchen order tickets (KOT) and client receipts automatically."
    },
    {
      q: "How does the customer QR table ordering system work?",
      a: "Each table is assigned a unique QR code. Customers scan the QR code to view your digital menu, select items, and order directly. It rings a notification on the waiter and chef terminals instantly."
    },
    {
      q: "Is there any limit to the number of staff members or terminals?",
      a: "No! RESTUVEXO supports unlimited waiters, chefs, billing terminals, and manager devices. You can operate them all concurrently under your subscription."
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white text-slate-800 overflow-hidden font-sans">
      
      {/* Petpooja-style Intro Loading screen (only happens on landing page first open) */}
      {introLoading && (
        <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${fadeExit ? 'opacity-0' : 'opacity-100'}`}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes drawLeftCircle {
              0% { stroke-dasharray: 130; stroke-dashoffset: 130; }
              100% { stroke-dasharray: 130; stroke-dashoffset: 0; }
            }
            @keyframes drawRightCircle {
              0% { stroke-dasharray: 130; stroke-dashoffset: 130; }
              100% { stroke-dasharray: 130; stroke-dashoffset: 0; }
            }
            @keyframes drawOverlay {
              0% { stroke-dasharray: 30; stroke-dashoffset: 30; }
              40% { stroke-dasharray: 30; stroke-dashoffset: 30; }
              100% { stroke-dasharray: 30; stroke-dashoffset: 0; }
            }
            @keyframes textFadeInUp {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 0.95; transform: translateY(0); }
            }
            @keyframes gentleRotatePulse {
              0%, 100% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.05) rotate(3deg); }
            }
            @keyframes pulseLine {
              0%, 100% { width: 0; opacity: 0; }
              50% { width: 60px; opacity: 0.25; }
            }
            @keyframes liquidFlow1 {
              0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.75; }
              50% { transform: translate(50px, -35px) scale(1.12); opacity: 0.95; }
            }
            @keyframes liquidFlow2 {
              0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.65; }
              50% { transform: translate(-45px, 45px) scale(1.08); opacity: 0.85; }
            }
            .animate-draw-left {
              animation: drawLeftCircle 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .animate-draw-right {
              animation: drawRightCircle 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
            }
            .animate-draw-overlay {
              animation: drawOverlay 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .animate-text-fade-in-up {
              animation: textFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-gentle-rotate-pulse {
              animation: gentleRotatePulse 3s ease-in-out infinite;
            }
            .animate-pulse-line {
              animation: pulseLine 1.8s ease-in-out infinite;
            }
            .animate-liquid-1 {
              animation: liquidFlow1 18s ease-in-out infinite;
            }
            .animate-liquid-2 {
              animation: liquidFlow2 24s ease-in-out infinite;
            }
          `}} />

          <div className="flex flex-col items-center justify-center space-y-5">
            
            {/* Logo Image */}
            <div className="opacity-0 animate-text-fade-in-up flex items-center justify-center mb-1" style={{ animationDelay: '0.1s' }}>
              <img 
                src="/restuvexo_logo.png" 
                alt="RESTUVEXO Logo" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
            </div>

            {/* Sleek inline logo spelling: RESTUVEX [interlocking loops O] */}
            <div className="flex items-center justify-center">
              {/* RESTUVEX text */}
              <span className="text-slate-700 font-semibold tracking-wider text-3xl sm:text-4xl md:text-5xl select-none opacity-0 animate-text-fade-in-up" style={{ animationDelay: '0.2s' }}>
                RESTUVEX
              </span>
              
              {/* Interlocking loops O */}
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ml-1 select-none animate-gentle-rotate-pulse" style={{ animationDelay: '0.4s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                  {/* Left Circle Loop */}
                  <circle 
                    cx="38" 
                    cy="50" 
                    r="20" 
                    fill="none" 
                    stroke="#ff5a5f" 
                    strokeWidth="5.5" 
                    strokeLinecap="round"
                    strokeDasharray="130"
                    strokeDashoffset="130"
                    className="animate-draw-left"
                  />
                  {/* Right Circle Loop */}
                  <circle 
                    cx="62" 
                    cy="50" 
                    r="20" 
                    fill="none" 
                    stroke="#ff8e9b" 
                    strokeWidth="5.5" 
                    strokeLinecap="round"
                    strokeDasharray="130"
                    strokeDashoffset="130"
                    className="animate-draw-right"
                  />
                  {/* Interlocking overlay arc to make it look truly 3D/interlocked */}
                  <path 
                    d="M 38 30 A 20 20 0 0 1 55.32 40" 
                    fill="none" 
                    stroke="#ff5a5f" 
                    strokeWidth="5.5" 
                    strokeLinecap="round"
                    strokeDasharray="30"
                    strokeDashoffset="30"
                    className="animate-draw-overlay"
                  />
                </svg>
              </div>
            </div>

            {/* Subtitle tag */}
            <div className="text-center space-y-1.5 opacity-0 animate-text-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-400">
                Restaurant Operating System
              </p>
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[#ff5a5f] to-transparent mx-auto rounded-full animate-pulse-line" />
            </div>
            
          </div>
        </div>
      )}
      
      {/* Schema.org Structured Data for SEO Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "RESTUVEXO Restaurant Management System & Software",
            "operatingSystem": "All (Cloud & local PWA)",
            "applicationCategory": "BusinessApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "INR"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "184"
            },
            "description": "Enterprise-grade decoupled Restaurant Operating System featuring real-time KDS, multi-terminal POS checkout, QR table ordering, and recipe inventory control.",
            "featureList": [
              "High-speed decoupled POS",
              "Real-time Kitchen Display System",
              "PWA QR table ordering",
              "Recipe cost tracking & automatic inventory deduction",
              "Multiple printer routing",
              "Offline operational cache support"
            ]
          })
        }}
      />

      {/* Smooth Liquid Floating Ambient Mesh (Pure White Background with Soft Warm Fluid Glows) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-transparent blur-[130px] animate-liquid-1" />
        <div className="absolute top-[30%] -right-[12%] w-[750px] h-[750px] rounded-full bg-gradient-to-bl from-orange-500/10 via-rose-300/8 to-transparent blur-[150px] animate-liquid-2" />
        <div className="absolute -bottom-[15%] left-[25%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-amber-400/10 via-orange-300/12 to-transparent blur-[140px] animate-liquid-1" />
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-cover p-1.5" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                RESTUVEXO
              </span>
              <span className="text-[9px] block text-slate-450 font-black uppercase tracking-widest mt-[-3px]">
                AI-Powered Restaurant Operating System
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
            <a href="#pos-simulator" className="hover:text-orange-500 transition-colors">Live POS Demo</a>
            <a href="#marketplace" className="hover:text-orange-500 transition-colors">POS Add-ons</a>
            <a href="#calculator" className="hover:text-orange-500 transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-orange-500 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-orange-500 transition-colors">FAQ</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://app.restuvexo.shop/auth/login"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition duration-200"
            >
              Staff Terminal
            </a>
            <a 
              href="#book-demo"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all duration-200"
            >
              Book A Demo
            </a>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-20 z-10 flex-1">
        
        {/* HERO SECTION */}
        <section className="grid lg:grid-cols-12 gap-12 items-center pt-8 pb-12">
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-xs font-extrabold text-orange-700 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> {curT.heroBadge}
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              {curT.heroTitle1} <br />
              <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 bg-clip-text text-transparent">
                Restaurant Management System
              </span>
            </h1>
            
            <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-xl">
              {curT.heroSub}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a 
                href="#book-demo" 
                className="flex-1 sm:flex-initial text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-orange-500/10 active:scale-95 transition duration-200"
              >
                Schedule Free Demo
              </a>
              <a 
                href="https://app.restuvexo.shop/auth/signup" 
                className="flex-1 sm:flex-initial text-center bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold py-3.5 px-8 rounded-xl shadow-sm active:scale-95 transition duration-200"
              >
                Register Shop
              </a>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free Setup Assist
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Offline Local Caching
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Card Required
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            {/* Visual Glassmorphic Mockup Container */}
            <div className="glass-panel p-6 rounded-3xl shadow-2xl relative border border-white/60">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-400 block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-green-400 block" />
                </div>
                <div className="text-xs font-bold text-slate-400 bg-slate-100/60 px-3 py-1 rounded-full border border-slate-200/50 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> RESTUVEXO POS Terminal V2.4
                </div>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Revenue</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">+18.5% Today</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">₹24,850.00</div>
                  
                  {/* Mock Mini Chart Lines */}
                  <div className="flex items-end gap-1.5 h-20 mt-4">
                    <div className="w-full bg-slate-200 h-[30%] rounded-sm" />
                    <div className="w-full bg-slate-200 h-[45%] rounded-sm" />
                    <div className="w-full bg-slate-200 h-[40%] rounded-sm" />
                    <div className="w-full bg-slate-200 h-[60%] rounded-sm" />
                    <div className="w-full bg-orange-400 h-[75%] rounded-sm animate-pulse" />
                    <div className="w-full bg-orange-500 h-[92%] rounded-sm" />
                  </div>
                </div>

                <div className="col-span-4 flex flex-col gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center flex-1 flex flex-col justify-center items-center">
                    <span className="text-[10px] text-emerald-800 font-extrabold block mb-1">POS Status</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mb-1" />
                    <span className="text-xs font-black text-slate-800">Online</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center flex-1 flex flex-col justify-center items-center">
                    <span className="text-[10px] text-orange-800 font-extrabold block mb-0.5">Tables Active</span>
                    <span className="text-xl font-black text-slate-800">18 / 25</span>
                  </div>
                </div>

                {/* Simulated Order Queue Banner */}
                <div className="col-span-12 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-extrabold text-sm">
                      KOT
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800">New Table Order - Table #14</div>
                      <div className="text-[10px] text-slate-400 font-semibold">2x Gourmet Burger, 1x Iced Tea</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-1 rounded-lg">Cooking</span>
                </div>
              </div>
            </div>

            {/* Float food icons using animated css tags */}
            <div className="absolute top-[-15px] right-[20px] animate-float-leaf-1 bg-white p-2.5 rounded-2xl shadow-md border border-slate-100 text-orange-600">
              <FoodIcon name="Margherita Pizza" className="w-7 h-7" />
            </div>
            <div className="absolute bottom-[-10px] left-[-10px] animate-float-leaf-2 bg-white p-2.5 rounded-2xl shadow-md border border-slate-100 text-orange-600">
              <FoodIcon name="Mango Smoothie" className="w-7 h-7" />
            </div>
            <div className="absolute bottom-[40%] right-[-20px] animate-float-leaf-3 bg-white p-2.5 rounded-2xl shadow-md border border-slate-100 text-orange-600">
              <FoodIcon name="Truffle Burger" className="w-7 h-7" />
            </div>
          </div>
        </section>


        {/* LIVE POS SIMULATOR SECTION */}
        <section id="pos-simulator" className="space-y-6 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest text-orange-600 uppercase">Interactive Demo</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Experience Our POS Speed</h2>
            <p className="text-slate-500 text-sm md:text-base">
              Try the live interactive POS simulator below. Click items to construct an order, and simulate an instant ticket output.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Cashier Item Grid (8 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-slate-800 text-base">Menu Grid (Cashier POS Mode)</h3>
                  <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md">6 Items Registered</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {posItems.map(item => (
                    <div 
                      key={item.id}
                      className="border border-slate-100 hover:border-orange-200 bg-slate-50/50 hover:bg-orange-50/20 p-4 rounded-2xl text-center flex flex-col justify-between items-center transition-all duration-200 select-none cursor-pointer"
                      onClick={() => adjustItemCount(item.id, 1)}
                    >
                      <div className="text-orange-600 mb-2">
                        <FoodIcon name={item.name} className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 block line-clamp-1">{item.name}</span>
                      <span className="text-xs font-black text-slate-900 mt-1">₹{item.price.toFixed(2)}</span>
                      
                      <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => adjustItemCount(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 hover:bg-slate-50 active:scale-90"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-slate-800 min-w-4">{item.count}</span>
                        <button 
                          onClick={() => adjustItemCount(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs font-black hover:bg-orange-600 active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {hasPosItems && (
                <button 
                  onClick={handleClearPOS}
                  className="w-full border border-dashed border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold py-2 rounded-xl text-xs mt-6 transition duration-200"
                >
                  Clear Current Cart Selection
                </button>
              )}
            </div>

            {/* Cart & KOT Print output (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-slate-800 text-base">Receipt Ticket & Checkout</h3>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block animate-pulse" />
                </div>

                {!hasPosItems ? (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold">Cart is empty.</p>
                    <p className="text-[10px]">Click menu items on the left to start adding food.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {posItems.filter(i => i.count > 0).map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600 font-black">x{item.count}</span>
                          <span className="text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-slate-900 font-bold">₹{(item.price * item.count).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-slate-100 pt-3 flex justify-between items-center font-black text-sm">
                      <span>Total Amount:</span>
                      <span className="text-orange-600 text-base">₹{getPosTotal()}</span>
                    </div>
                  </div>
                )}
              </div>

              {hasPosItems && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleSimulatePrint}
                    disabled={isPrintingBill}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all duration-200 text-xs uppercase tracking-wide"
                  >
                    {isPrintingBill ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Printing KOT Receipt...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        Print Simulated Receipt
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Slidedown Receipt Paper Output Simulator */}
              {printedBill && (
                <div className="absolute inset-x-6 top-[55px] bg-yellow-50/90 border border-yellow-200 p-4 rounded-2xl shadow-lg z-20 animate-fade-in-up font-mono text-[10px] text-slate-700 space-y-2">
                  <div className="text-center font-bold border-b border-dashed border-yellow-300 pb-2">
                    <div className="text-xs uppercase font-extrabold text-slate-800">RESTUVEXO KOT SIMULATOR</div>
                    <div>Receipt No: #{printedBill.id}</div>
                    <div>Time: {printedBill.date}</div>
                  </div>
                  <div className="space-y-1.5 py-1">
                    {printedBill.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.name} x{item.count}</span>
                        <span>₹{(item.price * item.count).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-yellow-300 pt-2 flex justify-between font-bold text-slate-900">
                    <span>TOTAL COMPLETED:</span>
                    <span>₹{printedBill.total}</span>
                  </div>
                  <div className="text-center text-[8px] text-slate-400 pt-1">
                    KOT sent to Kitchen Display System (KDS)
                  </div>
                  <button 
                    onClick={() => setPrintedBill(null)}
                    className="w-full text-center mt-2 font-sans font-bold text-[9px] text-red-500 bg-red-50 py-1 rounded"
                  >
                    Dismiss Receipt
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>


        {/* PETPOOJA STYLE ADDONS APP MARKETPLACE */}
        <section id="marketplace" className="space-y-10 scroll-mt-24">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">App Marketplace</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Add-ons to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">supercharge</span> your POS
            </h2>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Use smart and easy-to-use technology that helps you offer premium service and the best hospitality.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto">
            {/* Sidebar Tab Switcher (3 cols) */}
            <div className="lg:col-span-3 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 scrollbar-none">
              {[
                { id: "qr_ordering",  icon: QrCode,      title: "QR Self-Ordering",    subtitle: "Dynamic QR, Print Themes" },
                { id: "staff_panel",  icon: Lock,        title: "Staff & Waiter Panel", subtitle: "10-digit IDs, Role Access" },
                { id: "kitchen_kds",  icon: ChefHat,     title: "Live Kitchen (KDS)",   subtitle: "Instant KOTs via Socket.io" },
                { id: "smart_menu",   icon: BookOpen,    title: "Smart Menu & Inventory", subtitle: "Catalog, Stock, Top Items" }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex-1 min-w-[170px] lg:min-w-0 text-left px-4 py-3.5 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? "bg-white border-orange-400/60 shadow-lg shadow-orange-500/10 scale-[1.02]"
                        : "bg-slate-50/80 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-500"}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`font-black text-xs truncate ${isActive ? "text-orange-600" : "text-slate-800"}`}>{tab.title}</div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5">{tab.subtitle}</div>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-orange-500 ml-auto flex-shrink-0 hidden lg:block" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main Panel (9 cols) */}
            <div className="lg:col-span-9 bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[460px]">
              <div className="flex-1 p-6 md:p-8">

                {/* ΓöÇΓöÇ QR ORDERING ΓöÇΓöÇ */}
                {activeTab === "qr_ordering" && (
                  <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in-up h-full">
                    <div className="md:col-span-5 space-y-5">
                      <span className="inline-block text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Customer Portal</span>
                      <h3 className="text-2xl font-black text-slate-900 leading-snug">Dynamic QR<br />Ordering</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                        Guests scan, browse, and order directly from their phones. We generate premium QR print cards — Classic, Dark &amp; Elegant — with your restaurant branding baked in.
                      </p>
                      <a href="#book-demo" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 group">
                        Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* QR Hero Card – spans 2 cols */}
                      <div className="sm:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden group min-h-[160px]">
                        <div className="absolute -right-8 -top-8 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/25 transition-all duration-700" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <div className="text-[9px] tracking-[0.15em] uppercase font-black text-orange-400">TABLE 04 • FLOOR 2</div>
                            <h4 className="text-lg font-extrabold mt-1 leading-tight">Scan & Order<br />Your Food</h4>
                          </div>
                          <div className="p-3 bg-white rounded-2xl shadow-xl">
                            <QrCode className="w-11 h-11 text-slate-900" />
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-800 relative z-10 flex justify-between items-center">
                          <div>
                            <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Powered by</div>
                            <div className="text-sm font-black text-white tracking-wider">RESTUVEXO</div>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="px-2.5 py-1 bg-white/10 rounded-lg text-[8px] font-bold text-slate-300 border border-white/10 backdrop-blur">Classic</span>
                            <span className="px-2.5 py-1 bg-orange-500/25 rounded-lg text-[8px] font-bold text-orange-400 border border-orange-500/30">Elegant</span>
                            <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[8px] font-bold text-slate-500 border border-white/5">Dark</span>
                          </div>
                        </div>
                      </div>

                      {/* Scan count */}
                      <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4 flex flex-col justify-between min-h-[108px]">
                        <Globe className="w-5 h-5 text-orange-500" />
                        <div>
                          <div className="text-2xl font-black text-slate-900">2,840<span className="text-orange-500 text-[10px] ml-1 font-extrabold">scans/mo</span></div>
                          <p className="text-[9px] text-slate-400 mt-0.5">Avg. across restaurants</p>
                        </div>
                      </div>

                      {/* PWA pill */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[108px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                        <div className="flex justify-between items-start">
                          <Smartphone className="w-5 h-5 text-indigo-400" />
                          <span className="text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold">PWA</span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">No App Install</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Works offline, runs in browser</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ΓöÇΓöÇ STAFF PANEL ΓöÇΓöÇ */}
                {activeTab === "staff_panel" && (
                  <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in-up h-full">
                    <div className="md:col-span-5 space-y-5">
                      <span className="inline-block text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Secure Access</span>
                      <h3 className="text-2xl font-black text-slate-900 leading-snug">Captain &amp;<br />Staff Desk</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                        No personal phone numbers needed. RESTUVEXO auto-generates secure 10-digit IDs for Waiters, Chefs &amp; Cashiers with full role-based access control.
                      </p>
                      <a href="#book-demo" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 group">
                        Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-2 gap-3">
                      {/* Auth Card – full width */}
                      <div className="col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100">
                            <Lock className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Staff Authentication</h4>
                            <p className="text-[10px] text-slate-400">10-digit secure system login</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex justify-center gap-1 font-mono text-xl font-black text-slate-700 tracking-[0.2em]">
                          {"918274".split("").map((d, i) => (
                            <span key={i} className={d === "2" ? "text-orange-500" : ""}>{d}</span>
                          ))}
                          <span className="text-slate-200 mx-0.5">•</span>
                          {"••••".split("").map((_, i) => <span key={i} className="text-slate-200">•</span>)}
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-dashed border-slate-100 pt-4">
                          <span className="font-bold text-slate-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />Role Verified</span>
                          <span className="bg-emerald-50 text-emerald-700 font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">Captain</span>
                        </div>
                      </div>

                      {/* Role Chips */}
                      {[
                        { role: "Waiter", desc: "Floor access", cls: "bg-blue-50 border-blue-100", tc: "text-blue-700", dc: "bg-blue-400" },
                        { role: "Chef",   desc: "KDS access",   cls: "bg-amber-50 border-amber-100", tc: "text-amber-700", dc: "bg-amber-400" },
                      ].map(r => (
                        <div key={r.role} className={`${r.cls} border rounded-2xl p-4 flex items-center gap-3`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${r.dc} flex-shrink-0`} />
                          <div>
                            <div className={`text-xs font-black ${r.tc}`}>{r.role}</div>
                            <div className="text-[9px] text-slate-400 font-medium">{r.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ΓöÇΓöÇ KITCHEN KDS ΓöÇΓöÇ */}
                {activeTab === "kitchen_kds" && (
                  <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in-up h-full">
                    <div className="md:col-span-5 space-y-5">
                      <span className="inline-block text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Real-Time Sync</span>
                      <h3 className="text-2xl font-black text-slate-900 leading-snug">Live Kitchen<br />Display (KDS)</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                        Powered by Socket.io — chefs get KOTs the millisecond an order is punched. Update ticket status from Pending to Cooking with one tap and animated live alerts.
                      </p>
                      <a href="#book-demo" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 group">
                        Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="md:col-span-7">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                        {/* Header */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ChefHat className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-black text-white tracking-wide">KITCHEN KDS</span>
                          </div>
                          <span className="flex items-center gap-1.5 text-[9px] bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/25 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live Socket
                          </span>
                        </div>

                        {/* KOT Ticket */}
                        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-3 shadow-inner">
                          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Table 12 • KOT #1042</span>
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg font-bold border border-red-500/15">04:32 MIN</span>
                          </div>
                          <div className="space-y-2.5 text-xs font-bold">
                            {[
                              { qty: "1├ù", item: "Truffle Burger", note: "No Onions" },
                              { qty: "2├ù", item: "Mango Smoothie", note: null },
                              { qty: "1├ù", item: "Pasta Arrabbiata", note: "Extra Spicy" },
                            ].map((o, i) => (
                              <div key={i} className="flex justify-between items-center text-white">
                                <span className="flex items-center gap-2"><span className="text-orange-400">{o.qty}</span>{o.item}</span>
                                {o.note && <span className="text-[8px] text-slate-400 bg-slate-700/70 px-1.5 py-0.5 rounded border border-slate-600/30">{o.note}</span>}
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 flex gap-2">
                            <button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95">Γ£ô MARK COOKING</button>
                            <button className="px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-2.5 rounded-xl border border-slate-600/30 transition">HOLD</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ΓöÇΓöÇ SMART MENU & INVENTORY ΓöÇΓöÇ */}
                {activeTab === "smart_menu" && (
                  <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in-up h-full">
                    <div className="md:col-span-5 space-y-5">
                      <span className="inline-block text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Menu Intelligence</span>
                      <h3 className="text-2xl font-black text-slate-900 leading-snug">Smart Menu &amp;<br />Inventory Control</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                        Beautifully manage your full menu catalog, track stock in real-time, onboard items in seconds with Quick Add Wizards, and let the dashboard surface your top-selling dishes daily.
                      </p>
                      <ul className="space-y-2">
                        {[
                          "Visual categorized menu catalog",
                          "Real-time inventory auto-deduction",
                          "Quick Add Wizards — items in seconds",
                          "Top Selling Items widget on dashboard",
                        ].map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600 font-semibold">
                            <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 text-[8px] font-black mt-0.5">Γ£ô</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a href="#book-demo" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 group">
                        Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card 1: Visual Menu Catalog */}
                      <div className="sm:col-span-2 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400" />
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            Visual Menu Catalog
                          </h4>
                          <span className="text-[9px] bg-orange-50 text-orange-600 font-black px-2 py-0.5 rounded-full border border-orange-100">48 Items</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { cat: "Starters", items: 12, color: "bg-orange-50 border-orange-100 text-orange-700" },
                            { cat: "Main Course", items: 18, color: "bg-indigo-50 border-indigo-100 text-indigo-700" },
                            { cat: "Desserts", items: 8, color: "bg-pink-50 border-pink-100 text-pink-700" },
                            { cat: "Beverages", items: 10, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                          ].map(c => (
                            <div key={c.cat} className={`${c.color} border rounded-xl px-3 py-2`}>
                              <div className="text-[9px] font-black truncate">{c.cat}</div>
                              <div className="text-[8px] opacity-70 font-semibold mt-0.5">{c.items} items</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card 2: Stock Tracking */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between min-h-[120px] shadow-sm">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-400" /> Stock Tracking
                          </h4>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {[
                            { item: "Tomato", pct: 22, color: "bg-red-500", alert: true },
                            { item: "Chicken", pct: 68, color: "bg-emerald-500", alert: false },
                            { item: "Oil", pct: 45, color: "bg-orange-400", alert: false },
                          ].map(s => (
                            <div key={s.item} className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-slate-500 w-12 truncate">{s.item}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                              </div>
                              {s.alert && <span className="text-[7px] font-black text-red-500 animate-pulse">LOW</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card 3: Quick Add Wizard */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center justify-between">
                          <Zap className="w-4 h-4 text-orange-400" />
                          <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">Wizard</span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">Quick Add</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">New item live in &lt; 30s</div>
                        </div>
                      </div>

                      {/* Card 4: Top Selling Widget — full width */}
                      <div className="sm:col-span-2 bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-100 rounded-2xl px-5 py-4 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            Top Selling Items Today
                          </h4>
                          <span className="text-[8px] bg-orange-500 text-white font-black px-2 py-0.5 rounded-full">Live</span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { rank: 1, name: "Truffle Burger", orders: 47, bar: "w-full" },
                            { rank: 2, name: "Mango Smoothie", orders: 38, bar: "w-4/5" },
                            { rank: 3, name: "Pasta Arrabbiata", orders: 29, bar: "w-3/5" },
                          ].map(t => (
                            <div key={t.rank} className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-orange-500 w-3">#{t.rank}</span>
                              <span className="text-[9px] font-semibold text-slate-700 w-28 truncate">{t.name}</span>
                              <div className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                <div className={`h-full bg-orange-500 rounded-full ${t.bar}`} />
                              </div>
                              <span className="text-[8px] font-black text-slate-500 w-8 text-right">{t.orders}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom CTA Banner */}
              <div className="border-t border-slate-100 bg-gradient-to-r from-orange-500/5 via-transparent to-rose-500/5 px-6 md:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Want to test how this fits in your restaurant?</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Get in touch with our team to clarify your queries.</p>
                </div>
                <a 
                  href="#book-demo"
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-extrabold text-[11px] tracking-widest uppercase transition-all duration-200 active:scale-95 shadow-md shadow-slate-900/20"
                >
                  Schedule a Free Demo →
                </a>
              </div>
            </div>
          </div>
        </section>


        {/* INTERACTIVE ROI CALCULATOR */}
        <section id="calculator" className="space-y-6 scroll-mt-24 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black tracking-widest text-orange-600 uppercase">Savings Estimator</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Estimate Your Monthly Savings</h2>
            <p className="text-slate-500 text-sm md:text-base">
              Drag the sliders below to estimate how much cash and time RESTUVEXO Restaurant OS can save for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-stretch mt-4 bg-white border border-slate-200/50 p-6 md:p-8 rounded-3xl shadow-sm">
            {/* Left Inputs (7 cols) */}
            <div className="md:col-span-7 space-y-6 flex flex-col justify-center">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-extrabold text-slate-700">
                  <span className="flex items-center gap-1.5"><Store className="w-4 h-4 text-orange-500" /> Number of Tables</span>
                  <span className="text-orange-600 font-black">{tables} Tables</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={tables}
                  onChange={(e) => setTables(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-extrabold text-slate-700">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-orange-500" /> Average Daily Orders</span>
                  <span className="text-orange-600 font-black">{dailyOrders} Orders</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-extrabold text-slate-700">
                  <span className="flex items-center gap-1.5"><IndianRupee className="w-4 h-4 text-orange-500" /> Average Order Ticket Value</span>
                  <span className="text-orange-600 font-black">₹{ticketValue.toLocaleString("en-IN")}</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="2000" 
                  step="10"
                  value={ticketValue}
                  onChange={(e) => setTicketValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>

            {/* Right Calculations (5 cols) */}
            <div className="md:col-span-5 bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-2xl p-6 flex flex-col justify-between border border-slate-800 shadow-xl">
              <div className="space-y-4">
                <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Total Savings Breakdown</div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Monthly Store Revenue:</span>
                    <span className="font-extrabold">₹{savings.monthlyRevenue}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Throughput Revenue Boost:</span>
                    <span className="font-extrabold text-emerald-400">+₹{savings.extraRevenue}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Labor Cost Savings:</span>
                    <span className="font-extrabold text-emerald-400">+₹{savings.laborSavings}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Auto-Inventory Food Savings:</span>
                    <span className="font-extrabold text-emerald-400">+₹{savings.inventorySavings}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6 space-y-1">
                <div className="text-xs text-orange-400 font-black tracking-wider uppercase">Estimated Monthly Savings</div>
                <div className="text-3xl font-black text-white tracking-tight">₹{savings.totalSavings}</div>
                <p className="text-[9px] text-slate-500 leading-normal pt-1">
                  *Based on typical data comparing standard traditional registers to RESTUVEXO decoupled processing workflows.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* SYSTEM OVERVIEW / KEY HIGHLIGHTS */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4 scroll-mt-24">
          <div className="bg-white border border-slate-200/50 p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300 space-y-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl font-bold">
              <Zap className="w-6 h-6 fill-orange-500 text-orange-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Ultra-High Speed POS</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Accept orders in under 3 seconds. Optimized billing layouts, quick payment triggers (UPI, Cash, Cards), offline local caching support, and automatic print routing.
            </p>
          </div>

          <div className="bg-white border border-slate-200/50 p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold">
              <ChefHat className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Recipe Inventory</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Auto-depletes raw ingredients when an order is completed. Low stock indicators trigger automatic push alerts so you never run out of ingredients during rush hours.
            </p>
          </div>

          <div className="bg-white border border-slate-200/50 p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300 space-y-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">PWA Table Ordering</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Allow clients to scan table QR codes to view your digital menu, order food, call waiters, and pay online directly without downloading any native app.
            </p>
          </div>
        </section>

        {/* VEXOAI SMART VIRTUAL ASSISTANT SECTION */}
        <section id="vexoai-feature" className="scroll-mt-24 max-w-6xl mx-auto w-full relative py-12">
          {/* Background Ambient Glow */}
          <div className="absolute -top-12 -left-12 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="bg-white/80 backdrop-blur-md text-slate-800 rounded-3xl p-8 md:p-12 border border-orange-100 shadow-xl shadow-orange-500/5 relative overflow-hidden">
            {/* Header */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 text-[10px] font-black text-[#ff5722] tracking-wider uppercase animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-[#ff5722]" /> AI-Powered Restaurant Assistant
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Meet <span className="bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] bg-clip-text text-transparent">VexoAI</span>: Your Restaurant Copilot
              </h2>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-2xl">
                A secure, state-of-the-art virtual assistant built directly into the core of RESTUVEXO. Troubleshoot printers, audit live sales, navigate screens, and trigger actions using simple text or voice.
              </p>
            </div>

            {/* Split Showcase Layout */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Visual Chat Simulation (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-2xl space-y-4 relative overflow-hidden min-h-[440px] flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899]" />
                
                {/* Chatbot Header */}
                <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white tracking-wide leading-none">VexoAI</h4>
                      <span className="text-[8px] font-bold text-slate-500 block mt-1">ROS Virtual Assistant</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online
                  </span>
                </div>

                {/* Simulated Conversation */}
                <div className="flex-1 py-4 space-y-4 overflow-y-auto max-h-[280px] scrollbar-none text-left">
                  {/* User Bubble */}
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white text-[11px] font-semibold rounded-[1.2rem] rounded-br-none px-4 py-2.5 max-w-[85%] shadow-md">
                      What are today's sales and profit?
                    </div>
                  </div>

                  {/* Bot Bubble */}
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-semibold rounded-[1.2rem] rounded-bl-none px-4 py-2.5 max-w-[85%] space-y-2">
                      <p className="leading-relaxed">Today's total sales/revenue is **₹780.00** and net profit is **₹420.00**.</p>
                    </div>
                  </div>

                  {/* User Bubble 2 */}
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white text-[11px] font-semibold rounded-[1.2rem] rounded-br-none px-4 py-2.5 max-w-[85%] shadow-md">
                      Take me to the POS Billing screen
                    </div>
                  </div>

                  {/* Bot Action Request Bubble */}
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-semibold rounded-[1.2rem] rounded-bl-none px-4 py-2.5 max-w-[85%] space-y-2.5">
                      <p className="leading-relaxed">I am redirecting you to the POS Billing terminal.</p>
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-wider leading-none">Security Authorization</p>
                        <p className="text-[9px] font-bold text-slate-400">Confirm Navigation</p>
                        <div className="flex gap-1.5 pt-1">
                          <span className="px-2.5 py-1 bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white text-[8px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-default">Allow (Yes)</span>
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-lg border border-slate-700 cursor-default">Cancel (No)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Input Box */}
                <div className="border border-slate-800 rounded-xl p-2 flex bg-slate-900/50 justify-between items-center text-slate-500 text-[10px] font-semibold">
                  <span>Ask VexoAI...</span>
                  <div className="w-6 h-6 rounded bg-rose-500 text-white flex items-center justify-center animate-pulse">
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Right Column: Key Capabilities (7 cols) */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <h3 className="text-xl md:text-2xl font-black text-slate-900">How it Works: Semantic Operations</h3>
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                  Unlike generic chatbots, VexoAI is sandboxed inside the operating system. It operates securely with local, read-only API actions, protecting your database and hardware:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item 1 */}
                  <div className="bg-white border border-slate-100 hover:border-orange-500/20 p-5 rounded-2xl transition duration-300 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5722] flex items-center justify-center border border-orange-100">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">Real-Time Auditing</h4>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Instant queries about sales, daily revenue, busy tables, and low stock ingredients, straight from our safe backend telemetry handler.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-white border border-slate-100 hover:border-orange-500/20 p-5 rounded-2xl transition duration-300 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">Action Confirmation</h4>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      VexoAI will never execute page redirects or print triggers automatically. Every action requires your explicit permission via inline buttons.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="bg-white border border-slate-100 hover:border-orange-500/20 p-5 rounded-2xl transition duration-300 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center border border-pink-100">
                        <Mic className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">Voice Transcription</h4>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Built-in Speech-to-Text supporting native Bangla (`bn-BD`) and English dialects. Talk to your terminal naturally.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="bg-white border border-slate-100 hover:border-orange-500/20 p-5 rounded-2xl transition duration-300 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100">
                        <Lock className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">Safe & Non-Destructive</h4>
                    </div>
                    <p className="text-[#64748b] text-[11px] leading-relaxed">
                      Does not have write access to your DB. Destructive actions (like clearing tables or menu modifications) cannot be run by AI, keeping database integrity intact.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Roadmap / Future Features Grid */}
            <div className="mt-16 pt-12 border-t border-slate-100/80 text-left">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#ff5722]" /> VexoAI: Future Capabilities (Roadmap)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: "Predictive Demand Planning", desc: "Predicts peak dining rushes, calculates optimal ingredient preparation amounts, and forecasts ingredient spoilage patterns." },
                  { title: "Automatic Reordering Triggers", desc: "Syncs with raw inventory levels to auto-draft purchase invoices and email suppliers when stock levels drop below the buffer threshold." },
                  { title: "Smart Recipe Recommendation", desc: "Suggests special chef menu specials and promotions using ingredients near their expiration date, cutting down food waste." }
                ].map((roadmap, idx) => (
                  <div key={idx} className="bg-slate-50/50 hover:bg-orange-50/10 border border-slate-200/50 hover:border-orange-200 p-5 rounded-2xl transition duration-200 relative overflow-hidden group">
                    <span className="absolute top-4 right-4 text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/40 px-2 py-0.5 rounded-md group-hover:text-[#ff5722] group-hover:border-orange-200/50 transition">Q3-Q4 2026</span>
                    <h4 className="text-xs font-black text-slate-800 pr-12">{roadmap.title}</h4>
                    <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">
                      {roadmap.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================
            REAL-TIME RUNNING ORDERS & KITCHEN AUTOMATION BENEFITS
            ======================================================== */}
        <section id="running-orders-benefits" className="scroll-mt-24 max-w-6xl mx-auto w-full relative py-8">
          <div className="bg-gradient-to-b from-orange-500/[0.03] to-white rounded-3xl p-8 md:p-12 border border-orange-100 shadow-xl shadow-orange-500/5 relative overflow-hidden">
            {/* Ambient Accent Light */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-orange-400/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[10px] font-black text-orange-600 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>{curT.benefitsTag}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                {curT.benefitsTitle1} <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">{curT.benefitsTitle2}</span>?
              </h2>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-2xl mx-auto">
                {curT.benefitsSub}
              </p>
            </div>

            {/* 4 Core Value Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {/* Card 1: 3x Faster Table Turnover */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-orange-200 transition duration-300 space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black group-hover:scale-105 transition">
                  <Zap className="w-6 h-6 fill-orange-500 text-orange-500" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base md:text-lg">{curT.card1Title}</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">{curT.card1Badge}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {curT.card1Desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="text-slate-400 text-[11px]">আর্থিক লাভ:</span>
                  <span className="text-emerald-600 font-extrabold">{curT.card1Profit}</span>
                </div>
              </div>

              {/* Card 2: Zero Food Waste & Wrong KOTs */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-orange-200 transition duration-300 space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black group-hover:scale-105 transition">
                  <ChefHat className="w-6 h-6 text-rose-600" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base md:text-lg">{curT.card2Title}</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">{curT.card2Badge}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {curT.card2Desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="text-slate-400 text-[11px]">আর্থিক লাভ:</span>
                  <span className="text-emerald-600 font-extrabold">{curT.card2Profit}</span>
                </div>
              </div>

              {/* Card 3: Contactless Self-Ordering */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-orange-200 transition duration-300 space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:scale-105 transition">
                  <QrCode className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base md:text-lg">{curT.card3Title}</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">{curT.card3Badge}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {curT.card3Desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="text-slate-400 text-[11px]">আর্থিক লাভ:</span>
                  <span className="text-emerald-600 font-extrabold">{curT.card3Profit}</span>
                </div>
              </div>

              {/* Card 4: Real-time Profit & Sales Telemetry */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-orange-200 transition duration-300 space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-105 transition">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base md:text-lg">{curT.card4Title}</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">{curT.card4Badge}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {curT.card4Desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="text-slate-400 text-[11px]">আর্থিক লাভ:</span>
                  <span className="text-emerald-600 font-extrabold">{curT.card4Profit}</span>
                </div>
              </div>
            </div>

            {/* Bottom Highlight Banner */}
            <div className="mt-8 p-4 bg-orange-50/60 rounded-2xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative z-10">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-slate-900 block">{curT.bannerTitle}</span>
                <span className="text-[11px] text-slate-500 font-semibold">{curT.bannerSub}</span>
              </div>
              <a
                href="#book-demo"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs transition shrink-0"
              >
                {curT.bannerBtn}
              </a>
            </div>
          </div>
        </section>

        {/* PRICING SECTION - 1 MONTH FREE TRIAL */}
        <section id="pricing" className="scroll-mt-24 max-w-4xl mx-auto w-full relative py-8">
          <div className="bg-gradient-to-b from-orange-500/[0.04] via-white to-white border-2 border-orange-500/30 rounded-3xl p-8 md:p-12 shadow-xl shadow-orange-500/5 text-center relative overflow-hidden space-y-8">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-bl-2xl">
              1 Month Full Access Free
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200">
                {curT.pricingBadge}
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                {curT.pricingTitle}
              </h2>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                {curT.pricingSub}
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-2xl max-w-lg mx-auto shadow-sm space-y-2">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black text-slate-900 tracking-tight">₹0</span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{curT.pricingPeriod}</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-600">
                {curT.pricingGuarantee}
              </p>
            </div>

            {/* Included Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-2xl mx-auto text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f1}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f2}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f3}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f4}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f5}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{curT.f6}</span>
              </div>
            </div>

            <div className="pt-2 max-w-md mx-auto">
              <a
                href="https://app.restuvexo.shop/auth/signup"
                className="w-full inline-flex py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-xs items-center justify-center gap-2 cursor-pointer"
              >
                <span>{curT.pricingCta}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="text-[10px] text-slate-400 font-semibold block mt-2">
                {curT.pricingInstant}
              </span>
            </div>
          </div>
        </section>

        {/* BOOK A DEMO DATABASE-CONNECTED FORM SECTION */}
        <section id="book-demo" className="scroll-mt-24 max-w-4xl mx-auto w-full pt-10">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-12">
            
            {/* Form Info Panel (5 cols) */}
            <div className="md:col-span-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Schedule a Free Demo</h3>
                  <p className="text-orange-100 text-xs mt-1 leading-relaxed">
                    Get in touch with our team to clarify your queries. Let us show you how RESTUVEXO will grow your restaurant.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs font-semibold text-orange-50">
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-orange-200" />
                    <span>Live product walkthrough</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-orange-200" />
                    <span>Free schema setup assist</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-orange-200" />
                    <span>On-call technical consulting</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/20 pt-6 mt-8 space-y-4">
                <div className="flex items-center gap-3 text-xs">
                  <Award className="w-5 h-5 text-orange-200" />
                  <div>
                    <span className="font-extrabold block">No. 1 Restaurant Partner</span>
                    <span className="text-[10px] text-orange-100">Top-rated POS interface of 2026</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-orange-200" />
                  <div>
                    <span className="font-extrabold block">Secure & Encrypted</span>
                    <span className="text-[10px] text-orange-100">PCI Compliant data storage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Input Panel (7 cols) */}
            <div className="md:col-span-7 p-8">
              {formStatus.success ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 animate-fade-in-up">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-sm border border-emerald-100">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="text-xl font-black text-slate-800">Demo Scheduled Successfully!</h4>
                  <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
                    Thank you! We have successfully stored your free demo request in our database. One of our POS experts will call you shortly to configure your terminal setup.
                  </p>
                  <button 
                    onClick={() => setFormStatus({ loading: false, success: false, error: null })}
                    className="mt-4 px-6 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition"
                  >
                    Register Another Demo
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <h4 className="font-black text-slate-800 text-base">Request Demo Consultation</h4>
                  
                  {formStatus.error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-[11px] font-bold leading-normal flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{formStatus.error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your Name</label>
                      <input 
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your full name"
                        className="w-full text-xs premium-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Restaurant Name</label>
                      <input 
                        type="text"
                        name="restaurantName"
                        value={formData.restaurantName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your restaurant name"
                        className="w-full text-xs premium-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your email address"
                        className="w-full text-xs premium-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone Number</label>
                      <div className="w-full relative phone-input-container">
                        <PhoneInput
                          defaultCountry="in"
                          value={formData.phone}
                          onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                          placeholder="Enter phone number"
                          className="w-full text-xs"
                          inputClassName="!w-full !text-xs !bg-slate-50 hover:!bg-slate-100/80 !border-slate-200 focus:!border-slate-900 focus:!bg-white !rounded-r-2xl !h-[50px] !px-4 !font-bold !text-slate-900 !transition-all !shadow-sm"
                          countrySelectorStyleProps={{
                            buttonClassName: "!bg-slate-50 hover:!bg-slate-100/80 !border-slate-200 !rounded-l-2xl !h-[50px] !px-3 !transition-all !shadow-sm !border-r-0",
                            dropdownStyleProps: {
                              style: {
                                borderRadius: '16px',
                                padding: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                marginTop: '8px',
                                fontFamily: 'inherit',
                                zIndex: 50
                              },
                              listItemClassName: "hover:!bg-slate-100 !rounded-xl !px-3 !py-2 !transition-colors !duration-200"
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Additional Message (Optional)</label>
                    <textarea 
                      name="message"
                      rows={3}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your kitchen, thermal printer setup or ordering needs..."
                      className="w-full text-xs premium-input resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={formStatus.loading}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all duration-200 text-xs uppercase tracking-wide mt-2 cursor-pointer"
                  >
                    {formStatus.loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting details...
                      </>
                    ) : (
                      "Submit Free Demo Request"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>


        {/* ACCORDION FAQ SECTION */}
        <section id="faq" className="max-w-3xl mx-auto space-y-6 scroll-mt-24">
          <div className="text-center space-y-2">
            <span className="text-xs font-black tracking-widest text-orange-600 uppercase">Frequently Asked Questions</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Got Questions? We Have Answers</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-extrabold text-sm md:text-base text-slate-800 hover:bg-slate-50/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-orange-500 font-extrabold text-lg transform transition-transform duration-300 ${faqOpen[idx] ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                
                {faqOpen[idx] && (
                  <div className="px-6 pb-5 pt-1 text-slate-500 text-xs md:text-sm leading-relaxed border-t border-slate-50 animate-fade-in-up">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-100 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-md overflow-hidden flex items-center justify-center border-2 border-orange-500">
                <img src="/restuvexo_logo.png" alt="RESTUVEXO Logo" className="w-full h-full object-cover p-1" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                RESTUVEXO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              The ultimate high-speed decoupled AI-powered operating system and point-of-sale tool built for modern restaurant ecosystems.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-[11px] font-bold text-slate-500">
              <li><a href="#features" className="hover:text-orange-500">POS Checkout</a></li>
              <li><a href="#marketplace" className="hover:text-orange-500">KDS Cooking Monitor</a></li>
              <li><a href="#marketplace" className="hover:text-orange-500">QR Code Menus</a></li>
              <li><a href="#calculator" className="hover:text-orange-500">Profit Analytics</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Quick links</h4>
            <ul className="space-y-2 text-[11px] font-bold text-slate-500">
              <li><a href="https://app.restuvexo.shop/auth/login" className="hover:text-orange-500">{curT.staffTerminal}</a></li>
              <li><a href="https://app.restuvexo.shop/auth/signup" className="hover:text-orange-500">Register Shop</a></li>
              <li><a href="#book-demo" className="hover:text-orange-500">Book Free Demo</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Compliance & Trust</h4>
            <div className="space-y-2.5 text-[10px] text-slate-400 font-semibold leading-normal">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> ISO 27001 Certified
              </div>
              <div className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" /> 24/7 Priority Support
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500" /> GDPR & Privacy Compliant
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-slate-50 text-center text-slate-400 text-[10px] font-semibold space-y-1">
          <div>
            © 2026 RESTUVEXO. All rights reserved. The Modern Cloud-Native Restaurant Operating System.
          </div>
        </div>
      </footer>

    </div>
  );
}
