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
exports.ExpenseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
async function withRetry(fn, retries = 2) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        }
        catch (err) {
            attempt++;
            if (attempt >= retries)
                throw err;
            await new Promise(r => setTimeout(r, 150));
        }
    }
}
let ExpenseService = class ExpenseService {
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
    }
    async addExpense(req, res) {
        try {
            const { title, category, amount, date } = req.body;
            const restaurantId = req.user.restaurantId;
            if (!title || !category || !amount || !date) {
                return res.status(400).json({ success: false, message: "All fields are required" });
            }
            const expense = await withRetry(() => this.prisma.expense.create({
                data: {
                    restaurantId,
                    title,
                    category,
                    amount: parseFloat(amount),
                    date: new Date(date)
                }
            }));
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
            }
            return res.status(201).json({ success: true, message: "Expense logged successfully", data: expense });
        }
        catch (error) {
            console.error("Add Expense error:", error);
            return res.status(500).json({ success: false, message: "Server Error", error: error.message });
        }
    }
    ;
    async getExpenses(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const limit = parseInt(req.query.limit) || 100;
            const expenses = await withRetry(() => this.prisma.expense.findMany({
                where: { restaurantId },
                orderBy: { date: "desc" },
                take: limit
            }));
            return res.status(200).json({ success: true, data: expenses });
        }
        catch (error) {
            console.error("Get Expenses error:", error);
            return res.status(500).json({ success: false, message: "Server Error", data: [] });
        }
    }
    ;
    async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            const restaurantId = req.user.restaurantId;
            await withRetry(() => this.prisma.expense.deleteMany({
                where: {
                    id: parseInt(id),
                    restaurantId
                }
            }));
            const io = this.websocketGateway?.server;
            if (io) {
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit("reports_updated", { timestamp: new Date() });
            }
            return res.status(200).json({ success: true, message: "Expense deleted" });
        }
        catch (error) {
            console.error("Delete expense error:", error);
            return res.status(500).json({ success: false, message: "Server Error" });
        }
    }
    ;
};
exports.ExpenseService = ExpenseService;
exports.ExpenseService = ExpenseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, websocket_gateway_1.WebsocketGateway])
], ExpenseService);
//# sourceMappingURL=expense.service.js.map