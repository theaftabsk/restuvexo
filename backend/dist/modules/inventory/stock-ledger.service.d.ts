import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { RecipeEngineService } from './recipe-engine.service';
import { Prisma } from '@prisma/client';
export declare class StockLedgerService {
    private prisma;
    private recipeEngine;
    private websocketGateway;
    constructor(prisma: PrismaService, recipeEngine: RecipeEngineService, websocketGateway: WebsocketGateway);
    deductStockForOrder(restaurantId: number, orderId: number, sourceType?: 'KOT' | 'ORDER'): Promise<{
        success: boolean;
        deductedItemsCount: number;
    }>;
    reverseStockForOrder(restaurantId: number, orderId: number, reason?: string): Promise<{
        success: boolean;
    }>;
    recordPurchase(restaurantId: number, inventoryId: number, qtyPurchased: number, costPerUnit: number, invoiceNo?: string, supplierName?: string): Promise<{
        id: number;
        restaurantId: number;
        createdAt: Date;
        inventoryId: number;
        note: string | null;
        txType: import(".prisma/client").$Enums.InventoryTxType;
        qtyDelta: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        costAtTx: Prisma.Decimal;
        idempotencyKey: string;
        sourceType: string | null;
        sourceId: number | null;
    }>;
    recordWastage(restaurantId: number, inventoryId: number, qtyWasted: number, reason?: string): Promise<{
        id: number;
        restaurantId: number;
        createdAt: Date;
        inventoryId: number;
        note: string | null;
        txType: import(".prisma/client").$Enums.InventoryTxType;
        qtyDelta: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        costAtTx: Prisma.Decimal;
        idempotencyKey: string;
        sourceType: string | null;
        sourceId: number | null;
    }>;
    recordAdjustment(restaurantId: number, inventoryId: number, newPhysicalCount: number, reason?: string): Promise<{
        id: number;
        restaurantId: number;
        createdAt: Date;
        inventoryId: number;
        note: string | null;
        txType: import(".prisma/client").$Enums.InventoryTxType;
        qtyDelta: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        costAtTx: Prisma.Decimal;
        idempotencyKey: string;
        sourceType: string | null;
        sourceId: number | null;
    }>;
}
