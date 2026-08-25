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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const websocket_gateway_1 = require("../../websocket/websocket.gateway");
const stock_ledger_service_1 = require("./stock-ledger.service");
const unit_converter_1 = require("../../shared/unit-converter");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    constructor(prisma, websocketGateway, stockLedgerService) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
        this.stockLedgerService = stockLedgerService;
    }
    async getInventory(req, res) {
        const restaurantId = req.user.restaurantId;
        const { page = 1, limit = 50, search = '' } = req.query;
        try {
            const pageNumber = Math.max(1, parseInt(page));
            const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
            const whereClause = {
                restaurantId,
                isArchived: false,
                ...(search && {
                    itemName: { contains: search, mode: 'insensitive' }
                })
            };
            const totalCount = await this.prisma.inventory.count({
                where: whereClause
            });
            const items = await this.prisma.inventory.findMany({
                where: whereClause,
                orderBy: { itemName: 'asc' },
                skip: (pageNumber - 1) * pageSize,
                take: pageSize
            });
            const formattedItems = items.map((item) => {
                const current = parseFloat(item.currentStock.toString());
                const minAlert = parseFloat(item.minAlertQty.toString());
                const reorder = parseFloat(item.reorderLevel.toString());
                let status = 'in_stock';
                if (current <= 0)
                    status = 'out_of_stock';
                else if (current <= minAlert)
                    status = 'critical';
                else if (current <= reorder)
                    status = 'low_stock';
                return {
                    ...item,
                    currentStock: current,
                    reservedStock: parseFloat(item.reservedStock.toString()),
                    reorderLevel: reorder,
                    minAlertQty: minAlert,
                    costPerUnit: parseFloat(item.costPerUnit.toString()),
                    status
                };
            });
            res.json({
                data: formattedItems,
                pagination: {
                    total: totalCount,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(totalCount / pageSize)
                }
            });
        }
        catch (error) {
            console.error('[Get Inventory Error]', error);
            res.status(500).json({ error: 'Failed to load raw ingredients stock.' });
        }
    }
    async addInventoryItem(req, res) {
        const { itemName, currentStock = 0, baseUnit = 'kg', unitDimension, reorderLevel = 5.0, minAlertQty = 2.0, costPerUnit = 0.0 } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!itemName || !baseUnit) {
            return res.status(400).json({
                error: 'Ingredient name and base measurement unit are required.'
            });
        }
        try {
            const dimension = unitDimension ||
                (0, unit_converter_1.getUnitDimension)(baseUnit);
            const newItem = await this.prisma.inventory.create({
                data: {
                    restaurantId,
                    itemName,
                    currentStock: new client_1.Prisma.Decimal(currentStock),
                    baseUnit,
                    unitDimension: dimension,
                    reorderLevel: new client_1.Prisma.Decimal(reorderLevel),
                    minAlertQty: new client_1.Prisma.Decimal(minAlertQty),
                    costPerUnit: new client_1.Prisma.Decimal(costPerUnit)
                }
            });
            if (Number(currentStock) > 0) {
                await this.prisma.inventoryTransaction.create({
                    data: {
                        restaurantId,
                        inventoryId: newItem.id,
                        txType: 'purchase',
                        qtyDelta: new client_1.Prisma.Decimal(currentStock),
                        balanceAfter: new client_1.Prisma.Decimal(currentStock),
                        costAtTx: new client_1.Prisma.Decimal(costPerUnit),
                        idempotencyKey: `OPENING:${newItem.id}:${Date.now()}`,
                        sourceType: 'OPENING_STOCK',
                        note: 'Initial opening stock balance'
                    }
                });
            }
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.status(201).json({
                message: 'Raw ingredient added successfully!',
                item: {
                    ...newItem,
                    currentStock: parseFloat(newItem.currentStock.toString()),
                    costPerUnit: parseFloat(newItem.costPerUnit.toString())
                }
            });
        }
        catch (error) {
            console.error('[Add Inventory Item Error]', error);
            res.status(500).json({ error: 'Could not save ingredient stock.' });
        }
    }
    async updateInventoryItem(req, res) {
        const { id } = req.params;
        const { itemName, currentStock, baseUnit, reorderLevel, minAlertQty, costPerUnit } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const item = await this.prisma.inventory.findUnique({
                where: { id: parseInt(id) }
            });
            if (!item || item.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Ingredient not found.' });
            }
            const updatedItem = await this.prisma.inventory.update({
                where: { id: item.id },
                data: {
                    ...(itemName && { itemName }),
                    ...(baseUnit && {
                        baseUnit,
                        unitDimension: (0, unit_converter_1.getUnitDimension)(baseUnit)
                    }),
                    ...(currentStock !== undefined && {
                        currentStock: new client_1.Prisma.Decimal(currentStock)
                    }),
                    ...(reorderLevel !== undefined && {
                        reorderLevel: new client_1.Prisma.Decimal(reorderLevel)
                    }),
                    ...(minAlertQty !== undefined && {
                        minAlertQty: new client_1.Prisma.Decimal(minAlertQty)
                    }),
                    ...(costPerUnit !== undefined && {
                        costPerUnit: new client_1.Prisma.Decimal(costPerUnit)
                    })
                }
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.json({
                message: 'Ingredient details updated successfully.',
                item: {
                    ...updatedItem,
                    currentStock: parseFloat(updatedItem.currentStock.toString()),
                    costPerUnit: parseFloat(updatedItem.costPerUnit.toString())
                }
            });
        }
        catch (error) {
            console.error('[Update Inventory Error]', error);
            res.status(500).json({ error: 'Failed to update ingredient.' });
        }
    }
    async deleteInventoryItem(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const item = await this.prisma.inventory.findUnique({
                where: { id: parseInt(id) }
            });
            if (!item || item.restaurantId !== restaurantId) {
                return res.status(404).json({ error: 'Ingredient not found.' });
            }
            await this.prisma.inventory.update({
                where: { id: item.id },
                data: { isArchived: true }
            });
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.json({ message: 'Raw ingredient archived.' });
        }
        catch (error) {
            console.error('[Delete Inventory Error]', error);
            res.status(500).json({ error: 'Could not archive ingredient.' });
        }
    }
    async recordPurchase(req, res) {
        const { inventoryId, qtyPurchased, costPerUnit, invoiceNo, supplierName } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!inventoryId || !qtyPurchased || qtyPurchased <= 0) {
            return res
                .status(400)
                .json({ error: 'Valid ingredient and quantity purchased are required.' });
        }
        try {
            const record = await this.stockLedgerService.recordPurchase(restaurantId, parseInt(inventoryId), parseFloat(qtyPurchased), parseFloat(costPerUnit || 0), invoiceNo, supplierName);
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.status(201).json({
                message: 'Stock purchase added to inventory ledger.',
                transaction: record
            });
        }
        catch (error) {
            console.error('[Purchase Error]', error);
            res
                .status(500)
                .json({ error: error.message || 'Failed to record purchase.' });
        }
    }
    async recordWastage(req, res) {
        const { inventoryId, qtyWasted, reason } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!inventoryId || !qtyWasted || qtyWasted <= 0) {
            return res
                .status(400)
                .json({ error: 'Valid ingredient and wasted quantity are required.' });
        }
        try {
            const record = await this.stockLedgerService.recordWastage(restaurantId, parseInt(inventoryId), parseFloat(qtyWasted), reason);
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.status(201).json({
                message: 'Wastage recorded successfully.',
                transaction: record
            });
        }
        catch (error) {
            console.error('[Wastage Error]', error);
            res
                .status(500)
                .json({ error: error.message || 'Failed to log wastage.' });
        }
    }
    async recordAdjustment(req, res) {
        const { inventoryId, newPhysicalCount, reason } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!inventoryId || newPhysicalCount === undefined) {
            return res
                .status(400)
                .json({ error: 'Valid ingredient and physical count are required.' });
        }
        try {
            const record = await this.stockLedgerService.recordAdjustment(restaurantId, parseInt(inventoryId), parseFloat(newPhysicalCount), reason);
            this.websocketGateway?.server
                ?.to(`restaurant_${restaurantId}`)
                .emit('inventory_updated');
            res.status(201).json({
                message: 'Stock adjustment saved.',
                transaction: record
            });
        }
        catch (error) {
            console.error('[Adjustment Error]', error);
            res
                .status(500)
                .json({ error: error.message || 'Failed to adjust stock.' });
        }
    }
    async getTransactions(req, res) {
        const restaurantId = req.user.restaurantId;
        const { inventoryId, txType, page = 1, limit = 50 } = req.query;
        try {
            const pageNumber = Math.max(1, parseInt(page));
            const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
            const whereClause = {
                restaurantId,
                ...(inventoryId && { inventoryId: parseInt(inventoryId) }),
                ...(txType && { txType: txType })
            };
            const [totalCount, transactions] = await Promise.all([
                this.prisma.inventoryTransaction.count({ where: whereClause }),
                this.prisma.inventoryTransaction.findMany({
                    where: whereClause,
                    include: {
                        inventory: { select: { itemName: true, baseUnit: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (pageNumber - 1) * pageSize,
                    take: pageSize
                })
            ]);
            const formatted = transactions.map((t) => ({
                ...t,
                qtyDelta: parseFloat(t.qtyDelta.toString()),
                balanceAfter: parseFloat(t.balanceAfter.toString()),
                costAtTx: parseFloat(t.costAtTx.toString())
            }));
            res.json({
                data: formatted,
                pagination: {
                    total: totalCount,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(totalCount / pageSize)
                }
            });
        }
        catch (error) {
            console.error('[Get Transactions Error]', error);
            res.status(500).json({ error: 'Failed to load transaction audit ledger.' });
        }
    }
    async getStockSettings(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            let settings = await this.prisma.restaurantSetting.findUnique({
                where: { restaurantId }
            });
            if (!settings) {
                settings = await this.prisma.restaurantSetting.create({
                    data: {
                        restaurantId,
                        inventoryMode: 'full_inventory',
                        deductionTrigger: 'on_kot_sent',
                        negativeStockPolicy: 'block_sale',
                        lowStockAlertEnabled: true,
                        autoOutOfStockEnabled: true
                    }
                });
            }
            res.json({
                inventoryMode: settings.inventoryMode,
                deductionTrigger: settings.deductionTrigger,
                negativeStockPolicy: settings.negativeStockPolicy,
                lowStockAlertEnabled: settings.lowStockAlertEnabled,
                autoOutOfStockEnabled: settings.autoOutOfStockEnabled
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message || 'Failed to fetch stock settings.' });
        }
    }
    async updateStockSettings(req, res) {
        const restaurantId = req.user.restaurantId;
        const { inventoryMode, deductionTrigger, negativeStockPolicy, lowStockAlertEnabled, autoOutOfStockEnabled } = req.body;
        try {
            const updateData = {};
            if (inventoryMode)
                updateData.inventoryMode = inventoryMode;
            if (deductionTrigger)
                updateData.deductionTrigger = deductionTrigger;
            if (negativeStockPolicy)
                updateData.negativeStockPolicy = negativeStockPolicy;
            if (typeof lowStockAlertEnabled === 'boolean')
                updateData.lowStockAlertEnabled = lowStockAlertEnabled;
            if (typeof autoOutOfStockEnabled === 'boolean')
                updateData.autoOutOfStockEnabled = autoOutOfStockEnabled;
            const settings = await this.prisma.restaurantSetting.upsert({
                where: { restaurantId },
                update: updateData,
                create: {
                    restaurantId,
                    ...updateData
                }
            });
            res.json({
                message: 'Stock tracking settings updated successfully!',
                settings: {
                    inventoryMode: settings.inventoryMode,
                    deductionTrigger: settings.deductionTrigger,
                    negativeStockPolicy: settings.negativeStockPolicy,
                    lowStockAlertEnabled: settings.lowStockAlertEnabled,
                    autoOutOfStockEnabled: settings.autoOutOfStockEnabled
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message || 'Failed to update stock settings.' });
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebsocketGateway,
        stock_ledger_service_1.StockLedgerService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map