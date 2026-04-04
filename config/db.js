import dns from "dns";
import mongoose from "mongoose";

dns.setServers(["1.1.1.1" , "8.8.8.8"]);

const connectToDB = async () => {
    if(!process.env.MONGO_URI){
        throw new Error("MONGO_URI is not defined in .env file")
    }

    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to MongoDB");
}

export default connectToDB;
