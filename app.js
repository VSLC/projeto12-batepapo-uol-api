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
    db = mongoClient.db("test");
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
        const userMap = userFind.map(userM => userM.participant.name.toLowerCase());
        const repeatedUser = userMap.find(repeteadUser => repeteadUser === participant.name)

        if (repeatedUser === undefined) {
            const response = await db.collection("users").insertOne(user);
            const status = { from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(user.lastStatus).format("HH:mm:ss") };
            const responseStatus = await db.collection("message").insertOne(status);

            console.log(userMap);
            res.sendStatus(202);

        } else {
            res.sendStatus(409)
        }

    } catch (error) {
        res.status(500);

    }


})

server.get("/participants", async (req, res) => {
    const response = await db.collection("users").find({}).toArray();
    res.send(response);
})

server.listen(port, () => { console.log("Listen on port 5000") })
