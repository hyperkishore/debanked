"use client";

/**
 * OpenClaw WebSocket client for the MissionIQ chat widget.
 *
 * Connects to the OpenClaw gateway via WebSocket (Tailscale Funnel).
 * Handles authentication, message exchange, reconnection, and typing indicators.
 *
 * Protocol (OpenClaw Gateway WebSocket):
 *   Connect: wss://host/ws?token=<gateway-token>&agent=missioniq
 *   Send:    { type: "message", content: string, conversationId?: string, userId?: string }
 *   Receive: { type: "message", content: string, done: boolean }
 *            { type: "typing", isTyping: boolean }
 *            { type: "error", message: string }
 *            { type: "connected", agent: string }
 */

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface OpenClawClientOptions {
  wsUrl: string;
  token: string;
  agent?: string;
  userId?: string;
  onMessage: (message: ChatMessage) => void;
  onTyping: (isTyping: boolean) => void;
  onStateChange: (state: ConnectionState) => void;
  onError: (error: string) => void;
  onStreamChunk?: (chunk: string, messageId: string) => void;
}

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private options: OpenClawClientOptions;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentStreamId: string | null = null;
  private currentStreamContent = "";

  constructor(options: OpenClawClientOptions) {
    this.options = options;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.options.onStateChange("connecting");

    const url = new URL(this.options.wsUrl);
    url.searchParams.set("token", this.options.token);
    if (this.options.agent) {
      url.searchParams.set("agent", this.options.agent);
    }
    if (this.options.userId) {
      url.searchParams.set("userId", this.options.userId);
    }

    try {
      this.ws = new WebSocket(url.toString());
    } catch {
      this.options.onStateChange("error");
      this.options.onError("Failed to create WebSocket connection");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onStateChange("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch {
        // Non-JSON message — treat as plain text response
        this.options.onMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: event.data,
          timestamp: new Date(),
        });
      }
    };

    this.ws.onclose = (event) => {
      this.options.onStateChange("disconnected");
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.options.onStateChange("error");
      this.options.onError("WebSocket connection error");
    };
  }

  private handleMessage(data: {
    type: string;
    content?: string;
    message?: string;
    isTyping?: boolean;
    done?: boolean;
    messageId?: string;
    agent?: string;
  }) {
    switch (data.type) {
      case "message":
        if (data.done === false && data.content) {
          // Streaming chunk
          if (!this.currentStreamId) {
            this.currentStreamId = data.messageId || crypto.randomUUID();
            this.currentStreamContent = "";
          }
          this.currentStreamContent += data.content;
          this.options.onStreamChunk?.(this.currentStreamContent, this.currentStreamId);
        } else {
          // Complete message or single response
          const content = data.content || this.currentStreamContent;
          const id = data.messageId || this.currentStreamId || crypto.randomUUID();
          this.options.onMessage({
            id,
            role: "assistant",
            content,
            timestamp: new Date(),
          });
          this.currentStreamId = null;
          this.currentStreamContent = "";
          this.options.onTyping(false);
        }
        break;

      case "typing":
        this.options.onTyping(data.isTyping ?? true);
        break;

      case "error":
        this.options.onError(data.message || "Unknown error from agent");
        this.options.onTyping(false);
        break;

      case "connected":
        // Agent confirmed connection
        break;
    }
  }

  sendMessage(content: string, conversationId?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.options.onError("Not connected to agent");
      return false;
    }

    this.ws.send(
      JSON.stringify({
        type: "message",
        content,
        conversationId,
        userId: this.options.userId,
      })
    );

    this.options.onTyping(true);
    return true;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.options.onError("Max reconnection attempts reached. Please refresh the page.");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnected");
      this.ws = null;
    }
    this.options.onStateChange("disconnected");
  }

  get state(): ConnectionState {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      default:
        return "disconnected";
    }
  }
}
