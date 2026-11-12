import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' })
await page.screenshot({ path: '/tmp/miserables-qa/00-start.png' })
await page.click('#start-button')
await page.waitForFunction(() => window.__MISERABLES__?.isReady() === true, { timeout: 30000 })
await page.waitForTimeout(1200)
const startedTime = await page.evaluate(() => window.__MISERABLES__?.getTime() ?? 0)
const shots = [24, 30, 90, 125, 180, 230, 385, 480, 625, 715, 775, 895, 985, 1085, 1185, 1280, 1320]
for (const time of shots) {
  await page.evaluate((t) => {
    window.__MISERABLES__?.pause()
    window.__MISERABLES__?.seek(t)
  }, time)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `/tmp/miserables-qa/${String(time).padStart(4, '0')}.png` })
}
await page.evaluate(() => window.__MISERABLES__?.seek(1320))
await page.waitForTimeout(350)
const creditsVisible = await page.locator('#credits').isVisible()
await page.click('#replay-button')
await page.waitForTimeout(250)
const replayTime = await page.locator('#current-time').textContent()
await page.evaluate(() => window.__MISERABLES__?.seek(52))
await page.waitForTimeout(200)
const sub = await page.locator('#subtitles').textContent()
const chapter = await page.locator('#chapter-card-title').textContent()
const timeText = await page.locator('#current-time').textContent()
const voiceDisabled = await page.locator('#voice-button').isDisabled()
await page.click('#info-button')
const infoVisible = await page.locator('#info-panel').isVisible()
const downloadPromise = page.waitForEvent('download', { timeout: 5000 })
await page.click('#download-srt')
const download = await downloadPromise
await page.click('#info-close')
await page.click('#play-button')
await page.waitForTimeout(200)
await page.click('#play-button')
await page.click('#quality-select')
await page.selectOption('#quality-select', 'low')
await page.waitForTimeout(200)
console.log(JSON.stringify({ errors, startedTime, sub, chapter, timeText, voiceDisabled, infoVisible, creditsVisible, replayTime, download: download.suggestedFilename() }, null, 2))
await browser.close()
