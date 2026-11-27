// K-Startup announcements (창업진흥원_K-Startup 조회서비스, data.go.kr dataset 15125364, "이용허락범위 제한 없음"),
// with a DATA_GO_KR_SERVICE_KEY from the data.go.kr 활용신청. Only announcements still taking applications and open
// to university students. They're Korean programs for people in Korea, so they're marked as restricted to Korea.
import { LIMITS, USER_AGENT, clip, toDay, validUrl, type Fetch, type ImportedEvent } from "./types";
import type { OpportunityType } from "../opportunities";

export const KSTARTUP_URL = "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01";
const PER_PAGE = 100;
const MAX_PAGES = 10;

type Announcement = {
  pbanc_sn?: number | string;
  biz_pbanc_nm?: string;
  intg_pbanc_biz_nm?: string;
  pbanc_ntrp_nm?: string;
  sprv_inst?: string;
  detl_pg_url?: string;
  biz_gdnc_url?: string;
  pbanc_rcpt_bgng_dt?: string;
  pbanc_rcpt_end_dt?: string;
  supt_regin?: string;
  supt_biz_clsfc?: string;
  aply_trgt?: string;
  rcrt_prgs_yn?: string;
};

// supt_regin, in English; 전국 (nationwide) and anything unknown leave the city empty
const REGIONS: Record<string, string> = {
  서울: "Seoul", 부산: "Busan", 대구: "Daegu", 인천: "Incheon", 광주: "Gwangju", 대전: "Daejeon", 울산: "Ulsan", 세종: "Sejong",
  경기: "Gyeonggi", 강원: "Gangwon", 충북: "Chungbuk", 충남: "Chungnam", 전북: "Jeonbuk", 전남: "Jeonnam", 경북: "Gyeongbuk",
  경남: "Gyeongnam", 제주: "Jeju",
};

// Contests and hackathons by name; funding programs are grants; the rest (education, events, space) are "other"
function typeOf(a: Announcement): OpportunityType {
  const text = `${a.biz_pbanc_nm ?? ""} ${a.intg_pbanc_biz_nm ?? ""}`;
  if (/해커톤|hackathon/i.test(text)) return "hackathon";
  if (/공모전|경진대회|대회|챌린지|challenge/i.test(text)) return "competition";
  if (/사업화|융자|자금/.test(a.supt_biz_clsfc ?? "")) return "grant";
  return "other";
}

export function parseKStartup(body: unknown): ImportedEvent[] {
  const items = (body as { data?: unknown })?.data;
  if (!Array.isArray(items)) throw new Error("K-Startup: expected data in the response");
  return (items as Announcement[]).flatMap((a) => {
    const title = clip(a.biz_pbanc_nm || a.intg_pbanc_biz_nm, LIMITS.title);
    const url = validUrl(a.detl_pg_url) ?? validUrl(a.biz_gdnc_url);
    const deadline = toDay(a.pbanc_rcpt_end_dt);
    if (!a.pbanc_sn || !url || title.length < 3 || !deadline) return [];
    if (a.rcrt_prgs_yn && a.rcrt_prgs_yn !== "Y") return [];
    if (!(a.aply_trgt ?? "").includes("대학생")) return [];
    const region = Object.keys(REGIONS).find((r) => (a.supt_regin ?? "").startsWith(r));
    return [{
      source: "kstartup",
      external_id: String(a.pbanc_sn),
      title,
      type: typeOf(a),
      organizer: clip(a.pbanc_ntrp_nm || a.sprv_inst, LIMITS.organizer),
      url,
      description: "",
      starts_at: null,
      deadline,
      ends_at: null,
      online: false,
      country: "KR",
      city: region ? REGIONS[region] : "",
      // Korean programs, announced in Korean
      languages: ["Korean"],
      eligibility: "country",
      eligibility_note: clip(a.aply_trgt ? `신청 대상: ${a.aply_trgt}` : "", LIMITS.note),
      inferred: ["languages"],
    } satisfies ImportedEvent];
  });
}

// data.go.kr hands out the key both raw and URL-encoded; either works here
const rawKey = (key: string) => (key.includes("%") ? decodeURIComponent(key) : key);

export async function fetchKStartup(serviceKey: string, fetcher: Fetch = fetch) {
  const events: ImportedEvent[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ serviceKey: rawKey(serviceKey), page: String(page), perPage: String(PER_PAGE), returnType: "json" });
    params.set("cond[rcrt_prgs_yn::EQ]", "Y");
    const response = await fetcher(`${KSTARTUP_URL}?${params}`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
    // The message never includes the address: it carries the key
    if (!response.ok) throw new Error(`K-Startup answered ${response.status}`);
    const body = (await response.json()) as { totalCount?: number; currentCount?: number };
    events.push(...parseKStartup(body));
    if (!body.currentCount || page * PER_PAGE >= (body.totalCount ?? 0)) break;
  }
  return events;
}
