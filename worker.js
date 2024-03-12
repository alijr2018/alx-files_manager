// worker.js

import { Worker, Queue, WorkerOptions } from 'bull';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const workerOptions: WorkerOptions = {
  limiter: {
    max: 100,
    duration: 5000,
  },
};

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
}, workerOptions);

export default worker;
