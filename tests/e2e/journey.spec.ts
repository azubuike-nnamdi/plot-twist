import { expect, test } from "@playwright/test"

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required to run the browser journey. Playwright was not executed."
  )
}

test("landing, login, and the share image stay public", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Drop secret answers. Guess the author." })
  ).toBeVisible()
  await page.getByRole("link", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  const image = await page.request.get("/opengraph-image")
  expect(image.status()).toBe(200)
  expect(image.headers()["content-type"]).toContain("image/png")
})

test("a logged-out invite returns to the room after an account exists", async ({
  page,
}) => {
  const stamp = Date.now().toString().slice(-8)
  await page.goto("/join?code=ABCDEFGH")
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.goto("/register")
  await page.getByLabel("Username").fill(`player${stamp}`)
  await page.getByLabel("Email").fill(`player${stamp}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill("password123")
  await page.getByLabel("Confirm password").fill("password123")
  await page.getByRole("button", { name: "Create account and play" }).click()
  await expect(page).toHaveURL("/")
})

test("three accounts can finish a short room and rematch", async ({ browser }) => {
  const stamp = Date.now().toString().slice(-6)
  const host = await browser.newContext()
  const second = await browser.newContext()
  const third = await browser.newContext()
  const hostPage = await host.newPage()
  const secondPage = await second.newPage()
  const thirdPage = await third.newPage()

  async function register(
    page: typeof hostPage,
    name: string
  ) {
    await page.goto("/register")
    await page.getByLabel("Username").fill(name)
    await page.getByLabel("Email").fill(`${name}@example.com`)
    await page.getByLabel("Password", { exact: true }).fill("password123")
    await page.getByLabel("Confirm password").fill("password123")
    await page.getByRole("button", { name: "Create account and play" }).click()
    await expect(page).toHaveURL("/")
  }

  await register(hostPage, `host${stamp}`)
  await register(secondPage, `two${stamp}`)
  await register(thirdPage, `three${stamp}`)

  await hostPage.goto("/create")
  await hostPage.getByLabel("Room name").fill(`Night ${stamp}`)
  await hostPage.getByRole("checkbox").first().check()
  await hostPage.getByLabel("Rounds").selectOption("3")
  await hostPage.getByRole("button", { name: "Generate room and enter lobby" }).click()
  await expect(hostPage).toHaveURL(/\/room\//)
  const code = new URL(hostPage.url()).pathname.split("/").pop() ?? ""

  for (const page of [secondPage, thirdPage]) {
    await page.goto(`/join?code=${code}`)
    await page.getByRole("button", { name: "Join room" }).click()
    await expect(page).toHaveURL(new RegExp(`/room/${code}`))
  }

  await hostPage.getByRole("button", { name: "Start game" }).click()

  for (let round = 0; round < 3; round += 1) {
    for (const page of [hostPage, secondPage, thirdPage]) {
      await expect(page.getByPlaceholder("Write your secret answer")).toBeVisible({
        timeout: 20_000,
      })
      await page.getByPlaceholder("Write your secret answer").fill(`Answer ${round} from this seat`)
      await page.getByRole("button", { name: "Lock in my answer" }).click()
    }
    for (const page of [hostPage, secondPage, thirdPage]) {
      await expect(page.getByRole("button", { name: "Lock in vote" }).first()).toBeVisible({
        timeout: 20_000,
      })
      const cards = page.locator("article")
      const count = await cards.count()
      for (let index = 0; index < count; index += 1) {
        const card = cards.nth(index)
        await card.getByRole("button").nth(0).click()
        await card.getByRole("button", { name: "Lock in vote" }).click()
      }
    }
    await expect(hostPage.getByRole("button", { name: /Next round|Show final results/ })).toBeVisible({
      timeout: 20_000,
    })
    await hostPage.getByRole("button", { name: /Next round|Show final results/ }).click()
  }

  await expect(hostPage.getByRole("button", { name: "Play again" })).toBeVisible({
    timeout: 20_000,
  })
  await hostPage.getByRole("button", { name: "Play again" }).click()
  await expect(hostPage).toHaveURL(/\/room\//)
  await host.close()
  await second.close()
  await third.close()
})
