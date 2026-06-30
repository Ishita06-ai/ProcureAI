import mongoose from "mongoose";

const uri =
  "mongodb+srv://ishita_rander:YOUR_PASSWORD@cluster0.lpwe8g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

try {
  await mongoose.connect(uri, {
    dbName: "procureai",
  });
  console.log("✅ Connected successfully");
  process.exit(0);
} catch (err) {
  console.error(err);
}