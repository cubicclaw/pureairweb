import { NextRequest, NextResponse } from "next/server";

interface VerifyRequestBody {
  captchaType: "math" | "slider";
  answer?: number;
  expected?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { captchaType, answer, expected } = body;

    if (!captchaType) {
      return NextResponse.json(
        { success: false, error: "captchaType is required" },
        { status: 400 },
      );
    }

    if (captchaType === "math") {
      if (answer === undefined || expected === undefined) {
        return NextResponse.json(
          { success: false, error: "answer and expected are required for math captcha" },
          { status: 400 },
        );
      }

      const success = Number(answer) === Number(expected);
      return NextResponse.json({ success });
    }

    if (captchaType === "slider") {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: `Unknown captchaType: ${captchaType}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[captcha/verify]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
