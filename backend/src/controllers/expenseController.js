const prisma = require("../db");

// Helper: run a Prisma query with auto-reconnect on engine crash (code 101 / timer has gone away)
async function withRetry(fn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isEngineError =
        err?.constructor?.name === "PrismaClientInitializationError" ||
        (err?.message && err.message.includes("Query engine exited")) ||
        (err?.message && err.message.includes("timer has gone away"));

      if (isEngineError && attempt < retries) {
        console.warn(`⚠️ [Prisma] Engine crash detected (code 101). Reconnecting... (attempt ${attempt + 1})`);
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }
}

// Add a new expense
const addExpense = async (req, res) => {
  try {
    const { title, category, amount, date } = req.body;
    const restaurantId = req.user.restaurantId;

    if (!title || !category || !amount || !date) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const expense = await withRetry(() =>
      prisma.expense.create({
        data: {
          restaurantId,
          title,
          category,
          amount: parseFloat(amount),
          date: new Date(date)
        }
      })
    );

    const io = req.app.get("socketio");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
    }

    return res.status(201).json({ success: true, message: "Expense logged successfully", data: expense });
  } catch (error) {
    console.error("Add Expense error:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get all expenses
const getExpenses = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const limit = parseInt(req.query.limit) || 100;

    const expenses = await withRetry(() =>
      prisma.expense.findMany({
        where: { restaurantId },
        orderBy: { date: "desc" },
        take: limit
      })
    );

    return res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Get Expenses error:", error);
    // Always return JSON with empty data so frontend doesn't hang
    return res.status(500).json({ success: false, message: "Server Error", data: [] });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurantId;

    await withRetry(() =>
      prisma.expense.deleteMany({
        where: {
          id: parseInt(id),
          restaurantId
        }
      })
    );

    const io = req.app.get("socketio");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
    }

    return res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  addExpense,
  getExpenses,
  deleteExpense
};
