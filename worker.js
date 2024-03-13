/* eslint-disable import/no-named-as-default */
// worker.js

import { Worker } from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const worker = new Worker('fileQueue', async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.client
    .db(dbClient.database)
    .collection('files')
    .findOne({ _id: dbClient.ObjectId(fileId), userId: dbClient.ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  const promises = sizes.map(async (size) => {
    const thumbnailPath = `${file.localPath}_${size}`;
    const thumbnail = await imageThumbnail(file.localPath, { width: size, responseType: 'base64' });
    fs.writeFileSync(thumbnailPath, thumbnail);
  });

  await Promise.all(promises);
});

export default worker;
