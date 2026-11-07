const TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

export function formatEventTime(value: string): string {
  return TIME_FORMATTER.format(new Date(value));
}

export function formatEventDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function formatLanguageList(languages: string[]): string {
  return languages.map((language) => language.replace("语", "")).join(" / ");
}
