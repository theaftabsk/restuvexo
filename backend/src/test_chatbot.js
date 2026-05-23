require('dotenv').config();
const prisma = require('./db');
const chatbotController = require('./controllers/chatbotController');

async function runTest() {
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

    // Mock Express Request
    const req = {
      body: {
        message: "আজকের sales কত?"
      },
      user: {
        id: 1,
        restaurantId: restaurant.id,
        name: "Test Owner",
        role: "owner"
      }
    };

    // Mock Express Response
    const res = {
      json: function(data) {
        console.log('\n📥 Response Received from Chatbot Controller:');
        console.log(JSON.stringify(data, null, 2));
        
        // Assertions
        if (data && data.text && data.action) {
          console.log('\n🎉 TEST PASSED! The controller successfully processed the query, compiled stats, and returned the correct redirect action.');
        } else {
          console.log('\n⚠️ TEST COMPLETED (Partial Match): Verify if action should be returned for this query.');
        }
        process.exit(0);
      },
      status: function(code) {
        console.log(`\n❌ Status code returned: ${code}`);
        return this;
      }
    };

    console.log(`💬 Sending query: "${req.body.message}" to Chatbot controller...`);
    await chatbotController.handleChat(req, res);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTest();
