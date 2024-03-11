// FilesController.js

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import base64 from 'base-64';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const { 'x-token': token } = req.headers;
    const { name, type, parentId, isPublic, data } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentIdValue = 0;

    if (parentId) {
      const parentFile = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: dbClient.ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }

      parentIdValue = parentFile._id;
    }

    let localPath;
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      localPath = path.join(folderPath, `${uuidv4()}`);
      const fileContent = base64.decode(data);
      fs.writeFileSync(localPath, fileContent);
    }

    const newFile = {
      userId: dbClient.ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentIdValue,
      localPath: type !== 'folder' ? localPath : undefined,
    };

    const result = await dbClient.client.db(dbClient.database).collection('files').insertOne(newFile);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentIdValue,
    });
  }
}

export default FilesController;
