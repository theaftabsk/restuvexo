"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./prisma/prisma.module");
const websocket_module_1 = require("./websocket/websocket.module");
const subscription_guard_1 = require("./shared/subscription.guard");
const shared_module_1 = require("./shared/shared.module");
const auth_module_1 = require("./modules/auth/auth.module");
const menu_module_1 = require("./modules/menu/menu.module");
const order_module_1 = require("./modules/order/order.module");
const table_module_1 = require("./modules/table/table.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const expense_module_1 = require("./modules/expense/expense.module");
const chatbot_module_1 = require("./modules/chatbot/chatbot.module");
const superAdmin_module_1 = require("./modules/superAdmin/superAdmin.module");
const upload_module_1 = require("./modules/upload/upload.module");
const demo_module_1 = require("./modules/demo/demo.module");
const subscription_module_1 = require("./modules/subscription/subscription.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            websocket_module_1.WebsocketModule,
            shared_module_1.SharedModule,
            auth_module_1.AuthModule,
            menu_module_1.MenuModule,
            order_module_1.OrderModule,
            table_module_1.TableModule,
            inventory_module_1.InventoryModule,
            dashboard_module_1.DashboardModule,
            expense_module_1.ExpenseModule,
            chatbot_module_1.ChatbotModule,
            superAdmin_module_1.SuperAdminModule,
            upload_module_1.UploadModule,
            demo_module_1.DemoModule,
            subscription_module_1.SubscriptionModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: subscription_guard_1.SubscriptionGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map