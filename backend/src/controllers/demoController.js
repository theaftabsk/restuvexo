const prisma = require("../db");

// Submit a new free demo request
const createDemoRequest = async (req, res) => {
  try {
    const { name, email, phone, restaurantName, message } = req.body;

    if (!name || !email || !phone || !restaurantName) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, phone, and restaurant name are required." 
      });
    }

    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        phone,
        restaurantName,
        message: message || null
      }
    });

    return res.status(201).json({ 
      success: true, 
      message: "Demo scheduled successfully! Our team will contact you shortly.", 
      data: demoRequest 
    });
  } catch (error) {
    console.error("Create Demo Request error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server Error", 
      error: error.message 
    });
  }
};

// Get all demo requests (for audit/admin view)
const getDemoRequests = async (req, res) => {
  try {
    const demoRequests = await prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, data: demoRequests });
  } catch (error) {
    console.error("Get Demo Requests error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createDemoRequest,
  getDemoRequests
};
