// FilesController.js

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import base64 from 'base-64';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fileQueue from '../utils/queues';

class FilesController {
  static async postUpload(req, res) {
    const { 'x-token': token } = req.headers;
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    await fileQueue.add({
      userId: userId.toString(),
      fileId: file._id.toString(),
    });

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

  static async getShow(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  static async getIndex(req, res) {
    const { 'x-token': token } = req.headers;
    const { parentId, page } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pipeline = [
      {
        $match: {
          userId: dbClient.ObjectId(userId),
          parentId: parentId ? dbClient.ObjectId(parentId) : 0,
        },
      },
      {
        $skip: page ? page * 20 : 0,
      },
      {
        $limit: 20,
      },
    ];

    const files = await dbClient.client.db(dbClient.database).collection('files').aggregate(pipeline).toArray();

    return res.json(files);
  }

  static async putPublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client.db(dbClient.database).collection('files').findOneAndUpdate(
      { _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) },
      { $set: { isPublic: true } },
      { returnDocument: 'after' },
    );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file.value);
  }

  static async putUnpublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client.db(dbClient.database).collection('files').findOneAndUpdate(
      { _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) },
      { $set: { isPublic: false } },
      { returnDocument: 'after' },
    );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file.value);
  }

  static async getFile(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client.db(dbClient.database).collection('files').findOne(
      { _id: dbClient.ObjectId(id) },
    );

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!userId || file.userId.toString() !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    const filePath = file.localPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { size } = req.query;
    const fileName = size ? `${file.localPath}_${size}` : file.localPath;

    if (!fs.existsSync(fileName)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(fileName);
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(fileName).pipe(res);
  }
}

export default FilesController;
