import { Request, Response } from 'express';
import OldUser from '../models/old_user';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// export const importCSV = async (req: Request, res: Response) => {
//   if (!req.file) return res.status(400).json({ message: 'CSV file required' });

//   const results: any[] = [];

//   fs.createReadStream(req.file.path)
//     .pipe(csv())
//     .on('data', (data: any) => results.push(data))
//     .on('end', async () => {
//       try {
//         for (let row of results) {
//           // Encrypt password
//           row.password = await bcrypt.hash(row.password, 10);
//           await OldUser.create(row);
//         }
//         res.json({ message: 'CSV imported successfully', count: results.length });
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Error importing CSV' });
//       }
//     });
// };

export const importCSV = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const results: any[] = [];
  let count = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', async (row) => {
      try {
        // Encrypt password
        row.password = await bcrypt.hash(row.password, 10);
        // Insert immediately
        await OldUser.create(row);
        count++;
      } catch (err) {
        console.error('Error inserting row:', err);
      }
    })
    .on('end', () => {
      res.json({ message: `CSV imported successfully: ${count} rows` });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ message: 'Error reading CSV' });
    });
};

