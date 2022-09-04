import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb"
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
    const joiSchemaParticipants = joi.object({
        name: joi.string().required().min(1),
    })
    const validate = joiSchemaParticipants.validate(participant);
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
        console.log(response);
        const users = response.map(user => user.participant)
        res.send(users);
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
        const joiSchemaMessages = joi.object({
            from: joi.string().valid(...loggedUsers).required(),
            to: joi.string().required().min(1),
            text: joi.string().required().min(1),
            type: joi.string().valid("message", "private_message")

        })
        const validade = joiSchemaMessages.validate(message, { abortEarly: "false" });
        const actualMessageTime = dayjs(Date.now()).format("HH:mm:ss");
        const finalMessage = { ...message, time: actualMessageTime, }
        console.log(finalMessage);
        const response = await db.collection("messages").insertOne(finalMessage);

        if (validade.error) {
            res.sendStatus(422);
        }

        res.sendStatus(202);
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

server.get("/messages", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit);
        const messages = await db.collection("messages").find({}).toArray();
        const presentUser = req.header("User");
        const filteredMessages = messages.filter((messages) => {
            if (messages.type === "status" || messages.type === "message" || messages.from === presentUser || messages.to === presentUser) {
                return true;
            }
            else {
                return false;
            }
        });
        let currentMessages;
        if (isNaN(limit)) {
            currentMessages = filteredMessages.length;
        }
        currentMessages = limit;
        res.send(filteredMessages.slice(-currentMessages))
    } catch (error) {
        res.sendStatus(500);
    }
})

server.post("/status", async (req, res) => {
    const User = req.headers.user;

    if (!User) {
        res.sendStatus(500)
    }

    try {
        const responseLoggedUser = await db.collection("users").find({ "participant.name": User }).toArray();
        console.log(responseLoggedUser)
        if (responseLoggedUser.length === 0) {
            res.sendStatus(404);
            return;
        }
        await db.collection("users").updateOne({ "participant.name": User }, { $set: { lastStatus: Date.now() } });
        const responseLoggedUser2 = await db.collection("users").find({ "participant.name": User }).toArray();
        console.log(responseLoggedUser2);

        res.sendStatus(202);
    }

    catch (error) {
        res.sendStatus(500);
    }
})


server.listen(port, () => { console.log("Listen on port 5000") });
