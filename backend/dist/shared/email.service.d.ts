export declare class EmailService {
    private transporter;
    constructor();
    private getTransporter;
    sendOtpEmail(email: string, name: string, otp: string): Promise<boolean>;
    sendResetPasswordEmail(email: string, name: string, resetLink: string): Promise<boolean>;
    sendWelcomeEmail(email: string, name: string, restaurantName: string): Promise<boolean>;
}
