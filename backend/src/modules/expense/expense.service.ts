
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import * as path from 'path';
import * as fs from 'fs';


async function withRetry(fn: any, retries = 2) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, 150));
    }
  }
}


@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService, private websocketGateway: WebsocketGateway) {
    
  }

  async addExpense(req, res: any) {
  try {
    const { title, category, amount, date } = req.body;
    const restaurantId = req.user.restaurantId;

    if (!title || !category || !amount || !date) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const expense = await withRetry(() =>
      this.prisma.expense.create({
        data: {
          restaurantId,
          title,
          category,
          amount: parseFloat(amount),
          date: new Date(date)
        }
      })
    );

    
    const io = this.websocketGateway?.server; if (io) {
      this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
    }

    return res.status(201).json({ success: true, message: "Expense logged successfully", data: expense });
  } catch (error) {
    console.error("Add Expense error:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get all expenses
async getExpenses(req, res: any) {
  try {
    const restaurantId = req.user.restaurantId;
    const limit = parseInt(req.query.limit) || 100;

    const expenses = await withRetry(() =>
      this.prisma.expense.findMany({
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
async deleteExpense(req, res: any) {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurantId;

    await withRetry(() =>
      this.prisma.expense.deleteMany({
        where: {
          id: parseInt(id),
          restaurantId
        }
      })
    );

    
    const io = this.websocketGateway?.server; if (io) {
      this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
    }

    return res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


}
