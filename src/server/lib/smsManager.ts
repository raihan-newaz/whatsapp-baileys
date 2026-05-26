
import db from './db';

const GREENWEB_API_URL = 'https://api.greenweb.com.bd/api.php';
const GREENWEB_G_API_URL = 'https://api.greenweb.com.bd/g_api.php';

export interface SmsResponse {
    to: string;
    message: string;
    status: string;
    statusmsg: string;
}

export interface GatewayConfig {
    token?: string;
    senderId?: string;
    [key: string]: any;
}

export class SmsManager {
    private provider: string;
    private config: GatewayConfig;
    private userId?: string;

    constructor(provider: string, config: GatewayConfig, userId?: string) {
        this.provider = provider;
        this.config = config;
        this.userId = userId;
    }

    /**
     * Send SMS using the configured provider
     */
    async sendSms(to: string | string[], message: string): Promise<SmsResponse[]> {
        const recipientString = Array.isArray(to) ? to.join(',') : to;

        switch (this.provider) {
            case 'GreenWeb':
                return this.sendGreenWebSms(recipientString, message);
            case 'eSMS (Diana Host)':
                return this.sendESms(recipientString, message);
            case 'BulkSMSBD':
                return this.sendBulkSmsBd(recipientString, message);
            case 'Alpha SMS':
                return this.sendAlphaSms(recipientString, message);
            case 'Android App':
                return this.sendAndroidSms(recipientString, message);
            default:
                throw new Error(`Provider ${this.provider} is not yet implemented.`);
        }
    }

    private async sendAndroidSms(to: string, message: string): Promise<SmsResponse[]> {
        if (!this.userId && !this.config.deviceId) {
            throw new Error('User ID or Device ID is required to send Android SMS');
        }

        const { io } = require('../index'); // Lazy load io to prevent circular deps
        
        return new Promise(async (resolve, reject) => {
            try {
                // Find target socket
                let deviceQuery = 'SELECT socket_id, status FROM android_devices WHERE ';
                let params: any[] = [];
                
                if (this.config.deviceId) {
                    deviceQuery += 'id = ? AND status = "connected"';
                    params.push(this.config.deviceId);
                } else if (this.userId) {
                    deviceQuery += 'user_id = ? AND status = "connected" ORDER BY last_active_at DESC LIMIT 1';
                    params.push(this.userId);
                }

                const [rows]: any = await db.query(deviceQuery, params);
                const device = rows[0];

                if (!device || !device.socket_id) {
                    throw new Error('No connected Android device found for this gateway');
                }

                // Send event to the device
                // Emit an event that the android app listens to
                io.to(device.socket_id).emit('send_sms', {
                    to,
                    message,
                    messageId: Date.now().toString()
                });

                // Acknowledge sending command was delivered to the device
                // Real delivery tracking would require webhook or callback, but we return success here
                resolve([{
                    to,
                    message,
                    status: 'success',
                    statusmsg: 'SMS queued to Android device'
                }]);
            } catch (err) {
                console.error('Error sending Android SMS:', err);
                reject(err);
            }
        });
    }

    private async sendGreenWebSms(to: string, message: string): Promise<SmsResponse[]> {
        const params = new URLSearchParams();
        params.append('token', this.config.token || '');
        params.append('to', to);
        params.append('message', message);
        params.append('json', '1');

        try {
            const response = await fetch(`${GREENWEB_API_URL}?json`, {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) {
                throw new Error(`GreenWeb API error: ${response.statusText}`);
            }

            return (await response.json()) as SmsResponse[];
        } catch (error) {
            console.error('Error sending GreenWeb SMS:', error);
            throw error;
        }
    }

    private async sendESms(to: string, message: string): Promise<SmsResponse[]> {
        throw new Error('eSMS (Diana Host) integration is currently in progress. Sending is not yet available.');
    }

    private async sendBulkSmsBd(to: string, message: string): Promise<SmsResponse[]> {
        throw new Error('BulkSMSBD integration is currently in progress. Sending is not yet available.');
    }

    private async sendAlphaSms(to: string, message: string): Promise<SmsResponse[]> {
        throw new Error('Alpha SMS integration is currently in progress. Sending is not yet available.');
    }

    /**
     * Get account balance and statistics
     */
    async getAccountDetails() {
        switch (this.provider) {
            case 'GreenWeb':
                return this.getGreenWebDetails();
            case 'eSMS (Diana Host)':
                return this.getESmsDetails();
            case 'BulkSMSBD':
                return this.getBulkSmsBdDetails();
            case 'Alpha SMS':
                return this.getAlphaSmsDetails();
            case 'Android App':
                return this.getAndroidAppDetails();
            default:
                return { balance: 'N/A', msg: `Balance check not implemented for ${this.provider}` };
        }
    }

    private async getAndroidAppDetails() {
        return { balance: 'Unlimited (Carrier limit applies)', status: 'Active' };
    }

    private async getGreenWebDetails() {
        try {
            const response = await fetch(`${GREENWEB_G_API_URL}?token=${this.config.token}&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms&json`);
            
            if (!response.ok) {
                throw new Error(`GreenWeb G-API error: ${response.statusText}`);
            }

            const data = await response.json() as any;
            
            // Check for error in JSON response
            if (Array.isArray(data) && data[0] && data[0].status === 'FAILED') {
                throw new Error(data[0].statusmsg || 'GreenWeb API failure');
            }
            if (data && data.status === 'FAILED') {
                throw new Error(data.statusmsg || 'GreenWeb API failure');
            }

            return data;
        } catch (error) {
            console.error('Error fetching GreenWeb details:', error);
            throw error;
        }
    }

    private async getESmsDetails() {
        throw new Error('eSMS (Diana Host) API is not yet integrated. Balance check unavailable.');
    }

    private async getBulkSmsBdDetails() {
        throw new Error('BulkSMSBD API is not yet integrated. Balance check unavailable.');
    }

    private async getAlphaSmsDetails() {
        throw new Error('Alpha SMS API is not yet integrated. Balance check unavailable.');
    }

    /**
     * Get instance for a specific gateway ID
     */
    static async getByGatewayId(gatewayId: string): Promise<SmsManager> {
        const [rows] = await db.query('SELECT * FROM sms_gateways WHERE id = ?', [gatewayId]);
        const gateway = (rows as any[])[0];
        
        if (!gateway) {
            throw new Error('Gateway not found');
        }

        const config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
        return new SmsManager(gateway.provider, config, gateway.user_id);
    }

    /**
     * Get instance for the default gateway
     */
    static async getDefault(): Promise<SmsManager> {
        const [rows] = await db.query('SELECT * FROM sms_gateways WHERE is_default = TRUE AND status = "active" LIMIT 1');
        let gateway = (rows as any[])[0];
        
        if (!gateway) {
            // Fallback to any active gateway if no default is marked
            const [anyActive] = await db.query('SELECT * FROM sms_gateways WHERE status = "active" LIMIT 1');
            gateway = (anyActive as any[])[0];
        }

        if (!gateway) {
            // Fallback to old system_settings if no gateways table entries exist yet
            try {
                const [oldRows] = await db.query('SELECT value FROM system_settings WHERE `key` = ?', ['greenweb_token']);
                const oldRow = (oldRows as any[])[0];
                if (oldRow) {
                    const parsed = JSON.parse(oldRow.value);
                    const token = typeof parsed === 'object' ? parsed.token : oldRow.value;
                    return new SmsManager('GreenWeb', { token });
                }
            } catch (e) {
                console.error('No gateways found and fallback failed:', e);
            }
            throw new Error('No active SMS gateway configured');
        }

        const config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
        return new SmsManager(gateway.provider, config, gateway.user_id);
    }

    /**
     * Get instance for a preferred gateway for a specific user
     */
    static async getForUser(userId: string): Promise<SmsManager> {
        const [rows] = await db.query('SELECT * FROM sms_gateways WHERE user_id = ? AND is_default = TRUE AND status = "active" LIMIT 1', [userId]);
        let gateway = (rows as any[])[0];
        
        if (!gateway) {
            // Fallback to any active gateway for this user
            const [anyActive] = await db.query('SELECT * FROM sms_gateways WHERE user_id = ? AND status = "active" LIMIT 1', [userId]);
            gateway = (anyActive as any[])[0];
        }

        if (!gateway) {
            // Fallback to system-wide default if user has none
            return this.getDefault();
        }

        const config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
        return new SmsManager(gateway.provider, config, gateway.user_id);
    }

    /**
     * Legacy factory method (deprecated)
     */
    static async getInstance(): Promise<SmsManager> {
        return this.getDefault();
    }
}
