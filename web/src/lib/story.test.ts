import { describe, expect, it } from "vitest";
import { clampLines, eventLine, firstName, fitSize, headline, qrPath, storyLang, storyVersion, withArticle, wrap } from "./story";

describe("withArticle", () => {
  it("picks a or an by the sound, and leaves other scripts alone", () => {
    expect(withArticle("iOS developer")).toBe("an iOS developer");
    expect(withArticle("Designer")).toBe("a Designer");
    expect(withArticle("Engineer")).toBe("an Engineer");
    expect(withArticle("UX designer")).toBe("a UX designer");
    expect(withArticle("ML engineer")).toBe("an ML engineer");
    expect(withArticle("디자이너")).toBe("디자이너");
    expect(withArticle("Дизайнер")).toBe("Дизайнер");
  });
});

describe("headline", () => {
  it("names one or two open roles, counts three or more and lists them", () => {
    expect(headline(["iOS developer"], null)).toEqual({ line: "We need an iOS developer", list: [] });
    expect(headline(["iOS developer", "Designer"], null).line).toBe("We need an iOS developer and a Designer");
    expect(headline(["Backend", "Designer", "ML"], "Imagine Cup")).toEqual({ line: "We need 3 more people", list: ["Backend", "Designer", "ML"] });
  });

  it("says the team is set when every role is filled", () => {
    expect(headline([], "Imagine Cup").line).toBe("Team set for Imagine Cup");
    expect(headline([], null).line).toBe("Team set");
  });
});

describe("Korean", () => {
  it("is used when most of the title's and roles' letters are Hangul", () => {
    expect(storyLang(["대학생을 위한 AI 스터디 메이트", "iOS 개발자", "디자이너"])).toBe("ko");
    expect(storyLang(["AI study buddy", "iOS developer"])).toBe("en");
    expect(storyLang(["Study buddy for 대학생", "Designer"])).toBe("en");
    expect(storyLang(["Сервис для поиска команды", "Дизайнер"])).toBe("en");
  });

  it("reads naturally, with the right particles", () => {
    expect(headline(["iOS 개발자"], null, "ko").line).toBe("iOS 개발자를 찾고 있어요");
    expect(headline(["백엔드 개발자"], null, "ko").line).toBe("백엔드 개발자를 찾고 있어요");
    expect(headline(["마케팅 담당"], null, "ko").line).toBe("마케팅 담당을 찾고 있어요");
    expect(headline(["iOS 개발자", "디자이너"], null, "ko").line).toBe("iOS 개발자와 디자이너를 찾고 있어요");
    expect(headline(["백엔드", "기획 담당"], null, "ko").line).toBe("백엔드와 기획 담당을 찾고 있어요");
    expect(headline(["디자인팀", "PM"], null, "ko").line).toBe("디자인팀과 PM 찾고 있어요");
    expect(headline(["백엔드", "디자이너", "PM"], "Imagine Cup", "ko")).toEqual({ line: "팀원 3명을 더 찾고 있어요", list: ["백엔드", "디자이너", "PM"] });
    expect(headline([], "Imagine Cup", "ko").line).toBe("Imagine Cup 팀 구성 완료");
    expect(headline([], null, "ko").line).toBe("팀 구성 완료");
  });

  it("counts days in Korean", () => {
    const event = { title: "Imagine Cup", deadline: "2026-12-01", starts_at: null, ends_at: null };
    expect(eventLine(event, "2026-11-19", "ko")).toEqual({ name: "IMAGINE CUP", left: "12일 남음", soon: false });
    expect(eventLine(event, "2026-12-01", "ko").left).toBe("오늘까지");
    expect(eventLine(null, "2026-11-19", "ko").name).toBe("자체 프로젝트");
  });
});

describe("eventLine", () => {
  const day = "2026-11-19";
  const event = (deadline: string | null, starts_at: string | null = null, ends_at: string | null = null) => ({ title: "Imagine Cup", deadline, starts_at, ends_at });

  it("shows the days left in caps, in the accent within a week", () => {
    expect(eventLine(event("2026-12-01"), day)).toEqual({ name: "IMAGINE CUP", left: "12 DAYS LEFT", soon: false });
    expect(eventLine(event("2026-11-26"), day)).toEqual({ name: "IMAGINE CUP", left: "7 DAYS LEFT", soon: true });
    expect(eventLine(event("2026-11-20"), day).left).toBe("1 DAY LEFT");
    expect(eventLine(event("2026-11-19"), day).left).toBe("TODAY");
  });

  it("drops the days once the event is over, and says OWN PROJECT without one", () => {
    expect(eventLine(event("2026-10-01", "2026-10-10", "2026-10-12"), day)).toEqual({ name: "IMAGINE CUP", left: null, soon: false });
    expect(eventLine(null, day)).toEqual({ name: "OWN PROJECT", left: null, soon: false });
  });
});

describe("sizing text", () => {
  it("keeps short lines big and shrinks long ones until they fit", () => {
    expect(fitSize("We need a Designer", 904, 3, 132, 72)).toBe(132);
    const long = "We need an Embedded systems engineer and a Product designer";
    const size = fitSize(long, 904, 3, 132, 72);
    expect(size).toBeLessThan(132);
    expect(wrap(long, size, 904).length).toBeLessThanOrEqual(3);
  });

  it("treats Hangul as wide", () => {
    // Four characters on a line three ems wide: Latin fits, Hangul doesn't
    expect(wrap("abcd", 100, 300)).toHaveLength(1);
    expect(wrap("가나다라", 100, 300)).toHaveLength(2);
  });

  it("cuts long text to a number of lines with an ellipsis", () => {
    const text = "An AI study buddy that plans your week, quizzes you before exams and finds classmates who are revising the same course right now";
    const clamped = clampLines(text, 42, 904, 2);
    expect(clamped.endsWith("…")).toBe(true);
    expect(wrap(clamped, 42, 904).length).toBeLessThanOrEqual(2);
    expect(clampLines("Short title", 42, 904, 3)).toBe("Short title");
  });
});

describe("storyVersion", () => {
  const team = {
    title: "Study buddy",
    roles: ["iOS", "Design"],
    owner_id: "a",
    opportunity: { id: "o" },
    team_applications: [{ user_id: "b", role: "iOS", status: "accepted" }],
  };

  it("changes with the title, roles, event or members, so a new share gets a fresh image", () => {
    const v = storyVersion(team);
    expect(storyVersion({ ...team })).toBe(v);
    expect(storyVersion({ ...team, title: "Study buddy 2" })).not.toBe(v);
    expect(storyVersion({ ...team, roles: ["iOS"] })).not.toBe(v);
    expect(storyVersion({ ...team, opportunity: null })).not.toBe(v);
    expect(storyVersion({ ...team, team_applications: [] })).not.toBe(v);
  });

  it("ignores pending applications, which the image never shows", () => {
    expect(storyVersion({ ...team, team_applications: [...team.team_applications, { user_id: "c", role: "Design", status: "pending" }] })).toBe(storyVersion(team));
  });
});

it("firstName keeps the first word", () => {
  expect(firstName("Minji Placeholder")).toBe("Minji");
  expect(firstName("김민지")).toBe("김민지");
  expect(firstName("  ")).toBe("Member");
});

it("qrPath draws a square code with a border", () => {
  const { size, d } = qrPath("https://example.com/teams/1?ref=story");
  expect(size).toBeGreaterThanOrEqual(25);
  expect(d).toMatch(/^M\d+ \d+h1v1h-1z/);
});
