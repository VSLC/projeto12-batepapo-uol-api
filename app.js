import express, { json } from 'express';
import { Db, MongoClient, ObjectId } from 'mongodb'
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

dotenv.config();

const port = 5000;
const server = express();
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db('banco_uolapi');
})
server.use(cors());
server.use(json());


server.post('/participants', async (req, res) => {
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
        const userFind = await db.collection('users').find({}).toArray();
        const userMap = userFind.map(userM => userM.participant.name);
        const repeatedUser = userMap.find(repeteadUser => repeteadUser === participant.name);
        if (repeatedUser === undefined) {
            const response = await db.collection('users').insertOne(user);
            const status = { from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(user.lastStatus).format('HH:mm:ss') };
            const responseStatus = await db.collection('messages').insertOne(status);
            res.sendStatus(202);
        } else {
            res.sendStatus(500);
        }
    } catch (error) {
        res.status(500);
    }
})

server.get('/participants', async (req, res) => {
    try {
        const response = await db.collection('users').find({}).toArray();
        const users = response.map(user => user.participant);
        res.send(users);
    } catch (error) {
        res.sendStatus(500);
    }

})

server.post('/messages', async (req, res) => {
    try {
        const from = req.headers.user;
        const message = { from, ...req.body };
        const users = await db.collection('users').find({}).toArray();
        const loggedUsers = users.map(user => user.participant.name);
        const joiSchemaMessages = joi.object({
            from: joi.string().valid(...loggedUsers).required(),
            to: joi.string().required().min(1),
            text: joi.string().required().min(1),
            type: joi.string().valid('message', 'private_message')

        })
        const validade = joiSchemaMessages.validate(message, { abortEarly: 'false' });
        if (validade.error) {
            res.sendStatus(422);
            return;
        }
        const actualMessageTime = dayjs(Date.now()).format('HH:mm:ss');
        const finalMessage = { ...message, time: actualMessageTime, };
        const response = await db.collection('messages').insertOne(finalMessage);


        res.sendStatus(202);
    } catch (error) {
        res.sendStatus(500);
    }
})

server.get('/messages', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit);
        console.log(limit);
        const messages = await db.collection('messages').find({}).toArray();
        const presentUser = req.header('User');
        const filteredMessages = messages.filter((messages) => {
            if (messages.type === 'status' || messages.type === 'message' || messages.from === presentUser || messages.to === presentUser) {
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
        console.log(currentMessages)
        const messageSliced = filteredMessages.slice(-currentMessages);
        res.send(messageSliced);
    } catch (error) {
        res.sendStatus(500);
    }
})

server.post('/status', async (req, res) => {
    const User = req.headers.user;

    if (!User) {
        res.sendStatus(500);
    }

    try {
        const responseLoggedUser = await db.collection('users').find({ 'participant.name': User }).toArray();
        if (responseLoggedUser.length === 0) {
            res.sendStatus(404);
            return;
        }
        await db.collection('users').updateOne({ 'participant.name': User }, { $set: { lastStatus: Date.now() } });
        const responseLoggedUser2 = await db.collection('users').find({ 'participant.name': User }).toArray();

        res.sendStatus(202);
    }

    catch (error) {
        res.sendStatus(500);
    }
})

setInterval(async () => {
    let timeOut = Date.now() - 10000;
    const timeOutUsers = await db.collection('users').find({ lastStatus: { $lte: timeOut } }).toArray();
    if (timeOutUsers.length === 0) {
        return;
    }
    const mapTimeOutUsers = timeOutUsers.map((mUsers) => {
        let message = {
            from: mUsers.participant.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        };
        return message;
    });
    await db.collection('messages').insertMany(mapTimeOutUsers);
    await db.collection('users').deleteMany({ lastStatus: { $lte: timeOut } });

}, 15000);


server.listen(port, () => { console.log('Listen on port 5000') });
