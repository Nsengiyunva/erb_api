// ─────────────────────────────────────────────────────────────────────────────
// Engineers Database (registry) — list / summary / filters / export / detail
//
// Mounted under /api/engineers/registry (see engineer_routes.ts). Separate
// from the legacy GET/PUT /api/engineers/:id handlers because PUT /:id is
// the erb_paid_list update (updateERBPaid).
//
// Each engineer is enriched with:
//   • account   — portal account (old_users) whose email matches any of the
//                 engineer's emails, OR whose licence_no is the engineer's
//                 reg_no (with/without a "/YYYY" suffix)
//   • photo_url — that account's profile picture
//   • licence   — issued licence for the licence year (erb_paid_list) and any
//                 portal renewal payment for that year (payment_transactions)
//
// PERFORMANCE: doing those matches in SQL meant a full scan of old_users and
// erb_paid_list for EVERY engineer row (non-indexable FIND_IN_SET/REPLACE),
// repeated for the page, three counts and the summary — seconds per page.
// Instead we load the four tables once into an in-memory snapshot per
// licence year (a few thousand rows), match them with hash maps, and serve
// list/summary/filters/export from memory. The snapshot is cached
// (REGISTRY_CACHE_TTL_MS, default 2 min), served stale while it refreshes
// in the background, and dropped on any write through the engineers API.
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import path from "path";
import { QueryTypes, Sequelize } from "sequelize";
import { sequelize, ERBEngineer, ERBPaid } from "../models";

const PICTURE_BASE = "https://data.erb.go.ug/old/users/uploads/";
const CACHE_TTL_MS = Number(process.env.REGISTRY_CACHE_TTL_MS) || 2 * 60_000;

// ── Schema guard ────────────────────────────────────────────────────────────
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
    const cols = await sequelize.getQueryInterface().describeTable("erb_engineer");
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
  // Warm the cache so the first page load is fast.
  getSnapshot(currentYear()).catch((e) => console.error("[engineers] warm-up failed:", e.message));
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const currentYear = () => new Date().getFullYear();

const parseYear = (v: unknown): number => {
  const y = parseInt(String(v ?? ""), 10);
  return y >= 1990 && y <= 2100 ? y : currentYear();
};

const splitEmails = (...vals: unknown[]): string[] => [
  ...new Set(
    vals
      .flatMap((v) => String(v ?? "").split(/[;,\s]+/))
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"))
  ),
];

const normReg = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
const stripYear = (v: string) => v.replace(/\/\d{4}$/, "");

const pictureUrl = (u: any): string | null => {
  const pic = u?.profile_picture || u?.user_picture;
  return pic ? PICTURE_BASE + path.basename(String(pic)) : null;
};

const TYPE_WORDS = ["PERMANENT", "TEMPORARY", "TECHNOLOGIST", "TECHNICIAN", "STUDENT"];

// Registration type as best we can tell: the `type` column; else a type
// word sitting in `country` (older CSV imports put it there); else TR*
// reg numbers are temporary engineers.
const effectiveType = (r: any): string => {
  const t = String(r.type ?? "").trim().toUpperCase();
  if (t) return t;
  const c = String(r.country ?? "").trim().toUpperCase();
  if (TYPE_WORDS.includes(c)) return c;
  if (/^TR[/.-]?\d/.test(normReg(r.reg_no))) return "TEMPORARY";
  return "";
};

const CATEGORY_TEST: Record<string, (t: string) => boolean> = {
  permanent: (t) => t.startsWith("PERM"),
  temporary: (t) => t.startsWith("TEMP"),
  technologist: (t) => t.startsWith("TECHNOLOG"),
  technician: (t) => t.startsWith("TECHNICIAN"),
};

// ── Snapshot ────────────────────────────────────────────────────────────────
type Snapshot = { year: number; builtAt: number; rows: any[]; byId: Map<string, any> };

const cache = new Map<number, { snap?: Snapshot; building?: Promise<Snapshot> }>();

export const invalidateRegistryCache = () => {
  for (const entry of cache.values()) if (entry.snap) entry.snap.builtAt = 0;
};

const buildSnapshot = async (year: number): Promise<Snapshot> => {
  const t0 = Date.now();
  const [engineers, users, paid, renewals] = await Promise.all([
    sequelize.query<any>("SELECT * FROM erb_engineer", { type: QueryTypes.SELECT }),
    sequelize.query<any>(
      "SELECT id, email, name, licence_no, tin, profile_picture, user_picture FROM old_users " +
        "WHERE (email IS NOT NULL AND email <> '') OR (licence_no IS NOT NULL AND licence_no <> '')",
      { type: QueryTypes.SELECT }
    ),
    sequelize.query<any>(
      "SELECT id, reg_no, license_no, year_paid FROM erb_paid_list " +
        "WHERE COALESCE(UPPER(receipt_type),'') <> 'DELETED' AND (TRIM(year_paid) = :y OR license_no LIKE :pat)",
      { type: QueryTypes.SELECT, replacements: { y: String(year), pat: `%/${year}` } }
    ),
    hasPaymentTransactions
      ? sequelize.query<any>(
          "SELECT id, registration_number, COALESCE(renewal_status,'PENDING') AS renewal_status FROM payment_transactions " +
            "WHERE purpose = 'RENEWAL' AND renewal_year = :y AND COALESCE(status,'') NOT IN ('DELETED','FAILED')",
          { type: QueryTypes.SELECT, replacements: { y: year } }
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Accounts by email and by reg part of licence_no (prefer ones with a photo)
  const byEmail = new Map<string, any>();
  const byReg = new Map<string, any>();
  const better = (cur: any, u: any) => !cur || (!pictureUrl(cur) && pictureUrl(u));
  for (const u of users) {
    if (u.email) {
      const k = String(u.email).trim().toLowerCase();
      if (better(byEmail.get(k), u)) byEmail.set(k, u);
    }
    if (u.licence_no) {
      const k = stripYear(normReg(u.licence_no));
      if (k && better(byReg.get(k), u)) byReg.set(k, u);
    }
  }

  // Licences for the year by reg no.
  const licenceByReg = new Map<string, { id: number; no: string }>();
  const putLic = (k: string, p: any) => {
    if (!k) return;
    const cur = licenceByReg.get(k);
    if (!cur || p.id > cur.id) licenceByReg.set(k, { id: p.id, no: p.license_no || `${k}/${year}` });
  };
  const suffix = `/${year}`;
  for (const p of paid) {
    const lic = normReg(p.license_no);
    const reg = normReg(p.reg_no);
    const yearOk = String(p.year_paid ?? "").trim() === String(year) || lic.endsWith(suffix);
    if (yearOk) putLic(reg.endsWith(suffix) ? reg.slice(0, -suffix.length) : reg, p);
    if (lic.endsWith(suffix)) putLic(lic.slice(0, -suffix.length), p);
  }

  // Portal renewal per reg no. (APPROVED > PENDING > REJECTED)
  const rank: Record<string, number> = { APPROVED: 3, PENDING: 2, REJECTED: 1 };
  const renewalByReg = new Map<string, string>();
  for (const t of renewals as any[]) {
    const k = normReg(t.registration_number);
    const s = String(t.renewal_status || "PENDING").toUpperCase();
    const cur = renewalByReg.get(k);
    if (!cur || (rank[s] || 0) > (rank[cur] || 0)) renewalByReg.set(k, s);
  }

  const rows = engineers.map((r: any) => {
    const emails = splitEmails(r.emails, r.primary_email, r.secondary_email);
    const reg = normReg(r.reg_no);
    const emailUser = emails.map((e) => byEmail.get(e)).find(Boolean) || null;
    const regUser = reg ? byReg.get(reg) || null : null;
    const account = emailUser || regUser;
    const accountEmail = account?.email ? String(account.email).trim() : null;
    const lic = reg ? licenceByReg.get(reg) : undefined;
    const etype = effectiveType(r);
    return {
      ...r,
      effective_type: etype || null,
      has_account: !!account,
      account: account
        ? {
            id: account.id,
            email: accountEmail,
            name: account.name,
            tin: account.tin || null,
            licence_no: account.licence_no || null,
            matched_by: emailUser ? "email" : "reg_no",
            email_mismatch: !!accountEmail && !emails.includes(accountEmail.toLowerCase()),
          }
        : null,
      tin: account?.tin || r.tin || null,
      photo_url: pictureUrl(account) || pictureUrl(regUser) || r.photo || null,
      licence: {
        year,
        has_licence: !!lic,
        licence_no: lic?.no || null,
        renewal_status: (reg && renewalByReg.get(reg)) || null,
      },
      // private: lower-cased search text
      _search: [r.name, r.reg_no, r.emails, r.primary_email, r.secondary_email, r.phones,
        r.primary_contact, r.secondary_contact, r.organisation, accountEmail]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  });
  rows.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));

  const byId = new Map<string, any>(rows.map((r: any) => [String(r.id), r]));
  console.log(`[engineers] snapshot ${year}: ${rows.length} engineers, ${users.length} accounts, ${paid.length} licences in ${Date.now() - t0}ms`);
  return { year, builtAt: Date.now(), rows, byId };
};

const getSnapshot = async (year: number, force = false): Promise<Snapshot> => {
  let entry = cache.get(year);
  if (!entry) { entry = {}; cache.set(year, entry); }
  const fresh = entry.snap && Date.now() - entry.snap.builtAt < CACHE_TTL_MS;
  if (fresh && !force) return entry.snap!;

  if (!entry.building) {
    const e = entry;
    e.building = buildSnapshot(year).then(
      (s) => { e.snap = s; e.building = undefined; return s; },
      (err) => { e.building = undefined; throw err; }
    );
  }
  // Stale-while-revalidate: serve the old snapshot while rebuilding,
  // unless it was invalidated by a write (builtAt = 0) or forced.
  if (entry.snap && entry.snap.builtAt > 0 && !force) return entry.snap;
  return entry.building!;
};

const strip = (r: any) => { const { _search, ...rest } = r; return rest; };

// ── Filtering ───────────────────────────────────────────────────────────────
const yesNo = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  return s === "yes" || s === "true" || s === "1" ? true : s === "no" || s === "false" || s === "0" ? false : null;
};

const baseFilter = (q: Request["query"]) => {
  const search = String(q.search ?? "").trim().toLowerCase();
  const field = String(q.field ?? "").trim().toLowerCase();
  const type = String(q.type ?? "").trim().toUpperCase();
  const country = String(q.country ?? "").trim().toLowerCase();
  return (r: any) =>
    (!search || r._search.includes(search)) &&
    (!field || String(r.field ?? "").trim().toLowerCase() === field) &&
    (!type || (type === "__NONE" ? !r.effective_type : r.effective_type === type)) &&
    (!country || String(r.country ?? "").trim().toLowerCase() === country);
};

const fullFilter = (q: Request["query"]) => {
  const base = baseFilter(q);
  const acc = yesNo(q.has_account);
  const lic = yesNo(q.licensed);
  const cat = CATEGORY_TEST[String(q.category ?? "").toLowerCase()];
  return (r: any) =>
    base(r) &&
    (acc === null || r.has_account === acc) &&
    (lic === null || r.licence.has_licence === lic) &&
    (!cat || cat(r.effective_type || ""));
};

// ── GET /registry ───────────────────────────────────────────────────────────
// Query: page, limit, search, field, type ("__none" = not set), country,
//        category=permanent|temporary|technologist|technician,
//        has_account=yes|no, licensed=yes|no, licence_year, refresh=1
export const listRegistry = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    const snap = await getSnapshot(year, req.query.refresh === "1");
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

    const base = baseFilter(req.query);
    const full = fullFilter(req.query);
    let total = 0, noAccount = 0, noLicence = 0;
    const matched: any[] = [];
    for (const r of snap.rows) {
      if (!base(r)) continue;
      total++;
      if (!r.has_account) noAccount++;
      if (!r.licence.has_licence) noLicence++;
      if (full(r)) matched.push(r);
    }
    const data = matched.slice((pageNum - 1) * pageSize, pageNum * pageSize).map(strip);

    res.json({
      success: true,
      data,
      meta: {
        total: matched.length,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(matched.length / pageSize)),
        licence_year: year,
        cached_at: new Date(snap.builtAt || Date.now()).toISOString(),
      },
      stats: { total, without_account: noAccount, without_licence: noLicence },
    });
  } catch (error: any) {
    console.error("listRegistry:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineers.", error: error.message });
  }
};

// ── GET /registry/summary ───────────────────────────────────────────────────
export const registrySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    const snap = await getSnapshot(year);
    const s = {
      total: 0, permanent: 0, temporary: 0, technologist: 0, technician: 0, type_not_set: 0,
      without_account: 0, without_licence: 0, account_and_licence: 0,
    };
    for (const r of snap.rows) {
      const t = r.effective_type || "";
      s.total++;
      if (CATEGORY_TEST.permanent(t)) s.permanent++;
      else if (CATEGORY_TEST.temporary(t)) s.temporary++;
      else if (CATEGORY_TEST.technologist(t)) s.technologist++;
      else if (CATEGORY_TEST.technician(t)) s.technician++;
      else if (!t) s.type_not_set++;
      if (!r.has_account) s.without_account++;
      if (!r.licence.has_licence) s.without_licence++;
      if (r.has_account && r.licence.has_licence) s.account_and_licence++;
    }
    res.json({ success: true, licence_year: year, summary: s });
  } catch (error: any) {
    console.error("registrySummary:", error);
    res.status(500).json({ success: false, message: "Failed to load summary.", error: error.message });
  }
};

// ── GET /registry/filters ───────────────────────────────────────────────────
export const registryFilters = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await getSnapshot(currentYear());
    const fields = new Map<string, string>();
    const types = new Set<string>();
    for (const r of snap.rows) {
      const f = String(r.field ?? "").trim();
      if (f && !fields.has(f.toLowerCase())) fields.set(f.toLowerCase(), f);
      if (r.effective_type) types.add(r.effective_type);
    }
    res.json({
      success: true,
      fields: [...fields.values()].sort((a, b) => a.localeCompare(b)),
      types: [...types].sort(),
      current_year: currentYear(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to load filters.", error: error.message });
  }
};

// ── GET /registry/export?format=csv|xlsx|json (+ the list filters) ──────────
const exportColumns = (year: number): [string, (r: any) => unknown][] => [
  ["Name", (r) => r.name],
  ["Reg No", (r) => r.reg_no],
  ["Type", (r) => r.type || r.effective_type || ""],
  ["Field", (r) => r.field],
  ["Gender", (r) => (r.gender === "M" ? "Male" : r.gender === "F" ? "Female" : r.gender)],
  ["Registration Date", (r) => r.reg_date],
  ["Organisation", (r) => r.organisation],
  ["Country", (r) => r.country],
  ["Address", (r) => r.address],
  ["Emails (record)", (r) => [r.primary_email, r.emails].filter(Boolean).join("; ").replace(/;\s*$/, "")],
  ["Phones", (r) => [r.primary_contact, r.phones].filter(Boolean).join("; ").replace(/;\s*$/, "")],
  ["Portal Account", (r) => (r.has_account ? "Yes" : "No")],
  ["Account Email", (r) => r.account?.email || ""],
  ["Account Matched By", (r) => (r.account ? (r.account.matched_by === "reg_no" ? "Reg/licence no." : "Email") : "")],
  ["Account Email Differs", (r) => (r.account?.email_mismatch ? "Yes" : r.account ? "No" : "")],
  [`Licence ${year}`, (r) => (r.licence.has_licence ? "Yes" : "No")],
  [`Licence No. ${year}`, (r) => r.licence.licence_no || ""],
  [`Renewal ${year} (portal)`, (r) => r.licence.renewal_status || ""],
  ["Status", (r) =>
    r.has_account && r.licence.has_licence ? "Account + licence"
      : !r.licence.has_licence && !r.has_account ? "No licence, no account"
      : !r.licence.has_licence ? "No licence" : "No account"],
  ["UIPE No.", (r) => r.uipe_number],
  ["Qualification", (r) => r.qualification],
  ["TIN", (r) => r.tin],
];

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportRegistry = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    const format = String(req.query.format || "csv").toLowerCase();
    const snap = await getSnapshot(year);
    const rows = snap.rows.filter(fullFilter(req.query));
    const cols = exportColumns(year);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `erb-engineers-${stamp}`;

    if (format === "json") {
      res.json({ success: true, licence_year: year, count: rows.length, data: rows.map(strip) });
      return;
    }

    if (format === "xlsx") {
      let ExcelJS: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ExcelJS = require("exceljs");
      } catch {
        res.status(501).json({ success: false, message: "XLSX export needs the 'exceljs' package: run `npm install exceljs` in erb_service and restart." });
        return;
      }
      const wb = new ExcelJS.Workbook();
      wb.creator = "ERB";
      const ws = wb.addWorksheet("Engineers", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = cols.map(([h]) => ({ header: h, key: h, width: Math.min(40, Math.max(12, h.length + 4)) }));
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003087" } };
      const fills: Record<string, string> = { red: "FFFDECEC", amber: "FFFFF7E0", green: "FFE9F9EE" };
      for (const r of rows) {
        const row = ws.addRow(cols.map(([, f]) => f(r) ?? ""));
        const tone = !r.licence.has_licence ? "red" : !r.has_account ? "amber" : "green";
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fills[tone] } };
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // CSV (BOM so Excel opens UTF-8 names correctly)
    const lines = [cols.map(([h]) => csvCell(h)).join(",")];
    for (const r of rows) lines.push(cols.map(([, f]) => csvCell(f(r))).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.send("﻿" + lines.join("\r\n"));
  } catch (error: any) {
    console.error("exportRegistry:", error);
    res.status(500).json({ success: false, message: "Export failed.", error: error.message });
  }
};

// ── GET /registry/:id ───────────────────────────────────────────────────────
export const getRegistryEngineer = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseYear(req.query.licence_year);
    let snap = await getSnapshot(year);
    let row = snap.byId.get(String(req.params.id));
    if (!row) {
      // maybe created after the snapshot was built
      const exists = await ERBEngineer.count({ where: { id: req.params.id } });
      if (exists) { snap = await getSnapshot(year, true); row = snap.byId.get(String(req.params.id)); }
    }
    if (!row) {
      res.status(404).json({ success: false, message: "Engineer not found." });
      return;
    }

    // Licence history (single engineer — cheap)
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
        ...strip(row),
        licences: (licences as any[]).filter((l) => String(l.receipt_type || "").toUpperCase() !== "DELETED"),
      },
    });
  } catch (error: any) {
    console.error("getRegistryEngineer:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer.", error: error.message });
  }
};
