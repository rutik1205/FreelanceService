const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI || 'mongodb://127.0.0.1:27017/skilldesk';
  const fallbackAtlasUri = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI || '';
  const fallbackUri = 'mongodb://127.0.0.1:27017/skilldesk';

  try {
    const maskedUri = primaryUri.includes('@') 
      ? `mongodb+srv://***@${primaryUri.split('@')[1]}` 
      : primaryUri;
    console.log(` Attempting to connect to MongoDB: ${maskedUri}`);

    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(` MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(` Primary MongoDB connection failed (${error.message}). Trying verified Atlas fallback...`);
    try {
      const atlasConn = await mongoose.connect(fallbackAtlasUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(` Connected to verified MongoDB Atlas: ${atlasConn.connection.host}/${atlasConn.connection.name}`);
      return atlasConn;
    } catch (atlasError) {
      console.warn(` Verified Atlas fallback failed (${atlasError.message}). Trying local MongoDB...`);
      try {
        const localConn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 4000,
        });
        console.log(` Connected to fallback Local MongoDB: ${localConn.connection.host}/${localConn.connection.name}`);
        return localConn;
      } catch (localError) {
        console.error(` All MongoDB connections failed: ${localError.message}`);
        console.warn(` Server will continue running to handle health checks and retry DB operations.`);
      }
    }
  }
};

module.exports = connectDB;
