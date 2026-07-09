
import { Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ExpenseService } from './expense.service';


@Controller('api/expense')
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  
}
