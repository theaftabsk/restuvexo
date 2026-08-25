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
const client_1 = require("@prisma/client");
let MenuService = class MenuService {
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
    }
    async createCategory(req, res) {
        const { name } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name)
            return res.status(400).json({ error: 'Category name is required.' });
        try {
            const category = await this.prisma.category.create({
                data: { restaurantId, name }
            });
            res
                .status(201)
                .json({ message: 'Food category created successfully!', category });
        }
        catch (error) {
            console.error('[Create Category Error]', error);
            res.status(500).json({ error: 'Could not add category. Try again.' });
        }
    }
    async getCategories(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const categories = await this.prisma.category.findMany({
                where: { restaurantId },
                include: {
                    menuItems: {
                        where: { isAvailable: true, isArchived: false },
                        include: {
                            variants: { where: { isArchived: false } },
                            addons: { where: { isArchived: false } },
                            recipes: { include: { inventory: true } }
                        },
                        orderBy: { name: 'asc' }
                    }
                },
                orderBy: { id: 'asc' }
            });
            res.json(categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
                itemCount: cat.menuItems.length,
                menuItems: cat.menuItems.map((item) => ({
                    ...item,
                    price: parseFloat(item.price.toString()),
                    costPrice: parseFloat(item.costPrice.toString()),
                    variants: item.variants.map((v) => ({
                        ...v,
                        price: parseFloat(v.price.toString())
                    })),
                    addons: item.addons.map((a) => ({
                        ...a,
                        price: parseFloat(a.price.toString())
                    })),
                    recipes: item.recipes.map((r) => ({
                        ...r,
                        qtyRequired: parseFloat(r.qtyRequired.toString())
                    }))
                }))
            })));
        }
        catch (error) {
            console.error('[Get Categories Error]', error);
            res.status(500).json({ error: 'Failed to retrieve categories.' });
        }
    }
    async createMenuItem(req, res) {
        const { name, description, price, categoryId, costPrice, isVeg = false, stockMode = 'dont_track', stockQty = 999, lowStockAlert = 5, hasVariants = false, allowSpice = true, isAvailable = true, trackStock = true, imageUrl, variants = [], addons = [], recipes = [] } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name || price === undefined || !categoryId) {
            return res
                .status(400)
                .json({ error: 'Name, price, and category are required.' });
        }
        try {
            const mode = stockMode === 'recipe_bom'
                ? client_1.StockTrackingMode.recipe_bom
                : stockMode === 'item_stock'
                    ? client_1.StockTrackingMode.item_stock
                    : client_1.StockTrackingMode.dont_track;
            const created = await this.prisma.$transaction(async (tx) => {
                const item = await tx.menuItem.create({
                    data: {
                        restaurantId,
                        categoryId: parseInt(categoryId),
                        name,
                        description: description || null,
                        price: new client_1.Prisma.Decimal(price),
                        costPrice: new client_1.Prisma.Decimal(costPrice || 0.0),
                        isVeg: !!isVeg,
                        stockMode: mode,
                        stockQty: parseInt(stockQty) || 999,
                        lowStockAlert: parseInt(lowStockAlert) || 5,
                        hasVariants: !!hasVariants,
                        allowSpice: allowSpice !== undefined ? !!allowSpice : true,
                        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
                        trackStock: trackStock !== undefined ? !!trackStock : true,
                        imageUrl: imageUrl || null
                    }
                });
                if (hasVariants && Array.isArray(variants) && variants.length > 0) {
                    for (const v of variants) {
                        const variantRecord = await tx.menuItemVariant.create({
                            data: {
                                menuItemId: item.id,
                                name: v.name,
                                price: new client_1.Prisma.Decimal(v.price || price),
                                isDefault: !!v.isDefault
                            }
                        });
                        if (Array.isArray(v.recipes) && v.recipes.length > 0) {
                            for (const vr of v.recipes) {
                                if (!vr.inventoryId || !vr.qtyRequired)
                                    continue;
                                await tx.recipe.create({
                                    data: {
                                        restaurantId,
                                        scope: client_1.RecipeScope.variant,
                                        menuItemId: item.id,
                                        variantId: variantRecord.id,
                                        inventoryId: parseInt(vr.inventoryId),
                                        qtyRequired: new client_1.Prisma.Decimal(vr.qtyRequired),
                                        unit: vr.unit || 'g',
                                        yieldPercent: new client_1.Prisma.Decimal(vr.yieldPercent || 100.0)
                                    }
                                });
                            }
                        }
                    }
                }
                if (Array.isArray(addons) && addons.length > 0) {
                    for (const a of addons) {
                        const addonRecord = await tx.menuItemAddon.create({
                            data: {
                                restaurantId,
                                menuItemId: item.id,
                                name: a.name,
                                price: new client_1.Prisma.Decimal(a.price || 0)
                            }
                        });
                        if (Array.isArray(a.recipes) && a.recipes.length > 0) {
                            for (const ar of a.recipes) {
                                if (!ar.inventoryId || !ar.qtyRequired)
                                    continue;
                                await tx.recipe.create({
                                    data: {
                                        restaurantId,
                                        scope: client_1.RecipeScope.addon,
                                        menuItemId: item.id,
                                        addonId: addonRecord.id,
                                        inventoryId: parseInt(ar.inventoryId),
                                        qtyRequired: new client_1.Prisma.Decimal(ar.qtyRequired),
                                        unit: ar.unit || 'g',
                                        yieldPercent: new client_1.Prisma.Decimal(ar.yieldPercent || 100.0)
                                    }
                                });
                            }
                        }
                    }
                }
                if (Array.isArray(recipes) && recipes.length > 0) {
                    for (const r of recipes) {
                        if (!r.inventoryId || !r.qtyRequired)
                            continue;
                        await tx.recipe.create({
                            data: {
                                restaurantId,
                                scope: client_1.RecipeScope.base_item,
                                menuItemId: item.id,
                                inventoryId: parseInt(r.inventoryId),
                                qtyRequired: new client_1.Prisma.Decimal(r.qtyRequired),
                                unit: r.unit || 'g',
                                yieldPercent: new client_1.Prisma.Decimal(r.yieldPercent || 100.0)
                            }
                        });
                    }
                }
                return item;
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('menu_updated');
            res.status(201).json({
                message: 'Menu item created successfully!',
                menuItem: created
            });
        }
        catch (error) {
            console.error('[Create Menu Item Error]', error);
            res.status(500).json({ error: 'Failed to create menu item.' });
        }
    }
    async getMenuItems(req, res) {
        const restaurantId = req.user.restaurantId;
        const { search = '', category = '', page = 1, limit = 50, showAll = 'false' } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {
            restaurantId,
            isArchived: false,
            ...(showAll !== 'true' && { isAvailable: true }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
            ...(category && category !== 'All' && { category: { name: category } })
        };
        try {
            const [total, menuItems] = await Promise.all([
                this.prisma.menuItem.count({ where: whereClause }),
                this.prisma.menuItem.findMany({
                    where: whereClause,
                    include: {
                        category: { select: { id: true, name: true } },
                        variants: {
                            where: { isArchived: false },
                            include: { recipes: { include: { inventory: true } } }
                        },
                        addons: {
                            where: { isArchived: false },
                            include: { recipes: { include: { inventory: true } } }
                        },
                        recipes: { include: { inventory: true } }
                    },
                    orderBy: { name: 'asc' },
                    skip,
                    take: limitNum
                })
            ]);
            const formatted = menuItems.map((item) => ({
                ...item,
                price: parseFloat(item.price.toString()),
                costPrice: parseFloat(item.costPrice.toString()),
                variants: item.variants.map((v) => ({
                    ...v,
                    price: parseFloat(v.price.toString()),
                    recipes: v.recipes.map((r) => ({
                        ...r,
                        qtyRequired: parseFloat(r.qtyRequired.toString())
                    }))
                })),
                addons: item.addons.map((a) => ({
                    ...a,
                    price: parseFloat(a.price.toString()),
                    recipes: a.recipes.map((r) => ({
                        ...r,
                        qtyRequired: parseFloat(r.qtyRequired.toString())
                    }))
                })),
                recipes: item.recipes.map((r) => ({
                    ...r,
                    qtyRequired: parseFloat(r.qtyRequired.toString())
                }))
            }));
            res.json({
                data: formatted,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                    hasMore: pageNum * limitNum < total
                }
            });
        }
        catch (error) {
            console.error('[Get Menu Items Error]', error);
            res.status(500).json({ error: 'Could not fetch menu items.' });
        }
    }
    async updateCategory(req, res) {
        const { id } = req.params;
        const { name } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name)
            return res.status(400).json({ error: 'Category name is required.' });
        try {
            const category = await this.prisma.category.findUnique({
                where: { id: parseInt(id) }
            });
            if (!category || category.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Category not found.' });
            }
            const updatedCategory = await this.prisma.category.update({
                where: { id: category.id },
                data: { name }
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('menu_updated');
            res.json({
                message: 'Category updated successfully!',
                category: updatedCategory
            });
        }
        catch (error) {
            console.error('[Update Category Error]', error);
            res.status(500).json({ error: 'Failed to update category.' });
        }
    }
    async deleteCategory(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const category = await this.prisma.category.findUnique({
                where: { id: parseInt(id) }
            });
            if (!category || category.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Category not found.' });
            }
            await this.prisma.category.delete({ where: { id: category.id } });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('menu_updated');
            res.json({ message: 'Category deleted successfully!' });
        }
        catch (error) {
            console.error('[Delete Category Error]', error);
            res.status(500).json({
                error: 'Failed to delete category. Make sure it has no attached menu items.'
            });
        }
    }
    async updateMenuItem(req, res) {
        const { id } = req.params;
        const { name, description, price, categoryId, costPrice, isVeg, stockMode, stockQty, lowStockAlert, hasVariants, allowSpice, isAvailable, trackStock, imageUrl, variants, addons, recipes } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const existing = await this.prisma.menuItem.findUnique({
                where: { id: parseInt(id) }
            });
            if (!existing || existing.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Menu item not found.' });
            }
            const updated = await this.prisma.$transaction(async (tx) => {
                const item = await tx.menuItem.update({
                    where: { id: existing.id },
                    data: {
                        ...(name !== undefined && { name }),
                        ...(description !== undefined && { description }),
                        ...(price !== undefined && { price: new client_1.Prisma.Decimal(price) }),
                        ...(categoryId !== undefined && {
                            categoryId: parseInt(categoryId)
                        }),
                        ...(costPrice !== undefined && {
                            costPrice: new client_1.Prisma.Decimal(costPrice)
                        }),
                        ...(isVeg !== undefined && { isVeg: !!isVeg }),
                        ...(stockMode !== undefined && {
                            stockMode: stockMode
                        }),
                        ...(stockQty !== undefined && { stockQty: parseInt(stockQty) }),
                        ...(lowStockAlert !== undefined && {
                            lowStockAlert: parseInt(lowStockAlert)
                        }),
                        ...(hasVariants !== undefined && { hasVariants: !!hasVariants }),
                        ...(allowSpice !== undefined && { allowSpice: !!allowSpice }),
                        ...(isAvailable !== undefined && { isAvailable: !!isAvailable }),
                        ...(trackStock !== undefined && { trackStock: !!trackStock }),
                        ...(imageUrl !== undefined && { imageUrl })
                    }
                });
                if (variants !== undefined && Array.isArray(variants)) {
                    await tx.menuItemVariant.deleteMany({
                        where: { menuItemId: item.id }
                    });
                    for (const v of variants) {
                        const vRecord = await tx.menuItemVariant.create({
                            data: {
                                menuItemId: item.id,
                                name: v.name,
                                price: new client_1.Prisma.Decimal(v.price || item.price),
                                isDefault: !!v.isDefault
                            }
                        });
                        if (Array.isArray(v.recipes)) {
                            for (const vr of v.recipes) {
                                if (!vr.inventoryId || !vr.qtyRequired)
                                    continue;
                                await tx.recipe.create({
                                    data: {
                                        restaurantId,
                                        scope: client_1.RecipeScope.variant,
                                        menuItemId: item.id,
                                        variantId: vRecord.id,
                                        inventoryId: parseInt(vr.inventoryId),
                                        qtyRequired: new client_1.Prisma.Decimal(vr.qtyRequired),
                                        unit: vr.unit || 'g',
                                        yieldPercent: new client_1.Prisma.Decimal(vr.yieldPercent || 100.0)
                                    }
                                });
                            }
                        }
                    }
                }
                if (addons !== undefined && Array.isArray(addons)) {
                    await tx.menuItemAddon.deleteMany({ where: { menuItemId: item.id } });
                    for (const a of addons) {
                        const aRecord = await tx.menuItemAddon.create({
                            data: {
                                restaurantId,
                                menuItemId: item.id,
                                name: a.name,
                                price: new client_1.Prisma.Decimal(a.price || 0)
                            }
                        });
                        if (Array.isArray(a.recipes)) {
                            for (const ar of a.recipes) {
                                if (!ar.inventoryId || !ar.qtyRequired)
                                    continue;
                                await tx.recipe.create({
                                    data: {
                                        restaurantId,
                                        scope: client_1.RecipeScope.addon,
                                        menuItemId: item.id,
                                        addonId: aRecord.id,
                                        inventoryId: parseInt(ar.inventoryId),
                                        qtyRequired: new client_1.Prisma.Decimal(ar.qtyRequired),
                                        unit: ar.unit || 'g',
                                        yieldPercent: new client_1.Prisma.Decimal(ar.yieldPercent || 100.0)
                                    }
                                });
                            }
                        }
                    }
                }
                if (recipes !== undefined && Array.isArray(recipes)) {
                    await tx.recipe.deleteMany({
                        where: { menuItemId: item.id, scope: client_1.RecipeScope.base_item }
                    });
                    for (const r of recipes) {
                        if (!r.inventoryId || !r.qtyRequired)
                            continue;
                        await tx.recipe.create({
                            data: {
                                restaurantId,
                                scope: client_1.RecipeScope.base_item,
                                menuItemId: item.id,
                                inventoryId: parseInt(r.inventoryId),
                                qtyRequired: new client_1.Prisma.Decimal(r.qtyRequired),
                                unit: r.unit || 'g',
                                yieldPercent: new client_1.Prisma.Decimal(r.yieldPercent || 100.0)
                            }
                        });
                    }
                }
                return item;
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('menu_updated');
            res.json({
                message: 'Menu item updated successfully!',
                menuItem: updated
            });
        }
        catch (error) {
            console.error('[Update Menu Item Error]', error);
            res.status(500).json({ error: error.message || 'Failed to update menu item.' });
        }
    }
    async deleteMenuItem(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const menuItem = await this.prisma.menuItem.findUnique({
                where: { id: parseInt(id) }
            });
            if (!menuItem || menuItem.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Menu item not found.' });
            }
            await this.prisma.menuItem.update({
                where: { id: menuItem.id },
                data: { isArchived: true, isAvailable: false }
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('menu_updated');
            res.json({ message: 'Menu item archived successfully!' });
        }
        catch (error) {
            console.error('[Delete Menu Item Error]', error);
            res.status(500).json({ error: 'Failed to archive menu item.' });
        }
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebsocketGateway])
], MenuService);
//# sourceMappingURL=menu.service.js.map