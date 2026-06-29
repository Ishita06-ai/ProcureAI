import mongoose from 'mongoose';

let promise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (promise) return promise;
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set');
  mongoose.set('strictQuery', true);
  promise = mongoose.connect(uri, {
    dbName: process.env.DB_NAME || 'procurio',
    serverSelectionTimeoutMS: 8000,
  }).then(c => c.connection);
  return promise;
}
