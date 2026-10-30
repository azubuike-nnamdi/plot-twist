import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const packs: {
  name: string
  description: string
  isAdult: boolean
  questions: string[]
}[] = [
  {
    name: "Awkward Confessions",
    description: "Cringeworthy moments, bad dates, and social blunders.",
    isAdult: false,
    questions: [
      "What is something petty you do when nobody is watching?",
      "What white lie do you still stand by?",
      "Which text have you reread more times than you will admit?",
      "What did you pretend to understand at a party?",
      "What is the smallest thing that ruined your day?",
      "Who did you practice a conversation with in the mirror?",
      "What did you laugh at and immediately regret?",
      "What is a habit you hope your friends never notice?",
    ],
  },
  {
    name: "Pop Culture Chaos",
    description: "Celebrity drama, movies, trends, and meme lore.",
    isAdult: false,
    questions: [
      "Which movie character would survive your group chat?",
      "What trend did you join three months late?",
      "Which fictional villain is actually organized?",
      "What song would play if you entered a room dramatically?",
      "Which show did you finish and refuse to discuss?",
      "What celebrity would give the worst wedding toast?",
      "Which meme describes your last weekend?",
      "What franchise would you reboot with your friends?",
    ],
  },
  {
    name: "Wild Hypotheticals",
    description: "Absurd dilemmas, superpowers, and parallel realities.",
    isAdult: false,
    questions: [
      "What useless superpower would you still show off?",
      "If you could replay one ordinary Tuesday, which one is it?",
      "What law would you pass that only affects your friend group?",
      "Which animal would you trust with your phone password?",
      "What would your statue be doing?",
      "If your thoughts appeared as subtitles, what would they say at dinner?",
      "What object in this room would you recruit for a heist?",
      "Which historical event would you attend only for the snacks?",
    ],
  },
  {
    name: "Office Shenanigans",
    description: "Silent quitting, meeting nightmares, and chat chaos.",
    isAdult: false,
    questions: [
      "What is your most polite way of saying this meeting should be an email?",
      "Which status message is covering for you right now?",
      "What did you type and then delete in the work chat?",
      "What snack policy would you enforce on day one?",
      "Which meeting role are you secretly the best at?",
      "What would your out-of-office reply confess?",
      "What is the most dramatic way to leave a spreadsheet?",
      "Which office plant knows too much?",
    ],
  },
  {
    name: "Deep and Dark Secrets",
    description: "Spicier questions for a group that opted in.",
    isAdult: true,
    questions: [
      "What opinion would get you uninvited from a group chat?",
      "What did you enjoy more than you told your friends?",
      "Which rule do you break when you are sure nobody will know?",
      "What is the boldest message sitting in your drafts?",
      "What rumor would you rather start than deny?",
      "What did you do for the story, not the outcome?",
      "Which secret would you trade for one honest answer?",
      "What is the last thing you wanted to explain and did not?",
    ],
  },
  {
    name: "Wholesome Nonsense",
    description: "Goofy banter, food debates, and harmless secrets.",
    isAdult: false,
    questions: [
      "What food would you defend in a debate?",
      "Which compliment do you still think about?",
      "What tiny ritual makes an ordinary day better?",
      "Who in this room would you trust to order for the table?",
      "What is your most sincere unpopular comfort?",
      "Which childhood prize are you still proud of?",
      "What would you add to a perfect Saturday?",
      "Which friend deserves a trophy for something small?",
    ],
  },
]

async function main() {
  for (const pack of packs) {
    const category = await prisma.category.upsert({
      where: { name: pack.name },
      update: {
        description: pack.description,
        isAdult: pack.isAdult,
        isActive: true,
      },
      create: {
        name: pack.name,
        description: pack.description,
        isAdult: pack.isAdult,
        isActive: true,
      },
    })
    for (const text of pack.questions) {
      const existing = await prisma.question.findFirst({
        where: { categoryId: category.id, text },
      })
      if (existing) continue
      await prisma.question.create({
        data: {
          text,
          categoryId: category.id,
          isAdult: pack.isAdult,
          isActive: true,
        },
      })
    }
  }
  await prisma.platformSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
