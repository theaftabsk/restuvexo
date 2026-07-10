import { Request, Response } from 'express';
import { ExpenseService } from './expense.service';
export declare class ExpenseController {
    private expenseService;
    constructor(expenseService: ExpenseService);
    addExpense(req: Request, res: Response): Promise<any>;
    getExpenses(req: Request, res: Response): Promise<any>;
    deleteExpense(req: Request, res: Response): Promise<any>;
}
