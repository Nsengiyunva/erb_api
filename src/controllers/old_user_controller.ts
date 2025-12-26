// import { Request, Response } from 'express';
// import OldUser from '../models/old_user';
// import csv from 'csv-parser';
// import fs from 'fs';
// import bcrypt from 'bcryptjs';

// export const importCSV = async (req: Request, res: Response) => {
//   if (!req.file) return res.status(400).json({ message: 'CSV file required' });

//   const results: any[] = [];
//   let count = 0;

//   fs.createReadStream(req.file.path)
//     .pipe(csv())
//     .on('data', async (row) => {
//       try {
//         // Encrypt password
//         row.password = await bcrypt.hash(row.password, 10);
//         // Insert immediately
//         await OldUser.create(row);
//         count++;
//       } catch (err) {
//         console.error('Error inserting row:', err);
//       }
//     })
//     .on('end', () => {
//       res.json({ message: `CSV imported successfully: ${count} rows` });
//     })
//     .on('error', (err) => {
//       console.error(err);
//       res.status(500).json({ message: 'Error reading CSV' });
//     });
// };

import { Request, Response } from 'express';
import OldUser from '../models/old_user';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export const importCSV = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const chunkSize = 100; // number of rows per bulk insert
  const buffer: any[] = [];
  let count = 0;

  const stream = fs.createReadStream(req.file.path).pipe(csv());

  stream.on('data', async (row) => {
    // Encrypt password
    row.password = await bcrypt.hash(row.password, 10);
    buffer.push(row);

    // If buffer reached chunk size, insert and reset buffer
    if (buffer.length >= chunkSize) {
      stream.pause(); // pause the stream while inserting
      try {
        await OldUser.bulkCreate(buffer);
        count += buffer.length;
        buffer.length = 0; // reset buffer
      } catch (err) {
        console.error('Bulk insert error:', err);
      } finally {
        stream.resume(); // resume reading
      }
    }
  });

  stream.on('end', async () => {
    // Insert any remaining rows
    if (buffer.length > 0) {
      try {
        await OldUser.bulkCreate(buffer);
        count += buffer.length;
      } catch (err) {
        console.error('Final bulk insert error:', err);
      }
    }
    res.json({ message: `CSV imported successfully: ${count} rows` });
  });

  stream.on('error', (err) => {
    console.error('CSV read error:', err);
    res.status(500).json({ message: 'Error reading CSV' });
  });
};
