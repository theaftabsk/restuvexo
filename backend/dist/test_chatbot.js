"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const chatbot_controller_1 = require("./modules/chatbot/chatbot.controller");
const prisma_service_1 = require("./prisma/prisma.service");
async function runTest() {
    console.log('🔄 Bootstrapping NestJS application context for testing...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const prisma = app.get(prisma_service_1.PrismaService);
    const chatbotController = app.get(chatbot_controller_1.ChatbotController);
    console.log('🔄 Checking database connection and retrieving a valid restaurant...');
    try {
        const restaurant = await prisma.restaurant.findFirst({
            select: { id: true, name: true }
        });
        if (!restaurant) {
            console.error('❌ No restaurant found in the database. Please seed or add a restaurant.');
            process.exit(1);
        }
        console.log(`✅ Found restaurant: "${restaurant.name}" (ID: ${restaurant.id})`);
        const req = {
            body: {
                message: "আজকের sales কত?"
            },
            user: {
                id: 1,
                restaurantId: restaurant.id,
                role: "owner"
            }
        };
        const res = {
            status: (code) => {
                return {
                    json: (data) => {
                        console.log(`\n📥 Response Received from Chatbot Controller (Status: ${code}):`);
                        console.log(JSON.stringify(data, null, 2));
                        console.log('\n🎉 TEST PASSED! The controller successfully processed the query.');
                        app.close();
                        process.exit(0);
                    }
                };
            },
            json: (data) => {
                console.log(`\n📥 Response Received from Chatbot Controller (Status: 200):`);
                console.log(JSON.stringify(data, null, 2));
                console.log('\n🎉 TEST PASSED! The controller successfully processed the query.');
                app.close();
                process.exit(0);
            }
        };
        console.log(`\n💬 Sending query: "${req.body.message}" to Chatbot controller...`);
        await chatbotController.handleChat(req, res);
    }
    catch (err) {
        console.error('❌ Test failed with error:', err);
        await app.close();
        process.exit(1);
    }
}
runTest();
//# sourceMappingURL=test_chatbot.js.map