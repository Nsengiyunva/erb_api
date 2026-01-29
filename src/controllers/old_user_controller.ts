import { Request, Response } from 'express';
import OldUser from '../models/old_user';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import pLimit from 'p-limit';

/**
 * Import CSV users in chunks
 */
export const importCSV = async (req: Request, res: Response) => {
  if (!req.file)
    return res.status(400).json({ message: 'CSV file required' });

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
              limit(async () => {
                return {
                  ...row,
                  password: await bcrypt.hash(row.password, 10),
                };
              })
            )
          );

          // Bulk insert (ignore duplicates)
          await OldUser.bulkCreate(hashedChunk, { ignoreDuplicates: true });
          count += hashedChunk.length;

          console.log(`Processed ${count} rows...`);
        }

        res.json({ message: `CSV imported successfully: ${count} rows` });
      } catch (err) {
        console.error('Error importing CSV:', err);
        res.status(500).json({ message: 'Error importing CSV', error: err instanceof Error ? err.message : err });
      }
    })
    .on('error', (err) => {
      console.error('CSV read error:', err);
      res.status(500).json({ message: 'Error reading CSV', error: err instanceof Error ? err.message : err });
    });
};

/**
 * Update user by ID
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Prevent updating primary key
    if (req.body.id) delete req.body.id;

    // Find the user
    const user = await OldUser.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only allow certain fields to be updated
    const allowedFields = [
      'first_name',
      'surname',
      'other_names',
      'telephone',
      'dob',
      'gender',
      'company_name',
      'address',
      'country',
      'type',
      'email',
      'birth_place',
      'licence_no',
      'belongs_to',
      'last_name',
      'phone_no',
      'registered',
      'category',
      'name',
      'status',
      'user_type',
      'user_level',
      'password'
    ];

    const updates: Partial<typeof req.body> = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // No valid fields to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    // Update user
    await user.update(updates); // password hashing is handled automatically by your model hooks

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('❌ Update user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : error,
    });
  }
};
