import { Request, Response } from 'express';
import OldUser from '../models/old_user';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import pLimit from 'p-limit';

export const importCSV = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const chunkSize = 100;
  const rowsQueue: any[] = [];
  let count = 0;
  const limit = pLimit(5); // limit bcrypt concurrency

  // Step 1: Read CSV and push rows to queue
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => rowsQueue.push(row))
    .on('end', async () => {
      try {
        while (rowsQueue.length > 0) {
          const chunk = rowsQueue.splice(0, chunkSize);

          // Hash passwords in parallel (limited concurrency)
          const hashedChunk = await Promise.all(
            chunk.map((row) =>
              limit(async () => ({
                ...row,
                password: await bcrypt.hash(row.password, 10),
              }))
            )
          );

          // Bulk insert
          await OldUser.bulkCreate(hashedChunk, { ignoreDuplicates: true });
          count += hashedChunk.length;

          console.log(`Processed ${count} rows...`);
        }

        res.json({ message: `CSV imported successfully: ${count} rows` });
      } catch (err) {
        console.error('Error importing CSV:', err);
        res.status(500).json({ message: 'Error importing CSV' });
      }
    })
    .on('error', (err) => {
      console.error('CSV read error:', err);
      res.status(500).json({ message: 'Error reading CSV' });
    });
};
