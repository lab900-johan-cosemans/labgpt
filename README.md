ChatGPT for Slack
---
Slackbot connected to chatgpt4 api. 

## Usage

You can send a direct message to the Slack Bot:

<img src="images/conversation.png" width="400">

Or invite it to a channel and mention it `@YourSlackBot <your question>`:

<img src="images/channel.png" width="400">

Note:
  - This bot will remember the conversation history and continue the conversation
  - To reset thread, simply type `close` or `stop` or wait 30 minutes

## Setup

High level steps to get this bot to work in your slack environment:
1. Get an OpenAI API key (paid)
2. Create a Slack App and configure as below
3. Host this service somewhere (eg GCP) - it listens to the events from Slack and sends requests to OpenAI
4. Start asking questions! :)

### Get an OpenAI API key
Sign up at https://platform.openai.com/overview and create a new API key in https://platform.openai.com/account/api-keys

### Create a Slack App

Note: Check this for the guide how to create a Slack App https://slack.dev/bolt-js/tutorial/getting-started

You'll need these keys for the next step:
```
SLACK_SIGNING_SECRET=""
SLACK_BOT_TOKEN=""
SLACK_APP_TOKEN=""
```

In "Basic Information", create an app token and store in SLACK_APP_TOKEN

```
App-Level Token:

connections:write
authorizations:read
app_configurations:write
```

Here you can also find the "Signing Secret" to store in SLACK_SIGNING_SECRET

In "App Home", check this checkbox:

```
Allow users to send Slash commands and messages from the messages tab
```

In "Socket Mode", enable socket mode

In "OAuth & Permission", add these scopes to Bot Token Scopes

```
app_mentions:read
channels:join
chat:write
chat:write.customize
chat:write.public
im:history
im:read
im:write
```
Then click "install in workspace" and copy the "Bot User OAuth Access Token" to SLACK_BOT_TOKEN

In "Event Subscriptions", add two subscriptions:
```
app_mention
message.im
```

### Start this service
- Require nodejs >= 18 (required by above library)
- Create new `.env` and update the information
```
cp .env.sample .env
# Open file `.env` and filling all the keys
```
- Install
```
yarn install
```

- Start the service
```
yarn start
```


This app uses the library at https://github.com/transitive-bullshit/chatgpt-api
