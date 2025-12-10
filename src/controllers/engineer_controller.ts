import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { ERBEngineer } from "../models";

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
      // "reg_no",
      "name",
    ];

    // Validate
    for (const row of records) {
      for (const field of requiredFields) {
        if (!row[field as keyof EngineerCsvRow]) {
          return res.status(400).json({
            message: `Missing required field: ${field}`,
            row,
          });
        }
      }
    }

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
    console.error("CSV Import Error:", error);
    return res.status(500).json({ message: "Error importing CSV", error });
  }
};

export const checkhealth  = async ( req: Request, res: Response ) => {
  return res.status(200).json({
    message: "API & Server is running...",
  });
}
