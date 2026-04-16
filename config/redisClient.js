import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config({path: "config/.env"})

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
})

redisClient.on("error" , (err) => console.log("Redis Client Error" , err))

await redisClient.connect()
console.log("Connected to Redis");
export default redisClient;