import { Request, Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    ownerSignup(req: Request, res: Response): Promise<any>;
    verifyOtp(req: Request, res: Response): Promise<any>;
    login(req: Request, res: Response): Promise<any>;
    forgotPassword(req: Request, res: Response): Promise<any>;
    resetPassword(req: Request, res: Response): Promise<any>;
    addStaff(req: Request, res: Response): Promise<any>;
    getStaff(req: Request, res: Response): Promise<void>;
    editStaff(req: Request, res: Response): Promise<any>;
    updateStaffStatus(req: Request, res: Response): Promise<any>;
    deleteStaff(req: Request, res: Response): Promise<any>;
    updateRestaurant(req: Request, res: Response): Promise<void>;
    updateProfile(req: Request, res: Response): Promise<any>;
    getRestaurant(req: Request, res: Response): Promise<any>;
}
