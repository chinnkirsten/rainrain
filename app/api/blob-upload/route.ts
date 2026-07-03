import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 生成客户端直传 Blob 的令牌。中间件已确保只有登录用户能到达这里。
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        addRandomSuffix: true,
        maximumSizeInBytes: 500 * 1024 * 1024, // 单文件上限 500MB
        tokenPayload: clientPayload ?? undefined,
      }),
      // 直传完成的回调在本地开发不会被 Vercel 调用，元数据改由客户端记录。
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
