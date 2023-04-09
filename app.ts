import dotenv from "dotenv-safe";
import {App, AppMentionEvent, SayFn} from "@slack/bolt";
import {StringIndexed} from "@slack/bolt/dist/types/helpers";
import {GenericMessageEvent, MessageEvent} from "@slack/bolt/dist/types/events/message-events";
import {WebClient} from "@slack/web-api";
import {doConversation, Source} from "./conversation";

dotenv.config();

// Initializes your app with your bot token and signing secret
const app: App<StringIndexed> = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // add this
    appToken: process.env.SLACK_APP_TOKEN, // add this
});

app.message(async function ({message, say, client}: { message: MessageEvent, client: WebClient, say: SayFn }
): Promise<void> {
    let genericMessage = message as GenericMessageEvent; // Cast to GenericMessageEvent as this is the only type of messages we receive
    console.log("Direct Message: " + genericMessage.text);
    await doConversation(
        Source.DirectMessage,
        clean(genericMessage.text),
        genericMessage.user,
        genericMessage.user + (genericMessage.thread_ts || ''),
        genericMessage.channel,
        genericMessage.thread_ts,
        genericMessage.ts,
        say,
        client);
});

app.event("app_mention", async ({event, client, say}: { event: AppMentionEvent, client: WebClient, say: SayFn }) => {
    console.log("Mention: " + event.text);
    await doConversation(Source.Mention,
        clean(event.text),
        event.user,
        event.channel + (event.thread_ts || ''),
        event.channel,
        event.thread_ts,
        event.ts,
        say,
        client);
});

function clean(text: string) {
    return text.replace(/(?:\s)<@[^, ]*|(?:^)<@[^, ]*/, "").trim();
}

(async () => {
    await app.start();
    console.log("⚡️ Slack chat app is running at port 4000!");
})();