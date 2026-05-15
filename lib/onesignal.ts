const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

export async function sendPushNotification({
  externalUserId,
  title,
  message,
}: {
  externalUserId: string;
  title: string;
  message: string;
}) {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [externalUserId] },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
    }),
  });
  return res.json();
}
