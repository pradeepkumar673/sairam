import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import ChatMessage from "../models/ChatMessage";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { Types } from "mongoose";

export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { familyId } = req.params;

  if (!Types.ObjectId.isValid(familyId)) {
    const messages = await ChatMessage.find({ familyId }).populate("senderId", "firstName lastName avatar").sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, { messages }));
  }

  const messages = await ChatMessage.find({ familyId: new Types.ObjectId(familyId) })
    .populate("senderId", "firstName lastName avatar")
    .sort({ createdAt: 1 });

  res.status(200).json(new ApiResponse(200, { messages }));
});
