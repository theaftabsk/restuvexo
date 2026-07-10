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
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const path = require("path");
const fs = require("fs");
let MenuService = class MenuService {
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
    }
    async createCategory(req, res) {
        const { name } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name)
            return res.status(400).json({ error: "Category name is required." });
        try {
            const category = await this.prisma.category.create({ data: { restaurantId, name } });
            res.status(201).json({ message: "Food category created successfully!", category });
        }
        catch (error) {
            console.error('[Create Category Error]', error);
            res.status(500).json({ error: "Could not add category. Try again." });
        }
    }
    ;
    async getCategories(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const categories = await this.prisma.category.findMany({
                where: { restaurantId },
                include: {
                    menuItems: {
                        where: { isAvailable: true },
                        orderBy: { name: 'asc' }
                    }
                },
                orderBy: { id: 'asc' }
            });
            res.json(categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                itemCount: cat.menuItems.length,
                menuItems: cat.menuItems.map(item => ({
                    ...item,
                    price: parseFloat(item.price.toString()),
                    costPrice: parseFloat(item.costPrice.toString())
                }))
            })));
        }
        catch (error) {
            console.error('[Get Categories Error]', error);
            res.status(500).json({ error: "Failed to retrieve categories." });
        }
    }
    ;
    async createMenuItem(req, res) {
        const { name, price, categoryId, stockQty, isAvailable, costPrice, trackStock, imageUrl } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name || !price || !categoryId)
            return res.status(400).json({ error: "Name, price and category are required fields." });
        try {
            const menuItem = await this.prisma.menuItem.create({
                data: {
                    restaurantId, name,
                    price: parseFloat(price),
                    categoryId: parseInt(categoryId),
                    stockQty: stockQty ? parseInt(stockQty) : 999,
                    isAvailable: isAvailable !== undefined ? !!isAvailable : true,
                    costPrice: costPrice ? parseFloat(costPrice) : 0.00,
                    trackStock: trackStock !== undefined ? !!trackStock : true,
                    imageUrl: imageUrl || null
                }
            });
            res.status(201).json({
                message: "Menu item added successfully!",
                menuItem: {
                    ...menuItem,
                    price: parseFloat(menuItem.price.toString()),
                    costPrice: parseFloat(menuItem.costPrice.toString()),
                    trackStock: menuItem.trackStock
                }
            });
        }
        catch (error) {
            console.error('[Create Menu Item Error]', error);
            res.status(500).json({ error: "Failed to create menu item. Try again." });
        }
    }
    ;
    async getMenuItems(req, res) {
        const restaurantId = req.user.restaurantId;
        const { search = '', category = '', page = 1, limit = 48, showAll = 'false' } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {
            restaurantId,
            ...(showAll !== 'true' && { isAvailable: true }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
            ...(category && category !== 'All' && { category: { name: category } })
        };
        try {
            const [total, menuItems] = await Promise.all([
                this.prisma.menuItem.count({ where: whereClause }),
                this.prisma.menuItem.findMany({
                    where: whereClause,
                    include: { category: { select: { id: true, name: true } } },
                    orderBy: { name: 'asc' },
                    skip,
                    take: limitNum
                })
            ]);
            res.json({
                data: menuItems.map(item => ({
                    ...item,
                    price: parseFloat(item.price.toString()),
                    costPrice: parseFloat(item.costPrice.toString())
                })),
                pagination: {
                    total, page: pageNum, limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                    hasMore: pageNum * limitNum < total
                }
            });
        }
        catch (error) {
            console.error('[Get Menu Items Error]', error);
            res.status(500).json({ error: "Could not fetch menu items." });
        }
    }
    ;
    async updateCategory(req, res) {
        const { id } = req.params;
        const { name } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name)
            return res.status(400).json({ error: "Category name is required." });
        try {
            const category = await this.prisma.category.findUnique({ where: { id: parseInt(id) } });
            if (!category || category.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Category not found." });
            }
            const updatedCategory = await this.prisma.category.update({
                where: { id: category.id },
                data: { name }
            });
            const io = this.websocketGateway?.server;
            if (io)
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('menu_updated');
            res.json({ message: "Category updated successfully!", category: updatedCategory });
        }
        catch (error) {
            console.error('[Update Category Error]', error);
            res.status(500).json({ error: "Failed to update category." });
        }
    }
    ;
    async deleteCategory(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const category = await this.prisma.category.findUnique({ where: { id: parseInt(id) } });
            if (!category || category.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Category not found." });
            }
            await this.prisma.category.delete({ where: { id: category.id } });
            const io = this.websocketGateway?.server;
            if (io)
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('menu_updated');
            res.json({ message: "Category deleted successfully!" });
        }
        catch (error) {
            console.error('[Delete Category Error]', error);
            res.status(500).json({ error: "Failed to delete category. Make sure it has no attached menu items." });
        }
    }
    ;
    async updateMenuItem(req, res) {
        const { id } = req.params;
        const { name, price, categoryId, stockQty, isAvailable, costPrice, trackStock, imageUrl } = req.body;
        const restaurantId = req.user.restaurantId;
        let menuItem = null;
        try {
            menuItem = await this.prisma.menuItem.findUnique({ where: { id: parseInt(id) } });
            if (!menuItem || menuItem.restaurantId !== restaurantId) {
                if (imageUrl) {
                    const newImagePath = path.join(__dirname, '../../../public', imageUrl);
                    if (fs.existsSync(newImagePath))
                        fs.unlinkSync(newImagePath);
                }
                return res.status(404).json({ error: "Menu item not found." });
            }
            const updatedMenuItem = await this.prisma.menuItem.update({
                where: { id: menuItem.id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(price !== undefined && { price: parseFloat(price) }),
                    ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
                    ...(stockQty !== undefined && { stockQty: parseInt(stockQty) }),
                    ...(isAvailable !== undefined && { isAvailable: !!isAvailable }),
                    ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
                    ...(trackStock !== undefined && { trackStock: !!trackStock }),
                    ...(imageUrl !== undefined && { imageUrl })
                }
            });
            if (imageUrl !== undefined && menuItem.imageUrl && imageUrl !== menuItem.imageUrl) {
                try {
                    const oldImagePath = path.join(__dirname, '../../../public', menuItem.imageUrl);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            const io = this.websocketGateway?.server;
            if (io)
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('menu_updated');
            res.json({
                message: "Menu item updated successfully!", menuItem: {
                    ...updatedMenuItem,
                    price: parseFloat(updatedMenuItem.price.toString()),
                    costPrice: parseFloat(updatedMenuItem.costPrice.toString()),
                    trackStock: updatedMenuItem.trackStock
                }
            });
        }
        catch (error) {
            console.error('[Update Menu Item Error]', error);
            if (imageUrl !== undefined && (!menuItem || imageUrl !== menuItem.imageUrl)) {
                try {
                    const newImagePath = path.join(__dirname, '../../../public', imageUrl);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                catch (err) {
                    console.error('Error deleting newly orphaned image:', err);
                }
            }
            res.status(500).json({ error: error.message || "Failed to update menu item." });
        }
    }
    ;
    async deleteMenuItem(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const menuItem = await this.prisma.menuItem.findUnique({ where: { id: parseInt(id) } });
            if (!menuItem || menuItem.restaurantId !== restaurantId) {
                return res.status(404).json({ error: "Menu item not found." });
            }
            await this.prisma.menuItem.delete({ where: { id: menuItem.id } });
            if (menuItem.imageUrl) {
                try {
                    const imagePath = path.join(__dirname, '../../../public', menuItem.imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
                catch (err) {
                    console.error('Error deleting image during menu item deletion:', err);
                }
            }
            const io = this.websocketGateway?.server;
            if (io)
                this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('menu_updated');
            res.json({ message: "Menu item deleted successfully!" });
        }
        catch (error) {
            console.error('[Delete Menu Item Error]', error);
            res.status(500).json({ error: "Failed to delete menu item." });
        }
    }
    ;
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, websocket_gateway_1.WebsocketGateway])
], MenuService);
//# sourceMappingURL=menu.service.js.map