
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';



@Injectable()
export class DemoService {
  constructor(private prisma: PrismaService) {
    
  }

  async createDemoRequest(req, res: any) {
  try {
    const { name, email, phone, restaurantName, message } = req.body;

    if (!name || !email || !phone || !restaurantName) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, phone, and restaurant name are required." 
      });
    }

    const demoRequest = await this.prisma.demoRequest.create({
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
async getDemoRequests(req, res: any) {
  try {
    const demoRequests = await this.prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, data: demoRequests });
  } catch (error) {
    console.error("Get Demo Requests error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


}
