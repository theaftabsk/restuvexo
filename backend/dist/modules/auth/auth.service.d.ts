import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings.service';
import { EmailService } from '../../shared/email.service';
export declare class AuthService {
    private prisma;
    private settingsService;
    private emailService;
    constructor(prisma: PrismaService, settingsService: SettingsService, emailService: EmailService);
    ownerSignup(req: any, res: any): Promise<any>;
    verifyOtp(req: any, res: any): Promise<any>;
    resendOtp(req: any, res: any): Promise<any>;
    login(req: any, res: any): Promise<any>;
    forgotPassword(req: any, res: any): Promise<any>;
    resetPassword(req: any, res: any): Promise<any>;
    addStaff(req: any, res: any): Promise<any>;
    getStaff(req: any, res: any): Promise<void>;
    updateStaffStatus(req: any, res: any): Promise<any>;
    editStaff(req: any, res: any): Promise<any>;
    deleteStaff(req: any, res: any): Promise<any>;
    updateRestaurant(req: any, res: any): Promise<void>;
    updateProfile(req: any, res: any): Promise<any>;
    getRestaurant(req: any, res: any): Promise<any>;
    changePassword(req: any, res: any): Promise<any>;
}
