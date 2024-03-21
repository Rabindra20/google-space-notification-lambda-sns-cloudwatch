import { google } from 'googleapis';
import fs from 'fs';
export async function handler(event, context) {
  try {
    // Retrieve message from event when Lambda is triggered from SNS
    const message = JSON.parse(event.Records[0].Sns.Message);
    console.log(JSON.stringify(message));

    const alarmName = message.AlarmName || 'N/A';
    const newState = message.NewStateValue || 'N/A';
    const reason = message.NewStateReason || 'N/A';

    // Create format for Slack message
    // const slackMessage = {
    //   text: `:fire: ${alarmName} state is now ${newState}: ${reason}\n\`\`\`\n${JSON.stringify(message)}\`\`\``
    // };

    // Create format for Google Chat message
    // const chatMessage = {
    //   text: `:fire: ${alarmName} state is now ${newState}: ${reason}\n\`\`\`\n${JSON.stringify(message)}\`\`\``
    // };
    const chatMessage = {
      cards: [
        {
          header: {
            title: `Alarm: ${alarmName}`,
            subtitle: `State: ${newState}`,
            imageUrl: 'https://example.com/image.png',
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `Reason: ${reason}`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const roomId = process.env.GOOGLE_CHAT_ROOM_ID;

    if (!roomId) {
      throw new Error('Google Chat room ID not provided in environment variables');
    }

    // Decode the base64 encoded service account key
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(Buffer.from(process.env.SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8'));
    } catch (parseError) {
      throw new Error('Error parsing service account key:', parseError);
    }
    
    // const serviceAccountKey = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/chat.bot'],
    });
    

    await jwtClient.authorize(); // Authorize the JWT client

    const chat = google.chat({ version: 'v1', auth: jwtClient });

    const response = await chat.spaces.messages.create({
      parent: `spaces/${roomId}`,
      requestBody: chatMessage,
    });

    console.log('Message sent successfully:', response.data);

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
// async function sendToSlack(slackMessage) {
// }