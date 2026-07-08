import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { ERBEngineer,  ERBPaid } from "../models";
import { Sequelize, Op } from 'sequelize';

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


const normalizeString = (val: unknown): string =>
  typeof val === "string" ? val.trim() : "";

/**
 * Sanitise a single raw row into the shape expected by ERBEngineer.
 * Accepts both snake_case (CSV/DB) and camelCase (form payload) keys.
 */
const sanitizeEngineerPayload = (raw: Record<string, unknown>) => ({
  reg_date:     normalizeString(raw.reg_date     ?? raw.regDate),
  organisation: normalizeString(raw.organisation),
  country:      normalizeString(raw.country),
  reg_no:       normalizeString(raw.reg_no       ?? raw.regNo),
  name:         normalizeString(raw.name),
  gender:       normalizeString(raw.gender)       || null,
  field:        normalizeString(raw.field)        || null,
  address:      normalizeString(raw.address)      || null,
  phones:       normalizeString(raw.phones)       || null,
  emails:       normalizeString(raw.emails)       || null,
  uipe_number:  normalizeString(raw.uipe_number  ?? raw.uipeNumber)  || null,
  qualification:normalizeString(raw.qualification)|| null,
  primary_email:    normalizeString(raw.primary_email    ?? raw.primaryEmail)    || null,
  secondary_email:  normalizeString(raw.secondary_email  ?? raw.secondaryEmail)  || null,
  primary_contact:  normalizeString(raw.primary_contact  ?? raw.primaryContact)  || null,
  secondary_contact:normalizeString(raw.secondary_contact?? raw.secondaryContact)|| null,
  photo:        normalizeString(raw.photo)        || null,
  type:         normalizeString(raw.type)         || null,
});


const REQUIRED_FIELDS = ["reg_date", "organisation", "country", "reg_no", "name"] as const;

const validateRequired = (
  payload: ReturnType<typeof sanitizeEngineerPayload>
): string[] =>
  REQUIRED_FIELDS.filter((f) => !payload[f]);


// mthods

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

export const getPaidRecordsSummary = async (req: Request, res: Response) => {
  try {
    const records = await ERBPaid.findAll({
      attributes: ['base_field', 'specialization', 'license_status'],
      where: { license_status: 'SIGNED' }
    });

    const summary = {
      total: records.length,
      byType: {
        permanent: records.filter(r => r.base_field === 'PERMANENT').length,
        temporary: records.filter(r => r.base_field === 'TEMPORARY').length,
        technologists: records.filter(r => r.base_field === 'TECHNOLOGIST').length,
        technicians: records.filter(r => r.base_field === 'TECHNICIAN').length,
      },
      bySpecialization: records.reduce((acc, r) => {
        const spec = r.specialization?.trim();
        if (spec) acc[spec] = (acc[spec] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────
// GET /paid-records/stats — real dashboard numbers
// Aggregates over the WHOLE table (not a paginated page).
// ─────────────────────────────────────────────
const LICENSE_TYPES = ['PERMANENT', 'TEMPORARY', 'TECHNOLOGIST', 'TECHNICIAN'];

const toAmount = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export const getPaidRecordsStats = async (req: Request, res: Response) => {
  try {
    const records = await ERBPaid.findAll({
      attributes: [
        'name', 'reg_no', 'specialization', 'base_field', 'record_type',
        'license_status', 'amount_paid', 'year_paid',
        'issue_date', 'created_at',
      ],
      raw: true,
    }) as any[];

    const signed   = records.filter(r => (r.license_status || '').toUpperCase() === 'SIGNED');
    const unsigned = records.filter(r => (r.license_status || '').toUpperCase() !== 'SIGNED');

    // Revenue = signed licenses that actually have a paid amount recorded.
    const isConfirmedPayment = (r: any) =>
      (r.license_status || '').toString().trim().toUpperCase() === 'SIGNED' &&
      toAmount(r.amount_paid) > 0;

    const paidRecords = records.filter(isConfirmedPayment);

    // ── category (base_field) breakdown ─────────────────────────────
    // count = all signed/issued licenses in that category
    // revenue = signed + paid rows in that category
    const byType = LICENSE_TYPES.reduce((acc, type) => {
      const rows     = signed.filter(r => (r.base_field || '').toUpperCase() === type);
      const paidRows = paidRecords.filter(r => (r.base_field || '').toUpperCase() === type);
      acc[type.toLowerCase()] = {
        count:   rows.length,
        revenue: paidRows.reduce((sum, r) => sum + toAmount(r.amount_paid), 0),
      };
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const totalRevenue = paidRecords.reduce((sum, r) => sum + toAmount(r.amount_paid), 0);

    // ── top specializations (engineering fields) ─────────────────────
    const specStats: Record<string, { count: number; revenue: number }> = {};
    signed.forEach(r => {
      const spec = (r.specialization || '').trim();
      if (!spec) return;
      if (!specStats[spec]) specStats[spec] = { count: 0, revenue: 0 };
      specStats[spec].count += 1;
    });
    paidRecords.forEach(r => {
      const spec = (r.specialization || '').trim();
      if (!spec) return;
      if (!specStats[spec]) specStats[spec] = { count: 0, revenue: 0 };
      specStats[spec].revenue += toAmount(r.amount_paid);
    });
    const topSpecializations = Object.entries(specStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, s]) => ({ name, count: s.count, revenue: s.revenue }));

    // ── real monthly trend (last 12 months, by created_at) ──────────
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) });
    }
    const monthlyMap: Record<string, { revenue: number; count: number }> = {};
    months.forEach(m => (monthlyMap[m.key] = { revenue: 0, count: 0 }));
    paidRecords.forEach(r => {
      const d = r.created_at ? new Date(r.created_at as any) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = monthKey(d);
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += toAmount(r.amount_paid);
        monthlyMap[key].count += 1;
      }
    });
    const monthlyTrend = months.map(m => ({
      month:   m.label,
      revenue: monthlyMap[m.key].revenue,
      count:   monthlyMap[m.key].count,
    }));

    // ── month-over-month change ──────────────────────────────────────
    const thisMonth = monthlyTrend[monthlyTrend.length - 1]?.revenue ?? 0;
    const lastMonth  = monthlyTrend[monthlyTrend.length - 2]?.revenue ?? 0;
    const momChangePct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    // ── recent activity ──────────────────────────────────────────────
    // Show recent CONFIRMED payments (not just any signed record) so the
    // amounts on screen are always real, non-zero figures.
    const recentActivity = [...paidRecords]
      .sort((a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime())
      .slice(0, 8)
      .map(r => ({
        name:           r.name,
        reg_no:         r.reg_no,
        specialization: r.specialization,
        base_field:     r.base_field,
        amount_paid:    toAmount(r.amount_paid),
        date:           r.created_at,
      }));

    // ── diagnostics ────────────────────────────────────────────────
    // Groups rows by (record_type, license_status, email_status) with
    // count + amount_paid sum, so the real shape of the data is visible
    // straight from the API response — no DB client needed.
    const diagBuckets: Record<string, { record_type: string; license_status: string; email_status: string; count: number; amountPaidSum: number }> = {};
    records.forEach(r => {
      const rt = (r.record_type || '(null)').toString();
      const ls = (r.license_status || '(null)').toString();
      const es = (r.email_status || '(null)').toString();
      const key = `${rt}|${ls}|${es}`;
      if (!diagBuckets[key]) {
        diagBuckets[key] = { record_type: rt, license_status: ls, email_status: es, count: 0, amountPaidSum: 0 };
      }
      diagBuckets[key].count += 1;
      diagBuckets[key].amountPaidSum += toAmount(r.amount_paid);
    });
    const diagnostics = Object.values(diagBuckets).sort((a, b) => b.amountPaidSum - a.amountPaidSum);

    return res.status(200).json({
      success: true,
      data: {
        totalRecords:     records.length,
        totalSigned:      signed.length,
        totalUnsigned:    unsigned.length,
        totalPaidRecords: paidRecords.length,
        totalRevenue,
        avgRevenue:       paidRecords.length ? Math.round(totalRevenue / paidRecords.length) : 0,
        momChangePct,
        byType,
        topSpecializations,
        monthlyTrend,
        recentActivity,
        diagnostics,
      },
    });
  } catch (error) {
    console.error('Error fetching paid records stats:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export const getAllPaidRecords = async (req: Request, res: Response) => {
  try {
    const page                 = parseInt(req.query.page as string) || 1
    const limit                = 10
    const offset               = (page - 1) * limit
    const search               = (req.query.search as string)?.trim()
    const specialization       = req.query.specialization as string
    const emailStatus          = req.query.email_status as string
    const licenseStatus        = (req.query.license_status as string)?.trim()
    const excludeLicenseStatus = (req.query.exclude_license_status as string)?.trim() // NEW

    // ── license_status filter ─────────────────────────────────────────────────
    // Priority:
    //   1. exclude_license_status=SIGNED  → rows where status != SIGNED or is NULL
    //   2. license_status=SIGNED          → exact match (original behaviour)
    //   3. neither sent                   → default to exact match 'SIGNED'
    const where: any = {}

    if (excludeLicenseStatus) {
      // Exclude rows with this status; also include rows where status is NULL
      // (NULL != 'SIGNED' is NULL in SQL, not TRUE — so we must handle it explicitly)
      where.license_status = {
        [Op.or]: [
          { [Op.ne]: excludeLicenseStatus },
          { [Op.is]: null },
        ],
      }
    } else {
      // Exact match — default to 'SIGNED' if nothing passed
      where.license_status = licenseStatus || 'SIGNED'
    }

    // ── specialization filter ─────────────────────────────────────────────────
    if (specialization) {
      where.specialization = specialization
    }

    // ── email_status filter ───────────────────────────────────────────────────
    if (emailStatus === 'EMAIL SENT') {
      where.email_status = 'EMAIL SENT'
    } else if (emailStatus === 'NOT SENT') {
      where[Op.and] = [
        ...(where[Op.and] ?? []),
        {
          [Op.or]: [
            { email_status: null },
            { email_status: '' },
            { email_status: { [Op.not]: 'EMAIL SENT' } },
          ],
        },
      ]
    }

    // ── search filter ─────────────────────────────────────────────────────────
    if (search) {
      where[Op.and] = [
        ...(where[Op.and] ?? []),
        {
          [Op.or]: [
            { name:           { [Op.like]: `%${search}%` } },
            { email_address:  { [Op.like]: `%${search}%` } },
            { reg_no:         { [Op.like]: `%${search}%` } },
            { specialization: { [Op.like]: `%${search}%` } },
            { license_no:     { [Op.like]: `%${search}%` } },
          ],
        },
      ]
    }

    // ── query ─────────────────────────────────────────────────────────────────
    const { count, rows: records } = await ERBPaid.findAndCountAll({
      where,
      order:  [['id', 'DESC']],
      limit,
      offset,
    })

    return res.status(200).json({
      success: true,
      count,
      data: records,
      pagination: {
        currentPage:  page,
        totalPages:   Math.ceil(count / limit),
        totalRecords: count,
        perPage:      limit,
        hasNextPage:  page < Math.ceil(count / limit),
        hasPrevPage:  page > 1,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
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
    message: "DATA API & Server is running...",
  });
}

export const insertEngineers = async (req: Request, res: Response) => {
  try {
    // const engineers = Array.isArray(req.body)
    //   ? req.body
    //   : [req.body];

    let engineers = req.body.engineers;

    if (!engineers.length) {
      return res.status(400).json({
        success: false,
        message: "No engineers provided",
      });
    }

    await ERBEngineer.bulkCreate(engineers);

    return res.status(201).json({
      success: true,
      message: "Engineers inserted successfully!",
    });

  } catch (err: any) {
    console.error("Insert error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to insert engineers",
    });
  }
}

// export async function addEngineer( req: Request, res: Response ) {

//   const { engineer } =  req.body

//   try {
//     const record = await ERBEngineer.create({
//       reg_date: engineer.reg_date,
//       organisation: engineer.organisation,
//       reg_no: engineer.reg_no,
//       country: engineer.country,
//       name: engineer.name,
//       gender: engineer.gender ?? null,
//       field: engineer.field ?? null,
//       address: engineer.address ?? null,
//       phones: engineer.phones ?? null,
//       emails: engineer.emails ?? null,
//       uipe_number: engineer.uipe_number ?? null,
//       qualification: engineer.qualification ?? null,
//       amount_paid: engineer.amount_paid ?? null,
//       purpose: engineer.purpose ?? null,
//     });

//     return res.status(201).json(
//       { success: true, message: "Engineer inserted successfully!",  data: record, }
//     );
//   } catch (err: any) {
//     // console.error('Error inserting engineer:', err);
//     return res.status(500).json(
//       { success: false, message: err.message }
//     );
//   }
// }

export const insertPaidRecord =  async (  req: Request, res: Response ) =>  {
  try {

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
    return res.status(200).json(
      { success: true, message: "Engineers inserted successfully!", data: record }
    );
  } catch (error: any) {
    return res.status(500).json(
      { success: false, err: error }
    );
  }
}


// ─────────────────────────────────────────────
// GET /engineers — list all
// ─────────────────────────────────────────────
export const getAllEngineers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search, field, type, country, page = "1", limit = "20" } = req.query;

    const where: Record<string, unknown> = {};

    if (search) {
      const like = `%${search}%`;
      where[Op.or as unknown as string] = [
        { name:   { [Op.like]: like } },
        { reg_no: { [Op.like]: like } },
        { emails: { [Op.like]: like } },
        { phones: { [Op.like]: like } },
      ];
    }

    if (field)   where.field   = field;
    if (type)    where.type    = type;
    if (country) where.country = country;

    const pageNum  = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset   = (pageNum - 1) * pageSize;

    const { count, rows } = await ERBEngineer.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      data: rows,
      meta: {
        total:       count,
        page:        pageNum,
        limit:       pageSize,
        totalPages:  Math.ceil(count / pageSize),
      },
    });
  } catch (error: any) {
    // console.error("getAllEngineers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineers.", error: error.message });
  }
}


export const getEngineerById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const engineer = await ERBEngineer.findByPk(req.params.id);
    if (!engineer) {
      res.status(404).json({ success: false, message: "Engineer not found." });
      return;
    }
    res.json({ success: true, data: engineer });
  } catch (error: any) {
    console.error("getEngineerById:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer.", error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /engineers — add single engineer
// ─────────────────────────────────────────────
export const addEngineer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = sanitizeEngineerPayload(req.body);

    // Validate required fields
    const missing = validateRequired(payload);
    if (missing.length) {
      res.status(422).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}.`,
      });
      return;
    }

    // Prevent duplicate reg_no
    const existing = await ERBEngineer.findOne({ where: { reg_no: payload.reg_no } });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `An engineer with reg_no "${payload.reg_no}" already exists.`,
      });
      return;
    }

    const engineer = await ERBEngineer.create(payload as any);

    res.status(201).json({
      success: true,
      message: "Engineer created successfully.",
      data: engineer,
    });
  } catch (error: any) {
    console.error("addEngineer:", error);
    res.status(500).json({ success: false, message: "Failed to create engineer.", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /engineers/:id — update engineer
// ─────────────────────────────────────────────
export const updateEngineer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const engineer = await ERBEngineer.findByPk(req.params.id);
    if (!engineer) {
      res.status(404).json({ success: false, message: "Engineer not found." });
      return;
    }

    const payload = sanitizeEngineerPayload({ ...engineer.toJSON(), ...req.body });

    // Validate required fields are not being blanked out
    const missing = validateRequired(payload);
    if (missing.length) {
      res.status(422).json({
        success: false,
        message: `These required fields cannot be empty: ${missing.join(", ")}.`,
      });
      return;
    }

    // If reg_no is changing, check it isn't taken by another record
    if (payload.reg_no !== engineer.reg_no) {
      const conflict = await ERBEngineer.findOne({
        where: { reg_no: payload.reg_no, id: { [Op.ne]: engineer.id } },
      });
      if (conflict) {
        res.status(409).json({
          success: false,
          message: `reg_no "${payload.reg_no}" is already assigned to another engineer.`,
        });
        return;
      }
    }

    await engineer.update(payload);

    res.json({
      success: true,
      message: "Engineer updated successfully.",
      data: engineer,
    });
  } catch (error: any) {
    console.error("updateEngineer:", error);
    res.status(500).json({ success: false, message: "Failed to update engineer.", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /engineers/:id
// ─────────────────────────────────────────────
export const deleteEngineer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const engineer = await ERBEngineer.findByPk(req.params.id);
    if (!engineer) {
      res.status(404).json({ success: false, message: "Engineer not found." });
      return;
    }
    await engineer.destroy();
    res.json({ success: true, message: "Engineer deleted successfully." });
  } catch (error: any) {
    console.error("deleteEngineer:", error);
    res.status(500).json({ success: false, message: "Failed to delete engineer.", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /engineers/batch-import
//
// Accepts:  { engineers: RawEngineer[] }
//
// Strategy (per-row):
//   • Validate required fields  → skip with error
//   • reg_no already exists     → UPDATE  (upsert)  if updateExisting=true
//                               → skip with warning  if updateExisting=false
//   • Otherwise                 → INSERT
//
// Query param: ?updateExisting=true   (default false)
// ─────────────────────────────────────────────────────────────────────────────
export const batchImportEngineers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const updateExisting = req.query.updateExisting === "true";
  const raw: unknown[] = req.body.engineers;

  if (!Array.isArray(raw) || raw.length === 0) {
    res.status(422).json({
      success: false,
      message: 'Request body must contain a non-empty "engineers" array.',
    });
    return;
  }

  const MAX_BATCH = 1000;
  if (raw.length > MAX_BATCH) {
    res.status(422).json({
      success: false,
      message: `Batch size exceeds the limit of ${MAX_BATCH} records. Split your import into smaller chunks.`,
    });
    return;
  }

  const results = {
    inserted:  0,
    updated:   0,
    skipped:   0,
    errors:    [] as { row: number; reg_no?: string; reason: string }[],
  };

  for (let i = 0; i < raw.length; i++) {
    const rowNum = i + 1;

    try {
      const payload = sanitizeEngineerPayload(raw[i] as Record<string, unknown>);

      // Validate required fields
      const missing = validateRequired(payload);
      if (missing.length) {
        results.errors.push({
          row: rowNum,
          reg_no: payload.reg_no || undefined,
          reason: `Missing required fields: ${missing.join(", ")}.`,
        });
        results.skipped++;
        continue;
      }

      // Check for existing record
      const existing = await ERBEngineer.findOne({ where: { reg_no: payload.reg_no } });

      if (existing) {
        if (updateExisting) {
          await existing.update(payload);
          results.updated++;
        } else {
          results.errors.push({
            row: rowNum,
            reg_no: payload.reg_no,
            reason: `reg_no "${payload.reg_no}" already exists. Pass ?updateExisting=true to overwrite.`,
          });
          results.skipped++;
        }
        continue;
      }

      await ERBEngineer.create(payload as any);
      results.inserted++;

    } catch (err: any) {
      console.error(`batchImport row ${rowNum}:`, err);
      results.errors.push({
        row: rowNum,
        reason: err.message ?? "Unexpected error.",
      });
      results.skipped++;
    }
  }

  const allFailed = results.inserted === 0 && results.updated === 0;

  res.status(allFailed ? 422 : 200).json({
    success: !allFailed,
    message: `Import complete. Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped: ${results.skipped}.`,
    results,
  });
};