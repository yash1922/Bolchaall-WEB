// Email service. Uses Resend if RESEND_API_KEY is set, otherwise logs to console.
// Hackathon scope — every send is fire-and-forget; failures don't block the calling flow.

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let resendClient: { emails: { send: (input: unknown) => Promise<unknown> } } | null = null;
let resendInitialized = false;

async function getResend() {
  if (resendInitialized) return resendClient;
  resendInitialized = true;
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { Resend } = await import("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY) as unknown as typeof resendClient;
    return resendClient;
  } catch (e) {
    console.warn("[email] resend init failed:", e);
    return null;
  }
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Bolchall <noreply@bolchall.demo>";
  const client = await getResend();
  if (!client) {
    console.log(
      `[email:console-fallback] to=${payload.to} subject="${payload.subject}"\n${payload.text}`
    );
    return;
  }
  try {
    await client.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? `<pre>${payload.text}</pre>`,
    });
  } catch (e) {
    console.warn("[email] send failed, falling back to console:", e);
    console.log(`[email:fallback] to=${payload.to} subject="${payload.subject}"\n${payload.text}`);
  }
}

export const Emails = {
  patientWelcome(to: string, name: string) {
    return sendEmail({
      to,
      subject: "Welcome to Bolchall",
      text:
        `Hi ${name},\n\n` +
        `Welcome to Bolchall! Your 3-day free trial has started.\n\n` +
        `Browse the phoneme directory, run a free-practice exercise, or wait to be matched with a therapist.\n\n` +
        `— The Bolchall team`,
    });
  },
  doctorApproved(to: string, name: string) {
    return sendEmail({
      to,
      subject: "You're approved on Bolchall",
      text:
        `Dr. ${name},\n\n` +
        `Your application has been approved. You can now claim patients and assign exercises.\n\n` +
        `Log in: http://localhost:3000/login\n\n` +
        `— The Bolchall admin team`,
    });
  },
  doctorRejected(to: string, name: string) {
    return sendEmail({
      to,
      subject: "Bolchall application update",
      text:
        `Dr. ${name},\n\n` +
        `Thank you for applying. After review, we're not able to approve your application at this time.\n\n` +
        `— The Bolchall admin team`,
    });
  },
  newAssignment(to: string, patientName: string, exerciseTitle: string, doctorName: string) {
    return sendEmail({
      to,
      subject: `New exercise from ${doctorName}: ${exerciseTitle}`,
      text:
        `Hi ${patientName},\n\n` +
        `${doctorName} has assigned you a new exercise: "${exerciseTitle}".\n\n` +
        `Open it on your dashboard: http://localhost:3000/app\n\n` +
        `— The Bolchall team`,
    });
  },
};
