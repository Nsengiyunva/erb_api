// ─────────────────────────────────────────────────────────────────────────────
// Engineers Database (registry) — list / detail / create / update
//
// Mounted under /api/engineers/registry (see engineer_routes.ts). These are
// separate from the legacy GET/PUT /api/engineers/:id handlers because
// PUT /:id was registered for erb_paid_list (updateERBPaid) first, so every
// "Save" on the Edit Engineer page was actually writing to the paid list.
//
// Each engineer row is enriched with:
//   • account      — the portal account (old_users) whose email matches any
//                    of the engineer's emails (emails / primary / secondary)
//   • photo_url    — the account's profile picture (fallback: the old_users
//                    row whose licence_no = reg_no, then engineer.photo)
//   • licence      — the issued licence for ?licence_year (default: this
//                    year) from erb_paid_list, plus any portal renewal
//                    payment for that year from payment_transactions
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import path from "path";
import { Op, QueryTypes, Sequelize, WhereOptions } from "sequelize";
import { sequelize, ERBEngineer, ERBPaid } from "../models";
import OldUser from "../models/old_user";

const E = "`ERBEngineer`"; // alias Sequelize gives erb_engineer in queries
const PICTURE_BASE = "https://data.erb.go.ug/old/users/uploads/";

// ── Schema guard ────────────────────────────────────────────────────────────
// The model always declared fewer columns than the forms/import sent. Add
// any that are missing so saves stop silently dropping them.
const EXTRA_COLUMNS: Record<string, string> = {
  primary_email: "VARCHAR(255) NULL",
  secondary_email: "VARCHAR(255) NULL",
  primary_contact: "VARCHAR(255) NULL",
  secondary_contact: "VARCHAR(255) NULL",
  photo: "VARCHAR(500) NULL",
  type: "VARCHAR(30) NULL",
};

let hasPaymentTransactions = false;

export const ensureEngineerColumns = async (): Promise<void> => {
  try {
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable("erb_engineer");
    for (const [name, ddl] of Object.entries(EXTRA_COLUMNS)) {
      if (!cols[name]) {
        await sequelize.query(`ALTER TABLE erb_engineer ADD COLUMN \`${name}\` ${ddl}`);
        console.log(`[engineers] added missing column erb_engineer.${name}`);
      }
    }
  } catch (e: any) {
    console.error("[engineers] could not verify erb_engineer columns:", e.message);
  }
  try {
    await sequelize.getQueryInterface().describeTable("payment_transactions");
    hasPaymentTransactions = true;
  } catch {
    hasPaymentTransactions = false;
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const currentYear = () => new Date().getFullYear();

const parseYear = (v: unknown): number => {
  const y = parseInt(String(v ?? ""), 10);
  return y >= 1990 && y <= 2100 ? y : currentYear();
};

const splitEmails = (...vals: unknown[]): string[] =>
  [
    ...new Set(
      vals
        .flatMap((v) => String(v ?? "").split(/[;,\s]+/))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes("@"))
    ),
  ];

const normReg = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

const pictureUrl = (u: any): string | null => {
  const pic = u?.profile_picture || u?.user_picture;
  return pic ? PICTURE_BASE + path.basename(String(pic)) : null;
};

// SQL fragments (year is always an integer from parseYear → safe to inline)
const SQL_REG = `REPLACE(UPPER(TRIM(${E}.reg_no)),' ','')`;

const SQL_EMAIL_SET =
  `LOWER(REPLACE(REPLACE(REPLACE(CONCAT_WS(';', ${E}.emails, ${E}.primary_email, ${E}.secondary_email),' ',''),',',';'),';',','))`;

const SQL_HAS_ACCOUNT =
  `EXISTS (SELECT 1 FROM old_users u WHERE u.email IS NOT NULL AND TRIM(u.email) <> '' ` +
  `AND FIND_IN_SET(LOWER(TRIM(u.email)), ${SQL_EMAIL_SET}) > 0)`;

const paidMatch = (year: number) =>
  `COALESCE(UPPER(p.receipt_type),'') <> 'DELETED' AND (` +
  `(REPLACE(UPPER(TRIM(p.reg_no)),' ','') IN (${SQL_REG}, CONCAT(${SQL_REG}, '/${year}')) ` +
  `AND (TRIM(p.year_paid) = '${year}' OR p.license_no LIKE '%/${year}')) ` +
  `OR REPLACE(UPPER(TRIM(p.license_no)),' ','') = CONCAT(${SQL_REG}, '/${year}'))`;

const SQL_HAS_LICENCE = (year: number) =>
  `EXISTS (SELECT 1 FROM erb_paid_list p WHERE ${paidMatch(year)})`;

const SQL_LICENCE_NO = (year: number) =>
  `(SELECT p.license_no FROM erb_paid_list p WHERE ${paidMatch(year)} ORDER BY p.id DESC LIMIT 1)`;

const SQL_RENEWAL_STATUS = (year: number) =>
  `(SELECT COALESCE(t.renewal_status,'PENDING') FROM payment_transactions t ` +
  `WHERE t.purpose = 'RENEWAL' AND t.renewal_year = ${year} ` +
  `AND COALESCE(t.status,'') NOT IN ('DELETED','FAILED') ` +
  `AND REPLACE(UPPER(TRIM(t.registration_number)),' ','') = ${SQL_REG} ` +
  `ORDER BY (t.renewal_status = 'APPROVED') DESC, t.id DESC LIMIT 1)`;

const enrichAttributes = (year: number): any[] => {
  const attrs: any[] = [[Sequelize.literal(SQL_LICENCE_NO(year)), "licence_no_for_year"]];
  if (hasPaymentTransactions) {
    attrs.push([Sequelize.literal(SQL_RENEWAL_STATUS(year)), "renewal_status_for_year"]);
  }
  return attrs;
};

// Attach account + photo + licence summary to plain engineer rows.
const enrichRows = async (rows: any[], year: number) => {
  const emailsByRow = rows.map((r) => splitEmails(r.emails, r.primary_email, r.secondary_email));
  const allEmails = [...new Set(emailsByRow.flat())];
  const regNos = [...new Set(rows.map((r) => String(r.reg_no || "").trim()).filter(Boolean))];

  const or: any[] = [];
  if (allEmails.length) or.push({ email: { [Op.in]: allEmails } });
  if (regNos.length) or.push({ licence_no: { [Op.in]: regNos } });

  const users: any[] = or.length
    ? await OldUser.findAll({
        where: { [Op.or]: or },
        attributes: ["id", "email", "name", "licence_no", "tin", "profile_picture", "user_picture", "status"],
        raw: true,
      })
    : [];

  const byEmail = new Map<string, any>();
  const byReg = new Map<string, any>();
  for (const u of users) {
    if (u.email) {
      const k = String(u.email).trim().toLowerCase();
      // prefer the account that has a picture
      if (!byEmail.has(k) || (!pictureUrl(byEmail.get(k)) && pictureUrl(u))) byEmail.set(k, u);
    }
    if (u.licence_no) {
      const k = normReg(u.licence_no);
      if (!byReg.has(k) || (!pictureUrl(byReg.get(k)) && pictureUrl(u))) byReg.set(k, u);
    }
  }

  return rows.map((r, i) => {
    const account = emailsByRow[i].map((e) => byEmail.get(e)).find(Boolean) || null;
    const regUser = byReg.get(normReg(r.reg_no)) || null;
    const licenceNo = r.licence_no_for_year || null;
    const renewal = r.renewal_status_for_year || null;
    delete r.licence_no_for_year;
    delete r.renewal_status_for_year;
    return {
      ...r,
      has_account: !!account,
      account: account
        ? { id: account.id, email: account.email, name: account.name, tin: account.tin || null }
        : null,
      tin: account?.tin || r.tin || null,
      photo_url: pictureUrl(account) || pictureUrl(regUser) || r.photo || null,
      licence: {
        year,
        has_licence: !!licenceNo,
        licence_no: licenceNo,
        renewal_status: renewal, // portal renewal for that year: APPROVED / PENDING / REJECTED / null
      },
    };
  });
};

// Builds the base WHERE from search / field / type / country.
const buildBaseWhere = (q: Request["query"]): WhereOptions => {
  const { search, field, type, country } = q;
  const where: any = {};
  if (search && String(search).trim()) {
    const like = `%${String(search).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { reg_no: { [Op.like]: like } },
      { emails: { [Op.like]: like } },
      { primary_email: { [Op.like]: like } },
      { phones: { [Op.like]: like } },
      { primary_contact: { [Op.like]: like } },
      { organisation: { [Op.like]: like } },
    ];
  }
  if (field) where.field = String(field);
  if (type) {
    if (String(type) === "__none") where.type = { [Op.or]: [null, ""] };
    else where.type = String(type);
  }
  if (country) where.country = String(country);
  return where;
};

const yesNo = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  return s === "yes" || s === "true" || s === "1" ? true : s === "no" || s === "false" || s === "0" ? false : null;
};

// ── GET /registry ───────────────────────────────────────────────────────────
// Query: page, limit, search, field, type ("__none" = not set), country,
//        has_account=yes|no, licensed=yes|no, licence_year (default this year)
export const listRegistry = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

    const base = buildBaseWhere(req.query);
    const extra: any[] = [];
    const acc = yesNo(req.query.has_account);
    const lic = yesNo(req.query.licensed);
    if (acc !== null) extra.push(Sequelize.literal(acc ? SQL_HAS_ACCOUNT : `NOT ${SQL_HAS_ACCOUNT}`));
    if (lic !== null) extra.push(Sequelize.literal(lic ? SQL_HAS_LICENCE(year) : `NOT ${SQL_HAS_LICENCE(year)}`));
    const where: any = extra.length ? { [Op.and]: [base, ...extra] } : base;

    const [{ count, rows }, noAccount, noLicence, totalBase] = await Promise.all([
      ERBEngineer.findAndCountAll({
        where,
        attributes: { include: enrichAttributes(year) },
        limit: pageSize,
        offset: (pageNum - 1) * pageSize,
        order: [["name", "ASC"]],
        raw: true,
      }),
      ERBEngineer.count({ where: { [Op.and]: [base, Sequelize.literal(`NOT ${SQL_HAS_ACCOUNT}`)] } as any }),
      ERBEngineer.count({ where: { [Op.and]: [base, Sequelize.literal(`NOT ${SQL_HAS_LICENCE(year)}`)] } as any }),
      ERBEngineer.count({ where: base }),
    ]);

    const data = await enrichRows(rows as any[], year);

    res.json({
      success: true,
      data,
      meta: {
        total: count,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
        licence_year: year,
      },
      // Counts across the search/field/type filters (ignoring the
      // account/licence filters) — shown as the header chips.
      stats: { total: totalBase, without_account: noAccount, without_licence: noLicence },
    });
  } catch (error: any) {
    console.error("listRegistry:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineers.", error: error.message });
  }
};

// ── GET /registry/filters ───────────────────────────────────────────────────
export const registryFilters = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [fields, types] = await Promise.all([
      sequelize.query<{ v: string }>(
        "SELECT DISTINCT TRIM(field) AS v FROM erb_engineer WHERE field IS NOT NULL AND TRIM(field) <> '' ORDER BY v",
        { type: QueryTypes.SELECT }
      ),
      sequelize.query<{ v: string }>(
        "SELECT DISTINCT UPPER(TRIM(type)) AS v FROM erb_engineer WHERE type IS NOT NULL AND TRIM(type) <> '' ORDER BY v",
        { type: QueryTypes.SELECT }
      ),
    ]);
    res.json({
      success: true,
      fields: fields.map((r) => r.v),
      types: types.map((r) => r.v),
      current_year: currentYear(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to load filters.", error: error.message });
  }
};

// ── GET /registry/:id ───────────────────────────────────────────────────────
export const getRegistryEngineer = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    const row: any = await ERBEngineer.findOne({
      where: { id: req.params.id },
      attributes: { include: enrichAttributes(year) },
      raw: true,
    });
    if (!row) {
      res.status(404).json({ success: false, message: "Engineer not found." });
      return;
    }
    const [engineer] = await enrichRows([row], year);

    // Licence history from the issued-licence register
    const reg = normReg(row.reg_no);
    const licences = reg
      ? await ERBPaid.findAll({
          where: Sequelize.where(
            Sequelize.fn("REPLACE", Sequelize.fn("UPPER", Sequelize.fn("TRIM", Sequelize.col("reg_no"))), " ", ""),
            reg
          ),
          attributes: ["id", "license_no", "year_paid", "amount_paid", "license_status", "issue_date", "receipt_type"],
          order: [["year_paid", "DESC"], ["id", "DESC"]],
          limit: 30,
          raw: true,
        })
      : [];

    res.json({
      success: true,
      data: {
        ...engineer,
        licences: (licences as any[]).filter((l) => String(l.receipt_type || "").toUpperCase() !== "DELETED"),
      },
    });
  } catch (error: any) {
    console.error("getRegistryEngineer:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer.", error: error.message });
  }
};
