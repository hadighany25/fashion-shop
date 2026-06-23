const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to database: ${error.message}`);
    process.exit(1); // បិទកម្មវិធីប្រសិនបើភ្ជាប់មិនបាន
  }
};

module.exports = connectDB;
