import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { ERBEngineer,  ERBPaid } from "../models";

import { engineers } from './fixtures'

interface EngineerCsvRow {
  reg_date: string;
  organisation: string;
  country: string;
  reg_no: string;
  name: string;
  gender?: string;
  field?: string;
  address?: string;
  phones?: string;
  emails?: string;
  uipe_number?: string;
  qualification?: string;
}

interface PaidCsvRow {
  record_no: string;
  reg_no: string;
  name: string;
  specialization?: string;
  license_no?: string;
  email_address?: string;
  base_field?: string;
  issue_date?: string;
  period?: number;
}

export const importEngineersFromCsv = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const csvBuffer = req.file.buffer.toString();

    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as EngineerCsvRow[];

    if (!records.length) {
      return res.status(400).json({ message: "CSV contains no data" });
    }

    const requiredFields = [
      "reg_no",
      "name",
    ];

    // Validate
    // for (const row of records) {
    //   for (const field of requiredFields) {
    //     if (!row[field as keyof EngineerCsvRow]) {
    //       return res.status(400).json({
    //         message: `Missing required field: ${field}`,
    //         row,
    //       });
    //     }
    //   }
    // }

    const inserted = [];

    for (const row of records) {
      const engineer = await ERBEngineer.create({
        reg_date: new Date(row.reg_date),
        organisation: row.organisation,
        country: row.country,
        reg_no: row.reg_no,
        name: row.name,
        gender: row.gender || null,
        field: row.field || null,
        address: row.address || null,
        phones: row.phones || null,
        emails: row.emails || null,
        uipe_number: row.uipe_number || null,
        qualification: row.qualification || null,
      });

      inserted.push(engineer);
    }

    return res.status(200).json({
      message: "CSV imported successfully",
      inserted: records.length,
      // data: records,
    });
  } catch (error) {
    // console.error("CSV Import Error:", error);
    return res.status(500).json({ message: "Error importing CSV", error });
  }
}


export const importPaidList = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const csvBuffer = req.file.buffer.toString();

    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as PaidCsvRow[];

    if (!records.length) {
      return res.status(400).json({ message: "CSV contains no data" });
    }

    const requiredFields = [
      "reg_no",
      "name",
    ];

    const inserted = [];

    for (const row of records) {
      const item = await ERBPaid.create({
        record_no: row.record_no,
        reg_no: row.reg_no,
        name: row.name,
        specialization: row.specialization || "",
        license_no: row.license_no || "",
        email_address: row.email_address || "",
        base_field: row.base_field || "",
        period: row.period || ""
      });

      inserted.push( item );
    }

    return res.status(200).json({
      message: "CSV imported successfully",
      inserted: records.length,
      // data: records,
    });
  } catch (error) {
    console.error("CSV Import Error:", error);
    return res.status(500).json({ message: "Error importing CSV", error });
  }
}

export const getAllPaidRecords = async (req: Request, res: Response) => {
  try {
    const records = await ERBPaid.findAll({
      order: [["id", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Error fetching paid records:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching paid records",
    });
  }
}

export const getPaidRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await ERBPaid.findByPk(Number(id));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Record with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error fetching paid record:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching paid record",
    });
  }
}


export const updateERBPaid = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Find the record first
    const record = await ERBPaid.findByPk(id);

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Update the record with new data
    await record.update(updateData);

    return res.status(200).json({
      message: "Record updated successfully",
      data: record,
    });
  } catch (error) {
    // console.error("Error updating ERBPaid record:", error);
    return res.status(500).json({
      message: "Failed to update record",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const checkhealth  = async ( req: Request, res: Response ) => {
  return res.status(200).json({
    message: "API & Server is running...",
  });
}

export const insertEngineers =  async ( req: Request, res: Response ) => {
  const [ engineers ] = req.body;
  
  try {
    await ERBEngineer.bulkCreate( engineers );
    return res.status(200).json(
      { success: true, message: "Engineers inserted successfully!" }
    );
  } catch (err) {
    // console.error("Error inserting engineers:", err);
    // return { success: false, message: err };
    return res.status(500).json(
      { success: false, err: err }
    );
  }
}

export async function addEngineer( req: Request, res: Response ) {

  const { engineer } =  req.body

  try {
    const record = await ERBEngineer.create({
      reg_date: engineer.reg_date,
      organisation: engineer.organisation,
      reg_no: engineer.reg_no,
      country: engineer.country,
      name: engineer.name,
      gender: engineer.gender ?? null,
      field: engineer.field ?? null,
      address: engineer.address ?? null,
      phones: engineer.phones ?? null,
      emails: engineer.emails ?? null,
      uipe_number: engineer.uipe_number ?? null,
      qualification: engineer.qualification ?? null,
      amount_paid: engineer.amount_paid ?? null,
      purpose: engineer.purpose ?? null,
    });

    return res.status(201).json(
      { success: true, message: "Engineer inserted successfully!",  data: record, }
    );
  } catch (err: any) {
    // console.error('Error inserting engineer:', err);
    return res.status(500).json(
      { success: false, message: err.message }
    );
  }
}


//insert one paid record
export const insertPaidRecord =  async (  req: Request, res: Response ) =>  {
  try {

    // data: {
    //   record_no?: number;
    //   reg_no?: string;
    //   name: string;
    //   specialization?: string;
    //   license_no: string;
    //   email_address?: string;
    //   base_field?: string;
    //   issue_date?: string;
    //   period?: string;
    //   license_status?: number;
    //   category?: string;
    //   amount_paid?: string;
    //   year_paid?: string;
    //   email_status?: string;
    //   purpose?: string;
    // }

    const { data } = req.body;

    const record = await ERBPaid.create({
      record_no: data.record_no ?? null,
      reg_no: data.reg_no ?? null,
      name: data.name,
      specialization: data.specialization ?? null,
      license_no: data.license_no,
      email_address: data.email_address ?? null,
      base_field: data.base_field ?? null,
      issue_date: data.issue_date ?? null,
      period: data.period ?? null,
      license_status: data.license_status ?? null,
      category: data.category ?? null,
      amount_paid: data.amount_paid ?? null,
      year_paid: data.year_paid ?? null,
      email_status: data.email_status ?? null,
      purpose: data.purpose ?? null,
    });

    // return {
    //   success: true,
    //   message: 'Paid record inserted successfully',
    //   data: record,
    // };
    return res.status(200).json(
      { success: true, message: "Engineers inserted successfully!", data: record }
    );
  } catch (error: any) {
    // console.error('Insert ERBPaid failed:', error);
    // return {
    //   success: false,
    //   message: error.message,
    // };
    return res.status(500).json(
      { success: false, err: error }
    );
  }
}



