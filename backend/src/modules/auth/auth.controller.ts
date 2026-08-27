
import { Controller, Req, Res, UseGuards, Post, Get, Put, Patch, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../shared/auth.guard';
import { RolesGuard } from '../../shared/roles.guard';
import { Roles } from '../../shared/roles.decorator';


@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  
  @Post('owner/signup')
  async ownerSignup(@Req() req: Request, @Res() res: Response) {
    return this.authService.ownerSignup(req, res);
  }

  @Post('verify-otp')
  async verifyOtp(@Req() req: Request, @Res() res: Response) {
    return this.authService.verifyOtp(req, res);
  }

  @Post('resend-otp')
  async resendOtp(@Req() req: Request, @Res() res: Response) {
    return this.authService.resendOtp(req, res);
  }

  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    return this.authService.login(req, res);
  }

  @Post('forgot-password')
  async forgotPassword(@Req() req: Request, @Res() res: Response) {
    return this.authService.forgotPassword(req, res);
  }

  @Post('reset-password')
  async resetPassword(@Req() req: Request, @Res() res: Response) {
    return this.authService.resetPassword(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Post('staff')
  async addStaff(@Req() req: Request, @Res() res: Response) {
    return this.authService.addStaff(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Get('staff')
  async getStaff(@Req() req: Request, @Res() res: Response) {
    return this.authService.getStaff(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Put('staff/:id')
  async editStaff(@Req() req: Request, @Res() res: Response) {
    return this.authService.editStaff(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Patch('staff/:id/status')
  async updateStaffStatus(@Req() req: Request, @Res() res: Response) {
    return this.authService.updateStaffStatus(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Delete('staff/:id')
  async deleteStaff(@Req() req: Request, @Res() res: Response) {
    return this.authService.deleteStaff(req, res);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Put('restaurant')
  async updateRestaurant(@Req() req: Request, @Res() res: Response) {
    return this.authService.updateRestaurant(req, res);
  }

  @UseGuards(AuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: Request, @Res() res: Response) {
    return this.authService.updateProfile(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('restaurant')
  async getRestaurant(@Req() req: Request, @Res() res: Response) {
    return this.authService.getRestaurant(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: Request, @Res() res: Response) {
    return this.authService.changePassword(req, res);
  }
}
