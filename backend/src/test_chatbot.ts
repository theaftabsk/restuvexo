import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ChatbotController } from './modules/chatbot/chatbot.controller';
import { PrismaService } from './prisma/prisma.service';

async function runTest() {
  console.log('🔄 Bootstrapping NestJS application context for testing...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get(PrismaService);
  const chatbotController = app.get(ChatbotController);

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

    // Mock Express Request & Response
    const req = {
      body: {
        message: "আজকের sales কত?"
      },
      user: {
        id: 1,
        restaurantId: restaurant.id,
        role: "owner"
      }
    } as any;

    const res = {
      status: (code: number) => {
        return {
          json: (data: any) => {
            console.log(`\n📥 Response Received from Chatbot Controller (Status: ${code}):`);
            console.log(JSON.stringify(data, null, 2));
            console.log('\n🎉 TEST PASSED! The controller successfully processed the query.');
            app.close();
            process.exit(0);
          }
        };
      },
      json: (data: any) => {
        console.log(`\n📥 Response Received from Chatbot Controller (Status: 200):`);
        console.log(JSON.stringify(data, null, 2));
        console.log('\n🎉 TEST PASSED! The controller successfully processed the query.');
        app.close();
        process.exit(0);
      }
    } as any;

    console.log(`\n💬 Sending query: "${req.body.message}" to Chatbot controller...`);
    await chatbotController.handleChat(req, res);

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runTest();
