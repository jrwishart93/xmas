import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const body = await req.json();

  // TEMPORARY FIX (no API key → skip email send and avoid build crash)
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing – email sending is temporarily disabled.");

    return NextResponse.json(
      {
        ok: false,
        message: "Email sending temporarily disabled (no API key provided).",
        bodyReceived: body,
      },
      { status: 200 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: body.from,
      to: body.to,
      subject: body.subject,
      html: body.html,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error("Resend error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
