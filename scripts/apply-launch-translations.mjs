#!/usr/bin/env node
/** Apply Sprint L2.5 launch translations for JA + zh-CN (landing + nav). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '..', 'packages', 'i18n', 'src', 'messages');

const patches = {
  ja: {
    'landing.nav.features': '機能',
    'landing.nav.pricing': '料金',
    'landing.nav.faq': 'FAQ',
    'landing.nav.signIn': 'ログイン',
    'landing.nav.startFree': '無料で始める',
    'landing.nav.howItWorks': '使い方',
    'landing.hero.title': 'AIが自動化する戦略コンサルティング',
    'landing.hero.tagline': 'AIが調査します。あなたが決断します。',
    'landing.hero.ctaStart': '無料で始める',
    'landing.hero.ctaDemo': 'デモを見る',
    'landing.hero.ctaHint1': 'クレジットカード不要',
    'landing.hero.ctaHint2': '3分で開始',
    'landing.hero.ctaHint3': 'Beta期間無料',
  },
  'zh-CN': {
    'landing.nav.features': '功能',
    'landing.nav.pricing': '定价',
    'landing.nav.faq': '常见问题',
    'landing.nav.signIn': '登录',
    'landing.nav.startFree': '免费开始',
    'landing.nav.howItWorks': '使用方式',
    'landing.hero.title': 'AI 驱动的战略咨询',
    'landing.hero.tagline': 'AI 负责调研，您来做决策。',
    'landing.hero.ctaStart': '免费开始',
    'landing.hero.ctaDemo': '查看演示',
    'landing.hero.ctaHint1': '无需信用卡',
    'landing.hero.ctaHint2': '3 分钟即可开始',
    'landing.hero.ctaHint3': 'Beta 期间免费',
  },
};

function set(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

for (const [locale, entries] of Object.entries(patches)) {
  const file = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(entries)) {
    set(json, key, value);
  }
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Updated ${locale}.json (${Object.keys(entries).length} keys)`);
}
