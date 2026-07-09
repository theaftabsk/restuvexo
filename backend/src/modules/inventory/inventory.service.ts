
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';



@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private websocketGateway: WebsocketGateway) {
    
  }

  async getInventory(req, res: any) {
  const restaurantId = req.user.restaurantId;
  const { page = 1, limit = 20 } = req.query;

  try {
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    // Fetch total count for pagination meta
    const totalCount = await this.prisma.inventory.count({
      where: { restaurantId: restaurantId }
    });

    const items = await this.prisma.inventory.findMany({
      where: { restaurantId: restaurantId },
      orderBy: { itemName: 'asc' },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize
    });

    const formattedItems = items.map(item => ({
      ...item,
      qty: parseFloat(item.qty.toString()),
      lowStockAlert: parseFloat(item.lowStockAlert.toString())
    }));

    res.json({
      data: formattedItems,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });

  } catch (error) {
    console.error('[Get Inventory Error]', error);
    res.status(500).json({ error: "Failed to load raw ingredients stock." });
  }
};

// 2. Add New Raw Ingredient
async addInventoryItem(req, res: any) {
  const { itemName, qty, unit, lowStockAlert } = req.body;
  const restaurantId = req.user.restaurantId;

  if (!itemName || qty === undefined || !unit) {
    return res.status(400).json({ error: "Ingredient name, initial quantity and measurement unit are required." });
  }

  try {
    const newItem = await this.prisma.inventory.create({
      data: {
        restaurantId: restaurantId,
        itemName: itemName,
        qty: parseFloat(qty),
        unit: unit,
        lowStockAlert: lowStockAlert ? parseFloat(lowStockAlert) : 5.00
      }
    });

    
    const io = this.websocketGateway?.server; if (io) this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('inventory_updated');

    res.status(201).json({
      message: "Raw ingredient added successfully!", item: {
        ...newItem,
        qty: parseFloat(newItem.qty.toString()),
        lowStockAlert: parseFloat(newItem.lowStockAlert.toString())
      }
    });

  } catch (error) {
    console.error('[Add Inventory Item Error]', error);
    res.status(500).json({ error: "Could not save ingredient stock. Try again." });
  }
};

// 3. Manually Adjust Stock or Edit Alert thresholds
async updateInventoryItem(req, res: any) {
  const { id } = req.params;
  const { qty, lowStockAlert } = req.body;
  const restaurantId = req.user.restaurantId;

  try {
    const item = await this.prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!item || item.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Ingredient not found." });
    }

    const updatedItem = await this.prisma.inventory.update({
      where: { id: item.id },
      data: {
        ...(qty !== undefined && { qty: parseFloat(qty) }),
        ...(lowStockAlert !== undefined && { lowStockAlert: parseFloat(lowStockAlert) })
      }
    });

    
    const io = this.websocketGateway?.server; if (io) this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('inventory_updated');

    res.json({
      message: "Stock level adjusted successfully.", item: {
        ...updatedItem,
        qty: parseFloat(updatedItem.qty.toString()),
        lowStockAlert: parseFloat(updatedItem.lowStockAlert.toString())
      }
    });

  } catch (error) {
    console.error('[Update Inventory Error]', error);
    res.status(500).json({ error: "Failed to adjust stock level." });
  }
};

// 4. Delete Ingredient
async deleteInventoryItem(req, res: any) {
  const { id } = req.params;
  const restaurantId = req.user.restaurantId;

  try {
    const item = await this.prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!item || item.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Ingredient not found." });
    }

    await this.prisma.inventory.delete({
      where: { id: item.id }
    });

    
    const io = this.websocketGateway?.server; if (io) this.websocketGateway.server.to(`restaurant_${restaurantId}`).emit('inventory_updated');

    res.json({ message: "Raw ingredient deleted from records." });

  } catch (error) {
    console.error('[Delete Inventory Error]', error);
    res.status(500).json({ error: "Could not remove ingredient. Check if linked to food recipes." });
  }
};

}
