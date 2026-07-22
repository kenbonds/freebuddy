import "express";

declare module "express" {
  interface Response {
    jsonError: (msg: string, code?: number) => void;
  }
}
