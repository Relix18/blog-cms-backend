import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/errorHandler.js";
import { ControllerType } from "../types/types.js";

export const errorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  const response = {
    success: false,
    message: err.message,
  };

  res.status(err.statusCode).json(response);
};

export const TryCatch =
  (passedFunc: ControllerType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await passedFunc(req, res, next);
    } catch (error) {
      next(error);
    }
  };
