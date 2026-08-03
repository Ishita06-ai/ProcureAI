import mongoose from "mongoose";

const uri =
  "mongodb+srv://1ishitarander_db_user:i1d2r3123@cluster0.0k4km8r.mongodb.net/procureai?retryWrites=true&w=majority&appName=Cluster0";

try {
  await mongoose.connect(uri);
  console.log("✅ Connected to Atlas!");
  process.exit(0);
} catch (err) {
  console.error("❌ Connection failed:");
  console.error(err);
}