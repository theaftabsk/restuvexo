import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SubscriptionGuard } from './shared/subscription.guard';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrderModule } from './modules/order/order.module';
import { TableModule } from './modules/table/table.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { SuperAdminModule } from './modules/superAdmin/superAdmin.module';
import { UploadModule } from './modules/upload/upload.module';
import { DemoModule } from './modules/demo/demo.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    SharedModule,
    AuthModule,
    MenuModule,
    OrderModule,
    TableModule,
    InventoryModule,
    DashboardModule,
    ExpenseModule,
    ChatbotModule,
    SuperAdminModule,
    UploadModule,
    DemoModule,
    SubscriptionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}

