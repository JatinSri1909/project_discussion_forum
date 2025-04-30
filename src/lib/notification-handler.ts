import { WebSocketServer, WebSocket as WS } from 'ws';
import http from 'http';
import { supabase } from './supabase';
import logger from './logger';

interface NotificationConnection {
  userId: string;
  ws: WS;
  heartbeat: number;
}

class NotificationHandler {
  private wss: WebSocketServer;
  private connections: Map<string, NotificationConnection>;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server });
    this.connections = new Map();

    // Set up WebSocket connection handling
    this.wss.on('connection', this.handleConnection.bind(this));

    // Set up heartbeat to check for stale connections
    this.heartbeatInterval = setInterval(this.checkConnections.bind(this), 30000);

    // Subscribe to Supabase realtime notifications
    this.setupSupabaseSubscription();

    logger.info('Notification handler initialized');
  }

  private async handleConnection(ws: WS) {
    try {
      // Get auth token from connection request
      const token = (ws as any).url?.split('token=')[1];
      if (!token) {
        ws.close(1008, 'No authentication token provided');
        return;
      }

      // Verify token and get user
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      // Store connection
      this.connections.set(user.id, {
        userId: user.id,
        ws,
        heartbeat: Date.now()
      });

      // Set up message handling
      ws.on('message', (data: WS.Data) => {
        const connection = this.connections.get(user.id);
        if (connection) {
          connection.heartbeat = Date.now();
          this.handleMessage(user.id, data.toString());
        }
      });

      // Handle connection close
      ws.on('close', () => {
        this.connections.delete(user.id);
        logger.debug(`WebSocket connection closed for user ${user.id}`);
      });

      logger.debug(`WebSocket connection established for user ${user.id}`);
    } catch (err) {
      logger.error('Error handling WebSocket connection:', err);
      ws.close(1011, 'Internal server error');
    }
  }

  private async handleMessage(userId: string, data: string) {
    try {
      const message = JSON.parse(data);
      
      // Handle client messages (e.g., mark notifications as read)
      if (message.type === 'mark_read') {
        await this.markNotificationsAsRead(userId, message.ids);
      }
    } catch (err) {
      logger.error('Error handling WebSocket message:', err);
    }
  }

  private async markNotificationsAsRead(userId: string, notificationIds: string[]) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .in('id', notificationIds);

      if (error) throw error;
    } catch (err) {
      logger.error('Error marking notifications as read:', err);
    }
  }

  private checkConnections() {
    const now = Date.now();
    for (const [userId, connection] of this.connections.entries()) {
      // Close connections that haven't sent a heartbeat in 60 seconds
      if (now - connection.heartbeat > 60000) {
        connection.ws.close(1000, 'Connection timed out');
        this.connections.delete(userId);
        logger.debug(`Closed stale connection for user ${userId}`);
      }
    }
  }

  private setupSupabaseSubscription() {
    supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, this.handleNewNotification.bind(this))
      .subscribe();
  }

  private async handleNewNotification(payload: any) {
    try {
      const notification = payload.new;
      const connection = this.connections.get(notification.recipient_id);

      if (connection) {
        // Get additional notification data
        const { data: enrichedNotification, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:user_id (
              id,
              username,
              avatar
            )
          `)
          .eq('id', notification.id)
          .single();

        if (error) throw error;

        // Send notification to connected user
        connection.ws.send(JSON.stringify({
          type: 'notification',
          data: enrichedNotification
        }));

        logger.debug(`Sent notification to user ${notification.recipient_id}`);
      }
    } catch (err) {
      logger.error('Error handling new notification:', err);
    }
  }

  public shutdown() {
    clearInterval(this.heartbeatInterval);
    for (const connection of this.connections.values()) {
      connection.ws.close(1000, 'Server shutting down');
    }
    this.wss.close();
    logger.info('Notification handler shut down');
  }
}

export default NotificationHandler;