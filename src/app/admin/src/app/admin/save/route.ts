import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, description, tags, coverUrl, destUrl, adminPass } = data;

    if (adminPass !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.manga.create({
      data: { name, description, tags, coverUrl, destUrl }
    });

    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    const adLink = "https://www.effectivegatecpm.com/y8szstkz?key=9952683873ccc1746eb3ec9f3161a5d0";
    
    const hashtags = tags.map((t: string) => `#${t.trim().replace(/\s+/g, '')}`).join(' ');
    const caption = `<b>🔥 NEW UPLOAD: ${name}</b>\n\n` +
                    `📝 <b>Summary:</b>\n<i>${description}</i>\n\n` +
                    `🏷 <b>Tags:</b>\n${hashtags}\n\n` +
                    `🚀 <i>Click below to read the full manga!</i>`;

    await bot.telegram.sendPhoto("@hi0anime", coverUrl, {
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📖 READ ONLINE (FREE)", url: adLink }]
        ]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
