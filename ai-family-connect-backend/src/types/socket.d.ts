import "socket.io";

declare module "socket.io" {
  interface Socket {
    data: {
      userId: string;
      name?: string;
      role?: string;
    };
  }
}