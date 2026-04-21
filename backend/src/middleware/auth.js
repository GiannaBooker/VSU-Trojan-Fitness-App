import { accessDb } from "../storage.js";
import { verifyJwt } from "../jwt.js";

export function createAuthMiddleware({ jwtSecret }) {
  return async function requireAuth(req, res, next) {
    try {
      const authHeader = req.get("authorization") || "";
      const [scheme, token] = authHeader.split(" ");
      if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing bearer token" });
      }

      const payload = verifyJwt(token, jwtSecret);

      const revoked = await accessDb((db) =>
        db.revokedTokens.some((item) => item.jti === payload.jti),
      );
      if (revoked) {
        return res.status(401).json({ error: "Token revoked" });
      }

      req.user = { id: payload.sub, email: payload.email };
      req.token = { jti: payload.jti, exp: payload.exp };
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

