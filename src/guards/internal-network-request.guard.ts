import { AuthGuard, ExecutionContext, Injectable } from "@danet/core";

@Injectable()
export class InternalNetworkRequestGuard implements AuthGuard {
  constructor() {}

  // Guard agaisnt access outside the railway network
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const edgeHeader = context.req.raw.headers.get("x-railway-edge");
    const edgeRequestIdHeader = context.req.raw.headers.get(
      "x-railway-request-id",
    );
    if (
      (edgeHeader && edgeHeader.length > 0) ||
      (edgeRequestIdHeader && edgeRequestIdHeader.length > 0)
    ) {
      return false;
    }
    return true;
  }
}
