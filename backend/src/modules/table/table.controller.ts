
import { Controller, Req, Res, UseGuards, Get, Post, Put, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { TableService } from './table.service';
import { AuthGuard } from '../../shared/auth.guard';


@Controller('api/tables')
export class TableController {
  constructor(private tableService: TableService) {}

  
  @UseGuards(AuthGuard)
  @Get()
  async getTables(@Req() req: Request, @Res() res: Response) {
    return this.tableService.getTables(req, res);
  }

  @UseGuards(AuthGuard)
  @Post()
  async createTable(@Req() req: Request, @Res() res: Response) {
    return this.tableService.createTable(req, res);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async updateTable(@Req() req: Request, @Res() res: Response) {
    return this.tableService.updateTable(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteTable(@Req() req: Request, @Res() res: Response) {
    return this.tableService.deleteTable(req, res);
  }

  @UseGuards(AuthGuard)
  @Get(':id/history')
  async getTableHistory(@Req() req: Request, @Res() res: Response) {
    return this.tableService.getTableHistory(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('active-sessions')
  async getActiveSessions(@Req() req: Request, @Res() res: Response) {
    return this.tableService.getActiveSessions(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete('active-sessions/:sessionId')
  async clearActiveSession(@Req() req: Request, @Res() res: Response) {
    return this.tableService.clearActiveSession(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('settings')
  async getSettings(@Req() req: Request, @Res() res: Response) {
    return this.tableService.getSettings(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('settings')
  async updateSettings(@Req() req: Request, @Res() res: Response) {
    return this.tableService.updateSettings(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('block-device')
  async blockDevice(@Req() req: Request, @Res() res: Response) {
    return this.tableService.blockDevice(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('blacklisted-devices')
  async getBlacklistedDevices(@Req() req: Request, @Res() res: Response) {
    return this.tableService.getBlacklistedDevices(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete('blacklisted-devices/:deviceId')
  async unblockDevice(@Req() req: Request, @Res() res: Response) {
    return this.tableService.unblockDevice(req, res);
  }

}
