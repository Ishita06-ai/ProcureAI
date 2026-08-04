import mongoose from 'mongoose';
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
let promise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (promise) return promise;
  const uri = process.env.MONGO_URL;
console.log("MONGO_URL =", uri);
console.log("DB_NAME =", process.env.DB_NAME);
  if (!uri) throw new Error('MONGO_URL is not set');
  mongoose.set('strictQuery', true);
  promise = mongoose.connect(uri, {
    dbName: process.env.DB_NAME || 'procurio',
    serverSelectionTimeoutMS: 8000,
  }).then(async (c) => {
    console.log('Connected DB =', c.connection.name);
    console.log('Mongo URI =', process.env.MONGO_URL);
    console.log('DB_NAME =', process.env.DB_NAME);
    try {
      const cols = await c.connection.db.listCollections().toArray();
      console.log('COLLECTIONS =', JSON.stringify(cols.map((x) => x.name)));
    } catch (e) { console.log('COLLECTIONS error =', e.message); }
    return c.connection;
  });
  return promise;
}
