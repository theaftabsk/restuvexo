import { Controller, Req, Res, UseGuards, Get, Post, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { ExpenseService } from './expense.service';
import { AuthGuard } from '../../shared/auth.guard';

@Controller(['api/expense', 'api/expenses'])
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  @UseGuards(AuthGuard)
  @Post()
  async addExpense(@Req() req: Request, @Res() res: Response) {
    return this.expenseService.addExpense(req, res);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getExpenses(@Req() req: Request, @Res() res: Response) {
    return this.expenseService.getExpenses(req, res);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteExpense(@Req() req: Request, @Res() res: Response) {
    return this.expenseService.deleteExpense(req, res);
  }
}
