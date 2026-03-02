import { Request, Response } from "express";
import { ERBWed } from "../models";

export const createERBWed = async (req: Request, res: Response) => {
  try {
    const receiptPath = req.file ? req.file.path : null;

    const record = await ERBWed.create({
      ...req.body,
      receipt_document: "",
    });

    return res.status(201).json({
      success: true,
      message: "Record created successfully",
      data: record,
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export const updateERBWed = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
  
      const record = await ERBWed.findByPk(id);
  
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Record not found",
        });
      }
  
      // if (req.file) {
      //   req.body.receipt_document = req.file.path;
      // }
  
      await record.update(req.body);
  
      return res.status(200).json({
        success: true,
        message: "Record updated successfully",
        data: record,
      });
  
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
}

export const getAllERBWed = async (_req: Request, res: Response) => {
    try {
      const records = await ERBWed.findAll({
        order: [["created_at", "DESC"]],
      });
  
      return res.status(200).json({
        success: true,
        data: records,
      });
  
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch records",
        error: error.message,
      });
    }
  }
  
  
  /**
   * @desc Get single record
   * @route GET /api/erb-wed/:id
   */
  export const getSingleERBWed = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
  
      const record = await ERBWed.findByPk(id);
  
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Record not found",
        });
      }
  
      return res.status(200).json({
        success: true,
        data: record,
      });
  
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch record",
        error: error.message,
      });
    }
  }