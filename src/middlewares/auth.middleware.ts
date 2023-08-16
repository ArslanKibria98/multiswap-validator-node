import { Request, Response, NextFunction } from "express";
var jwt = require("jsonwebtoken");
let authorizationError = "Authorization header missing";
let invalidToken = "Invalid token";

const auth =
  (...requiredRights: string[]) =>
  async (req: any, res: any, next: NextFunction) => {
    if (!req.headers.authorization) {
      return res.http401(authorizationError);
    } else {
      try {
        const token = req.headers.authorization.split(" ")[1];
        if (token && token == (global as any).AWS_ENVIRONMENT.API_KEY) {
          next();
        }
      } catch (error) {
        (global as any).log.error(error);
      }
      return res.http401(invalidToken);
    }
  };
export default auth;
