"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
let prismaInstance;
async function getRestaurantTelemetry(restaurantId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    try {
        const [paidOrdersToday, activeOrdersCount, completedOrdersCount, tables, outOfStockCount, lowStockCount, categoriesCount, menuItemsCount] = await Promise.all([
            prismaInstance.order.findMany({
                where: { restaurantId, paymentStatus: 'paid', createdAt: { gte: startOfToday, lte: endOfToday } },
                select: { totalAmount: true, totalProfit: true }
            }),
            prismaInstance.order.count({ where: { restaurantId, status: { in: ['pending', 'cooking', 'ready'] } } }),
            prismaInstance.order.count({ where: { restaurantId, status: 'completed', createdAt: { gte: startOfToday, lte: endOfToday } } }),
            prismaInstance.table.findMany({ where: { restaurantId }, select: { id: true, tableNo: true, status: true } }),
            prismaInstance.menuItem.count({ where: { restaurantId, trackStock: true, stockQty: { lte: 0 } } }),
            prismaInstance.menuItem.count({ where: { restaurantId, trackStock: true, stockQty: { gt: 0, lte: 10 } } }),
            prismaInstance.category.count({ where: { restaurantId } }),
            prismaInstance.menuItem.count({ where: { restaurantId } })
        ]);
        let todayRevenue = 0;
        let todayProfit = 0;
        paidOrdersToday.forEach(order => {
            todayRevenue += parseFloat(String(order.totalAmount)) || 0;
            todayProfit += parseFloat(String(order.totalProfit)) || 0;
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
    }
    catch (error) {
        console.error(error);
        return null;
    }
}
const isNormalQuestion = (message) => {
    const lowercase = message.toLowerCase();
    const patterns = [
        'hello', 'hi', 'hey', 'menu', 'food', 'dishes', 'what do you serve', 'recommend',
        'special', 'open', 'hours', 'time', 'location', 'where', 'contact', 'phone', 'help'
    ];
    return patterns.some(p => lowercase.includes(p));
};
const userUsageCache = {};
const getUserUsage = (userId) => {
    const today = new Date().toDateString();
    if (!userUsageCache[userId] || userUsageCache[userId].date !== today) {
        userUsageCache[userId] = { localCount: 0, apiCount: 0, date: today };
    }
    return userUsageCache[userId];
};
const getLocalFallbackResponse = (message, telemetry, userName) => {
    const lowercase = message.toLowerCase();
    if (lowercase.includes('hello') || lowercase.includes('hi') || lowercase.includes('hey')) {
        return {
            text: `Hello ${userName}! I am VexoAI, your restaurant virtual assistant. How can I help you manage your restaurant today? (Local Rules Mode)`,
            action: null
        };
    }
    if (lowercase.includes('menu') || lowercase.includes('food') || lowercase.includes('dishes')) {
        return {
            text: `Your restaurant currently has **${telemetry.menuItemsCount} items** in the menu across **${telemetry.categoriesCount} categories**. You can add or modify them in the Menu Manager.`,
            action: "/menu"
        };
    }
    if (lowercase.includes('status') || lowercase.includes('telemetry') || lowercase.includes('analytics') || lowercase.includes('today')) {
        return {
            text: `Here is your live restaurant telemetry for today:\n\n` +
                `- **Revenue**: ₹${telemetry.todayRevenue}\n` +
                `- **Profit**: ₹${telemetry.todayProfit}\n` +
                `- **Active orders (Cooking/Ready)**: ${telemetry.activeOrdersCount}\n` +
                `- **Completed orders today**: ${telemetry.completedOrdersCount}\n` +
                `- **Tables (Occupied / Total)**: ${telemetry.busyTablesCount} / ${telemetry.tablesCount}\n` +
                `- **Items out of stock**: ${telemetry.outOfStockCount}`,
            action: "/dashboard"
        };
    }
    if (lowercase.includes('table')) {
        return {
            text: `Your workspace has **${telemetry.tablesCount} tables** configured (${telemetry.busyTablesCount} occupied, ${telemetry.freeTablesCount} free). You can view the live floor layout in the Tables panel.`,
            action: "/tables"
        };
    }
    return {
        text: `I understood your query about "${message}", but to access advanced AI insights, please configure your OpenAI API Key or Groq API Key in Restaurant Settings.`,
        action: null
    };
};
let ChatbotService = class ChatbotService {
    constructor(prisma, settingsService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        prismaInstance = prisma;
    }
    async handleChat(req, res) {
        const { message, history } = req.body;
        const restaurantId = req.user.restaurantId;
        const userName = req.user.name || "Owner";
        const userRole = req.user.role || "owner";
        const userId = req.user.id || 0;
        if (!message) {
            return res.status(400).json({ error: "Message content is required." });
        }
        try {
            const settings = await this.settingsService.getRestaurantSettings(restaurantId);
            if (settings.vexoAiEnabled === false) {
                return res.json({
                    text: "VexoAI Chatbot has been disabled by the restaurant administrator.",
                    action: null
                });
            }
            const isNormal = isNormalQuestion(message);
            const usage = getUserUsage(userId);
            if (settings.subscriptionPlan === 'trial') {
                if (!isNormal) {
                    return res.json({
                        text: "Advanced AI queries are only available on the **Pro Plan**. Please upgrade to Pro to unlock the full power of VexoAI.",
                        action: null
                    });
                }
                const normalLimit = settings.vexoAiNormalLimit !== undefined ? settings.vexoAiNormalLimit : 15;
                if (usage.localCount >= normalLimit) {
                    return res.json({
                        text: `You have reached your daily limit of ${normalLimit} normal queries for VexoAI. Please contact your restaurant administrator to increase this limit.`,
                        action: null
                    });
                }
                usage.localCount += 1;
                const telemetry = await getRestaurantTelemetry(restaurantId);
                const fallback = getLocalFallbackResponse(message, telemetry, userName);
                return res.json(fallback);
            }
            if (isNormal) {
                const normalLimit = settings.vexoAiNormalLimit !== undefined ? settings.vexoAiNormalLimit : 15;
                if (usage.localCount >= normalLimit) {
                    return res.json({
                        text: `You have reached your daily limit of ${normalLimit} normal queries for VexoAI. Please contact your restaurant administrator to increase this limit.`,
                        action: null
                    });
                }
                usage.localCount += 1;
            }
            else {
                const apiLimit = settings.vexoAiApiLimit !== undefined ? settings.vexoAiApiLimit : 5;
                if (usage.apiCount >= apiLimit) {
                    return res.json({
                        text: `You have reached your daily limit of ${apiLimit} advanced AI queries for VexoAI. Please contact your restaurant administrator to increase this limit.`,
                        action: null
                    });
                }
                usage.apiCount += 1;
            }
            const telemetry = await getRestaurantTelemetry(restaurantId);
            const groqKey = process.env.GROQ_API_KEY;
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!groqKey && !geminiKey) {
                const fallback = getLocalFallbackResponse(message, telemetry, userName);
                return res.json(fallback);
            }
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
                                ...(history || []).slice(-10),
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
                    }
                    else {
                        const errText = await response.text();
                        console.error('Groq API Error:', errText);
                        throw new Error('Groq API failed');
                    }
                }
                else {
                    throw new Error('Groq key not configured, falling back to Gemini');
                }
            }
            catch (groqError) {
                console.warn('Groq failed or key missing. Falling back to Gemini...', groqError.message);
                try {
                    if (geminiKey) {
                        console.log('🤖 [VexoAI] Calling Gemini API...');
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
                        }
                        else {
                            const errText = await response.text();
                            console.error('Gemini API Error:', errText);
                            throw new Error('Gemini API failed');
                        }
                    }
                    else {
                        throw new Error('Gemini key not configured');
                    }
                }
                catch (geminiError) {
                    console.error('Gemini also failed or key missing. Using local fallback responder.', geminiError.message);
                    const fallback = getLocalFallbackResponse(message, telemetry, userName);
                    return res.json(fallback);
                }
            }
        }
        catch (error) {
            console.error('Chatbot Controller Error:', error);
            res.status(500).json({ error: "Internal chatbot error." });
        }
    }
    ;
};
exports.ChatbotService = ChatbotService;
exports.ChatbotService = ChatbotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService])
], ChatbotService);
//# sourceMappingURL=chatbot.service.js.map