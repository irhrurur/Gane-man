const { chromium } = require("@playwright/test");
const assert = require("assert");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/veilbreak-desktop.png", fullPage: true });
  assert(await page.getByText("WELCOME BACK, OPERATOR").isVisible());
  const navigate = async (label) => {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: new RegExp("^" + label) })
      .click();
  };
  for (const label of [
    "Campaign",
    "Multiplayer",
    "Co-op Survival",
    "The Hollow",
    "Training Grounds",
    "Loadout",
    "Progression",
    "Challenges",
    "Barracks",
    "Overview",
  ]) {
    await navigate(label);
    assert(await page.locator("main").isVisible());
  }
  await navigate("Campaign");
  assert.equal(await page.locator(".mission-card").count(), 16);
  await page.locator(".mission-card").nth(15).click();
  assert(
    await page.getByRole("button", { name: "DEPLOY OPERATION 16" }).isVisible(),
  );
  await navigate("Multiplayer");
  assert.equal(await page.locator(".ruleset-grid>button").count(), 11);
  for (let i = 0; i < 11; i++) {
    await page.locator(".ruleset-grid>button").nth(i).click();
    assert(
      await page
        .locator(".ruleset-grid>button")
        .nth(i)
        .evaluate((e) => e.classList.contains("selected")),
    );
  }
  await navigate("Loadout");
  await page.getByRole("button", { name: /K-9 KESTREL/ }).click();
  await page.getByRole("button", { name: /GHOSTWEAVE/ }).click();
  await page.getByRole("button", { name: "SAVE LOADOUT" }).click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "networkidle" });
  await navigate("Loadout");
  assert(
    await page
      .getByRole("button", { name: /K-9 KESTREL/ })
      .evaluate((e) => e.classList.contains("selected")),
  );
  await page.getByRole("button", { name: /VXR-7 SENTINEL/ }).click();
  await page.getByRole("button", { name: /PULSE SCAN/ }).click();
  await page.getByRole("button", { name: "SAVE LOADOUT" }).click();
  await page.waitForTimeout(400);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  for (const tab of [
    "AUDIO",
    "GRAPHICS",
    "CONTROLS",
    "ACCESSIBILITY",
    "GENERAL",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
  }
  await page.getByRole("button", { name: "GRAPHICS", exact: true }).click();
  await page.locator(".setting-row select").selectOption("Low");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await navigate("Training Grounds");
  await page.setViewportSize({ width: 960, height: 600 });
  await page
    .getByRole("button", { name: "ENTER THE RANGE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "DEPLOY NOW", exact: true })
    .waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "DEPLOY NOW", exact: true }).click();
  await page.waitForTimeout(1400);
  assert(await page.locator("canvas").isVisible());
  assert(!(await page.getByText("GRAPHICS UNAVAILABLE").count()));
  const ammo = await page.locator(".ammo b").innerText();
  await page.screenshot({ path: "/tmp/veilbreak-game-start.png" });
  await page.mouse.move(480, 300);
  await page.mouse.down();
  await page.waitForFunction(
    () => document.querySelector(".ammo b")?.textContent !== "30",
    {},
    { timeout: 30000 },
  );
  await page.mouse.up();
  await page.waitForTimeout(200);
  assert.notEqual(
    await page.locator(".ammo b").innerText(),
    ammo,
    "Fire reduces ammunition",
  );
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(300);
  assert(
    await page
      .locator(".hud-equipment")
      .innerText()
      .then((t) => !t.includes("READY")),
  );
  await page.keyboard.press("KeyR");
  await page.waitForFunction(
    () => document.querySelector(".ammo b")?.textContent === "30",
    {},
    { timeout: 30000 },
  );
  assert.equal(await page.locator(".ammo b").innerText(), "30");
  await page.screenshot({ path: "/tmp/veilbreak-game.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  assert(
    await page.getByRole("button", { name: "RESUME OPERATION" }).isVisible(),
  );
  await page.getByRole("button", { name: "ABORT", exact: true }).click();
  assert(await page.locator(".sidebar").isVisible());
  await navigate("Overview");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/veilbreak-mobile.png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Mobile page has no horizontal overflow",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await navigate("Campaign");
  assert(await page.getByText("BREAK THE SILENCE.").isVisible());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser navigation, 16 missions, 11 modes, loadout persistence, settings, live WebGL firing/reload/ability/pause, and mobile layout",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
