import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';

const DUMP_PATH = resolve(process.cwd(), '../../docs/evidence/ALABOM/SI/si-v1-accuracy-independent-fix.json');

const WRONG_AXIS = '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';

const UNSEEN = [
  {
    type: '냉동물류 IoT',
    stake: '온도 초과',
    normal: `수도권 냉동탑차 30대를 운용하는 3PL은 종이 온도기록지로 관리해서 하절기 온도 초과가 주 14건입니다.
기존 대안은 종이 온도기록지와 기사 수기 보고입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 물류사 운영팀장입니다.`,
    partial: '물류사 2곳이 월 구독을 결제했다.',
    full: '물류사 2곳이 월 구독을 결제했고 온도 초과가 주 14건에서 4건으로 줄었다.',
    worse: '다음 주에 온도 초과가 4건에서 13건으로 늘었다.',
  },
  {
    type: '치과기공 매칭',
    stake: '재작업',
    normal: `개인 치과 40곳은 전화로 기공소를 돌려 보철 재작업이 월 19%입니다.
기존 대안은 원장이 아는 기공소에 전화하는 방식입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 치과 원장입니다.`,
    partial: '치과 3곳이 월 구독을 결제했다.',
    full: '치과 3곳이 월 구독을 결제했고 재작업이 19%에서 8%로 줄었다.',
    worse: '다음 달에 재작업이 8%에서 18%로 늘었다.',
  },
  {
    type: '굴착기 단기렌탈',
    stake: '공회',
    normal: `지방 토목 사장은 월단위 대기업 렌탈을 써서 굴착기 공회가 42%입니다.
기존 대안은 대기업 렌탈의 월단위 강제 계약입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 소규모 토목 사장입니다.`,
    partial: '토목 사장 2명이 단기 렌탈을 결제했다.',
    full: '토목 사장 2명이 단기 렌탈을 결제했고 공회가 42%에서 17%로 줄었다.',
    worse: '다음 기간에 공회가 17%에서 39%로 늘었다.',
  },
  {
    type: '선박 급유 중개',
    stake: '급유 지연',
    normal: `연근해 선사는 항만 전화 중개로 급유를 잡아 급유 지연이 출항 건당 18%입니다.
기존 대안은 항만 급유업자 전화 중개입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 선사 운항팀입니다.`,
    partial: '선사 2곳이 중개 수수료를 결제했다.',
    full: '선사 2곳이 중개 수수료를 결제했고 급유 지연이 18%에서 7%로 줄었다.',
    worse: '다음 기간에 급유 지연이 7%에서 17%로 늘었다.',
  },
  {
    type: '산업 3D 수탁',
    stake: '치수 불량',
    normal: `중소 설비보전팀은 해외 수탁 6주로 Spare part를 뽑아 치수 불량이 22%입니다.
기존 대안은 해외 수탁 3D 프린팅 6주 리드타임입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 공장 보전팀장입니다.`,
    partial: '공장 2곳이 수탁 비용을 결제했다.',
    full: '공장 2곳이 수탁 비용을 결제했고 치수 불량이 22%에서 6%로 줄었다.',
    worse: '다음 기간에 치수 불량이 6%에서 21%로 늘었다.',
  },
  {
    type: '학교급식 잔반',
    stake: '잔반',
    normal: `광역시 초등 급식은 전날 눈대중 식수로 잔반이 1인당 28%입니다.
기존 대안은 영양사가 전날 눈대중으로 식수를 정하는 방식입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 교육청 급식담당입니다.`,
    partial: '학교 2곳이 월 구독을 결제했다.',
    full: '학교 2곳이 월 구독을 결제했고 잔반이 28%에서 11%로 줄었다.',
    worse: '다음 기간에 잔반이 11%에서 27%로 늘었다.',
  },
];

const KNOWN = [
  {
    type: '임상 피험자 모집',
    stake: '노쇼',
    normal: `국내 CRO는 병원 게시판으로 피험자를 모아 스크리닝 방문 노쇼가 31%입니다.
기존 대안은 병원 게시판과 간호사 전화 독촉입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 CRO 프로젝트 매니저입니다.`,
    partial: 'CRO 2곳이 월 구독을 결제했다.',
    full: 'CRO 2곳이 월 구독을 결제했고 노쇼가 31%에서 12%로 줄었다.',
    worse: '다음 기간에 노쇼가 12%에서 29%로 늘었다.',
  },
  {
    type: '소상공인 해외송금',
    stake: '불일치',
    normal: `수출 소상공인은 은행 전신환으로 대금 회수할 때 송금 불일치가 건당 16%입니다.
기존 대안은 시중은행 전신환과 수기 대사입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 무역 소상공인 대표입니다.`,
    partial: '수출 대표 3명이 송금 수수료를 결제했다.',
    full: '수출 대표 3명이 송금 수수료를 결제했고 불일치가 16%에서 5%로 줄었다.',
    worse: '다음 기간에 불일치가 5%에서 15%로 늘었다.',
  },
];

function judge(document: string, answer?: string) {
  return analyzeStrategicIntelligence({
    documentText: answer ? appendFounderEvidenceToDocument(document, answer) : document,
  });
}

describe('S.I. independent Fix Gate — five failure types', () => {
  it('A4: first CU names the document metric for unseen and known types', () => {
    for (const item of [...UNSEEN, ...KNOWN]) {
      const t0 = judge(item.normal);
      expect(t0.criticalUnknown, item.type).toContain(item.stake);
      expect(t0.verdictId).toBe('judgment_deferred');
    }
  });

  it('A1: payment-only stays off S3 when the metric has not moved', () => {
    for (const item of [...UNSEEN, ...KNOWN]) {
      const paid = judge(item.normal, item.partial);
      expect(paid.stageId, item.type).not.toBe('S3');
      expect(paid.verdictId, item.type).toBe('judgment_deferred');
      expect(paid.criticalUnknown, item.type).toContain(item.stake);
    }
  });

  it('A2: metric worsening after full DCE downgrades unseen and known types', () => {
    for (const item of [...UNSEEN, ...KNOWN]) {
      const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
      const worse = judge(withFull, item.worse);
      expect(worse.verdictId === 'viable' && worse.stageId === 'S3', item.type).toBe(false);
      expect(worse.stageId === 'S3' && worse.verdictId === 'conditionally_viable', item.type).toBe(
        false,
      );
    }
  });

  it('A3: off-axis resale counts do not take a non-resale business to S4 viable', () => {
    for (const item of [...UNSEEN, ...KNOWN]) {
      const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
      const drifted = judge(withFull, WRONG_AXIS);
      expect(drifted.stageId === 'S4' && drifted.verdictId === 'viable', item.type).toBe(false);
      expect(drifted.judgment, item.type).not.toMatch(/사업화 가능성이 높음/);
    }
  });

  it('A5: viable headline does not also say there is no commercial evidence', () => {
    for (const item of [...UNSEEN, ...KNOWN]) {
      const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
      const view = resolveSiJourneyIntegration({
        businessDocument: withFull,
        founderAnswer: WRONG_AXIS,
      });
      const text = `${view.current.judgment.judgment}\n${view.current.judgment.risks.join('\n')}`;
      if (/가능성이 높음/.test(view.current.judgment.judgment)) {
        expect(text, item.type).not.toMatch(/상업 실행 증거가 없다/);
      }
    }
  });

  it('records the after dump for the five #194 failure types', () => {
    const rows = [...UNSEEN, ...KNOWN].map((item) => {
      const t0 = judge(item.normal);
      const paid = judge(item.normal, item.partial);
      const full = judge(item.normal, item.full);
      const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
      const worse = judge(withFull, item.worse);
      const drifted = judge(withFull, WRONG_AXIS);
      const driftedView = resolveSiJourneyIntegration({
        businessDocument: withFull,
        founderAnswer: WRONG_AXIS,
      });
      const driftedText = `${driftedView.current.judgment.judgment}\n${driftedView.current.judgment.risks.join('\n')}`;
      return {
        type: item.type,
        stake: item.stake,
        knownStakeNoun: KNOWN.some((row) => row.type === item.type),
        t0: {
          verdictId: t0.verdictId,
          stageId: t0.stageId,
          cu: t0.criticalUnknown,
          namesStake: t0.criticalUnknown.includes(item.stake),
        },
        paymentOnly: {
          verdictId: paid.verdictId,
          stageId: paid.stageId,
          cu: paid.criticalUnknown,
          offS3: paid.stageId !== 'S3' && paid.stageId !== 'S4',
        },
        full: { verdictId: full.verdictId, stageId: full.stageId },
        worsen: {
          verdictId: worse.verdictId,
          stageId: worse.stageId,
          notViableS3: !(worse.verdictId === 'viable' && worse.stageId === 'S3'),
        },
        wrongAxis: {
          verdictId: drifted.verdictId,
          stageId: drifted.stageId,
          judgment: drifted.judgment,
          risks: driftedView.current.judgment.risks,
          notS4Viable: !(drifted.stageId === 'S4' && drifted.verdictId === 'viable'),
          noHeadlineContradiction:
            !/가능성이 높음/.test(drifted.judgment) || !/상업 실행 증거가 없다/.test(driftedText),
        },
      };
    });

    mkdirSync(dirname(DUMP_PATH), { recursive: true });
    writeFileSync(
      `${DUMP_PATH}`,
      `${JSON.stringify(
        {
          dumpLock: 'a79c81c',
          productionSha: '0b46522',
          fixGate: 'OPEN',
          merge: 'forbidden',
          preview: 'unverified_until_attempt',
          scenarioCount: rows.length,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.t0.namesStake)).toBe(true);
    expect(rows.every((row) => row.paymentOnly.offS3)).toBe(true);
    expect(rows.every((row) => row.worsen.notViableS3)).toBe(true);
    expect(rows.every((row) => row.wrongAxis.notS4Viable)).toBe(true);
    expect(rows.every((row) => row.wrongAxis.noHeadlineContradiction)).toBe(true);
  });
});
