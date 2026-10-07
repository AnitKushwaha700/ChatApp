import mongoose from "mongoose";
import dns from "dns";

// ─────────────────────────────────────────────────────────────────────────────
// FIX: On some ISP/NAT64/IPv6 networks, Node.js c-ares DNS resolver fails to
// resolve MongoDB Atlas SRV records from the local router DNS (10.x.x.x).
// Forcing Google DNS for the native dns module AND passing it to mongoose
// resolves the querySrv ECONNREFUSED error without changing the connection URI.
// ─────────────────────────────────────────────────────────────────────────────
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in your .env file.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Pass Google DNS directly to the MongoDB driver's SRV resolver
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4, // Force IPv4 for TCP socket connections
    });

    console.log("✅ MongoDB Atlas connected successfully");
    console.log(`📡 Host: ${conn.connection.host} | DB: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    if (error.message.includes("querySrv") || error.message.includes("ECONNREFUSED")) {
      console.error("💡 This is a local DNS/Network issue. Your ISP is blocking SRV record lookups.");
      console.error("   Fix: Switch to mobile hotspot, or set your Wi-Fi DNS to 8.8.8.8 in Windows settings.");
    }
    process.exit(1);
  }
};

export default connectDB;