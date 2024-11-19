import mongoose, { mongo } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB Connection successful. Host -> ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`MongoDB Connection Error -> ${error}`);
    }
}

export {connectDb}