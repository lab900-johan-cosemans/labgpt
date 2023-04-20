import {SayFn} from "@slack/bolt";
import {WebClient} from "@slack/web-api";
import {ChatGPTAPI} from "chatgpt";
import dotenv from "dotenv-safe";

dotenv.config();

const conversations = new Map<string, { parentMessageId: string, timestamp: Date }>();
const botContext = 'You are a chatbot for the software company lab900 and you like what you do. You\'re super motivated and eager to help people that ask you a question. You know a lot about java, spring boot and angular and you dislike microsoft. One on 4 times you end a response with a fun fact, compliment or motivational sentence about lab900 or their employees. In this context, please answer this question:';
const chatAPI = new ChatGPTAPI({apiKey: process.env.OPENAI_API_KEY});
export async function doConversation(source: Source, question: string, userId: string, conversationId: string, channel: string, thread: string, timestamp: string, say: SayFn, client: WebClient): Promise<void> {
    try {
        if (await shouldContinueConversation(question, conversationId, channel, thread, say)) {
            await setWaiting(client, channel, timestamp);
            var parentConverationId = await getParentConversationId(conversationId, question, channel, thread, say);
            if(parentConverationId == null) {
                question = `${botContext} ${question}`;
            }
            let response = await chatAPI.sendMessage(question, {
                parentMessageId: await getParentConversationId(conversationId, question, channel, thread, say)
            });
            console.log("Response to @" + conversationId + ":\n" + response.text);
            setParentConversationId(conversationId, response.id);
            const message = source == Source.Mention ?
                `<@${userId}> You asked: ${shortenText(parentConverationId == null ? question : question.substring(botContext.length), 150)}\n${response.text}`
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

function shortenText(text: string, maxLength: number) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function setParentConversationId(conversationId: string, parentMessageId: string) {
    conversations[conversationId] = {parentMessageId, timestamp: Date.now()};
}

async function shouldContinueConversation(text: string, conversationId: string, channel: string, thread: string, say: SayFn): Promise<boolean> {
    if (text.toLowerCase() == "end" ||text.toLowerCase() == "stop" || text.toLowerCase() == "close") {
        conversations[conversationId] = {parentMessageId: undefined, timestamp: undefined};
        await say({channel, thread_ts: thread, text: "Ending conversation"});
        return false;
    }
    return true;
}

async function getParentConversationId(conversationId: string, text: string, channel: string, thread: string, say: SayFn): Promise<string | undefined> {
    var userConversation = conversations[conversationId];
    if (userConversation) {
        var timeDiff = Date.now() - userConversation.timestamp;
        if (timeDiff > 1000 * 60 * 30) {
            await say({channel, thread_ts: thread, text: "Starting a new conversation as there was no response in the last 30 minutes."});
            conversations[conversationId] = {parentMessageId: undefined, timestamp: undefined};
        }
    }
    return userConversation?.parentMessageId;
}

async function setWaiting(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.add({
        channel,
        name: 'eyes',
        timestamp,
    });
}

async function removeWaiting(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.remove({
        channel,
        name: 'eyes',
        timestamp,
    });
}

async function markAsDone(client: WebClient, channel: string, timestamp: string) {
    await client.reactions.add({
        channel,
        name: 'white_check_mark',
        timestamp,
    });
}

export enum Source {
    Mention,
    DirectMessage
}

