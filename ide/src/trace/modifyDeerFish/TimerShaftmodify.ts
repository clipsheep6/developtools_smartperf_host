@element('timer-shaft-element')
export class TimerShaftElement extends BaseElement {
  // @ts-ignore
  offscreen: OffscreenCanvas | undefined;
  isOffScreen: boolean = false;
  public ctx: CanvasRenderingContext2D | undefined | null;
  public canvas: HTMLCanvasElement | null | undefined;
  public totalEL: HTMLDivElement | null | undefined;
  public timeTotalEL: HTMLSpanElement | null | undefined;
  public timeOffsetEL: HTMLSpanElement | null | undefined;
  public collectGroup: HTMLDivElement | null | undefined;
  public collect1: HTMLInputElement | null | undefined;
  public loadComplete: boolean = false;
  public collecBtn: HTMLElement | null | undefined;
  rangeChangeHandler: ((timeRange: TimeRange) => void) | undefined = undefined;
  rangeClickHandler: ((sliceTime: SlicesTime | undefined | null) => void) | undefined = undefined;
  flagChangeHandler: ((hoverFlag: Flag | undefined | null, selectFlag: Flag | undefined | null) => void) | undefined =
    undefined;
  flagClickHandler: ((flag: Flag | undefined | null) => void) | undefined = undefined;
  /**
   * 离线渲染需要的变量
   */
  dpr = window.devicePixelRatio || 1;
  frame: Rect = new Rect(0, 0, 0, 0);
  must: boolean = true;
  hoverX: number = 0;
  hoverY: number = 0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  _cpuUsage: Array<{ cpu: number; ro: number; rate: number }> = [];
  protected timeRuler: TimeRuler | undefined;
  protected _rangeRuler: RangeRuler | undefined;
  protected _sportRuler: SportRuler | undefined;
  private root: HTMLDivElement | undefined | null;
  private _totalNS: number = 10_000_000_000;
  private _startNS: number = 0;
  private _endNS: number = 10_000_000_000;
  private traceSheetEL: TraceSheet | undefined | null;
  private sliceTime: SlicesTime | undefined | null;
  public selectionList: Array<SelectionParam> = [];
  public selectionMap: Map<string, SelectionParam> = new Map<string, SelectionParam>();
  public usageEL: HTMLDivElement | null | undefined;
  public timerShaftEL: TimerShaftElement | null | undefined;
  public rowsPaneEL: HTMLDivElement | null | undefined;
  _checkExpand: boolean = false; //是否展开
  _usageFoldHeight: number = 56.25;//初始化时折叠的负载区高度
  usageExpandHeight: number = 75; //给定的展开的负载区高度
  _cpuUsageCount: Array<{ cpu: number; ro: number; rate: number }> = [];

  get sportRuler(): SportRuler | undefined {
    return this._sportRuler;
  }

  get rangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  set cpuUsage(value: Array<{ cpu: number; ro: number; rate: number }>) {
    info('set cpuUsage values :', value);
    this._cpuUsage = value;

    this._cpuUsageCount = value;
    if (this._cpuUsageCount.length) {
      this.usageEL!.innerHTML = 'CPU Usage';
    }

    if (this._rangeRuler) {
      this._rangeRuler.cpuUsage = this._cpuUsage;
    }
  }

  get checkExpand(): boolean {
    return this._checkExpand;
  }

  set checkExpand(value: boolean) {
    this._checkExpand = value;
  }

  get usageFoldHeight(): number {
    return this._usageFoldHeight;
  }
  set usageFoldHeight(value: number) {
    this._usageFoldHeight = value;
  }

  get totalNS(): number {
    return this._totalNS;
  }

  set totalNS(value: number) {
    info('set totalNS values :', value);
    this._totalNS = value;
    if (this.timeRuler) this.timeRuler.totalNS = value;
    if (this._rangeRuler) this._rangeRuler.range.totalNS = value;
    if (this.timeTotalEL) this.timeTotalEL.textContent = `${ns2s(value)}`;
    requestAnimationFrame(() => this.render());
  }

  get startNS(): number {
    return this._startNS;
  }

  set startNS(value: number) {
    this._startNS = value;
  }

  get endNS(): number {
    return this._endNS;
  }

  set endNS(value: number) {
    this._endNS = value;
  }

  reset(): void {
    this.loadComplete = false;
    this.totalNS = 10_000_000_000;
    this.startNS = 0;
    this.endNS = 10_000_000_000;
    if (this._rangeRuler) {
      this._rangeRuler.drawMark = false;
      this._rangeRuler.range.totalNS = this.totalNS;
      this._rangeRuler.markAObj.frame.x = 0;
      this._rangeRuler.markBObj.frame.x = this._rangeRuler.frame.width;
      this._rangeRuler.cpuUsage = [];
      this.sportRuler!.flagList.length = 0;
      this.sportRuler!.slicesTimeList.length = 0;
      this.selectionList.length = 0;
      this.selectionMap.clear();
      this._rangeRuler.rangeRect = new Rect(0, 25, this.canvas?.clientWidth || 0, 75);
      this.sportRuler!.isRangeSelect = false;
      this.setSlicesMark();
    }
    this.removeTriangle('inverted');
    this.setRangeNS(0, this.endNS);
    //---------------每次导入trace时触发渲染-----------------
    if (this._rangeRuler && this._sportRuler) {
      this.canvas!.width = this.canvas!.clientWidth || 0;
      sessionStorage.setItem('foldHeight', String(56.25))
      if (this._checkExpand && this._checkExpand === true) {
        this._checkExpand = false;
        sessionStorage.setItem('expand', String(this._checkExpand))
      }
      sessionStorage.setItem('expand', String(this._checkExpand))
      this.usageEL!.innerHTML = '';
      this.usageEL!.style.height = `${100 - 56.25}px`;
      this.usageEL!.style.lineHeight = `${100 - 56.25}px`;
      this.timerShaftEL!.style.height = `${146 - 56.25 + 2}px`;
      this.canvas!.style.height = `${146 - 56.25}px`;
      this.canvas!.height = 146 - 56.25;
      this.rowsPaneEL!.style.maxHeight = `100%`;
      this._rangeRuler.frame.height = 18.75;
      this._sportRuler.frame.y = 43.75;
      this.render();
      this._checkExpand = true;
      this._cpuUsageCount = []//清空判断数据
    }
  }
}
