// import { Request, Response } from 'express';
// import csv from 'csv-parser';
// import path from 'path'
// import fs from 'fs'
// import multer from 'multer'
// import bcrypt from 'bcryptjs';
// import pLimit from 'p-limit';

// import OldUser from '../models/old_user';
// import { AuthenticatedRequest } from "../middleware/authenticate";

// const UPLOAD_DIR = '/home/user1/uploads/'


// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     // const dir = path.join(__dirname, '../../uploads/profiles')
//     const dir = UPLOAD_DIR;
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
//     cb(null, dir)
//   },
//   filename: (_req, file, cb) => {
//       const ext = path.extname(file.originalname)
//       cb(null, `profile_${Date.now()}${ext}`)
//   },
// })

// export const uploadProfilePicture = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   fileFilter: (_req, file, cb) => {
//       const allowed = ['image/jpeg', 'image/png', 'image/webp']
//       if (allowed.includes(file.mimetype)) {
//           cb(null, true)
//       } else {
//           cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
//       }
//   },
// }).single('profile_picture')


// export const importCSV = async (req: Request, res: Response) => {
//   if (!req.file)
//     return res.status(400).json({ message: 'CSV file required' });

//   const chunkSize = 100;
//   const rowsQueue: any[] = [];
//   let count = 0;
//   const limit = pLimit(5); 

//   fs.createReadStream(req.file.path)
//     .pipe(csv())
//     .on('data', (row) => rowsQueue.push(row))
//     .on('end', async () => {
//       try {
//         while (rowsQueue.length > 0) {
//           const chunk = rowsQueue.splice(0, chunkSize);

//           // Hash passwords in parallel (limited concurrency)
//           const hashedChunk = await Promise.all(
//             chunk.map((row) =>
//               limit(async () => {
//                 return {
//                   ...row,
//                   password: await bcrypt.hash(row.password, 10),
//                 };
//               })
//             )
//           );

//           // Bulk insert (ignore duplicates)
//           await OldUser.bulkCreate(hashedChunk, { ignoreDuplicates: true });
//           count += hashedChunk.length;

//           // console.log(`Processed ${count} rows...`);
//         }

//         res.json({ message: `CSV imported successfully: ${count} rows` });
//       } catch (err) {
//         // console.error('Error importing CSV:', err);
//         res.status(500).json({ message: 'Error importing CSV', error: err instanceof Error ? err.message : err });
//       }
//     })
//     .on('error', (err) => {
//       // console.error('CSV read error:', err);
//       res.status(500).json({ message: 'Error reading CSV', error: err instanceof Error ? err.message : err });
//     });
// }

// export const updateUser = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID is required',
//       });
//     }

//     const user = await OldUser.findByPk(id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

    
//     const allowedFields = [
//       'first_name',
//       'surname',
//       'other_names',
//       'telephone',
//       'dob',
//       'gender',
//       'company_name',
//       'address',
//       'country',
//       'type',
//       'email',
//       'birth_place',
//       'licence_no',
//       'belongs_to',
//       'last_name',
//       'phone_no',
//       'registered',
//       'category',
//       'name',
//       'status',
//       'user_type',
//       'user_level',
//       'password'
//     ];

//     const updates: Partial<typeof req.body> = {};
//     Object.keys(req.body).forEach((key) => {
//       if (allowedFields.includes(key) && req.body[key] !== undefined) {
//         updates[key] = req.body[key];
//       }
//     });

//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'No valid fields to update',
//       });
//     }

//     // Update user
//     await user.update(updates);

//     return res.status(200).json({
//       success: true,
//       message: 'User updated successfully',
//       data: user,
//     });
//   } catch (error) {
//     console.error('❌ Update user error:', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to update user',
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// }

// export const getUserById = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID is required',
//       });
//     }

//     const user = await OldUser.findByPk(id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: user,
//     });
//   } catch (error) {
//     console.error('❌ Get user error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user',
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// }

// export const getCurrentUser = async (
//   req: AuthenticatedRequest,
//   res: Response
// ) => {
//   try {
//     // Extract user ID from the JWT payload
//     const userId = (req.user as any)?.id || (req.user as any)?.sub;

//     if (!userId) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized: No user ID found" });
//     }

//     const user = await OldUser.findByPk(userId);

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     return res.status(200).json({ success: true, data: user });
//   } catch (error) {
//     // console.error("❌ Get current user error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch user",
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// }


// export const updateUserProfile = async (req: Request, res: Response) => {
//   try {
//       const { id } = req.params

//       const user = await OldUser.findByPk(id)
//       if (!user) {
//           return res.status(404).json({ success: false, message: 'User not found' })
//       }

//       const { name, address, company_name, gender, dob, birth_place } = req.body

//       // Only update allowed fields — email, telephone, category etc. are read-only
//       const updates: Partial<typeof user> = {}

//       if (name        !== undefined) updates.name         = name
//       if (address     !== undefined) updates.address      = address
//       if (company_name!== undefined) updates.company_name = company_name
//       if (gender      !== undefined) updates.gender       = gender
//       if (dob         !== undefined) updates.dob          = dob
//       if (birth_place !== undefined) updates.birth_place  = birth_place

//       // If a new photo was uploaded, delete the old one then store the new filename
//       if (req.file) {
//           if (user.profile_picture) {
//               const oldPath = path.join( UPLOAD_DIR, user.profile_picture)
//               if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
//           }
//           updates.profile_picture = req.file.filename
//       }

//       await user.update(updates)

//       return res.status(200).json({
//           success: true,
//           message: 'Profile updated successfully',
//           data: user,
//       })
//   } catch (error: any) {
//       return res.status(500).json({ success: false, message: error.message || 'Internal server error' })
//   }
// }




import { Request, Response } from 'express';
import csv from 'csv-parser';
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import bcrypt from 'bcryptjs';
import pLimit from 'p-limit';

import OldUser from '../models/old_user';
import { AuthenticatedRequest } from "../middleware/authenticate";

const UPLOAD_DIR = '/home/user1/uploads/'

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}${ext}`);
  },
});

export const uploadProfilePicture = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
}).single('profile_picture');


// ─── CSV Import ────────────────────────────────────────────────────────────────
export const importCSV = async (req: Request, res: Response) => {
  if (!req.file)
    return res.status(400).json({ message: 'CSV file required' });

  const chunkSize = 100;
  const rowsQueue: any[] = [];
  let count = 0;
  const limit = pLimit(5);

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => rowsQueue.push(row))
    .on('end', async () => {
      try {
        while (rowsQueue.length > 0) {
          const chunk = rowsQueue.splice(0, chunkSize);

          const hashedChunk = await Promise.all(
            chunk.map((row) =>
              limit(async () => ({
                ...row,
                password: await bcrypt.hash(row.password, 10),
              }))
            )
          );

          await OldUser.bulkCreate(hashedChunk, { ignoreDuplicates: true });
          count += hashedChunk.length;
        }

        res.json({ message: `CSV imported successfully: ${count} rows` });
      } catch (err) {
        res.status(500).json({ message: 'Error importing CSV', error: err instanceof Error ? err.message : err });
      }
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'Error reading CSV', error: err instanceof Error ? err.message : err });
    });
};


// ─── Update User (admin, all fields) ──────────────────────────────────────────
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await OldUser.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowedFields = [
      'first_name', 'surname', 'other_names', 'telephone', 'dob',
      'gender', 'company_name', 'address', 'country', 'type',
      'email', 'birth_place', 'licence_no', 'belongs_to', 'last_name',
      'phone_no', 'registered', 'category', 'name', 'status',
      'user_type', 'user_level', 'password',
    ];

    const updates: Partial<typeof req.body> = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await user.update(updates);

    return res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('❌ Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : error,
    });
  }
};


// ─── Get User by ID ────────────────────────────────────────────────────────────
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await OldUser.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : error,
    });
  }
};


// ─── Get Current Authenticated User ───────────────────────────────────────────
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No user ID found' });
    }

    const user = await OldUser.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : error,
    });
  }
};


// ─── Update User Profile (self-service, with optional photo) ──────────────────
// Route: PUT /users/:id/profile
// Middleware: uploadProfilePicture (multer), then this handler
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await OldUser.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, address, company_name, gender, dob, birth_place, email } = req.body;

    // Only mutable fields — licence_no, category, status etc. are read-only for self-service
    const updates: Record<string, any> = {};

    if (name         !== undefined) updates.name         = name;
    if (address      !== undefined) updates.address      = address;
    if (company_name !== undefined) updates.company_name = company_name;
    if (gender       !== undefined) updates.gender       = gender;
    if (dob          !== undefined) updates.dob          = dob;
    if (birth_place  !== undefined) updates.birth_place  = birth_place;
    if (email        !== undefined) updates.email        = email;

    // Handle profile picture upload
    if (req.file) {
      // Delete old picture if it exists
      if ((user as any).profile_picture) {
        const oldPath = path.join(UPLOAD_DIR, (user as any).profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updates.profile_picture = req.file.filename;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await user.update(updates);

    // Return updated user + profile picture URL if applicable
    const responseData = {
      ...(user as any).toJSON(),
      profile_picture_url: (user as any).profile_picture
        ? `/uploads/${(user as any).profile_picture}`
        : null,
    };

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: responseData,
    });
  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};


// ─── Serve Profile Picture ─────────────────────────────────────────────────────
// Route: GET /uploads/:filename
// Add this route in your router: router.get('/uploads/:filename', serveProfilePicture)
export const serveProfilePicture = (req: Request, res: Response) => {
  const { filename } = req.params;

  // Basic sanitization — prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.sendFile(filePath);
};
