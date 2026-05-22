import { io } from '../index';
import db, { generateUUID } from './db';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export class NotificationManager {
    /**
     * Creates a new notification in the database and emits it via Socket.IO
     */
    static async create(userId: string, title: string, message: string, type: NotificationType = 'info') {
        const id = generateUUID();
        const notification = {
            id,
            user_id: userId,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        };

        try {
            await db.query(
                'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [notification.id, notification.user_id, notification.title, notification.message, notification.type, notification.is_read, notification.created_at]
            );

            // Emit real-time event to the user's specific room
            io.to(userId).emit('notification:new', notification);
            
            console.log(`[Notification] Created: ${title} for user ${userId}`);
            return id;
        } catch (err) {
            console.error('[Notification] Failed to create notification:', err);
            return null;
        }
    }

    /**
     * Standard WhatsApp Session Notifications
     */
    static async notifySessionConnected(userId: string, sessionName: string) {
        return this.create(
            userId,
            'WhatsApp Connected',
            `Your session "${sessionName}" is now active and ready to send messages.`,
            'success'
        );
    }

    static async notifySessionDisconnected(userId: string, sessionName: string, reason?: string) {
        return this.create(
            userId,
            'WhatsApp Disconnected',
            `Session "${sessionName}" has been disconnected${reason ? ': ' + reason : '.'} Please re-scan QR if needed.`,
            'error'
        );
    }

    /**
     * Standard Campaign Notifications
     */
    static async notifyCampaignCompleted(userId: string, campaignName: string, success: number, failed: number) {
        return this.create(
            userId,
            'Campaign Completed',
            `"${campaignName}" finished sending. Success: ${success}, Failed: ${failed}.`,
            'success'
        );
    }

    static async notifyCampaignPaused(userId: string, campaignName: string, reason: string) {
        return this.create(
            userId,
            'Campaign Auto-Paused',
            `"${campaignName}" was paused automatically: ${reason}`,
            'warning'
        );
    }
}
