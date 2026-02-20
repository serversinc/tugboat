import { AsyncLocalStorage } from "async_hooks";

type ReqContext = {
  requestId?: string;
};

const als = new AsyncLocalStorage<ReqContext>();

export function runWithRequestContext<T>(ctx: ReqContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}
