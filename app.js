import express, { json } from "express";
import { MongoClient } from "mongodb"
import cors from "cors";
import dotenv from "dotenv"
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const port = 5000;
const server = express();
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db("banco_uolapi");
})
server.use(cors());
server.use(json());

server.post("/participants", async (req, res) => {
    const participant = req.body;
    const user = { participant, lastStatus: Date.now() };
    const schema = joi.object({ name: joi.string().required().min(1) });
    const validate = schema.validate(participant);

    if (validate.error) {
        res.sendStatus(422);
        return;
    }

    try {
        const userFind = await db.collection("users").find({}).toArray();
        const userMap = userFind.map(userM => userM.participant.name);
        const repeatedUser = userMap.find(repeteadUser => repeteadUser === participant.name)

        if (repeatedUser === undefined) {
            const response = await db.collection("users").insertOne(user);
            const status = { from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(user.lastStatus).format("HH:mm:ss") };
            const responseStatus = await db.collection("message").insertOne(status);

            res.sendStatus(202);

        } else {
            res.sendStatus(500);
        }

    } catch (error) {
        res.status(500);

    }


})

server.get("/participants", async (req, res) => {
    try {
        const response = await db.collection("users").find({}).toArray();
        res.send(response);
    } catch (error) {
        res.sendStatus(500)
    }

})

server.post("/messages", async (req, res) => {
    try {
        const from = req.headers.user;
        const message = { from, ...req.body };
        const users = await db.collection("users").find({}).toArray();
        const loggedUsers = users.map(user => user.participant.name);
        console.log(loggedUsers);
        const joiSchema = joi.object({
            from: joi.string().valid(...loggedUsers).required(),
            to: joi.string().required().min(1),
            text: joi.string().required().min(1),
            type: joi.string().valid("message", "private_message")

        })

        const validade = joiSchema.validate(message, { abortEarly: "false" });

        if (validade.error) {
            res.sendStatus(422);
        }
        const actualMessageTime = dayjs(Date.now()).format("HH:mm:ss");
        const finalMessage = {
            ...message,
            time: actualMessageTime,
        }
        console.log(finalMessage);
        const response = await db.collection("messages").insertOne(finalMessage);
        res.sendStatus(202);
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

})

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const messages = await db.collection("messages").find({}).toArray();
    const user = req.header("User");


})

server.listen(port, () => { console.log("Listen on port 5000") })
