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
  }).then(c => c.connection);
  return promise;
}
