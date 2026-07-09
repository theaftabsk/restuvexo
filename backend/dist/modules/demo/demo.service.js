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
exports.DemoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DemoService = class DemoService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDemoRequest(req, res) {
        try {
            const { name, email, phone, restaurantName, message } = req.body;
            if (!name || !email || !phone || !restaurantName) {
                return res.status(400).json({
                    success: false,
                    message: "Name, email, phone, and restaurant name are required."
                });
            }
            const demoRequest = await this.prisma.demoRequest.create({
                data: {
                    name,
                    email,
                    phone,
                    restaurantName,
                    message: message || null
                }
            });
            return res.status(201).json({
                success: true,
                message: "Demo scheduled successfully! Our team will contact you shortly.",
                data: demoRequest
            });
        }
        catch (error) {
            console.error("Create Demo Request error:", error);
            return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message
            });
        }
    }
    ;
    async getDemoRequests(req, res) {
        try {
            const demoRequests = await this.prisma.demoRequest.findMany({
                orderBy: { createdAt: "desc" }
            });
            return res.status(200).json({ success: true, data: demoRequests });
        }
        catch (error) {
            console.error("Get Demo Requests error:", error);
            return res.status(500).json({ success: false, message: "Server Error" });
        }
    }
    ;
};
exports.DemoService = DemoService;
exports.DemoService = DemoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DemoService);
//# sourceMappingURL=demo.service.js.map