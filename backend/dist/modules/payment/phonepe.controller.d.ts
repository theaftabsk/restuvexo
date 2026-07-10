import { PhonePeService } from './phonepe.service';
import { Response } from 'express';
export declare class PhonePeController {
    private readonly phonePeService;
    constructor(phonePeService: PhonePeService);
    initiate(res: Response, body: {
        orderId: number;
        redirectUrl: string;
    }): Promise<Response<any, Record<string, any>>>;
    callback(res: Response, body: {
        response: string;
    }): Promise<Response<any, Record<string, any>>>;
    status(res: Response, txnId: string): Promise<Response<any, Record<string, any>>>;
}
