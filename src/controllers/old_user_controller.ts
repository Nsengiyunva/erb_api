import { Request, Response } from 'express';
import OldUser from '../models/old_user';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export const importCSV = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const chunkSize = 100;
  const rowsQueue: any[] = [];
  let count = 0;

  // Step 1: Read CSV and push rows to queue
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      rowsQueue.push(row);
    })
    .on('end', async () => {
      try {
        // Step 2: Process queue sequentially in chunks
        while (rowsQueue.length > 0) {
          const chunk = rowsQueue.splice(0, chunkSize);

          // Hash passwords in parallel for this chunk
          const hashedChunk = await Promise.all(
            chunk.map(async (row) => ({
              ...row,
              password: await bcrypt.hash(row.password, 10),
            }))
          );

          // Bulk insert chunk
          await OldUser.bulkCreate(hashedChunk);
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
