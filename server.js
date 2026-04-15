import dotenv from "dotenv";
import connectToDB from "./config/db.js";
import app from "./app.js";
import "./utils/cronJobs.js";
dotenv.config({path: "config/.env"});

const PORT = process.env.PORT || 5500;

console.log("Server Time:", new Date().toString());
console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
const startServer = async () => {
    try {
        await connectToDB();

        app.listen(PORT , () => {
            console.log(`Server is running on port ${PORT}`);
        })
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

startServer();