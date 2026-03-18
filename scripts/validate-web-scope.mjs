import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const controllerRoot = path.resolve(repoRoot, '..', '.codex-migrate-controller', 'contracts')

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
const fail = (message) => {
  console.error(`validate-web-scope: ${message}`)
  process.exitCode = 1
}

try {
  JSON.parse(fs.readFileSync(path.join(controllerRoot, 'migration_contract.json'), 'utf8'))
  JSON.parse(fs.readFileSync(path.join(controllerRoot, 'playwright_plan.json'), 'utf8'))
} catch (error) {
  fail(`contract json invalid: ${error instanceof Error ? error.message : String(error)}`)
}

const poiSource = read('src/data/pois.ts')
const poiIds = [...poiSource.matchAll(/id: '(poi\d+)'/g)].map((match) => match[1])
if (poiIds.length === 0) {
  fail('no POI ids found in src/data/pois.ts')
}

const tourSource = read('src/data/tours.ts')
const tourMatches = [...tourSource.matchAll(/poiIds: \[([^\]]+)\]/g)]
for (const match of tourMatches) {
  const ids = [...match[1].matchAll(/'(poi\d+)'/g)].map((item) => item[1])
  for (const id of ids) {
    if (!poiIds.includes(id)) {
      fail(`tour references unknown poi id: ${id}`)
    }
  }
}

const audioDir = path.join(repoRoot, 'public', 'audio')
const audioFiles = new Set(fs.readdirSync(audioDir))
const languages = ['en-US', 'fr-FR', 'ja-JP', 'ko-KR', 'vi-VN', 'zh-CN']

for (const poiId of poiIds) {
  if (!audioFiles.has(`${poiId}.mp3`)) {
    fail(`missing fallback audio: ${poiId}.mp3`)
  }
  for (const language of languages) {
    if (!audioFiles.has(`${poiId}_${language}.mp3`)) {
      fail(`missing localized audio: ${poiId}_${language}.mp3`)
    }
  }
}

const loginScreen = read('src/screens/LoginScreen.tsx')
if (loginScreen.includes('data-testid=\'login-google\'') || loginScreen.includes('data-testid=\"login-google\"')) {
  fail('login screen still exposes login-google test id')
}

const audioService = read('src/services/audio.ts')
if (!audioService.includes("status: 'blocked'") || !audioService.includes("status: 'missing'")) {
  fail('audio service no longer preserves blocked/missing playback separation')
}

if (process.exitCode !== 1) {
  console.log('validate-web-scope: ok')
}
