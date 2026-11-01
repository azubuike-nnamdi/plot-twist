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
      "What excuse do you keep recycled for leaving early?",
      "Which photo did you untag and hope nobody noticed?",
      "What did you agree to and then look up in the bathroom?",
      "Which compliment did you replay until it got weird?",
      "What is sitting in your cart because you were embarrassed to check out?",
      "Who have you typed a reply to and then left on read on purpose?",
      "What small lie got bigger because nobody questioned it?",
      "What did you practice saying and then abandon at the door?",
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
      "Which sequel should have stopped one movie earlier?",
      "What awards speech would you give for doing the dishes?",
      "Which character would be the worst roommate?",
      "What theme song would ruin a serious moment in your life?",
      "Which reboot would you trust with your group chat?",
      "What reality show challenge would you fail immediately?",
      "Which soundtrack belongs to your commute?",
      "What fictional job would you accept with no training?",
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
      "What would you name a planet you were not allowed to visit?",
      "If your backpack could hold one impossible thing, what is it?",
      "Which sense would you lend to a friend for a day?",
      "What museum exhibit would be just your search history?",
      "If gravity took weekends off, where would you spend Saturday?",
      "What password would a raccoon set for you?",
      "Which invention would you un-invent for your own peace?",
      "What would your ghost do for fun?",
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
      "What would your keyboard shortcut for a shorter meeting be?",
      "Which meeting invite do you accept only to keep the peace?",
      "What is your most creative reading of a quick question?",
      "Which spreadsheet cell is carrying the whole team?",
      "What would you rename the conference room?",
      "Which email did you schedule so you would not have to watch it send?",
      "What is the kindest way to say the deadline was never real?",
      "Which mug has heard every complaint?",
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
      "What would you do again if the group chat never found out?",
      "Which boundary do you describe as a preference?",
      "What did you want credit for and never asked?",
      "Which story did you soften so you would still be invited?",
      "What are you proud of for reasons you do not say out loud?",
      "Which apology did you accept without meaning it?",
      "What do you hope stays between you and your camera roll?",
      "Which rule feels optional after midnight?",
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
      "What snack combination would you serve at your own parade?",
      "Which ordinary errand do you actually look forward to?",
      "What would you put on a trophy for being kind?",
      "Which song do you save for a good day?",
      "What small thing would you teach a room full of beginners?",
      "Which season would you hand to a friend who needs a reset?",
      "What would your thank-you note say if it had to be one sentence?",
      "Which shared meal do you still describe in detail?",
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
