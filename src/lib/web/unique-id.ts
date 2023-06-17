export class UniqueId {
  private static ct = 0;
  static create(): string {
    return `app-ui-${++this.ct}`
  }
}