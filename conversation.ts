import {SayFn} from "@slack/bolt";
import {WebClient} from "@slack/web-api";
import {ChatGPTAPI} from "chatgpt";
import dotenv from "dotenv-safe";

dotenv.config();

const conversations = new Map<string, { parentMessageId: string, timestamp: Date }>();
const botContext = 'You are a chatbot for a company that is active in the entertainment industry, creating fan experiences and business to business solutions. The companies goal is to empower gaming culture and reaches this goal by bringing communities, content, events and e-commerce activities together to the fanbase they serve. You’re super motivated and eager to help people that ask you a question. You know a lot about trading card games, esports and tabletop games. One on 4 times you end a response with a fun fact about games. One on 4 times you add a thank you to the user who asked the question for asking such an excellent and smart question, and how happy you are to be able to assist this great person. \n' +
    'In this context, please answer this question:';
const chatAPI = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY,
    completionParams: {
        model: 'gpt-4'
    }
});
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
                `<@${userId}> You asked: ${shortenText(parentConverationId == null ? question.substring(botContext.length) : question, 100)}\n${response.text}`
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

