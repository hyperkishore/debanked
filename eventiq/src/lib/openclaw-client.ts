"use client";

/**
 * OpenClaw Gateway WebSocket client for the MissionIQ chat widget.
 *
 * Protocol: OpenClaw Gateway v3 (custom frame-based, NOT JSON-RPC)
 *   Frame types: req, res, event
 *   Connect: ws://host:port (root path, no /ws)
 *   Auth: inside first `connect` request frame
 *   Chat: `chat.send` method with sessionKey
 *   Responses: `chat` events with state: delta/final
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

// OpenClaw frame types
interface OcReq {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface OcRes {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code?: string; message?: string };
}

interface OcEvent {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
}

type OcFrame = OcReq | OcRes | OcEvent;

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private options: OpenClawClientOptions;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reqCounter = 0;
  private sessionKey: string | null = null;
  private currentRunId: string | null = null;
  private streamContent = "";

  constructor(options: OpenClawClientOptions) {
    this.options = options;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.options.onStateChange("connecting");

    // OpenClaw gateway: connect to root path (no /ws suffix)
    // Remove trailing /ws if present
    let wsUrl = this.options.wsUrl;
    if (wsUrl.endsWith("/ws")) {
      wsUrl = wsUrl.slice(0, -3);
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.options.onStateChange("error");
      this.options.onError("Failed to create WebSocket connection");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Send connect request (mandatory first frame)
      this.sendReq("connect", {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "openclaw-control-ui",
          displayName: "EventIQ MissionIQ",
          version: "1.0.0",
          platform: "browser",
          mode: "webchat",
        },
        role: "operator",
        scopes: ["operator.read", "operator.write"],
        auth: { token: this.options.token },
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data) as OcFrame;
        this.handleFrame(frame);
      } catch {
        // Non-JSON — ignore
      }
    };

    this.ws.onclose = (event) => {
      this.options.onStateChange("disconnected");
      this.sessionKey = null;
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.options.onStateChange("error");
      this.options.onError("WebSocket connection error");
    };
  }

  private nextId(): string {
    return `r${++this.reqCounter}`;
  }

  private sendReq(method: string, params?: Record<string, unknown>): string {
    const id = this.nextId();
    const frame: OcReq = { type: "req", id, method };
    if (params) frame.params = params;
    this.ws?.send(JSON.stringify(frame));
    return id;
  }

  private handleFrame(frame: OcFrame) {
    switch (frame.type) {
      case "res":
        this.handleResponse(frame as OcRes);
        break;
      case "event":
        this.handleEvent(frame as OcEvent);
        break;
    }
  }

  private handleResponse(res: OcRes) {
    if (!res.ok) {
      const errMsg = res.error?.message || "Request failed";
      this.options.onError(errMsg);
      return;
    }

    const payload = res.payload as Record<string, unknown> | undefined;

    // hello-ok response from connect
    if (payload?.type === "hello-ok") {
      this.reconnectAttempts = 0;
      this.options.onStateChange("connected");

      // Extract session key for the target agent
      const snapshot = payload.snapshot as Record<string, unknown> | undefined;
      const defaults = snapshot?.sessionDefaults as Record<string, unknown> | undefined;

      // For a specific agent, construct the session key
      const agentId = this.options.agent || (defaults?.defaultAgentId as string) || "main";
      const mainKey = (defaults?.mainKey as string) || "main";
      this.sessionKey = `agent:${agentId}:${mainKey}`;
    }

    // chat.send accepted
    if (payload?.status === "accepted" && payload?.runId) {
      this.currentRunId = payload.runId as string;
      this.streamContent = "";
      this.options.onTyping(true);
    }
  }

  private handleEvent(ev: OcEvent) {
    switch (ev.event) {
      case "chat":
        this.handleChatEvent(ev.payload || {});
        break;
      case "tick":
        // Heartbeat — ignore
        break;
      case "shutdown":
        this.options.onError("Gateway is shutting down");
        break;
    }
  }

  /** Extract text from message content (may be string or array of {type,text} blocks) */
  private extractText(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string")
        .map((b: Record<string, unknown>) => b.text as string)
        .join("");
    }
    return "";
  }

  private handleChatEvent(payload: Record<string, unknown>) {
    const state = payload.state as string;
    const runId = payload.runId as string;

    if (state === "delta") {
      // Streaming chunk — content is the full accumulated text so far
      const message = payload.message as Record<string, unknown> | undefined;
      const content = this.extractText(message?.content) || (message?.text as string) || "";
      if (content) {
        this.streamContent = content;
        this.options.onStreamChunk?.(this.streamContent, runId || "stream");
      }
    } else if (state === "final") {
      // Complete response
      const message = payload.message as Record<string, unknown> | undefined;
      const finalContent = this.extractText(message?.content) || (message?.text as string) || this.streamContent;
      this.options.onMessage({
        id: runId || crypto.randomUUID(),
        role: "assistant",
        content: finalContent,
        timestamp: new Date(),
      });
      this.options.onTyping(false);
      this.currentRunId = null;
      this.streamContent = "";
    } else if (state === "error") {
      const errorMsg = (payload.errorMessage as string) || "Agent error";
      this.options.onError(errorMsg);
      this.options.onTyping(false);
      this.currentRunId = null;
      this.streamContent = "";
    } else if (state === "aborted") {
      // Partial output may exist
      if (this.streamContent) {
        this.options.onMessage({
          id: runId || crypto.randomUUID(),
          role: "assistant",
          content: this.streamContent,
          timestamp: new Date(),
        });
      }
      this.options.onTyping(false);
      this.currentRunId = null;
      this.streamContent = "";
    }
  }

  sendMessage(content: string, _conversationId?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionKey) {
      this.options.onError("Not connected to agent");
      return false;
    }

    this.sendReq("chat.send", {
      sessionKey: this.sessionKey,
      message: content,
      idempotencyKey: crypto.randomUUID(),
    });

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
    this.sessionKey = null;
    this.options.onStateChange("disconnected");
  }

  get state(): ConnectionState {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return this.sessionKey ? "connected" : "connecting";
      default:
        return "disconnected";
    }
  }
}
