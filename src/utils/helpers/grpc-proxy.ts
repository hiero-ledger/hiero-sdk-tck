import http2 from "node:http2";
import type { AddressInfo } from "node:net";

import { proto } from "@hashgraph/proto";

export interface GrpcCapture {
  /** gRPC method path, e.g. "/proto.CryptoService/getAccountInfo". */
  path: string;
  /** Raw request body: 5-byte gRPC frame header followed by the protobuf message. */
  requestBody: Buffer;
}

/**
 * gRPC-aware pass-through proxy between the SDK server and a consensus node,
 * per the proxy contract in
 * docs/test-specifications/crypto-service/ClientPing.md. One instance is one
 * listener with a fixed upstream node, so a capture is attributed to a node
 * identity by the proxy instance that recorded it.
 */
export class GrpcProxy {
  readonly captures: GrpcCapture[] = [];

  private server: http2.Http2Server;
  private readonly sessions = new Set<http2.ServerHttp2Session>();
  private port = 0;
  private listening = false;

  private constructor(private readonly upstream: string) {
    this.server = this.createServer();
  }

  /**
   * Starts a proxy on an ephemeral 127.0.0.1 port forwarding to `upstream`
   * (a "host:port" consensus node endpoint).
   */
  static async start(upstream: string): Promise<GrpcProxy> {
    const proxy = new GrpcProxy(upstream);
    await proxy.listen();
    return proxy;
  }

  /** The listener address to hand to `setup` as `nodeIp`. */
  get address(): string {
    return `127.0.0.1:${this.port}`;
  }

  /** Drops all recorded captures. */
  clear(): void {
    this.captures.length = 0;
  }

  /**
   * Makes the node unreachable: the listener refuses new connections and
   * severs the ones already established.
   */
  async block(): Promise<void> {
    if (!this.listening) {
      return;
    }
    this.listening = false;

    for (const session of this.sessions) {
      session.destroy();
    }
    this.sessions.clear();

    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  /** Reopens the listener on the same port. */
  async unblock(): Promise<void> {
    if (this.listening) {
      return;
    }
    this.server = this.createServer();
    await this.listen();
  }

  async stop(): Promise<void> {
    await this.block();
  }

  private createServer(): http2.Http2Server {
    const server = http2.createServer();

    server.on("session", (session) => {
      this.sessions.add(session);
      session.on("close", () => this.sessions.delete(session));
    });

    server.on("stream", (stream, headers) => this.forward(stream, headers));

    return server;
  }

  private listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen({ host: "127.0.0.1", port: this.port }, () => {
        this.port = (this.server.address() as AddressInfo).port;
        this.listening = true;
        resolve();
      });
    });
  }

  private forward(
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders,
  ): void {
    const chunks: Buffer[] = [];
    const capture: GrpcCapture = {
      path: String(headers[":path"]),
      requestBody: Buffer.alloc(0),
    };
    this.captures.push(capture);

    const upstreamSession = http2.connect(`http://${this.upstream}`);
    const upstreamRequest = upstreamSession.request({ ...headers });

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      capture.requestBody = Buffer.concat(chunks);
      upstreamRequest.write(chunk);
    });
    stream.on("end", () => upstreamRequest.end());

    // gRPC statuses normally arrive in trailers; a trailers-only response
    // carries them in its headers instead, so seed the trailers from the
    // headers and let real trailers overwrite them.
    let trailers: http2.OutgoingHttpHeaders = {};
    upstreamRequest.on("response", (responseHeaders) => {
      for (const key of Object.keys(responseHeaders)) {
        if (key.startsWith("grpc-")) {
          trailers[key] = responseHeaders[key];
        }
      }
      stream.respond({ ...responseHeaders }, { waitForTrailers: true });
    });
    upstreamRequest.on("data", (chunk) => stream.write(chunk));
    upstreamRequest.on("trailers", (upstreamTrailers) => {
      trailers = { ...upstreamTrailers };
    });
    stream.on("wantTrailers", () => stream.sendTrailers(trailers));
    upstreamRequest.on("end", () => {
      stream.end();
      upstreamSession.close();
    });

    const abort = () => {
      upstreamSession.destroy();
      if (!stream.destroyed) {
        stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
      }
    };
    upstreamSession.on("error", abort);
    upstreamRequest.on("error", abort);
    stream.on("error", () => upstreamSession.destroy());
  }
}

/** Decodes the protobuf Query inside a captured gRPC request frame. */
export const decodeQueryCapture = (capture: GrpcCapture): proto.Query => {
  const length = capture.requestBody.readUInt32BE(1);
  return proto.Query.decode(capture.requestBody.subarray(5, 5 + length));
};
