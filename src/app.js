import express from "express"
import cors from "cors"
import dotenv from "dotenv";
import joi from "joi";
import {MongoClient} from "mongodb";

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const mongoClient = new MongoClient(process.env.DATABASE_URL) 

try{
    await mongoClient.connect()
    console.log("MongoDB connected!")
} catch(err) {
    console.log(err.message)
}

app.get("/", (req, res)=>{
    res.send("hello word")
})




const port = 5000
app.listen(port, () => console.log(`Server is running !!`));