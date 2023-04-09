import {SayFn} from "@slack/bolt";
import {WebClient} from "@slack/web-api";
import {ChatGPTAPI} from "chatgpt";
import dotenv from "dotenv-safe";

dotenv.config();

const conversations = new Map<string, { parentMessageId: string, timestamp: Date }>();
const chatAPI = new ChatGPTAPI({apiKey: process.env.OPENAI_API_KEY});

export async function doConversation(source: Source, question: string, userId: string, conversationId: string, channel: string, thread: string, timestamp: string, say: SayFn, client: WebClient): Promise<void> {
    try {
        if (await shouldContinueConversation(question, conversationId, say)) {
            await setWaiting(client, channel, timestamp);
            let response = await chatAPI.sendMessage(question, {
                parentMessageId: await getParentConversationId(conversationId, question, say)
            });
            console.log("Response to @" + conversationId + ":\n" + response.text);
            setParentConversationId(conversationId, response.id);
            const message = source == Source.Mention ?
                    `<@${userId}> You asked: ${question}\n ${response.text}`
                    : `${response.text}`;
            await say({channel, thread_ts: thread, text: message});
            await removeWaiting(client, channel, timestamp);
            await markAsDone(client, channel, timestamp);
        }
    } catch (err) {
        await say("ERROR: Something went wrong, please try again after a while.");
        console.log(err);
    }
}

function setParentConversationId(conversationId: string, parentMessageId: string) {
    conversations[conversationId] = {parentMessageId, timestamp: Date.now()};
}

async function shouldContinueConversation(text: string, conversationId: string, say: SayFn): Promise<boolean> {
    if (text.toLowerCase() == "end" ||text.toLowerCase() == "stop" || text.toLowerCase() == "close") {
        conversations[conversationId] = {parentMessageId: undefined, timestamp: undefined};
        await say("Ending conversation");
        return false;
    }
    return true;
}

async function getParentConversationId(conversationId: string, text: string, say: SayFn): Promise<string | undefined> {
    var userConversation = conversations[conversationId];
    if (userConversation) {
        var timeDiff = Date.now() - userConversation.timestamp;
        if (timeDiff > 1000 * 60 * 30) {
            await say("Starting a new conversation as there was no response in the last 30 minutes.");
            conversations[conversationId] = {parentMessageId: undefined, timestamp: undefined};
        }
    }
    return userConversation?.parentMessageId;
}

async function setWaiting(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.add({
        channel: channel,
        name: 'eyes',
        timestamp: timestamp,
    });
}

async function removeWaiting(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.remove({
        channel: channel,
        name: 'eyes',
        timestamp: timestamp,
    });
}

async function markAsDone(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.add({
        channel: channel,
        name: 'white_check_mark',
        timestamp: timestamp,
    });
}

export enum Source {
    Mention,
    DirectMessage
}

