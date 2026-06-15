import { WS_URL } from '../constants/config';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private userId: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  connect(userId: number) {
    this.userId = userId;
    this.doConnect();
  }

  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.isConnected = true;
        // Authenticate
        if (this.userId) {
          this.ws?.send(JSON.stringify({
            type: 'auth',
            user_id: this.userId,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = this.handlers.get(data.type) || [];
          handlers.forEach((handler) => handler(data.payload));
        } catch (e) {
          console.warn('WebSocket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        // Auto reconnect after 3 seconds
        this.reconnectTimer = setTimeout(() => this.doConnect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
      this.reconnectTimer = setTimeout(() => this.doConnect(), 5000);
    }
  }

  on(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || [];
    this.handlers.set(type, handlers.filter((h) => h !== handler));
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    // Do NOT clear handlers here, otherwise global listeners in _layout.tsx will be lost after logout!
  }

  getIsConnected() {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
export default wsService;
