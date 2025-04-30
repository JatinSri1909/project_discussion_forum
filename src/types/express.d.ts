import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export type AuthenticatedRequestHandler = RequestHandler<
  ParamsDictionary,
  any,
  any,
  ParsedQs,
  Record<string, any>
>;

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;