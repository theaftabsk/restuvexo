const prisma = require('../db');

// Helper to fetch read-only sanitized telemetry from DB for AI context
async function getRestaurantTelemetry(restaurantId) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  try {
    const [
      paidOrdersToday,
      activeOrdersCount,
      completedOrdersCount,
      tables,
      outOfStockCount,
      lowStockCount,
      categoriesCount,
      menuItemsCount
    ] = await Promise.all([
      // Paid orders for revenue
      prisma.order.findMany({
        where: {
          restaurantId,
          paymentStatus: 'paid',
          createdAt: { gte: startOfToday, lte: endOfToday }
        },
        select: {
          totalAmount: true,
          totalProfit: true
        }
      }),
      // Active orders
      prisma.order.count({
        where: {
          restaurantId,
          status: { in: ['pending', 'cooking', 'ready'] }
        }
      }),
      // Completed orders today
      prisma.order.count({
        where: {
          restaurantId,
          status: 'completed',
          createdAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      // Tables
      prisma.table.findMany({
        where: { restaurantId },
        select: { id: true, tableNo: true, status: true }
      }),
      // Out of stock
      prisma.menuItem.count({
        where: {
          restaurantId,
          trackStock: true,
          stockQty: { lte: 0 }
        }
      }),
      // Low stock
      prisma.menuItem.count({
        where: {
          restaurantId,
          trackStock: true,
          stockQty: { gt: 0, lte: 10 }
        }
      }),
      // Categories
      prisma.category.count({ where: { restaurantId } }),
      // Menu Items
      prisma.menuItem.count({ where: { restaurantId } })
    ]);

    let todayRevenue = 0;
    let todayProfit = 0;
    paidOrdersToday.forEach(order => {
      todayRevenue += parseFloat(order.totalAmount) || 0;
      todayProfit += parseFloat(order.totalProfit) || 0;
    });

    const busyTables = tables.filter(t => t.status === 'occupied' || t.status === 'reserved');
    const freeTables = tables.filter(t => t.status === 'free');

    return {
      todayRevenue: todayRevenue.toFixed(2),
      todayProfit: todayProfit.toFixed(2),
      activeOrdersCount,
      completedOrdersCount,
      outOfStockCount,
      lowStockCount,
      categoriesCount,
      menuItemsCount,
      tablesCount: tables.length,
      busyTablesCount: busyTables.length,
      freeTablesCount: freeTables.length,
      tablesList: tables.map(t => ({ id: t.id, tableNo: t.tableNo, status: t.status }))
    };
  } catch (error) {
    console.error('[Telemetry Fetch Error]', error);
    return null;
  }
}

// Local rules-based responder fallback (100% free, offline, no API key required)
function getLocalFallbackResponse(message, telemetry, userName) {
  const query = message.toLowerCase();
  let responseText = "";
  let action = null;

  // Language check: Bangla or English
  const isBangla = /[\u0980-\u09FF]/.test(query);

  if (query.includes("sales") || query.includes("revenue") || query.includes("profit") || query.includes("আজকের বিক্রি") || query.includes("আজকের সেল") || query.includes("আজকের ইনকাম") || query.includes("আজকের প্রফিট")) {
    if (isBangla) {
      responseText = `আজকের বিক্রির হিসাব (Aggregated Telemetry):\n\n- **মোট বিক্রি:** ₹${telemetry?.todayRevenue || "0.00"}\n- **মোট লাভ:** ₹${telemetry?.todayProfit || "0.00"}\n- **চলতি অর্ডার (Active):** ${telemetry?.activeOrdersCount || 0} টি\n- **সম্পন্ন অর্ডার:** ${telemetry?.completedOrdersCount || 0} টি\n\nবিস্তারিত চার্ট এবং রিপোর্ট দেখতে আমি আপনাকে রিপোর্ট কনসোলে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `Here are today's sales statistics (Aggregated Telemetry):\n\n- **Total Revenue:** ₹${telemetry?.todayRevenue || "0.00"}\n- **Total Profit:** ₹${telemetry?.todayProfit || "0.00"}\n- **Active Orders:** ${telemetry?.activeOrdersCount || 0}\n- **Completed Orders:** ${telemetry?.completedOrdersCount || 0}\n\nI am redirecting you to the Analytics & Reports panel for details.`;
    }
    action = { type: "redirect", path: "/dashboard/reports" };
  } 
  else if (query.includes("pos") || query.includes("billing") || query.includes("অর্ডার কিভাবে add") || query.includes("বিলিং") || query.includes("অর্ডার যোগ") || query.includes("নতুন অর্ডার")) {
    // Check if table specific is requested, e.g. "table 4" or "টেবিল ৪"
    let tableNum = null;
    const match = query.match(/(?:table|টেবিল)\s*(\d+)/i);
    if (match && match[1]) {
      tableNum = match[1];
    }
    
    // Search table ID from tableList
    let matchedTableId = null;
    if (tableNum && telemetry?.tablesList) {
      const found = telemetry.tablesList.find(t => t.tableNo.toString() === tableNum);
      if (found) matchedTableId = found.id;
    }

    if (isBangla) {
      if (tableNum) {
        responseText = `টেবিল ${tableNum} এর জন্য নতুন অর্ডার তৈরি করতে আমি আপনাকে POS Billing স্ক্রিনে নিয়ে যাচ্ছি।`;
        action = { type: "redirect", path: `/dashboard/pos?table=${matchedTableId || tableNum}` };
      } else {
        responseText = `নতুন অর্ডার অ্যাড করার জন্য আপনাকে **POS Billing** প্যানেল ব্যবহার করতে হবে। আমি আপনাকে পস টার্মিনালে নিয়ে যাচ্ছি। সেখানে আপনি খাবার সিলেক্ট করে Dine-In/Takeaway অর্ডার করতে পারবেন।`;
        action = { type: "redirect", path: "/dashboard/pos" };
      }
    } else {
      if (tableNum) {
        responseText = `I am redirecting you to the POS Billing screen with Table ${tableNum} selected to add an order.`;
        action = { type: "redirect", path: `/dashboard/pos?table=${matchedTableId || tableNum}` };
      } else {
        responseText = `To create an order, please use the **POS Billing** terminal. I am redirecting you there now. You can select items, choose dining options, and checkout.`;
        action = { type: "redirect", path: "/dashboard/pos" };
      }
    }
  } 
  else if (query.includes("kitchen") || query.includes("kds") || query.includes("রান্নাঘর") || query.includes("কিচেন প্যানেল")) {
    if (isBangla) {
      responseText = `রান্নাঘরের সমস্ত লাইভ অর্ডারের আপডেট এবং রান্নার অগ্রগতি পর্যবেক্ষণ করতে **Kitchen Display System (KDS)** ব্যবহার করুন। আমি আপনাকে কিচেন প্যানেলে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `To monitor and update active kitchen tickets, please open the **Kitchen Display System (KDS)**. Redirecting you there now.`;
    }
    action = { type: "redirect", path: "/dashboard/kds" };
  }
  else if (query.includes("printer") || query.includes("print") || query.includes("প্রিন্টার") || query.includes("প্রিন্ট হচ্ছে না")) {
    // If user wants to print a specific order, e.g., "print order 15" or "অর্ডার ১৫ প্রিন্ট করো"
    const orderMatch = query.match(/(?:order|অর্ডার|আইডি|id)\s*#?(\d+)/i);
    if (orderMatch && orderMatch[1]) {
      const orderId = orderMatch[1];
      if (isBangla) {
        responseText = `অর্ডার #${orderId} এর রসিদ প্রিন্ট করার আদেশ পাঠানো হচ্ছে...`;
      } else {
        responseText = `Sending print command for Order #${orderId}...`;
      }
      action = { type: "print", orderId: parseInt(orderId), path: `/dashboard/orders?print=${orderId}` };
    } else {
      if (isBangla) {
        responseText = `প্রিন্টার কানেক্ট না হলে বা প্রিন্ট না হলে এই ধাপগুলো চেক করুন:\n\n1. **নেটওয়ার্ক চেক:** নিশ্চিত করুন প্রিন্টার এবং রেস্টুরেন্ট সফটওয়্যার একই ওয়াই-ফাই (Wi-Fi) নেটওয়ার্কে কানেক্টেড আছে।\n2. **আইপি অ্যাড্রেস:** **Settings Console** এ গিয়ে প্রিন্টারের সঠিক IP Address এন্ট্রি করা আছে কি না যাচাই করুন।\n3. **কানেকশন ও ক্যাবল:** থার্মাল প্রিন্টারের পাওয়ার কেবল এবং USB/LAN পোর্ট চেক করুন।\n4. কাগজ শেষ হয়ে গিয়েছে কি না দেখুন।\n\nপ্রিন্টার সেটিংস যাচাই করতে আমি আপনাকে সেটিংস কনসোলে নিয়ে যাচ্ছি।`;
      } else {
        responseText = `If your thermal printer is not connecting or printing, please verify the following:\n\n1. **Same Network:** Ensure both the printer and the device running this software are connected to the exact same Wi-Fi router.\n2. **IP Configuration:** Go to the **Settings Console** and double-check that the printer's correct Local IP Address is saved.\n3. **Cables & Power:** Ensure the thermal printer is powered ON, paper is loaded correctly, and USB/LAN cables are securely connected.\n\nRedirecting you to the Settings Console to audit printer parameters.`;
      }
      action = { type: "redirect", path: "/dashboard/settings" };
    }
  } 
  else if (query.includes("qr") || query.includes("কিউআর") || query.includes("self order")) {
    if (isBangla) {
      responseText = `কিউআর সেলফ-অর্ডারিং (QR Ordering) যেভাবে কাজ করে:\n\n1. **টেবিল সেটিংস:** ওনার প্রথমে প্রতিটি টেবিলের কিউআর কোড ডাউনলোড করে টেবিলে সাঁটিয়ে দেন।\n2. **স্ক্যান ও অর্ডার:** কাস্টমার তাদের মোবাইল ক্যামেরা দিয়ে টেবিল কিউআর স্ক্যান করে ডিজিটাল মেনু দেখে অর্ডার প্লেস করে।\n3. **অনুমোদন:** কাস্টমারের অর্ডার প্লেস করার পর সেটি সরাসরি **QR Code Approvals Hub** এ আসে। ওনার অনুমোদন (Approve) করলে অর্ডারটি কিচেনে চলে যায়।\n\nআপনাকে QR Approvals প্যানেলে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `Here is how QR Menu Ordering works:\n\n1. **Table QR Codes:** Generate and download table QR codes from **Table Settings** and print them for your tables.\n2. **Scan to Order:** Customers scan the QR code with their mobile phone to view your digital menu and submit self-orders.\n3. **Approval:** Placed orders appear in the **QR Code Approvals Hub** in real-time. Once approved, they are sent to the Kitchen queue.\n\nRedirecting you to the QR Code Approvals Hub now.`;
    }
    action = { type: "redirect", path: "/dashboard/qr" };
  }
  else if (query.includes("customer") || query.includes("কাস্টমার") || query.includes("গ্রাহক")) {
    if (isBangla) {
      responseText = `কাস্টমার যোগ করার জন্য আলাদা কোনো ডাটাবেস উইন্ডো প্রয়োজন নেই। অর্ডারের সময় কাস্টমারকে ট্র্যাক করতে আপনি **POS Billing** প্যানেলে যান এবং বিল তৈরি করার সময় কাস্টমারের নাম ও মোবাইল নম্বর সরাসরি কাস্টমার প্যানেলে অ্যাড করে দিতে পারেন।`;
    } else {
      responseText = `To add or manage customers, simply use the POS terminal. When creating a bill, you can type the customer's name and mobile number directly into the Checkout panel. Redirecting you to POS Billing.`;
    }
    action = { type: "redirect", path: "/dashboard/pos" };
  }
  else if (query.includes("table") || query.includes("টেবিল") || query.includes("খালি")) {
    if (isBangla) {
      responseText = `বর্তমানে রেস্টুরেন্টে মোট টেবিল আছে ${telemetry?.tablesCount || 0} টি। এর মধ্যে **ব্যস্ত/occupied** আছে ${telemetry?.busyTablesCount || 0} টি এবং **ফ্রী** আছে ${telemetry?.freeTablesCount || 0} টি।\n\nটেবিলের তালিকা ও লাইভ সেশন দেখতে আমি আপনাকে টেবিল সেটিংস পেজে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `You currently have ${telemetry?.tablesCount || 0} tables in total. **Occupied/Reserved:** ${telemetry?.busyTablesCount || 0}, **Free:** ${telemetry?.freeTablesCount || 0}.\n\nRedirecting you to the Table Settings page to inspect active visitor sessions.`;
    }
    action = { type: "redirect", path: "/dashboard/tables" };
  }
  else if (query.includes("expense") || query.includes("খরচ") || query.includes("হিসাব")) {
    if (isBangla) {
      responseText = `রেস্টুরেন্টের দৈনন্দিন খরচ (Expense) ট্র্যাক করতে আপনি **Expenses Tracker** ব্যবহার করতে পারেন। এখানে ক্যাটাগরি অনুযায়ী খরচের বিবরণ এন্ট্রি করা যায়। আমি আপনাকে এক্সপেন্সেস ট্র্যাকার পেজে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `To record or audit restaurant operational expenditures, please use the **Expenses Tracker**. Redirecting you there now.`;
    }
    action = { type: "redirect", path: "/dashboard/expenses" };
  }
  else if (query.includes("inventory") || query.includes("ইনভেন্টরি") || query.includes("কাঁচামাল") || query.includes("স্টক")) {
    if (isBangla) {
      responseText = `কাঁচামাল এবং রেসিপির স্টক পরিচালনা করতে আপনি **Inventory Stock** ব্যবহার করতে পারেন। বর্তমানে স্টক ফুরিয়ে গেছে (Out of Stock) এমন আইটেম সংখ্যা: ${telemetry?.outOfStockCount || 0} টি এবং কম স্টক (Low Stock) আইটেম আছে: ${telemetry?.lowStockCount || 0} টি।\n\nআমি আপনাকে ইনভেন্টরি ম্যানেজারে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `To manage raw materials, recipe inventory, and stock warnings, please use the **Inventory Stock** screen. Out of Stock items: ${telemetry?.outOfStockCount || 0}, Low Stock items: ${telemetry?.lowStockCount || 0}.\n\nRedirecting you to the Inventory console now.`;
    }
    action = { type: "redirect", path: "/dashboard/inventory" };
  }
  else if (query.includes("staff") || query.includes("স্টাফ") || query.includes("কর্মী") || query.includes("পিন")) {
    if (isBangla) {
      responseText = `রেস্টুরেন্টের কর্মী বা স্টাফদের পিন এবং POS/KDS এ পারমিশন কনফিগার করতে আপনি **Staff & Security** কনসোল ব্যবহার করবেন। নিরাপত্তা স্বার্থে কর্মী সেটিংস পরিবর্তন করতে আমি আপনাকে স্টাফ টার্মিনালে নিয়ে যাচ্ছি।`;
    } else {
      responseText = `To configure staff credentials, roles, secure PIN codes, and granular permissions, please open the **Staff & Security** screen. Redirecting you there.`;
    }
    action = { type: "redirect", path: "/dashboard/staff" };
  }
  else if (query.includes("help") || query.includes("সাহায্য") || query.includes("hi") || query.includes("hello") || query.includes("কেমন আছ") || query.includes("vexoai")) {
    if (isBangla) {
      responseText = `হ্যালো ${userName || "ইউজার"}, আমি **VexoAI**! আপনার রেস্টুরেন্ট সফটওয়্যারের পার্সোনাল অ্যাসিস্ট্যান্ট। আমি আপনাকে অর্ডারের তথ্য দিতে পারি, বিক্রির হিসাব দেখাতে পারি, এবং সেটিংস বা মেনু নেভিগেট করতে সাহায্য করতে পারি।\n\nআপনি আমাকে জিজ্ঞেস করতে পারেন:\n- "আজকের সেলস কত?"\n- "কয়টি টেবিল ফ্রী আছে?"\n- "কিচেন প্যানেল কোথায়?"\n- "অর্ডার কিভাবে অ্যাড করব?"\n- "প্রিন্টার কানেক্ট হচ্ছে না কেন?"`;
    } else {
      responseText = `Hello ${userName || "User"}! I am **VexoAI**, your dedicated restaurant virtual assistant. I know everything about your Restaurant Operating System.\n\nYou can ask me:\n- "What are today's sales?"\n- "How many tables are occupied?"\n- "Where is the kitchen panel?"\n- "How to add orders?"\n- "Why is the printer not working?"`;
    }
  }
  else {
    if (isBangla) {
      responseText = `আমি দুঃখিত, আমি আপনার প্রশ্নটি ঠিক বুঝতে পারিনি। আপনি কি আমাকে সেলস, কিচেন প্যানেল, অর্ডার অ্যাড করা বা কিউআর কোড নিয়ে কিছু জিজ্ঞেস করতে চান? আমি আপনাকে রেস্টুরেন্টের যেকোনো স্ক্রিনে নিয়ে যেতে পারি।`;
    } else {
      responseText = `I couldn't quite catch that. Would you like to check today's sales, KDS kitchen panel, POS billing, or configure settings? Just tell me what you'd like to do, and I'll guide you there.`;
    }
  }

  // Ensure default API-key missing alert is appended gracefully in small print if not in local settings
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    responseText += isBangla 
      ? `\n\n*(নোট: সম্পূর্ণ এআই অভিজ্ঞতার জন্য অনুগ্রহ করে ব্যাকএন্ড .env ফাইলে \`GROQ_API_KEY\` বা \`GEMINI_API_KEY\` যোগ করুন। বর্তমানে VexoAI লোকাল ব্যাকআপ রেসপন্ডার মোডে কাজ করছে।)*`
      : `\n\n*(Note: For the full AI experience, please add \`GROQ_API_KEY\` or \`GEMINI_API_KEY\` to your backend .env file. Currently, VexoAI is running on Local Backup Responder.)*`;
  }

  return { text: responseText, action };
}

const settingsService = require('../settingsService');

// In-memory usage map to track messages count per user
// Key: userId
// Value: { date: YYYY-MM-DD, localCount: number, apiCount: number }
const userUsageMap = new Map();

function getUserUsage(userId) {
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  if (!userUsageMap.has(userId)) {
    userUsageMap.set(userId, { date: today, localCount: 0, apiCount: 0 });
  }

  const usage = userUsageMap.get(userId);
  if (usage.date !== today) {
    // New day, reset counts
    usage.date = today;
    usage.localCount = 0;
    usage.apiCount = 0;
  }

  return usage;
}

function isNormalQuestion(message) {
  const query = message.toLowerCase();
  const keywords = [
    "sales", "revenue", "profit", "আজকের বিক্রি", "আজকের সেল", "আজকের ইনকাম", "আজকের প্রফিট",
    "pos", "billing", "অর্ডার কিভাবে add", "বিলিং", "অর্ডার যোগ", "নতুন অর্ডার",
    "kitchen", "kds", "রান্নাঘর", "কিচেন প্যানেল",
    "printer", "print", "প্রিন্টার", "প্রিন্ট হচ্ছে না",
    "qr", "কিউআর", "self order",
    "customer", "কাস্টমার", "গ্রাহক",
    "table", "টেবিল", "খালি",
    "expense", "খরচ", "হিসাব",
    "inventory", "ইনভেন্টরি", "কাঁচামাল", "স্টক",
    "staff", "স্টাফ", "কর্মী", "পিন",
    "help", "সাহায্য", "hi", "hello", "কেমন আছ", "vexoai"
  ];
  return keywords.some(keyword => query.includes(keyword));
}

// Main API Handler
exports.handleChat = async (req, res) => {
  const { message, history } = req.body;
  const restaurantId = req.user.restaurantId;
  const userName = req.user.name || "Owner";
  const userRole = req.user.role || "owner";
  const userId = req.user.id || 0;

  if (!message) {
    return res.status(400).json({ error: "Message content is required." });
  }

  try {
    // Check settings for VexoAI status
    const settings = await settingsService.getRestaurantSettings(restaurantId);
    if (settings.vexoAiEnabled === false) {
      return res.json({
        text: "VexoAI Chatbot has been disabled by the restaurant administrator.",
        action: null
      });
    }

    const isNormal = isNormalQuestion(message);
    const usage = getUserUsage(userId);

    if (isNormal) {
      const normalLimit = settings.vexoAiNormalLimit !== undefined ? settings.vexoAiNormalLimit : 15;
      if (usage.localCount >= normalLimit) {
        return res.json({
          text: `You have reached your daily limit of ${normalLimit} normal queries for VexoAI. Please contact your restaurant administrator to increase this limit.`,
          action: null
        });
      }
      usage.localCount += 1;
    } else {
      const apiLimit = settings.vexoAiApiLimit !== undefined ? settings.vexoAiApiLimit : 5;
      if (usage.apiCount >= apiLimit) {
        return res.json({
          text: `You have reached your daily limit of ${apiLimit} advanced AI queries for VexoAI. Please contact your restaurant administrator to increase this limit.`,
          action: null
        });
      }
      usage.apiCount += 1;
    }

    // 1. Fetch real-time aggregate statistics securely via middleware functions
    const telemetry = await getRestaurantTelemetry(restaurantId);

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // If no keys configured, run local rules responder immediately
    if (!groqKey && !geminiKey) {
      const fallback = getLocalFallbackResponse(message, telemetry, userName);
      return res.json(fallback);
    }

  // 2. Build system context system instruction
  const systemInstruction = `You are "VexoAI", an advanced intelligent Restaurant Virtual Assistant.
Help users (staff, waiters, owners) use this Restaurant Operating System (ROS) software.
Speak in the language the user speaks (Bangla, Hindi, or English). Fluent Bangla/Banglish is preferred for Bengali queries.
Be concise, clear, and helpful. Always provide direct instructions.

Here is the current restaurant operational status telemetry (Read-only aggregate metrics, fetched securely via middleware):
- Today's Revenue: ₹${telemetry?.todayRevenue || "0.00"}
- Today's Profit: ₹${telemetry?.todayProfit || "0.00"}
- Active Orders (Cooking/Pending/Ready): ${telemetry?.activeOrdersCount || 0}
- Completed Orders Today: ${telemetry?.completedOrdersCount || 0}
- Out of Stock Food Items: ${telemetry?.outOfStockCount || 0}
- Low Stock Food Items (<= 10 left): ${telemetry?.lowStockCount || 0}
- Total Food Items in Menu: ${telemetry?.menuItemsCount || 0}
- Total Categories in Menu: ${telemetry?.categoriesCount || 0}
- Dining Tables Summary: Total: ${telemetry?.tablesCount || 0}, Occupied/Reserved: ${telemetry?.busyTablesCount || 0}, Free: ${telemetry?.freeTablesCount || 0}
- Detailed Tables List (with IDs & Statuses): ${JSON.stringify(telemetry?.tablesList || [])}

Current User Metadata:
- Name: ${userName}
- System Authorization Role: ${userRole}

Software Navigation Pages & Redirection Paths:
- "/dashboard" -> Dashboard Overview (Telemetry, revenue counters, popular dishes)
- "/dashboard/pos" -> POS Billing Terminal (Add walk-in/dine-in orders, manage bills, checkout)
- "/dashboard/pos?table=<tableId>" -> POS Billing Terminal with a specific table preselected
- "/dashboard/orders" -> Orders & Invoice Manager (Audit dine-in orders, search invoices, settle unpaid bills, reprint receipts)
- "/dashboard/orders?search=<query>" -> Orders page showing search results for a specific order or table
- "/dashboard/qr" -> QR Code Approvals Hub (Audit and approve incoming QR self-orders before sending to kitchen)
- "/dashboard/kds" -> Kitchen Display System (Monitor active tickets, update chef preparation cooking status)
- "/dashboard/reports" -> Analytics & Reports Console (Profit/loss ledgers, telemetry)
- "/dashboard/menu" -> Menu Catalog (Manage dishes, categories, pricing)
- "/dashboard/menu/stock" -> Menu Stock Control (Track stock, adjust quantities)
- "/dashboard/tables" -> Table Settings (Floor setup, download/print QR codes for dining tables)
- "/dashboard/inventory" -> Recipe & Raw Inventory (Manage raw ingredients, stock levels, low-stock warnings)
- "/dashboard/staff" -> Staff & Security Console (Add staff accounts, PIN configurations, roles, permissions)
- "/dashboard/settings" -> Settings Console (Taxes, security keys, operational preferences, theme colors)

Troubleshooting Printer Connection:
- Network/LAN/Wi-Fi thermal printers. If not printing:
  1. Confirm printer is ON and has paper loaded.
  2. Confirm both printer and dashboard device are on the exact same Wi-Fi router.
  3. Verify the printer's local IP address inside "/dashboard/settings".

Customer Management:
- To add a customer, go to the POS Billing screen ("/dashboard/pos"), place items in cart, and write customer name/phone in the checkout fields during order placement.

YOU MUST respond in a clean JSON format containing:
1. "text": Your conversational reply in user's language (can contain Markdown lists/bolding).
2. "action": Optional object containing action commands:
   - "type": "redirect" or "print"
   - "path": The redirection path (e.g. "/dashboard/pos?table=4" or "/dashboard/kds", etc.)
   - "orderId": If printing or searching a specific order, supply the integer order ID.

Example JSON output format:
{
  "text": "এখানে কন্টাক্ট এবং প্রিন্টার সেটিং রয়েছে। আমি আপনাকে সেটিংস পেজে নিয়ে যাচ্ছি।",
  "action": {
    "type": "redirect",
    "path": "/dashboard/settings"
  }
}

Or:
{
  "text": "টেবিল ৫ এখন ব্যস্ত আছে। নতুন অর্ডার করার জন্য আপনাকে পিওএস স্ক্রিনে রিডাইরেক্ট করছি টেবিল ৫ সিলেক্ট করে।",
  "action": {
    "type": "redirect",
    "path": "/dashboard/pos?table=12"
  }
}

CRITICAL: Do NOT output anything outside the JSON object block. Your entire output MUST be a valid JSON parseable structure.`;

  // 3. Try to call Groq API (Primary), fallback to Gemini API (Secondary)
  try {
    if (groqKey) {
      console.log('🤖 [VexoAI] Calling Groq API...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-specdec',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            ...(history || []).slice(-10), // Send last 10 messages for context
            { role: 'user', content: message }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        const rawContent = result.choices[0].message.content.trim();
        const parsed = JSON.parse(rawContent);
        return res.json(parsed);
      } else {
        const errText = await response.text();
        console.error('Groq API Error:', errText);
        throw new Error('Groq API failed');
      }
    } else {
      throw new Error('Groq key not configured, falling back to Gemini');
    }
  } catch (groqError) {
    console.warn('Groq failed or key missing. Falling back to Gemini...', groqError.message);
    
    try {
      if (geminiKey) {
        console.log('🤖 [VexoAI] Calling Gemini API...');
        // Format chat context for Gemini
        const chatHistoryText = (history || []).slice(-10).map(h => `${h.role === 'user' ? 'User' : 'VexoAI'}: ${h.content}`).join('\n');
        const userPrompt = `${chatHistoryText}\nUser: ${message}\n\nRemember, your response MUST be a valid JSON matching the schema described. Do not include markdown code block quotes like \`\`\`json.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }] }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates[0].content.parts[0].text.trim();
          const parsed = JSON.parse(rawText);
          return res.json(parsed);
        } else {
          const errText = await response.text();
          console.error('Gemini API Error:', errText);
          throw new Error('Gemini API failed');
        }
      } else {
        throw new Error('Gemini key not configured');
      }
    } catch (geminiError) {
      console.error('Gemini also failed or key missing. Using local fallback responder.', geminiError.message);
      
      // Fallback to local rules-based engine
      const fallback = getLocalFallbackResponse(message, telemetry, userName);
      return res.json(fallback);
    }
  }
  } catch (error) {
    console.error('Chatbot Controller Error:', error);
    res.status(500).json({ error: "Internal chatbot error." });
  }
};
