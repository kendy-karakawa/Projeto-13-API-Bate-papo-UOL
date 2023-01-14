import express from "express"
import cors from "cors"
import dotenv from "dotenv";
import joi from "joi";
import {MongoClient, ObjectId} from "mongodb";
import dayjs from "dayjs";


dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())


const mongoClient = new MongoClient(process.env.DATABASE_URL) 
let db;






try{
    await mongoClient.connect()
    db = mongoClient.db()
    console.log("MongoDB connected!")
} catch(err) {
    console.log(err.message)
}



// from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time


app.post("/participants", async (req, res)=>{
    const {name} = req.body
    const time = dayjs().format("HH:mm:ss");

    const schema = joi.object({
        name: joi.string().required(),
    })

    const validation = schema.validate({name})
    if (validation.error){
        return res.sendStatus(422)
    }
    
    try{
        const resp = await db.collection("participants").findOne({name: name})
        if(resp) return res.sendStatus(409)
        
        await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})

        await db.collection("messages").insertOne({
            from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time
        })

        return res.sendStatus(201);
    }catch(err){
        return res.status(500).send(err.message);
    }
})

app.get("/participants",  (req, res)=>{
       db.collection("participants").find().toArray().then(dados =>{
        
        res.send(dados)

       })
        .catch((res)=> {
            return res.status(500).send(err.message);
        })
})

app.post("/messages", async (req, res)=>{
    const {to, text, type} = req.body;
    const name = req.headers.user

    try{
        const schema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.valid('message', 'private_message').required()
        })

        const findParticipants = await db.collection("participants").findOne({name: name})
        

        const verification = schema.validate({to, text, type}, {abortEarly: true})
        if (verification.error || !findParticipants){
            return res.sendStatus(422)
        }
        await db.collection("messages").insertOne({
            from: name, to: to, text: text, type: type, time: time
            })

        return res.sendStatus(201);
    }catch(err){
        return res.status(500).send(err.message);
    }
    
})

app.get("/messages", async (req, res)=>{
    const user = req.headers.user
    const limite = req.query.limit
        
    if(limite){
     const schema = joi.number().min(1)
    const validation = schema.validate(limite)
        if(validation.error) {
            console.log(validation.error)
            return res.sendStatus(422)
        }
        }

    await db.collection("messages").find({}).toArray().then(resp =>{
            const message = resp.filter(item => item.type === "message" || item.type === "status" || item.type === "private_message" && (item.from === user || item.to === user))
        
            
            if(limite){
            return res.send(message.slice(message.length - limite).reverse()) 
            }

            res.send(message)
            }) .catch((res)=> {
            return res.status(500).send(err.message);
    })
})

app.post("/status", async (req, res)=>{
    const user = req.headers.user
    const time = dayjs().format("HH:mm:ss");

    try{
        
        const findUser = await db.collection("participants").findOne({name: user})
        if(!findUser) return res.sendStatus(404)

        db.collection("participants").updateOne({name:user}, {$set: {lastStatus: Date.now()}})
        res.sendStatus(200)

    }catch(err){
        res.status(500).send(err.message)
    }
})

app.delete("/messages/:id", async (req, res)=>{
    const user = req.headers.user 
    const {id} = req.params

    try{
        const findMessage = await db.collection("messages").findOne({_id:ObjectId(id) })
        if(!findMessage) return res.sendStatus(404)

        if(findMessage.name !== user) return res.sendStatus(401)

        db.collection("messages").deleteOne({_id:ObjectId(id)})
        res.sendStatus(200)
    
    }catch(err){
        return res.status(500).send(err.message)
    }


})

setInterval(removeUser, 15000)

async function removeUser(){
    const now = Date.now()

    try{
       const user =  await db.collection("participants").findOne({})
       if(user && user.lastStatus < now - 10000 ){
        await db.collection("participants").deleteOne({name: user.name})
        db.collection("messages").insertOne({from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time})
        console.log(`${user.name} deletado`)
        }

    }catch(err){
        console.log(err.message)
    }

}


const port = 5000
app.listen(port, () => console.log(`Server is running !!`));