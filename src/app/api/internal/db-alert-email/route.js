import { NextResponse } from 'next/server';
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export async function POST(req) {
    // Simple shared-secret auth (good baseline for webhook calls)
    const alertSecret = req.headers.get("x-alert-secret");

    if (alertSecret !== process.env.ALERT_SECRET) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const { to, subject, text, html } = await req.json();

        if (!to || !subject || (!text && !html)) {
            return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
        }

        const cmd = new SendEmailCommand({
            FromEmailAddress: process.env.SES_FROM_EMAIL,
            Destination: { ToAddresses: [to] },
            Content: {
                Simple: {
                    Subject: { Data: subject },
                    Body: {
                        Text: text ? { Data: text } : undefined,
                        Html: html ? { Data: html } : undefined,
                    },
                },
            },
        });

        const out = await ses.send(cmd);
        return NextResponse.json({ ok: true, messageId: out.MessageId });
    } catch (err) {
        console.error("Error sending email:", err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
